import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { byName, roulette } from "./commands/index.js";
import { TZ_LABEL } from "./day.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

// Slash commands and buttons are all this bot uses, so Guilds is the only
// intent needed -- no privileged intents to enable in the developer portal.
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Ready as ${c.user.tag} — day resets at midnight ${TZ_LABEL}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = byName.get(interaction.commandName);
      if (command) await command.execute(interaction);
      return;
    }
    if (interaction.isButton()) {
      const [namespace, action, ownerId] = interaction.customId.split(":");
      if (namespace === "rr" && (action === "fire" || action === "cash")) {
        await roulette.handleButton(interaction, action, ownerId);
      }
    }
  } catch (error) {
    console.error(`Failed handling ${interaction.customId ?? interaction.commandName}:`, error);
    const message = { content: "Something jammed. Try again.", flags: MessageFlags.Ephemeral };
    // A handler can fail either before or after it answered Discord; pick the
    // reply method that is still valid so the user is not left hanging.
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message).catch(() => {});
    } else {
      await interaction.reply(message).catch(() => {});
    }
  }
});

client.login(token);
