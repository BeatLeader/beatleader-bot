import { config as initEnvVars } from "dotenv";
import Logger from "./util/logger";
import AssetCache from "./image/loader/assetCache";
import Database from "./database";
import { Client, IntentsBitField } from "discord.js";
import Bot from "./bot";
initEnvVars();

Logger.init();
AssetCache.init();

const db = new Database();
const client = new Client({ intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages] });
const bot = new Bot(client)

// start everything
bot.init();

export {
    db,
    client,
    bot
}
