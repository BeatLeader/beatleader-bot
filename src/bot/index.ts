import { Client } from "discord.js";
import Logger from "../util/logger";

export default class Bot {
  public client: Client<true>;

  constructor(client: Client) {
    this.client = client;
  }

  public async init() {
    this.client.once("ready", (readyClient) => {
      this.client = readyClient;

      Logger.info("Bot", `Ready! Logged in as ${readyClient.user.username}!`);
    });

    // load stuff


    Logger.info("Core", "Everything's ready! Logging in...")

    this.client.login(process.env.TOKEN);
  }
}
