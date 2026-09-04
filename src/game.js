// Pure game rules. No I/O, no Discord, no database -- everything here is a
// function of its arguments so it can be tested directly.

export const BASE_POT = 100;
export const CHAMBERS = 6;
/** Survival 6 would be a 6/6 chamber, so 5 is the ceiling. 100 * 2^5 = 3200 (x32). */
export const MAX_SURVIVALS = CHAMBERS - 1;
export const DICE_ROLLS_PER_DAY = 5;
export const DICE_SIDES = 6;

/**
 * Uniform integer in [0, max). Uses rejection sampling instead of `% max` so
 * every outcome is equally likely -- plain modulo of a random byte would make
 * low faces very slightly more common, which matters for a gambling bot.
 */
export function randomInt(max) {
  const limit = Math.floor(256 / max) * max;
  const byte = new Uint8Array(1);
  let value;
  do {
    crypto.getRandomValues(byte);
    value = byte[0];
  } while (value >= limit);
  return value % max;
}

export const rollDie = () => randomInt(DICE_SIDES) + 1;

// --- Roulette ---------------------------------------------------------------

/** Bullets loaded after `survivals` successful pulls. Starts at 1. */
export const bulletsAt = (survivals) => survivals + 1;

/** Pot after `survivals` successful pulls. Doubles each time. */
export const potAt = (survivals) => BASE_POT * 2 ** survivals;

/** Multiplier the pot represents, e.g. 5 survivals -> 32. */
export const multiplierAt = (survivals) => 2 ** survivals;

/** Death probability of the next pull, as a fraction of the 6 chambers. */
export const deathChanceAt = (survivals) => bulletsAt(survivals) / CHAMBERS;

/**
 * Pull the trigger. `roll` is the chamber that comes up (1..6); the loaded
 * bullets occupy chambers 1..bullets, so a roll within that range is fatal.
 */
export function fire(survivals, roll = rollDie()) {
  const bullets = bulletsAt(survivals);
  const died = roll <= bullets;
  return {
    roll,
    bullets,
    died,
    survivals: died ? survivals : survivals + 1,
    pot: died ? 0 : potAt(survivals + 1),
  };
}

// --- Dice: High Roll --------------------------------------------------------

/**
 * Resolve one High Roll. `payout` is what comes back to the player from the
 * bet they staked; `delta` is the net change to their balance.
 * Win normally -> x2 back. Win while showing a 6 -> x3. Tie -> stake returned.
 */
export function resolveDice(bet, playerRoll = rollDie(), botRoll = rollDie()) {
  let outcome, payout;
  if (playerRoll > botRoll) {
    const jackpot = playerRoll === DICE_SIDES;
    outcome = jackpot ? "jackpot" : "win";
    payout = jackpot ? bet * 3 : bet * 2;
  } else if (playerRoll === botRoll) {
    outcome = "tie";
    payout = bet;
  } else {
    outcome = "loss";
    payout = 0;
  }
  return { playerRoll, botRoll, outcome, payout, delta: payout - bet };
}
