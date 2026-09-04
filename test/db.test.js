import { expect, test } from "bun:test";

process.env.DATABASE_PATH = ":memory:";
const { getPlayer, savePlayer, leaderboard } = await import("../src/db.js");

const MON = new Date("2026-09-04T10:00:00Z");
const TUE = new Date("2026-09-04T23:00:01Z"); // one second into the next game day

test("a new player starts empty on today's key", () => {
  const p = getPlayer("new-user", MON);
  expect(p).toMatchObject({ permanent: 0, pending: 0, run_state: "idle", day_key: "2026-09-04" });
});

test("cashed-out money sits in pending until the day rolls over", () => {
  savePlayer({ ...getPlayer("casher", MON), pending: 3200, run_state: "cashed", dice_used: 5 });

  // Same day: still pending, still spent out.
  expect(getPlayer("casher", MON)).toMatchObject({ permanent: 0, pending: 3200, dice_used: 5 });

  // Next day: pending becomes permanent, run and dice limit reset.
  expect(getPlayer("casher", TUE)).toMatchObject({
    permanent: 3200, pending: 0, run_state: "idle", pot: 0, survivals: 0, dice_used: 0,
  });
});

test("rollover keeps lifetime stats", () => {
  savePlayer({ ...getPlayer("veteran", MON), runs: 7, deaths: 4, best_survivals: 5 });
  expect(getPlayer("veteran", TUE)).toMatchObject({ runs: 7, deaths: 4, best_survivals: 5 });
});

test("leaderboard ranks by permanent + pending", () => {
  savePlayer({ ...getPlayer("rich", MON), permanent: 100, pending: 900 });
  savePlayer({ ...getPlayer("poor", MON), permanent: 500, pending: 0 });
  const ids = leaderboard(100).map((r) => r.user_id);
  // "rich" has less permanent money but more overall, so it must rank higher.
  expect(ids.indexOf("rich")).toBeLessThan(ids.indexOf("poor"));
});
