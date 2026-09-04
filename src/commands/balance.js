import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getPlayer } from "../db.js";
import { nextResetAt } from "../day.js";
import { DICE_ROLLS_PER_DAY, multiplierAt } from "../game.js";
import { COLORS, money, relative } from "../format.js";

export const data = new SlashCommandBuilder()
  .setName("balance")
  .setDescription("Your money, today's run, and your rolls left.");

const RUN_STATUS = {
  idle: "Not started — `/roulette` to take it.",
  active: "In progress.",
  dead: "💀 Died. Nothing banked.",
  cashed: "💰 Cashed out.",
};

export async function execute(interaction) {
  const p = getPlayer(interaction.user.id);
  const embed = new EmbedBuilder()
    .setColor(COLORS.neutral)
    .setTitle(`${interaction.user.displayName}'s wallet`)
    .addFields(
      { name: "Permanent", value: money(p.permanent), inline: true },
      { name: "Pending", value: `${money(p.pending)}\n_lands ${relative(nextResetAt())}_`, inline: true },
      { name: "Rolls left", value: `${DICE_ROLLS_PER_DAY - p.dice_used}/${DICE_ROLLS_PER_DAY}`, inline: true },
      {
        name: "Today's run",
        value: p.run_state === "active"
          ? `In progress — ${money(p.pot)} on the table (×${multiplierAt(p.survivals)}), ${p.survivals} survived.`
          : RUN_STATUS[p.run_state],
      },
      { name: "Runs", value: `${p.runs}`, inline: true },
      { name: "Deaths", value: `${p.deaths}`, inline: true },
      { name: "Best streak", value: `${p.best_survivals} (×${multiplierAt(p.best_survivals)})`, inline: true },
    );
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
