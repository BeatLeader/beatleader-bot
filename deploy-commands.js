const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { clientId, testGuildId, token } = require("./config.json");
const fs = require("fs");

const rest = new REST({ version: "9" }).setToken(token);

// Read command data and push the data to these arrays depending on the testing value
const publicCommands = [];
const privateCommands = [];
const commandFiles = fs
    .readdirSync("./commands")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const commandClass = require(`./commands/${file}`);
    const command = new commandClass();

    if (command.testing) {
        privateCommands.push(command.data.toJSON());
    } else {
        publicCommands.push(command.data.toJSON());
    }
}

(async () => {
    await rest
        .put(Routes.applicationCommands(clientId), {
            body: publicCommands,
        })
        .then(() =>
            console.log(
                `Successfully registered ${publicCommands.length} public application commands.`
            )
        )
        .catch(console.error);

    await rest
        .put(Routes.applicationGuildCommands(clientId, testGuildId), {
            body: privateCommands,
        })
        .then(() =>
            console.log(
                `Successfully registered ${privateCommands.length} private application commands.`
            )
        )
        .catch(console.error);
})();
