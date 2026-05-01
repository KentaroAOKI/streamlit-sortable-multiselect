import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib";
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

type Args = {
  label?: string;
  options?: string[];
  default_selected?: string[];
  placeholder?: string;
  disabled?: boolean;
  show_move_buttons?: boolean;
  show_numbers?: boolean;
  base_color?: string | null;
  order_colors?: Record<string, string>;
};

type SortableItemProps = {
  id: string;
  index: number;
  count: number;
  disabled: boolean;
  showMoveButtons: boolean;
  showNumber: boolean;
  itemColor?: string;
  onRemove: (value: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

type ItemStyle = {
  transform: string | undefined;
  transition: string | undefined;
  "--item-bg"?: string;
  "--item-fg"?: string;
  "--item-muted-fg"?: string;
};

function normalizeSelection(values: string[] | undefined, options: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set<string>();
  return values.filter((value) => {
    if (!options.includes(value) || seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function getReadableTextColor(color: string | undefined): string | undefined {
  if (!color || typeof document === "undefined") {
    return undefined;
  }

  const probe = document.createElement("span");
  probe.style.color = color;
  document.body.appendChild(probe);
  const computedColor = window.getComputedStyle(probe).color;
  document.body.removeChild(probe);

  const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    return undefined;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function SortableItem({
  id,
  index,
  count,
  disabled,
  showMoveButtons,
  showNumber,
  itemColor,
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
  const textColor = getReadableTextColor(itemColor);
  if (itemColor) {
    style["--item-bg"] = itemColor;
  }
  if (textColor) {
    style["--item-fg"] = textColor;
    style["--item-muted-fg"] = textColor;
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
      <span className="item-label">{id}</span>
      <div className="item-actions">
        {showMoveButtons ? (
          <>
            <button
              type="button"
              aria-label={`Move ${id} up`}
              disabled={disabled || index === 0}
              onClick={() => onMove(index, index - 1)}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Move ${id} down`}
              disabled={disabled || index === count - 1}
              onClick={() => onMove(index, index + 1)}
            >
              ↓
            </button>
          </>
        ) : null}
        <button
          type="button"
          aria-label={`Remove ${id}`}
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
  const options = Array.isArray(componentArgs.options) ? componentArgs.options : [];
  const placeholder = componentArgs.placeholder ?? "Select...";
  const disabled = Boolean(componentArgs.disabled || streamlitDisabled);
  const showMoveButtons = componentArgs.show_move_buttons ?? true;
  const showNumbers = componentArgs.show_numbers ?? false;
  const baseColor = componentArgs.base_color ?? undefined;
  const orderColors = componentArgs.order_colors ?? {};
  const defaultSelection = useMemo(
    () => normalizeSelection(componentArgs.default_selected, options),
    [componentArgs.default_selected, options],
  );
  const [selected, setSelected] = useState<string[]>(defaultSelection);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setSelected((current) => {
      return normalizeSelection(current, options);
    });
  }, [options]);

  useEffect(() => {
    Streamlit.setComponentValue(selected);
    Streamlit.setFrameHeight();
  }, [selected]);

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  const availableOptions = options.filter((option) => !selected.includes(option));
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = availableOptions.filter((option) =>
    option.toLowerCase().includes(normalizedQuery),
  );
  const hasOptions = availableOptions.length > 0;
  const activeOption = filteredOptions[highlightedIndex] ?? filteredOptions[0];

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, selected.length, options]);

  useEffect(() => {
    if (highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(Math.max(filteredOptions.length - 1, 0));
    }
  }, [filteredOptions.length, highlightedIndex]);

  function addValue(value: string) {
    if (!value || disabled || selected.includes(value) || !options.includes(value)) {
      return;
    }
    setSelected((current) => [...current, value]);
    setQuery("");
    setIsOpen(selected.length + 1 < options.length);
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
  }

  function removeValue(value: string) {
    if (disabled) {
      return;
    }
    setSelected((current) => current.filter((item) => item !== value));
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
    if (disabled) {
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
        addValue(activeOption);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="sortable-multiselect" aria-disabled={disabled}>
      {label ? <label className="component-label">{label}</label> : null}
      <div className="search-combobox">
        <input
          ref={searchInputRef}
          className="search-input"
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen && hasOptions}
          aria-controls="sortable-multiselect-options"
          aria-activedescendant={
            isOpen && activeOption ? `sortable-multiselect-option-${highlightedIndex}` : undefined
          }
          aria-label={label ? `Search and add item to ${label}` : "Search and add item"}
          disabled={disabled || !hasOptions}
          placeholder={hasOptions ? placeholder : "No more options"}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={onSearchKeyDown}
        />
        {isOpen && hasOptions ? (
          <ul
            id="sortable-multiselect-options"
            className="options-list"
            role="listbox"
            aria-label="Available options"
          >
            {filteredOptions.length === 0 ? (
              <li className="option-empty">No matching options</li>
            ) : (
              filteredOptions.map((option, index) => (
                <li
                  id={`sortable-multiselect-option-${index}`}
                  className={`option-item${index === highlightedIndex ? " highlighted" : ""}`}
                  key={option}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => addValue(option)}
                >
                  {option}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {selected.length === 0 ? (
        <div className="empty-state">No items selected</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={selected} strategy={verticalListSortingStrategy}>
            <ul className="selected-list" aria-label="Selected items">
              {selected.map((item, index) => (
                <SortableItem
                  key={item}
                  id={item}
                  index={index}
                  count={selected.length}
                  disabled={disabled}
                  showMoveButtons={showMoveButtons}
                  showNumber={showNumbers}
                  itemColor={orderColors[String(index + 1)] ?? baseColor}
                  onRemove={removeValue}
                  onMove={moveValue}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export const ConnectedSortableMultiselect = withStreamlitConnection(SortableMultiselect);
