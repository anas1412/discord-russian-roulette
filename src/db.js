import { Database } from "bun:sqlite";
import { dayKey } from "./day.js";

const db = new Database(process.env.DATABASE_PATH || "./roulette.db", {
  create: true,
});
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    user_id        TEXT PRIMARY KEY,
    permanent      INTEGER NOT NULL DEFAULT 0,
    pending        INTEGER NOT NULL DEFAULT 0,
    day_key        TEXT    NOT NULL,
    run_state      TEXT    NOT NULL DEFAULT 'idle',
    pot            INTEGER NOT NULL DEFAULT 0,
    survivals      INTEGER NOT NULL DEFAULT 0,
    dice_used      INTEGER NOT NULL DEFAULT 0,
    runs           INTEGER NOT NULL DEFAULT 0,
    deaths         INTEGER NOT NULL DEFAULT 0,
    best_survivals INTEGER NOT NULL DEFAULT 0,
    total_cashed   INTEGER NOT NULL DEFAULT 0
  )
`);

const insert = db.query(
  "INSERT INTO players (user_id, day_key) VALUES (?, ?) RETURNING *",
);
const select = db.query("SELECT * FROM players WHERE user_id = ?");
const rollover = db.query(`
  UPDATE players SET
    permanent = permanent + pending,
    pending   = 0,
    day_key   = ?,
    run_state = 'idle',
    pot       = 0,
    survivals = 0,
    dice_used = 0
  WHERE user_id = ? RETURNING *
`);

/**
 * Fetch a player, creating them and applying any pending day rollover first.
 * Rollover is lazy: it happens the next time a stale player is touched, so
 * there is no scheduled job and inactive players cost nothing.
 */
export function getPlayer(userId, now = new Date()) {
  const today = dayKey(now);
  const row = select.get(userId);
  if (!row) return insert.get(userId, today);
  if (row.day_key !== today) return rollover.get(today, userId);
  return row;
}

const updatePlayer = db.query(`
  UPDATE players SET
    permanent = $permanent, pending = $pending, run_state = $run_state,
    pot = $pot, survivals = $survivals, dice_used = $dice_used,
    runs = $runs, deaths = $deaths, best_survivals = $best_survivals,
    total_cashed = $total_cashed
  WHERE user_id = $user_id RETURNING *
`);

export function savePlayer(player) {
  return updatePlayer.get({
    $user_id: player.user_id,
    $permanent: player.permanent,
    $pending: player.pending,
    $run_state: player.run_state,
    $pot: player.pot,
    $survivals: player.survivals,
    $dice_used: player.dice_used,
    $runs: player.runs,
    $deaths: player.deaths,
    $best_survivals: player.best_survivals,
    $total_cashed: player.total_cashed,
  });
}

const top = db.query(`
  SELECT user_id, permanent, pending, permanent + pending AS net,
         best_survivals, total_cashed
  FROM players ORDER BY net DESC, total_cashed DESC LIMIT ?
`);

export const leaderboard = (limit = 10) => top.all(limit);

export default db;
