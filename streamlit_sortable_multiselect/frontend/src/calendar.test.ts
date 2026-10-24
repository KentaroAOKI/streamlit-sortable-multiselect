import { describe, expect, it } from "vitest";
import { dateRangeDays, rangeEndMaximum, validCalendarValue } from "./calendar";

describe("calendar values", () => {
  it.each([
    "2027-02-29", "2028-02-30", "2028-13", "0000-01", "2028-2", "2028-01-00",
    "2028-01/2028-02-01", "2028-02/2028-01", "2028-02/", "2028-01/2028-02/2028-03",
  ])("rejects invalid calendar value %s", (value) => {
    expect(validCalendarValue(value, "date_month")).toBe(false);
  });

  it.each(["2028-02-29", "0099-01-01", "2028-02", "2028-01/2028-01", "2028-01-01/2028-12-31"])(
    "accepts valid calendar value %s without timezone conversion", (value) => {
      expect(validCalendarValue(value, "date_month")).toBe(true);
    },
  );

  it("requires the configured precision and inclusive bounds", () => {
    expect(validCalendarValue("2028-02", "date")).toBe(false);
    expect(validCalendarValue("2028-02-01", "month")).toBe(false);
    expect(validCalendarValue("2028-02-01/2028-02-29", "date", "2028-02-01", "2028-02-29")).toBe(true);
    expect(validCalendarValue("2028-02/2028-03", "month", "2028-02-15", "2028-03-01")).toBe(true);
    expect(validCalendarValue("2028-01/2028-03", "month", "2028-02-15", "2028-03-01")).toBe(false);
  });

  it.each([
    ["2028-02-28/2028-03-01", 3],
    ["2028-12-31/2029-01-01", 2],
    ["2028-03-11/2028-03-13", 3],
    ["2028-02-29/2028-02-29", 1],
    ["0099-12-31/0100-01-01", 2],
  ])("counts inclusive days in %s", (value, days) => {
    expect(dateRangeDays(value)).toBe(days);
    expect(validCalendarValue(value, "date", null, null, days)).toBe(true);
    expect(validCalendarValue(value, "date", null, null, days - 1)).toBe(false);
  });

  it("leaves month ranges and single values unaffected by the day limit", () => {
    expect(validCalendarValue("2028-01/2028-12", "month", null, null, 1)).toBe(true);
    expect(validCalendarValue("2028-02", "date_month", null, null, 1)).toBe(true);
    expect(validCalendarValue("2028-02-29", "date", null, null, 1)).toBe(true);
  });

  it("caps the end picker at both the range limit and global maximum", () => {
    expect(rangeEndMaximum("2028-02-28", 3)).toBe("2028-03-01");
    expect(rangeEndMaximum("2028-02-28", 3, "2028-02-29")).toBe("2028-02-29");
    expect(rangeEndMaximum("2028-02-28", 1)).toBe("2028-02-28");
    expect(rangeEndMaximum("9999-12-31", 100)).toBe("9999-12-31");
    expect(rangeEndMaximum("", 3, "2028-12-31")).toBe("2028-12-31");
    expect(rangeEndMaximum("2028-02-28")).toBeUndefined();
  });
});
