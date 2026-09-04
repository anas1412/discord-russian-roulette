import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("DISCORD_TOKEN and DISCORD_CLIENT_ID must both be set.");
  process.exit(1);
}

const body = commands.map((c) => c.data.toJSON());
const route = DISCORD_GUILD_ID
  ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID)
  : Routes.applicationCommands(DISCORD_CLIENT_ID);

await new REST().setToken(DISCORD_TOKEN).put(route, { body });
console.log(
  `Registered ${body.length} commands ${DISCORD_GUILD_ID ? `to guild ${DISCORD_GUILD_ID}` : "globally"}.`,
);
