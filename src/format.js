export const money = (n) => `**${n.toLocaleString("en-US")}** 🪙`;

/** Discord renders this as a live-updating relative timestamp. */
export const relative = (date) => `<t:${Math.floor(date.getTime() / 1000)}:R>`;

export const COLORS = {
  live: 0xe8b923,
  win: 0x2ecc71,
  death: 0xe74c3c,
  neutral: 0x5865f2,
};
