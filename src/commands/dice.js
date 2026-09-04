import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getPlayer, savePlayer } from "../db.js";
import { nextResetAt } from "../day.js";
import { DICE_ROLLS_PER_DAY, resolveDice } from "../game.js";
import { COLORS, money, relative } from "../format.js";

const FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export const data = new SlashCommandBuilder()
  .setName("dice")
  .setDescription(`High Roll — stake permanent money, ${DICE_ROLLS_PER_DAY} rolls a day.`)
  .addIntegerOption((o) =>
    o.setName("bet").setDescription("How much to stake").setMinValue(1).setRequired(true),
  );

export async function execute(interaction) {
  const bet = interaction.options.getInteger("bet");
  const player = getPlayer(interaction.user.id);

  if (player.dice_used >= DICE_ROLLS_PER_DAY) {
    return interaction.reply({
      content: `You've used all ${DICE_ROLLS_PER_DAY} rolls today. More ${relative(nextResetAt())}.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  if (bet > player.permanent) {
    const pendingNote = player.pending > 0
      ? ` You have ${money(player.pending)} pending, but it isn't spendable until the reset.`
      : "";
    return interaction.reply({
      content: `You only have ${money(player.permanent)} to stake.${pendingNote}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const result = resolveDice(bet);
  player.permanent += result.delta;
  player.dice_used += 1;
  savePlayer(player);

  const rollsLeft = DICE_ROLLS_PER_DAY - player.dice_used;
  const view = {
    jackpot: { color: COLORS.win, title: "🎲 JACKPOT — a winning six!", line: `×3. You take ${money(result.payout)}.` },
    win:     { color: COLORS.win, title: "🎲 You win", line: `×2. You take ${money(result.payout)}.` },
    tie:     { color: COLORS.neutral, title: "🎲 Push", line: `Dead heat — your ${money(bet)} comes back.` },
    loss:    { color: COLORS.death, title: "🎲 You lose", line: `The house takes your ${money(bet)}.` },
  }[result.outcome];

  const embed = new EmbedBuilder()
    .setColor(view.color)
    .setTitle(view.title)
    .setDescription(
      `You ${FACES[result.playerRoll]} **${result.playerRoll}**  vs  bot ${FACES[result.botRoll]} **${result.botRoll}**\n${view.line}`,
    )
    .addFields(
      { name: "Net", value: `${result.delta >= 0 ? "+" : "−"}${Math.abs(result.delta).toLocaleString("en-US")} 🪙`, inline: true },
      { name: "Balance", value: money(player.permanent), inline: true },
      { name: "Rolls left today", value: `${rollsLeft}/${DICE_ROLLS_PER_DAY}`, inline: true },
    );
  return interaction.reply({ embeds: [embed] });
}
