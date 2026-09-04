import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder,
  MessageFlags, SlashCommandBuilder,
} from "discord.js";
import { getPlayer, savePlayer } from "../db.js";
import { nextResetAt } from "../day.js";
import {
  BASE_POT, CHAMBERS, MAX_SURVIVALS,
  bulletsAt, deathChanceAt, fire, multiplierAt,
} from "../game.js";
import { COLORS, money, relative } from "../format.js";

export const data = new SlashCommandBuilder()
  .setName("roulette")
  .setDescription("Take your one daily run at the revolver.");

const chamberBar = (bullets) =>
  "🔴".repeat(bullets) + "⚪".repeat(CHAMBERS - bullets);

function liveEmbed(player) {
  const { survivals, pot } = player;
  const bullets = bulletsAt(survivals);
  const chance = Math.round(deathChanceAt(survivals) * 100);
  const embed = new EmbedBuilder()
    .setColor(COLORS.live)
    .setTitle("🔫 Russian Roulette")
    .setDescription(
      survivals === 0
        ? "The revolver is loaded and on the table. Your call."
        : `Survived **${survivals}** pull${survivals === 1 ? "" : "s"}. Another bullet just went in.`,
    )
    .addFields(
      { name: "Pot", value: `${money(pot)} (×${multiplierAt(survivals)})`, inline: true },
      { name: "If you survive", value: `${money(pot * 2)} (×${multiplierAt(survivals + 1)})`, inline: true },
      { name: "​", value: "​", inline: true },
      { name: "Chambers", value: `${chamberBar(bullets)}\n${bullets}/${CHAMBERS} loaded`, inline: true },
      { name: "Odds of dying", value: `**${chance}%**`, inline: true },
    );
  if (survivals >= MAX_SURVIVALS) {
    embed.addFields({
      name: "⚠️ Every chamber is loaded",
      value: "Firing now is certain death. Cash out.",
    });
  }
  return embed;
}

function liveButtons(userId, survivals) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`rr:fire:${userId}`)
      .setLabel(survivals >= MAX_SURVIVALS ? "Fire (certain death)" : "Fire")
      .setEmoji("🔫")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`rr:cash:${userId}`)
      .setLabel("Cash out")
      .setEmoji("💰")
      .setStyle(ButtonStyle.Success),
  );
}

/** The run is over -- show the result with the buttons spent. */
function finishedView(embed) {
  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rr:done")
          .setLabel("Run over — back tomorrow")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    ],
  };
}

function alreadyDoneEmbed(player) {
  const dead = player.run_state === "dead";
  return new EmbedBuilder()
    .setColor(dead ? COLORS.death : COLORS.win)
    .setTitle(dead ? "💀 You already died today" : "💰 You already cashed out today")
    .setDescription(
      dead
        ? "The revolver is done with you."
        : `You locked in ${money(player.pending)}. It becomes spendable at the reset.`,
    )
    .addFields({ name: "Next run", value: relative(nextResetAt()), inline: true });
}

export async function execute(interaction) {
  const player = getPlayer(interaction.user.id);

  if (player.run_state === "dead" || player.run_state === "cashed") {
    return interaction.reply({
      embeds: [alreadyDoneEmbed(player)],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (player.run_state === "idle") {
    player.run_state = "active";
    player.pot = BASE_POT;
    player.survivals = 0;
    player.runs += 1;
    savePlayer(player);
  }

  return interaction.reply({
    embeds: [liveEmbed(player)],
    components: [liveButtons(interaction.user.id, player.survivals)],
  });
}

// Serialise per-user button presses so double-clicks cannot fire twice off the
// same state. Discord delivers interactions concurrently, and the read-modify-
// write below is not atomic on its own.
const busy = new Set();

export async function handleButton(interaction, action, ownerId) {
  if (interaction.user.id !== ownerId) {
    return interaction.reply({
      content: "That's not your revolver. Run `/roulette` for your own.",
      flags: MessageFlags.Ephemeral,
    });
  }
  if (busy.has(ownerId)) {
    return interaction.reply({
      content: "Slow down — still resolving your last pull.",
      flags: MessageFlags.Ephemeral,
    });
  }
  busy.add(ownerId);
  try {
    const player = getPlayer(ownerId);
    if (player.run_state !== "active") {
      return interaction.update(finishedView(alreadyDoneEmbed(player)));
    }

    if (action === "cash") {
      player.pending += player.pot;
      player.total_cashed += player.pot;
      player.run_state = "cashed";
      const cashed = player.pot;
      const survivals = player.survivals;
      savePlayer(player);

      const embed = new EmbedBuilder()
        .setColor(COLORS.win)
        .setTitle("💰 Cashed out")
        .setDescription(
          `Walked away after **${survivals}** survival${survivals === 1 ? "" : "s"} with ${money(cashed)} (×${multiplierAt(survivals)}).`,
        )
        .addFields(
          { name: "Locked in", value: money(cashed), inline: true },
          { name: "Spendable", value: relative(nextResetAt()), inline: true },
        )
        .setFooter({ text: "Pending money turns permanent at the daily reset." });
      return interaction.update(finishedView(embed));
    }

    const result = fire(player.survivals);

    if (result.died) {
      const lost = player.pot;
      player.pot = 0;
      player.run_state = "dead";
      player.deaths += 1;
      savePlayer(player);

      const embed = new EmbedBuilder()
        .setColor(COLORS.death)
        .setTitle("💥 BANG")
        .setDescription(
          `Chamber **${result.roll}** of ${CHAMBERS} — loaded. You lose ${money(lost)}.`,
        )
        .addFields(
          { name: "Survived", value: `${result.survivals}`, inline: true },
          { name: "Odds you took", value: `${result.bullets}/${CHAMBERS}`, inline: true },
          { name: "Next run", value: relative(nextResetAt()), inline: true },
        );
      return interaction.update(finishedView(embed));
    }

    player.survivals = result.survivals;
    player.pot = result.pot;
    player.best_survivals = Math.max(player.best_survivals, result.survivals);
    savePlayer(player);

    const embed = liveEmbed(player)
      .setColor(COLORS.live)
      .setTitle("*click* — you're alive")
      .setDescription(
        `Chamber **${result.roll}** of ${CHAMBERS} — empty. Pot doubled to ${money(player.pot)}.`,
      );
    return interaction.update({
      embeds: [embed],
      components: [liveButtons(ownerId, player.survivals)],
    });
  } finally {
    busy.delete(ownerId);
  }
}
