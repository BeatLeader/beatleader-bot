import fs from "fs";
import path from "path";
import BaseCommand from "../base/base.command";
import Logger from "../../util/logger";
import { Collection } from "discord.js";
import { client } from "../..";

export default class CommandLoader {
  public static commands: Collection<string, BaseCommand> = new Collection();

  /**
   * The compiled location of the commands.s
   */
  public static readonly COMMAND_LOCATION = "dist/bot/commands";

  public static async loadCommands(): Promise<void> {
    const commandFiles = fs
      .readdirSync(path.resolve(CommandLoader.COMMAND_LOCATION))
      .filter((file) => file.endsWith(".command.js"));

    for (const file of commandFiles) {
      const command = await import(path.resolve(CommandLoader.COMMAND_LOCATION, file));
      if (command.default) {
        const commandInstance = new command.default();
        if (commandInstance instanceof BaseCommand) {
          Logger.log("CommandLoader", `Loaded command ${commandInstance.builder.name}`);
          CommandLoader.commands.set(commandInstance.builder.name, commandInstance);
        }
      }
    }

    Logger.log("CommandLoader", `Loaded ${CommandLoader.commands.size} commands`);

    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isCommand()) return;

      const command = CommandLoader.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        Logger.error("CommandLoader", error);
        if (!interaction.replied)
          await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          });
      }
    });
  }
}
