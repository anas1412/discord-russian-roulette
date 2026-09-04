import { expect, test } from "bun:test";
import {
  BASE_POT, CHAMBERS, MAX_SURVIVALS, DICE_SIDES,
  bulletsAt, potAt, multiplierAt, deathChanceAt, fire, resolveDice, randomInt,
} from "../src/game.js";

test("pot doubles each survival and tops out at x32", () => {
  expect([0, 1, 2, 3, 4, 5].map(potAt)).toEqual([100, 200, 400, 800, 1600, 3200]);
  expect(multiplierAt(MAX_SURVIVALS)).toBe(32);
  expect(potAt(0)).toBe(BASE_POT);
});

test("odds climb 1/6 -> 5/6, and the sixth pull is certain death", () => {
  expect([0, 1, 2, 3, 4].map((s) => bulletsAt(s) / CHAMBERS))
    .toEqual([1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]);
  expect(deathChanceAt(MAX_SURVIVALS)).toBe(1);
});

test("fire: a chamber at or below the bullet count is fatal", () => {
  // 1 bullet loaded: only chamber 1 kills.
  expect(fire(0, 1).died).toBe(true);
  expect(fire(0, 2).died).toBe(false);
  // 3 bullets loaded after 2 survivals.
  expect(fire(2, 3).died).toBe(true);
  expect(fire(2, 4).died).toBe(false);
});

test("fire: surviving advances the run, dying wipes the pot", () => {
  const lived = fire(1, 6);
  expect(lived).toMatchObject({ died: false, survivals: 2, pot: 400 });
  const died = fire(1, 1);
  expect(died).toMatchObject({ died: true, survivals: 1, pot: 0 });
});

test("fire: after 5 survivals every chamber is loaded", () => {
  for (let roll = 1; roll <= CHAMBERS; roll++) {
    expect(fire(MAX_SURVIVALS, roll).died).toBe(true);
  }
});

test("dice: beating the bot pays x2", () => {
  expect(resolveDice(50, 5, 3)).toMatchObject({ outcome: "win", payout: 100, delta: 50 });
});

test("dice: winning on a 6 is a x3 jackpot", () => {
  expect(resolveDice(50, 6, 5)).toMatchObject({ outcome: "jackpot", payout: 150, delta: 100 });
});

test("dice: a tie returns the stake, including 6 vs 6", () => {
  expect(resolveDice(50, 4, 4)).toMatchObject({ outcome: "tie", payout: 50, delta: 0 });
  expect(resolveDice(50, 6, 6)).toMatchObject({ outcome: "tie", payout: 50, delta: 0 });
});

test("dice: losing forfeits the stake", () => {
  expect(resolveDice(50, 2, 5)).toMatchObject({ outcome: "loss", payout: 0, delta: -50 });
});

test("randomInt stays in range and reaches every value", () => {
  const seen = new Set();
  for (let i = 0; i < 3000; i++) {
    const n = randomInt(DICE_SIDES);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(DICE_SIDES);
    seen.add(n);
  }
  expect(seen.size).toBe(DICE_SIDES);
});
