import { useEffect, useMemo, useState } from "react";
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
};

type SortableItemProps = {
  id: string;
  index: number;
  count: number;
  disabled: boolean;
  onRemove: (value: string) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
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

function SortableItem({
  id,
  index,
  count,
  disabled,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      className={`sortable-item${isDragging ? " dragging" : ""}`}
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
      <span className="item-label">{id}</span>
      <div className="item-actions">
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
  const defaultSelection = useMemo(
    () => normalizeSelection(componentArgs.default_selected, options),
    [componentArgs.default_selected, options],
  );
  const [selected, setSelected] = useState<string[]>(defaultSelection);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setSelected((current) => {
      const normalizedCurrent = normalizeSelection(current, options);
      if (normalizedCurrent.length > 0 || defaultSelection.length === 0) {
        return normalizedCurrent;
      }
      return defaultSelection;
    });
  }, [defaultSelection, options]);

  useEffect(() => {
    Streamlit.setComponentValue(selected);
    Streamlit.setFrameHeight();
  }, [selected]);

  useEffect(() => {
    Streamlit.setFrameHeight();
  });

  const availableOptions = options.filter((option) => !selected.includes(option));

  function addValue(value: string) {
    if (!value || disabled || selected.includes(value)) {
      return;
    }
    setSelected((current) => [...current, value]);
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

  return (
    <div className="sortable-multiselect" aria-disabled={disabled}>
      {label ? <label className="component-label">{label}</label> : null}
      <select
        className="add-select"
        aria-label={label ? `Add item to ${label}` : "Add item"}
        disabled={disabled || availableOptions.length === 0}
        value=""
        onChange={(event) => addValue(event.target.value)}
      >
        <option value="" disabled>
          {availableOptions.length === 0 ? "No more options" : placeholder}
        </option>
        {availableOptions.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>

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
