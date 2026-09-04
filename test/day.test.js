import { expect, test } from "bun:test";
import { dayKey, nextResetAt } from "../src/day.js";

test("the game day rolls over at 23:00 UTC (midnight in Tunisia)", () => {
  expect(dayKey(new Date("2026-09-04T22:59:59Z"))).toBe("2026-09-04");
  expect(dayKey(new Date("2026-09-04T23:00:00Z"))).toBe("2026-09-05");
  expect(dayKey(new Date("2026-09-05T00:30:00Z"))).toBe("2026-09-05");
});

test("no DST shift: the boundary is the same in January and July", () => {
  expect(dayKey(new Date("2026-01-10T23:00:00Z"))).toBe("2026-01-11");
  expect(dayKey(new Date("2026-07-10T23:00:00Z"))).toBe("2026-07-11");
});

test("nextResetAt points at the upcoming 23:00 UTC", () => {
  expect(nextResetAt(new Date("2026-09-04T10:00:00Z")).toISOString())
    .toBe("2026-09-04T23:00:00.000Z");
  // Just after a reset, the next one is a full day out.
  expect(nextResetAt(new Date("2026-09-04T23:00:01Z")).toISOString())
    .toBe("2026-09-05T23:00:00.000Z");
});
