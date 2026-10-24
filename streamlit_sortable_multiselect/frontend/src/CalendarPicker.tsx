import { useEffect, useId, useState } from "react";
import { CalendarMode, dateRangeDays, rangeEndMaximum, validCalendarValue } from "./calendar";

const DEFAULT_LABELS = {
  date_range: "Date (range)",
  month_single: "Month (single)",
  single: "Single",
  range: "Range",
  add: "Add",
  start: "Start",
  end: "End",
  date: "Date",
  month: "Month",
  calendar_input: "Calendar input",
  selection_kind: "Selection kind",
  invalid_value: "Choose a valid value within the allowed range, with start on or before end.",
  duplicate_value: "This item is already selected.",
  incomplete_selection: "Complete the selection before adding it.",
  range_too_long: "Choose a date range of at most {max_range_days} days (including both endpoints).",
};

export type CalendarLabels = Partial<Record<keyof typeof DEFAULT_LABELS, string>>;

type Props = {
  mode: CalendarMode;
  minimum?: string | null;
  maximum?: string | null;
  disabled: boolean;
  selected: string[];
  onAdd: (value: string) => void;
  labels?: CalendarLabels;
  maxRangeDays?: number | null;
};

export function CalendarPicker({ mode, minimum, maximum, disabled, selected, onAdd, labels, maxRangeDays }: Props) {
  const id = useId();
  const text = { ...DEFAULT_LABELS, ...labels };
  const [precision, setPrecision] = useState<"date" | "month">(mode === "month" ? "month" : "date");
  const [rangeSelection, setRange] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const actualPrecision = mode === "date_month" ? precision : mode;
  const range = mode === "date_month" ? actualPrecision === "date" : rangeSelection;
  const min = actualPrecision === "month" ? minimum?.slice(0, 7) : minimum;
  const max = actualPrecision === "month" ? maximum?.slice(0, 7) : maximum;
  const value = range ? `${start}/${end}` : start;
  const complete = Boolean(start && (!range || end));
  const validBounds = complete && validCalendarValue(value, actualPrecision, minimum, maximum);
  const tooLong = validBounds && range && actualPrecision === "date" && maxRangeDays != null &&
    dateRangeDays(value) > maxRangeDays;
  const valid = validBounds && !tooLong;
  const endMax = range && actualPrecision === "date"
    ? rangeEndMaximum(start, maxRangeDays, max) : max ?? undefined;
  const duplicate = selected.includes(value);
  const error = tooLong
    ? text.range_too_long.split("{max_range_days}").join(String(maxRangeDays))
    : complete && !valid
    ? text.invalid_value
    : complete && duplicate
      ? text.duplicate_value
      : submitted && !complete ? text.incomplete_selection : "";
  const startLabel = range ? text.start : actualPrecision === "date" ? text.date : text.month;

  useEffect(() => {
    setStart("");
    setEnd("");
    setSubmitted(false);
  }, [mode, actualPrecision]);

  function add() {
    if (disabled) return;
    setSubmitted(true);
    if (!valid || duplicate) return;
    onAdd(value);
    setStart("");
    setEnd("");
    setSubmitted(false);
  }

  return (
    <div className="calendar-picker" onKeyDown={(event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        add();
      }
    }}>
      <div className="calendar-modes">
        {mode === "date_month" ? (
          <fieldset className="calendar-segments" disabled={disabled}>
            <legend className="sr-only">{text.calendar_input}</legend>
            {(["date", "month"] as const).map((item) => (
              <label key={item}>
                <input type="radio" name={`${id}-precision`} value={item}
                  checked={precision === item} onChange={() => setPrecision(item)} />
                <span>{item === "date" ? text.date_range : text.month_single}</span>
              </label>
            ))}
          </fieldset>
        ) : null}
        {mode !== "date_month" ? <fieldset className="calendar-segments" disabled={disabled}>
          <legend className="sr-only">{text.selection_kind}</legend>
          <label>
            <input type="radio" name={`${id}-kind`} checked={!range}
              onChange={() => { setRange(false); setSubmitted(false); }} />
            <span>{text.single}</span>
          </label>
          <label>
            <input type="radio" name={`${id}-kind`} checked={range}
              onChange={() => { setRange(true); setSubmitted(false); }} />
            <span>{text.range}</span>
          </label>
        </fieldset> : null}
      </div>
      <div className="calendar-fields">
        <label className="calendar-field">
          <span>{startLabel}</span>
          <input type={actualPrecision} value={start} min={min ?? undefined}
            max={max ?? undefined} disabled={disabled}
            aria-label={startLabel}
            aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => { setStart(event.target.value); setSubmitted(false); }} />
        </label>
        {range ? (
          <label className="calendar-field">
            <span>{text.end}</span>
            <input type={actualPrecision} value={end} min={start || min || undefined}
              max={endMax} disabled={disabled} aria-label={text.end}
              aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => { setEnd(event.target.value); setSubmitted(false); }} />
          </label>
        ) : null}
        <button type="button" className="calendar-add" onClick={add}
          disabled={disabled || Boolean(complete && (!valid || duplicate))}>{text.add}</button>
      </div>
      {error ? <div id={`${id}-error`} className="calendar-error" role="alert">{error}</div> : null}
    </div>
  );
}
