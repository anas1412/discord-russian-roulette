import * as roulette from "./roulette.js";
import * as dice from "./dice.js";
import * as balance from "./balance.js";
import * as leaderboard from "./leaderboard.js";

export { roulette };
export const commands = [roulette, dice, balance, leaderboard];
export const byName = new Map(commands.map((c) => [c.data.name, c]));
