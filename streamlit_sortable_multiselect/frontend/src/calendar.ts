export type CalendarMode = "date" | "month" | "date_month";

const DAY_MS = 86_400_000;

export function dateRangeDays(value: string): number {
  const [start, end] = value.split("/");
  return (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS + 1;
}

export function rangeEndMaximum(
  start: string,
  maxRangeDays?: number | null,
  maximum?: string | null,
): string | undefined {
  if (!maxRangeDays || start.length !== 10 || !validPart(start)) return maximum ?? undefined;
  const endTime = Math.min(
    Date.parse(`${start}T00:00:00Z`) + (maxRangeDays - 1) * DAY_MS,
    Date.parse("9999-12-31T00:00:00Z"),
  );
  const rangeMax = new Date(endTime).toISOString().slice(0, 10);
  return maximum && maximum < rangeMax ? maximum : rangeMax;
}

function validPart(value: string): boolean {
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return false;
  const [year, month, day = 1] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12) return false;
  const parsed = new Date(0);
  parsed.setUTCFullYear(year, month - 1, day);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day;
}

export function validCalendarValue(
  value: string,
  mode: CalendarMode,
  minimum?: string | null,
  maximum?: string | null,
  maxRangeDays?: number | null,
): boolean {
  const parts = value.split("/");
  if (parts.length > 2 || !parts.every(validPart)) return false;
  const length = parts[0].length;
  if (parts.some((part) => part.length !== length)) return false;
  if (mode === "date" && length !== 10 || mode === "month" && length !== 7) return false;
  const lower = length === 7 ? minimum?.slice(0, 7) : minimum;
  const upper = length === 7 ? maximum?.slice(0, 7) : maximum;
  if (parts.length === 2 && length === 10 && maxRangeDays != null &&
      dateRangeDays(value) > maxRangeDays) return false;
  return parts.every((part) => (!lower || part >= lower) && (!upper || part <= upper)) &&
    (parts.length === 1 || parts[0] <= parts[1]);
}

export function calendarLabel(value: string): string {
  return value.replace("/", " – ");
}
