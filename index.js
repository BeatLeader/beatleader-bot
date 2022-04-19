const { Client, Intents, Collection } = require("discord.js");
const { token } = require("./config.json");

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Put each command in the commands folder into it's own collection to easily keep track of them
client.commands = new Collection();

const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const commandClass = require(`./commands/${file}`);
    const command = new commandClass();

    client.commands.set(command.data.name, commandClass);
}

let linkedAccounts = [
    {
        discordID: "123456789",
        blUserID: "123456789",
    },
];

client.once("ready", () => {
    console.log("Ready!");
    let rawAccountData = fs.readFileSync("linkedAccounts.json");
    linkedAccounts = JSON.parse(rawAccountData);
});

// when an interaction is created
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const commandClass = client.commands.get(interaction.commandName);

    if (!commandClass) return;

    const command = new commandClass();

    try {
        await command.execute(client, interaction);
    } catch (error) {
        console.error(
            `Caught ${error.name} during command ${interaction.commandName}`
        );
        console.error(error);
        await interaction.reply({
            content: `A ${error.name} was encountered during this command.`,
            ephemeral: true,
        });
    }
});

client.login(token);
