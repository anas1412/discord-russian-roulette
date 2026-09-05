import { Database } from "bun:sqlite";
import { dayKey } from "./day.js";

const SCHEMA = `
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
`;

/**
 * The connection opens on first query rather than at import time. Importing a
 * command module must not touch storage: `bun run deploy` only needs the slash
 * command definitions, and connecting there would create a stray database file
 * and race a running bot for the write lock.
 */
let conn = null;

function db() {
  if (conn) return conn;
  const handle = new Database(process.env.DATABASE_PATH || "./roulette.db", {
    create: true,
  });
  // Wait for a competing writer rather than failing instantly with SQLITE_BUSY.
  handle.exec("PRAGMA busy_timeout = 5000");
  handle.exec("PRAGMA journal_mode = WAL");
  handle.exec(SCHEMA);

  conn = {
    handle,
    insert: handle.query(
      "INSERT INTO players (user_id, day_key) VALUES (?, ?) RETURNING *",
    ),
    select: handle.query("SELECT * FROM players WHERE user_id = ?"),
    rollover: handle.query(`
      UPDATE players SET
        permanent = permanent + pending,
        pending   = 0,
        day_key   = ?,
        run_state = 'idle',
        pot       = 0,
        survivals = 0,
        dice_used = 0
      WHERE user_id = ? RETURNING *
    `),
    update: handle.query(`
      UPDATE players SET
        permanent = $permanent, pending = $pending, run_state = $run_state,
        pot = $pot, survivals = $survivals, dice_used = $dice_used,
        runs = $runs, deaths = $deaths, best_survivals = $best_survivals,
        total_cashed = $total_cashed
      WHERE user_id = $user_id RETURNING *
    `),
    top: handle.query(`
      SELECT user_id, permanent, pending, permanent + pending AS net,
             best_survivals, total_cashed
      FROM players ORDER BY net DESC, total_cashed DESC LIMIT ?
    `),
  };
  return conn;
}

/**
 * Fetch a player, creating them and applying any pending day rollover first.
 * Rollover is lazy: it happens the next time a stale player is touched, so
 * there is no scheduled job and inactive players cost nothing.
 */
export function getPlayer(userId, now = new Date()) {
  const { insert, select, rollover } = db();
  const today = dayKey(now);
  const row = select.get(userId);
  if (!row) return insert.get(userId, today);
  if (row.day_key !== today) return rollover.get(today, userId);
  return row;
}

export function savePlayer(player) {
  return db().update.get({
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

export const leaderboard = (limit = 10) => db().top.all(limit);

/** The underlying connection, for tests and one-off maintenance. */
export const database = () => db().handle;
