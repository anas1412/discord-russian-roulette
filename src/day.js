// The game day rolls over at midnight Tunisia time. Tunisia is UTC+1 all year
// and does not observe DST, so a fixed offset is correct -- no tz database
// needed and no ambiguous/skipped hour to handle.
export const TZ_LABEL = "UTC+1 (Tunisia)";
export const TZ_OFFSET_MS = 60 * 60 * 1000;

/** The current game day as "YYYY-MM-DD" in Tunisia time. */
export function dayKey(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** When the current game day ends, as a Date in real (UTC) time. */
export function nextResetAt(now = new Date()) {
  const local = new Date(now.getTime() + TZ_OFFSET_MS);
  local.setUTCHours(24, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_MS);
}
