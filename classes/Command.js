const { CommandInteraction, Client } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

/**
 * The basis for a command.
 */
class Command {
    /**
     * The basis for a command.
     * @param {SlashCommandBuilder} data The command data.
     * @param {boolean} testing If `true`, the command will only be registered on the GUILD_ID in `.env`
     */
    constructor(commandData, testing) {
        this.data = commandData;
        this.testing = testing;
    }

    /**
     * Executes the command.
     * @param {Client} client The bot client.
     * @param {CommandInteraction} interaction The command interaction.
     */
    async execute(client, interaction) {}
}

module.exports = Command;
