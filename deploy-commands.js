const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, testGuildId, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder()
        .setName('link')
        .setDescription('Link your discord account with a BeatLeader account!')
        .addStringOption(option => 
            option.setName('userid')
            .setDescription('The User ID of your BeatLeader account.')
            .setRequired(true)),
    new SlashCommandBuilder()
        .setName('unlink')
        .setDescription('Unink your discord account with a BeatLeader account!'),
	new SlashCommandBuilder()
        .setName('rank')
        .setDescription(`Replies with user's leaderboard rank!`)
        .addStringOption(option =>
            option.setName('userid')
            .setDescription(`The User ID of the BeatLeader account.`)
            .setRequired(false))
        .addMentionableOption(option =>
            option.setName('mentionable')
            .setDescription(`Mention the user with a linked BeatLeader account.`)
            .setRequired(false)),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);

/*rest.put(Routes.applicationGuildCommands(clientId, testGuildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);*/