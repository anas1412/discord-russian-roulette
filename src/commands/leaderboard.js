import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { leaderboard } from "../db.js";
import { COLORS, money } from "../format.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("Who's actually walking away with the money.");

const MEDALS = ["🥇", "🥈", "🥉"];

export async function execute(interaction) {
  const rows = leaderboard(10);
  if (rows.length === 0) {
    return interaction.reply("Nobody has played yet. `/roulette` to open the books.");
  }
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle("🏆 Richest at the table")
    .setDescription(
      rows
        .map((r, i) => {
          const pending = r.pending > 0 ? ` _(${r.pending.toLocaleString("en-US")} pending)_` : "";
          return `${MEDALS[i] ?? `\`${i + 1}.\``} <@${r.user_id}> — ${money(r.net)}${pending}`;
        })
        .join("\n"),
    )
    .setFooter({ text: "Ranked by permanent + pending money." });
  return interaction.reply({ embeds: [embed] });
}
