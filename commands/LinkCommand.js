const { SlashCommandBuilder } = require("@discordjs/builders");
const { Client, CommandInteraction } = require("discord.js");
const Command = require("../classes/Command");
const fs = require("fs");
const fetch = require("node-fetch");

class LinkCommand extends Command {
    /**
     * The basis for a command.
     * @param {SlashCommandBuilder} data The command data.
     * @param {boolean} testing If `true`, the command will only be registered on the GUILD_ID in `.env`
     */
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("link")
                .setDescription(
                    "Link your discord account with a BeatLeader account!"
                )
                .addStringOption((option) =>
                    option
                        .setName("userid")
                        .setDescription(
                            "The User ID of your BeatLeader account."
                        )
                        .setRequired(true)
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
                await interaction.reply({
                    content: `Your account is already linked!`,
                    ephemeral: true,
                });
                return;
            }
        }
        if (isNaN(interaction.options.getString("userid"))) {
            await interaction.reply({
                content: `That is not a valid ID. You can find it ingame or in your profile's url.`,
                ephemeral: true,
            });
            return;
        }
        try {
            let url =
                "https://beatleader.azurewebsites.net/player/" +
                interaction.options.getString("userid");
            await fetch(url, { method: "GET" })
                .then((res) => res.json())
                .then(async (json) => {
                    await interaction.reply({
                        content: `${user.tag} has been linked with BeatLeader account ${json.name}!`,
                        ephemeral: true,
                    });
                    linkedAccounts.push({
                        discordID: user.id,
                        blUserID: interaction.options.getString("userid"),
                    });
                    this.WriteToFile(linkedAccounts);
                });
        } catch (e) {
            console.log(e);
            await interaction.reply({
                content: "A player with that `userID` doesn't exist!",
            });
        }
    }
}

module.exports = LinkCommand;
