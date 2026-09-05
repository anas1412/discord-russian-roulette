import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;
const guildId = process.env.DISCORD_GUILD_ID?.trim();

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID must both be set.");
  process.exit(1);
}

const body = commands.map((c) => c.data.toJSON());
const route = guildId
  ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guildId)
  : Routes.applicationCommands(DISCORD_CLIENT_ID);

// Report what Discord echoes back, not what we sent -- the response is the only
// evidence the commands actually exist server-side.
const registered = await new REST().setToken(DISCORD_TOKEN).put(route, { body });

console.log(`Discord confirmed ${registered.length} command(s):`);
for (const c of registered) console.log(`  /${c.name}  (id ${c.id})`);

if (guildId) {
  console.log(`\nRegistered to guild ${guildId}. They appear immediately.`);
} else {
  console.log(
    "\nRegistered GLOBALLY. These can take up to an hour to show up.\n" +
      "To test now, put a server id in DISCORD_GUILD_ID and run this again.",
  );
}
console.log(
  "\nIf they still do not appear, the bot was likely invited without the\n" +
    "applications.commands scope. Re-invite it with this link:\n" +
    `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}` +
    "&permissions=0&scope=bot+applications.commands",
);
