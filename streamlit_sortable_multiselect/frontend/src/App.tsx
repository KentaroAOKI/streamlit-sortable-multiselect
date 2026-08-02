import {
  createContext,
  forwardRef,
  HTMLProps,
  KeyboardEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import "./style.css";

// Styleable parts of a selected item. Keep in sync with COLOR_FIELDS in the wrapper.
const COLOR_FIELDS = ["background", "text", "border"] as const;

// Color sources, in default precedence order. Keep in sync with COLOR_SOURCES.
const COLOR_SOURCES = ["value", "option", "order", "palette", "base"] as const;

type ColorField = (typeof COLOR_FIELDS)[number];
type ColorSource = (typeof COLOR_SOURCES)[number];
type ColorSpec = Partial<Record<ColorField, string>>;
type ColorValue = string | Record<string, unknown> | null;

type OptionItem = {
  label: string;
  value: string;
  icon_url?: string | null;
  color?: ColorSpec;
};

type Args = {
  label?: string;
  options?: Array<string | OptionItem>;
  default_selected?: string[];
  placeholder?: string;
  disabled?: boolean;
  show_move_buttons?: boolean;
  show_numbers?: boolean;
  base_color?: ColorValue;
  order_colors?: Record<string, ColorValue>;
  value_colors?: Record<string, ColorValue>;
  color_palette?: ColorValue[];
  color_priority?: string[];
  tooltip_color?: ColorValue;
  max_selections?: number | null;
  max_selections_placeholder?: string;
  empty_message?: string;
  no_options_placeholder?: string;
  selected_position?: "bottom" | "top";
  icon_size?: number;
  options_max_height?: number;
  suggestions_api_url?: string | null;
  suggestions_query_param?: string;
  suggestions_response_path?: string;
  suggestions_label_path?: string;
  suggestions_value_path?: string;
  suggestions_icon_url_path?: string | null;
  suggestions_color_path?: string | null;
  suggestions_headers?: Record<string, string>;
  suggestions_min_chars?: number;
  suggestions_debounce_ms?: number;
  suggestions_loading_message?: string;
  suggestions_error_message?: string;
};

type SortableItemProps = {
  id: string;
  label: string;
  iconUrl?: string | null;
  index: number;
  count: number;
  disabled: boolean;
  showMoveButtons: boolean;
  showNumber: boolean;
  colors: ColorSpec;
  onRemove: (value: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

type ItemStyle = {
  transform: string | undefined;
  transition: string | undefined;
  "--item-bg"?: string;
  "--item-fg"?: string;
  "--item-muted-fg"?: string;
  "--item-border"?: string;
  "--icon-size"?: string;
  "--options-max-height"?: string;
};

type SuggestionsStatus = "idle" | "loading" | "success" | "error";

type TooltipState = {
  text: string;
  left: number;
  top: number;
  maxWidth: number;
  placement: "above" | "below";
  arrowLeft: number;
};

type TooltipStyle = {
  left: number;
  top: number;
  maxWidth: number;
  "--tooltip-arrow-left"?: string;
  "--tooltip-bg"?: string;
  "--tooltip-fg"?: string;
  "--tooltip-border"?: string;
};

type TooltipController = {
  show: (text: string, element: HTMLElement) => void;
  hide: () => void;
};

const TooltipContext = createContext<TooltipController>({
  show: () => undefined,
  hide: () => undefined,
});

const TOOLTIP_MAX_WIDTH = 320;
const TOOLTIP_GAP = 8;
// Long enough that sweeping down a list does not flash a tooltip per row, short
// enough to feel immediate. The native title delay is roughly a second.
const TOOLTIP_DELAY_MS = 180;

// The component lives in an iframe, so a tooltip cannot overflow it the way a
// native one can. Anchor it to the label and keep it inside the frame.
function computeTooltipPosition(element: HTMLElement, text: string): TooltipState {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || rect.right;
  const maxWidth = Math.max(120, Math.min(TOOLTIP_MAX_WIDTH, viewportWidth - TOOLTIP_GAP * 2));
  const left = Math.min(
    Math.max(TOOLTIP_GAP, rect.left),
    Math.max(TOOLTIP_GAP, viewportWidth - maxWidth - TOOLTIP_GAP),
  );
  // Prefer above; flip below when the label sits too close to the top edge.
  const placement = rect.top >= 88 ? "above" : "below";
  const top = placement === "above" ? rect.top - TOOLTIP_GAP : rect.bottom + TOOLTIP_GAP;
  const arrowLeft = Math.min(
    Math.max(rect.left + rect.width / 2 - left, 12),
    Math.max(12, maxWidth - 12),
  );

  return { text, left, top, maxWidth, placement, arrowLeft };
}

function toColorSpec(color: unknown): ColorSpec | undefined {
  if (typeof color === "string") {
    return color ? { background: color } : undefined;
  }
  if (!color || typeof color !== "object") {
    return undefined;
  }

  const fields = color as Record<string, unknown>;
  const spec: ColorSpec = {};
  for (const field of COLOR_FIELDS) {
    const fieldValue = fields[field];
    if (typeof fieldValue === "string" && fieldValue) {
      spec[field] = fieldValue;
    }
  }
  return Object.keys(spec).length > 0 ? spec : undefined;
}

function toColorSpecRecord(colors: Record<string, ColorValue> | undefined): Record<string, ColorSpec> {
  const result: Record<string, ColorSpec> = {};
  for (const [key, color] of Object.entries(colors ?? {})) {
    const spec = toColorSpec(color);
    if (spec) {
      result[key] = spec;
    }
  }
  return result;
}

function toColorSpecList(colors: ColorValue[] | undefined): ColorSpec[] {
  if (!Array.isArray(colors)) {
    return [];
  }
  return colors.flatMap((color) => {
    const spec = toColorSpec(color);
    return spec ? [spec] : [];
  });
}

function normalizeColorPriority(priority: string[] | undefined): ColorSource[] {
  const ranked: ColorSource[] = [];
  if (Array.isArray(priority)) {
    for (const source of priority) {
      if (COLOR_SOURCES.includes(source as ColorSource) && !ranked.includes(source as ColorSource)) {
        ranked.push(source as ColorSource);
      }
    }
  }
  // Sources the caller left out still apply, ranked below the listed ones.
  for (const source of COLOR_SOURCES) {
    if (!ranked.includes(source)) {
      ranked.push(source);
    }
  }
  return ranked;
}

// The first source that sets a field wins that field, so a high-priority color
// that sets only `text` still inherits the background below it.
function mergeColorSpecs(
  priority: ColorSource[],
  sources: Partial<Record<ColorSource, ColorSpec | undefined>>,
): ColorSpec {
  const merged: ColorSpec = {};
  for (const source of priority) {
    const spec = sources[source];
    if (!spec) {
      continue;
    }
    for (const field of COLOR_FIELDS) {
      if (merged[field] === undefined && spec[field] !== undefined) {
        merged[field] = spec[field];
      }
    }
  }
  return merged;
}

type ItemColorConfig = {
  priority: ColorSource[];
  valueColors: Record<string, ColorSpec>;
  orderColors: Record<string, ColorSpec>;
  colorPalette: ColorSpec[];
  baseColor?: ColorSpec;
};

// Colors that belong to the option itself, wherever it sits in the list.
function resolveIdentityColors(option: OptionItem, config: ItemColorConfig): ColorSpec {
  return mergeColorSpecs(config.priority, {
    value: config.valueColors[option.value],
    option: option.color,
  });
}

function resolveItemColors(
  option: OptionItem,
  index: number,
  count: number,
  config: ItemColorConfig,
): ColorSpec {
  return mergeColorSpecs(config.priority, {
    value: config.valueColors[option.value],
    option: option.color,
    // Positive positions count from the top, negative ones from the bottom.
    order: config.orderColors[String(index + 1)] ?? config.orderColors[String(index - count)],
    palette:
      config.colorPalette.length > 0
        ? config.colorPalette[index % config.colorPalette.length]
        : undefined,
    base: config.baseColor,
  });
}

function normalizeOptions(options: Array<string | OptionItem> | undefined): OptionItem[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.flatMap((option): OptionItem[] => {
    if (typeof option === "string") {
      return [{ label: option, value: option, icon_url: null }];
    }

    if (
      option &&
      typeof option.label === "string" &&
      typeof option.value === "string" &&
      (option.icon_url === undefined ||
        option.icon_url === null ||
        typeof option.icon_url === "string")
    ) {
      return [
        {
          label: option.label,
          value: option.value,
          icon_url: option.icon_url ?? null,
          color: toColorSpec(option.color),
        },
      ];
    }

    return [];
  });
}

function getValueAtPath(value: unknown, path: string): unknown {
  if (!path) {
    return value;
  }

  let current = value;
  for (const segment of path.split(".")) {
    if (!segment || current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function normalizeSuggestions(
  response: unknown,
  responsePath: string,
  labelPath: string,
  valuePath: string,
  iconUrlPath: string | null,
  colorPath: string | null,
): OptionItem[] {
  const rawOptions = getValueAtPath(response, responsePath);
  if (!Array.isArray(rawOptions)) {
    throw new Error("Suggestions response path must point to an array.");
  }

  return rawOptions.flatMap((rawOption) => {
    const label = getValueAtPath(rawOption, labelPath);
    const value = getValueAtPath(rawOption, valuePath);
    const iconUrl = iconUrlPath ? getValueAtPath(rawOption, iconUrlPath) : null;
    const color = colorPath ? getValueAtPath(rawOption, colorPath) : null;
    if (
      typeof label !== "string" ||
      typeof value !== "string" ||
      (iconUrl !== undefined && iconUrl !== null && typeof iconUrl !== "string")
    ) {
      return [];
    }

    return [
      {
        label,
        value,
        icon_url: typeof iconUrl === "string" ? iconUrl : null,
        color: toColorSpec(color),
      },
    ];
  });
}

function buildSuggestionsUrl(apiUrl: string, queryParam: string, query: string): string {
  const url = new URL(apiUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Suggestions API URL must use HTTP or HTTPS.");
  }
  url.searchParams.set(queryParam, query);
  return url.toString();
}

function normalizeSelection(
  values: string[] | undefined,
  options: OptionItem[],
  maxSelections?: number | null,
): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const optionValues = new Set(options.map((option) => option.value));
  const seen = new Set<string>();
  const normalized = values.filter((value) => {
    if (!optionValues.has(value) || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });

  return typeof maxSelections === "number" ? normalized.slice(0, maxSelections) : normalized;
}

function selectionsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

// Must match the `.option-item` height in style.css for correct windowing.
const OPTION_ROW_HEIGHT = 36;

// Cache contrast per color: the DOM probe below forces a reflow, so run it once.
const readableTextColorCache = new Map<string, string | undefined>();

// Stable outer/inner elements for react-window that carry the listbox semantics.
const OptionsListOuter = forwardRef<HTMLDivElement, HTMLProps<HTMLDivElement>>(
  function OptionsListOuter(props, ref) {
    return (
      <div
        ref={ref}
        {...props}
        id="sortable-multiselect-options"
        className="options-scroll"
        role="listbox"
        aria-label="Available options"
      />
    );
  },
);

const OptionsListInner = forwardRef<HTMLUListElement, HTMLProps<HTMLUListElement>>(
  function OptionsListInner(props, ref) {
    return <ul ref={ref} {...props} className="options-inner" role="presentation" />;
  },
);

function getReadableTextColor(color: string | undefined): string | undefined {
  if (!color || typeof document === "undefined") {
    return undefined;
  }

  const cached = readableTextColorCache.get(color);
  if (cached !== undefined || readableTextColorCache.has(color)) {
    return cached;
  }

  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.appendChild(probe);
  const computedColor = window.getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  let result: string | undefined;
  if (match) {
    const red = Number(match[1]);
    const green = Number(match[2]);
    const blue = Number(match[3]);
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    result = luminance > 0.58 ? "#111827" : "#ffffff";
  }

  readableTextColorCache.set(color, result);
  return result;
}

// Labels are clipped by CSS, so the full text is only worth a tooltip when it
// does not fit. Measuring on hover keeps this off the render path, which matters
// for the virtualized options list.
function TruncatedLabel({ className, text }: { className: string; text: string }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const tooltip = useContext(TooltipContext);

  function onEnter() {
    const element = labelRef.current;
    if (!element) {
      return;
    }
    // scrollWidth/clientWidth are rounded, so ignore sub-pixel differences.
    const clipped =
      element.scrollWidth - element.clientWidth > 1 ||
      element.scrollHeight - element.clientHeight > 1;
    if (clipped) {
      tooltip.show(text, element);
    } else {
      tooltip.hide();
    }
  }

  // The full text is always in the DOM and only clipped visually, so screen
  // readers read it whether or not the tooltip is showing.
  return (
    <span
      ref={labelRef}
      className={className}
      onMouseEnter={onEnter}
      onMouseLeave={tooltip.hide}
    >
      {text}
    </span>
  );
}

type OptionRowData = {
  options: OptionItem[];
  highlightedIndex: number;
  colorConfig: ItemColorConfig;
  onHighlight: (index: number) => void;
  onSelect: (value: string) => void;
};

// Must be a stable component type. react-window renders the list's child as an
// element type, so an inline function would be a new type on every parent render
// and would remount every visible row, discarding per-row state such as the
// hover measurement above.
function OptionRow({ index, style, data }: ListChildComponentProps<OptionRowData>) {
  const option = data.options[index];
  const colors = resolveIdentityColors(option, data.colorConfig);
  const isHighlighted = index === data.highlightedIndex;

  return (
    <li
      id={`sortable-multiselect-option-${index}`}
      className={`option-item${isHighlighted ? " highlighted" : ""}`}
      style={style}
      role="option"
      aria-selected={isHighlighted}
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={() => data.onHighlight(index)}
      onClick={() => data.onSelect(option.value)}
    >
      {colors.background || colors.border ? (
        <span
          className="option-swatch"
          aria-hidden="true"
          style={{ background: colors.background, borderColor: colors.border }}
        />
      ) : null}
      {option.icon_url ? (
        <img className="option-icon" src={option.icon_url} alt="" aria-hidden="true" />
      ) : null}
      <TruncatedLabel className="option-label" text={option.label} />
    </li>
  );
}

function SortableItem({
  id,
  label,
  iconUrl,
  index,
  count,
  disabled,
  showMoveButtons,
  showNumber,
  colors,
  onRemove,
  onMove,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: ItemStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  // An explicit text color wins; otherwise stay readable on the background.
  const textColor = colors.text ?? getReadableTextColor(colors.background);
  if (colors.background) {
    style["--item-bg"] = colors.background;
  }
  if (textColor) {
    style["--item-fg"] = textColor;
    style["--item-muted-fg"] = textColor;
  }
  if (colors.border) {
    style["--item-border"] = colors.border;
  }

  return (
    <li
      ref={setNodeRef}
      className={`sortable-item${isDragging ? " dragging" : ""}${
        showNumber ? " with-number" : ""
      }`}
      style={style}
    >
      <button
        type="button"
        className="drag-handle"
        aria-label={`Drag ${id}`}
        disabled={disabled}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>
      {showNumber ? <span className="item-number">{index + 1}</span> : null}
      <span className="item-content">
        {iconUrl ? <img className="item-icon" src={iconUrl} alt="" aria-hidden="true" /> : null}
        <TruncatedLabel className="item-label" text={label} />
      </span>
      <div className="item-actions">
        {showMoveButtons ? (
          <>
            <button
              type="button"
              aria-label={`Move ${label} up`}
              disabled={disabled || index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${label} down`}
              disabled={disabled || index === count - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ↓
            </button>
          </>
        ) : null}
        <button
          type="button"
          aria-label={`Remove ${label}`}
          disabled={disabled}
          onClick={() => onRemove(id)}
        >
          ×
        </button>
      </div>
    </li>
  );
}

export function SortableMultiselect({ args, disabled: streamlitDisabled }: ComponentProps) {
  const componentArgs = args as Args;
  const label = componentArgs.label ?? "";
  const options = useMemo(() => normalizeOptions(componentArgs.options), [componentArgs.options]);
  const optionByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );
  const placeholder = componentArgs.placeholder ?? "Select...";
  const maxSelectionsPlaceholder =
    componentArgs.max_selections_placeholder ?? "Selection limit reached";
  const emptyMessage = componentArgs.empty_message ?? "No items selected";
  const noOptionsPlaceholder = componentArgs.no_options_placeholder ?? "No more options";
  const selectedPosition = componentArgs.selected_position === "top" ? "top" : "bottom";
  const iconSize =
    typeof componentArgs.icon_size === "number" && componentArgs.icon_size >= 1
      ? componentArgs.icon_size
      : 20;
  const optionsMaxHeight =
    typeof componentArgs.options_max_height === "number" && componentArgs.options_max_height >= 1
      ? componentArgs.options_max_height
      : 190;
  const suggestionsApiUrl = componentArgs.suggestions_api_url ?? null;
  const suggestionsEnabled = Boolean(suggestionsApiUrl);
  const suggestionsQueryParam = componentArgs.suggestions_query_param ?? "q";
  const suggestionsResponsePath = componentArgs.suggestions_response_path ?? "";
  const suggestionsLabelPath = componentArgs.suggestions_label_path ?? "label";
  const suggestionsValuePath = componentArgs.suggestions_value_path ?? "value";
  const suggestionsIconUrlPath =
    componentArgs.suggestions_icon_url_path === undefined
      ? "icon_url"
      : componentArgs.suggestions_icon_url_path;
  const suggestionsColorPath = componentArgs.suggestions_color_path ?? null;
  const suggestionsHeadersJson = useMemo(() => {
    const entries = Object.entries(componentArgs.suggestions_headers ?? {}).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return JSON.stringify(Object.fromEntries(entries));
  }, [componentArgs.suggestions_headers]);
  const suggestionsHeaders = useMemo(
    () => JSON.parse(suggestionsHeadersJson) as Record<string, string>,
    [suggestionsHeadersJson],
  );
  const suggestionsMinChars =
    typeof componentArgs.suggestions_min_chars === "number" &&
    componentArgs.suggestions_min_chars >= 0
      ? componentArgs.suggestions_min_chars
      : 1;
  const suggestionsDebounceMs =
    typeof componentArgs.suggestions_debounce_ms === "number" &&
    componentArgs.suggestions_debounce_ms >= 0
      ? componentArgs.suggestions_debounce_ms
      : 300;
  const suggestionsLoadingMessage =
    componentArgs.suggestions_loading_message ?? "Loading suggestions...";
  const suggestionsErrorMessage =
    componentArgs.suggestions_error_message ?? "Failed to load suggestions";
  const disabled = Boolean(componentArgs.disabled || streamlitDisabled);
  const showMoveButtons = componentArgs.show_move_buttons ?? true;
  const showNumbers = componentArgs.show_numbers ?? false;
  const baseColor = useMemo(
    () => toColorSpec(componentArgs.base_color),
    [componentArgs.base_color],
  );
  const orderColors = useMemo(
    () => toColorSpecRecord(componentArgs.order_colors),
    [componentArgs.order_colors],
  );
  const valueColors = useMemo(
    () => toColorSpecRecord(componentArgs.value_colors),
    [componentArgs.value_colors],
  );
  const colorPalette = useMemo(
    () => toColorSpecList(componentArgs.color_palette),
    [componentArgs.color_palette],
  );
  const colorPriority = useMemo(
    () => normalizeColorPriority(componentArgs.color_priority),
    [componentArgs.color_priority],
  );
  const tooltipColor = useMemo(
    () => toColorSpec(componentArgs.tooltip_color),
    [componentArgs.tooltip_color],
  );
  const itemColorConfig = useMemo<ItemColorConfig>(
    () => ({
      priority: colorPriority,
      valueColors,
      orderColors,
      colorPalette,
      baseColor,
    }),
    [colorPriority, valueColors, orderColors, colorPalette, baseColor],
  );
  const maxSelections =
    typeof componentArgs.max_selections === "number" && componentArgs.max_selections >= 0
      ? componentArgs.max_selections
      : null;
  const defaultSelection = useMemo(
    () => normalizeSelection(componentArgs.default_selected, options, maxSelections),
    [componentArgs.default_selected, options, maxSelections],
  );
  const [selected, setSelected] = useState<string[]>(defaultSelection);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [remoteOptions, setRemoteOptions] = useState<OptionItem[]>([]);
  const [suggestionsStatus, setSuggestionsStatus] = useState<SuggestionsStatus>("idle");
  const [selectedRemoteOptions, setSelectedRemoteOptions] = useState<Map<string, OptionItem>>(
    () => new Map(),
  );
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipTimerRef = useRef<number | undefined>(undefined);
  const tooltipController = useMemo<TooltipController>(
    () => ({
      show: (text, element) => {
        const next = computeTooltipPosition(element, text);
        window.clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = window.setTimeout(() => setTooltip(next), TOOLTIP_DELAY_MS);
      },
      hide: () => {
        window.clearTimeout(tooltipTimerRef.current);
        setTooltip(null);
      },
    }),
    [],
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsListRef = useRef<FixedSizeList>(null);
  const suggestionsRequestIdRef = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setSelected((current) => {
      const allowedOptions = [
        ...options,
        ...Array.from(selectedRemoteOptions.values()),
      ];
      const normalized = normalizeSelection(current, allowedOptions, maxSelections);
      return selectionsEqual(current, normalized) ? current : normalized;
    });
  }, [options, maxSelections, selectedRemoteOptions]);

  useEffect(() => {
    Streamlit.setComponentValue(selected);
    Streamlit.setFrameHeight();
  }, [selected]);

  useEffect(() => () => window.clearTimeout(tooltipTimerRef.current), []);

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  const selectionLimitReached = maxSelections !== null && selected.length >= maxSelections;
  const canAddOptions = !disabled && !selectionLimitReached;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  // Lowercase labels once per options change, not on every keystroke/render.
  const searchIndex = useMemo(
    () => options.map((option) => ({ option, haystack: option.label.toLowerCase() })),
    [options],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredStaticOptions = useMemo(() => {
    const result: OptionItem[] = [];
    for (const entry of searchIndex) {
      if (selectedSet.has(entry.option.value)) {
        continue;
      }
      if (normalizedQuery && !entry.haystack.includes(normalizedQuery)) {
        continue;
      }
      result.push(entry.option);
    }
    return result;
  }, [searchIndex, selectedSet, normalizedQuery]);
  const filteredOptions = useMemo(() => {
    const result = [...filteredStaticOptions];
    const seenValues = new Set(result.map((option) => option.value));
    for (const option of remoteOptions) {
      if (selectedSet.has(option.value) || seenValues.has(option.value)) {
        continue;
      }
      seenValues.add(option.value);
      result.push(option);
    }
    return result;
  }, [filteredStaticOptions, remoteOptions, selectedSet]);
  const candidateByValue = useMemo(
    () => new Map(filteredOptions.map((option) => [option.value, option])),
    [filteredOptions],
  );
  const availableCount = useMemo(
    () =>
      searchIndex.reduce(
        (count, entry) => (selectedSet.has(entry.option.value) ? count : count + 1),
        0,
      ),
    [searchIndex, selectedSet],
  );
  const hasStaticOptions = availableCount > 0;
  const apiQueryEligible =
    suggestionsEnabled && query.trim().length >= suggestionsMinChars;
  const hasOptions = filteredOptions.length > 0;
  const canSearch = canAddOptions && (suggestionsEnabled || hasStaticOptions);
  const showOptionsPopover =
    isOpen &&
    canAddOptions &&
    (hasOptions || apiQueryEligible);
  const showOptionsList = showOptionsPopover && hasOptions;
  const activeOption = filteredOptions[highlightedIndex] ?? filteredOptions[0];

  useEffect(() => {
    const requestId = ++suggestionsRequestIdRef.current;
    const controller = new AbortController();
    let timeoutId: number | undefined;

    if (!suggestionsEnabled || !suggestionsApiUrl || !apiQueryEligible) {
      setRemoteOptions([]);
      setSuggestionsStatus("idle");
      return () => controller.abort();
    }

    setRemoteOptions([]);
    setSuggestionsStatus("loading");
    timeoutId = window.setTimeout(async () => {
      try {
        const requestUrl = buildSuggestionsUrl(
          suggestionsApiUrl,
          suggestionsQueryParam,
          query.trim(),
        );
        const response = await fetch(requestUrl, {
          method: "GET",
          headers: suggestionsHeaders,
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Suggestions request failed with status ${response.status}.`);
        }
        const responseBody: unknown = await response.json();
        const nextOptions = normalizeSuggestions(
          responseBody,
          suggestionsResponsePath,
          suggestionsLabelPath,
          suggestionsValuePath,
          suggestionsIconUrlPath,
          suggestionsColorPath,
        );
        if (suggestionsRequestIdRef.current !== requestId) {
          return;
        }
        setRemoteOptions(nextOptions);
        setSuggestionsStatus("success");
      } catch (error) {
        if (controller.signal.aborted || suggestionsRequestIdRef.current !== requestId) {
          return;
        }
        setRemoteOptions([]);
        setSuggestionsStatus("error");
      }
    }, suggestionsDebounceMs);

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      controller.abort();
    };
  }, [
    apiQueryEligible,
    query,
    suggestionsApiUrl,
    suggestionsColorPath,
    suggestionsDebounceMs,
    suggestionsEnabled,
    suggestionsHeaders,
    suggestionsIconUrlPath,
    suggestionsLabelPath,
    suggestionsQueryParam,
    suggestionsResponsePath,
    suggestionsValuePath,
  ]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, selected.length, options]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(filteredOptions.length - 1, 0));
    }
  }, [filteredOptions.length, highlightedIndex]);

  // Never leave a tooltip anchored to a row whose content changed or went away.
  useEffect(() => {
    tooltipController.hide();
  }, [filteredOptions, selected, showOptionsPopover, tooltipController]);

  useEffect(() => {
    if (isOpen && canAddOptions) {
      optionsListRef.current?.scrollToItem(highlightedIndex, "auto");
    }
  }, [highlightedIndex, isOpen, canAddOptions]);

  function addValue(value: string) {
    if (!value || !canAddOptions || selectedSet.has(value) || !candidateByValue.has(value)) {
      return;
    }
    const selectedOption = candidateByValue.get(value);
    if (selectedOption && !optionByValue.has(value)) {
      setSelectedRemoteOptions((current) => {
        const next = new Map(current);
        next.set(value, selectedOption);
        return next;
      });
    }
    setSelected((current) => [...current, value]);
    setQuery("");
    const nextSelectionCount = selected.length + 1;
    setIsOpen(
      nextSelectionCount < (maxSelections ?? Infinity) &&
        (suggestionsEnabled || nextSelectionCount < options.length),
    );
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

  function removeValue(value: string) {
    if (disabled) {
      return;
    }
    setSelected((current) => current.filter((item) => item !== value));
    setSelectedRemoteOptions((current) => {
      if (!current.has(value)) {
        return current;
      }
      const next = new Map(current);
      next.delete(value);
      return next;
    });
  }

  function moveValue(fromIndex: number, toIndex: number) {
    if (disabled || toIndex < 0 || toIndex >= selected.length) {
      return;
    }
    setSelected((current) => arrayMove(current, fromIndex, toIndex));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (disabled || !over || active.id === over.id) {
      return;
    }

    setSelected((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) {
        return current;
      }
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!canAddOptions) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) =>
        filteredOptions.length === 0 ? 0 : Math.min(current + 1, filteredOptions.length - 1),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeOption) {
        addValue(activeOption.value);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const selectedItems = selected.length === 0 ? (
    <div className="empty-state">{emptyMessage}</div>
  ) : (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={selected} strategy={verticalListSortingStrategy}>
        <ul className="selected-list" aria-label="Selected items">
          {selected.map((item, index) => {
            const option =
              optionByValue.get(item) ??
              selectedRemoteOptions.get(item) ??
              { label: item, value: item, icon_url: null };
            return (
              <SortableItem
                key={item}
                id={item}
                label={option.label}
                iconUrl={option.icon_url}
                index={index}
                count={selected.length}
                disabled={disabled}
                showMoveButtons={showMoveButtons}
                showNumber={showNumbers}
                colors={resolveItemColors(option, index, selected.length, itemColorConfig)}
                onRemove={removeValue}
                onMove={moveValue}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );

  return (
    <TooltipContext.Provider value={tooltipController}>
    <div
      className={`sortable-multiselect selected-position-${selectedPosition}`}
      aria-disabled={disabled}
      style={
        {
          "--icon-size": `${iconSize}px`,
          "--options-max-height": `${optionsMaxHeight}px`,
        } as ItemStyle
      }
    >
      {tooltip ? (
        <div
          className={`label-tooltip ${tooltip.placement}`}
          role="tooltip"
          style={
            {
              left: tooltip.left,
              top: tooltip.top,
              maxWidth: tooltip.maxWidth,
              "--tooltip-arrow-left": `${tooltip.arrowLeft}px`,
              "--tooltip-bg": tooltipColor?.background,
              // Same rule as items: an explicit text color wins, otherwise stay
              // readable against whatever background was given.
              "--tooltip-fg": tooltipColor?.text ?? getReadableTextColor(tooltipColor?.background),
              "--tooltip-border": tooltipColor?.border,
            } as TooltipStyle
          }
        >
          {tooltip.text}
        </div>
      ) : null}
      {label ? <label className="component-label">{label}</label> : null}
      {selectedPosition === "top" ? selectedItems : null}
      <div className="search-combobox">
        <input
          ref={searchInputRef}
          className="search-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showOptionsList}
          aria-controls={showOptionsList ? "sortable-multiselect-options" : undefined}
          aria-activedescendant={
            showOptionsList && activeOption
              ? `sortable-multiselect-option-${highlightedIndex}`
              : undefined
          }
          aria-label={label ? `Search and add item to ${label}` : "Search and add item"}
          disabled={!canSearch}
          placeholder={
            selectionLimitReached
              ? maxSelectionsPlaceholder
              : suggestionsEnabled || hasStaticOptions
                ? placeholder
                : noOptionsPlaceholder
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={onSearchKeyDown}
        />
        {showOptionsPopover ? (
          <div className="options-popover">
            {suggestionsStatus === "loading" ? (
              <div className="option-status" role="status">
                {suggestionsLoadingMessage}
              </div>
            ) : null}
            {suggestionsStatus === "error" ? (
              <div className="option-status option-error" role="alert">
                {suggestionsErrorMessage}
              </div>
            ) : null}
            {filteredOptions.length === 0 ? (
              suggestionsStatus === "idle" || suggestionsStatus === "success" ? (
                <div className="option-empty">No matching options</div>
              ) : null
            ) : (
              <FixedSizeList
                ref={optionsListRef}
                outerElementType={OptionsListOuter}
                innerElementType={OptionsListInner}
                height={Math.min(optionsMaxHeight, filteredOptions.length * OPTION_ROW_HEIGHT)}
                itemCount={filteredOptions.length}
                itemSize={OPTION_ROW_HEIGHT}
                width="100%"
                overscanCount={8}
                onScroll={tooltipController.hide}
                itemData={{
                  options: filteredOptions,
                  highlightedIndex,
                  colorConfig: itemColorConfig,
                  onHighlight: setHighlightedIndex,
                  onSelect: addValue,
                }}
              >
                {OptionRow}
              </FixedSizeList>
            )}
          </div>
        ) : null}
      </div>

      {selectedPosition === "bottom" ? selectedItems : null}
    </div>
    </TooltipContext.Provider>
  );
}

export const ConnectedSortableMultiselect = withStreamlitConnection(SortableMultiselect);
