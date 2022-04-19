const { SlashCommandBuilder } = require("@discordjs/builders");
const { Client, CommandInteraction } = require("discord.js");
const Command = require("../classes/Command");
const fs = require("fs");

class UnlinkCommand extends Command {
    /**
     * The basis for a command.
     * @param {SlashCommandBuilder} data The command data.
     * @param {boolean} testing If `true`, the command will only be registered on the GUILD_ID in `.env`
     */
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("unlink")
                .setDescription(
                    "Unink your discord account with a BeatLeader account!"
                ),
            true
        );
    }

    /**
     * A helper function to write `jsonData` to a file.
     * @param {object} jsonData The data to be written.
     */
    WriteToFile(jsonData) {
        let data = JSON.stringify(jsonData);
        fs.unlink("linkedAccounts.json", (err) => {
            if (err) {
                console.error(err);
                return;
            }

            fs.writeFileSync("linkedAccounts.json", data);
        });
    }

    /**
     * Executes the command.
     * @param {Client} client The bot client.
     * @param {CommandInteraction} interaction The command interaction.
     */
    async execute(client, interaction) {
        let rawAccountData = fs.readFileSync("linkedAccounts.json");
        let linkedAccounts = JSON.parse(rawAccountData);

        let user = interaction.user;
        for (var i = 0; i < linkedAccounts.length; i++) {
            if (linkedAccounts[i].discordID == user.id) {
                linkedAccounts.splice(i, 1);
                this.WriteToFile(linkedAccounts);
                await interaction.reply({
                    content: `Your account has been unlinked!`,
                    ephemeral: true,
                });
                return;
            }
        }
        await interaction.reply({
            content: `You don't have an account linked!`,
            ephemeral: true,
        });
    }
}

module.exports = UnlinkCommand;
