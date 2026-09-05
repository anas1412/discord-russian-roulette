import { Client, Events, GatewayIntentBits, MessageFlags, Options } from "discord.js";
import { byName, roulette } from "./commands/index.js";
import { TZ_LABEL } from "./day.js";

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error("DISCORD_TOKEN is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

// Slash commands and buttons are all this bot uses, so Guilds is the only
// intent needed -- no privileged intents to enable in the developer portal.
//
// discord.js caches nearly everything it sees by default, and that cache grows
// with every server the bot joins. This bot only ever answers its own
// interactions, so all of it is dead weight. Zeroing these keeps idle memory
// flat instead of climbing with server count.
//
// GuildManager, ChannelManager, GuildChannelManager, PermissionOverwriteManager
// and RoleManager are deliberately left alone -- discord.js needs them to work.
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  makeCache: Options.cacheWithLimits({
    ApplicationCommandManager: 0,
    AutoModerationRuleManager: 0,
    BaseGuildEmojiManager: 0,
    DMMessageManager: 0,
    EntitlementManager: 0,
    GuildBanManager: 0,
    GuildEmojiManager: 0,
    GuildForumThreadManager: 0,
    GuildInviteManager: 0,
    GuildMessageManager: 0,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    GuildTextThreadManager: 0,
    MessageManager: 0,
    PollAnswerVoterManager: 0,
    PresenceManager: 0,
    ReactionManager: 0,
    ReactionUserManager: 0,
    StageInstanceManager: 0,
    SubscriptionManager: 0,
    ThreadManager: 0,
    ThreadMemberManager: 0,
    VoiceStateManager: 0,
    // Keep only the bot's own records; drop every other member and user.
    GuildMemberManager: {
      maxSize: 0,
      keepOverLimit: (member) => member.id === member.client.user.id,
    },
    UserManager: {
      maxSize: 0,
      keepOverLimit: (user) => user.id === user.client.user.id,
    },
  }),
});

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
