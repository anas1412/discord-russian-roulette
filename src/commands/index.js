import * as roulette from "./roulette.js";
import * as dice from "./dice.js";
import * as balance from "./balance.js";
import * as top from "./top.js";

export { roulette };
export const commands = [roulette, dice, balance, top];
export const byName = new Map(commands.map((c) => [c.data.name, c]));
