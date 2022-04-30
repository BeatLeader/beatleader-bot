const { Client, Intents, MessageEmbed, MessageAttachment, MessageActionRow, MessageButton } = require('discord.js');
const { createCanvas, loadImage } = require('canvas')
const { token } = require('./config.json');
const http = require('https')
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Downloader = require("nodejs-file-downloader");
const Jimp = require("jimp");
const webp = require('webp-converter');
const imageType = require('image-type');
const { waitUntil } = require('async-wait-until/dist/commonjs');
const { notStrictEqual } = require('assert');
const { send } = require('process');
const { padEnd } = require('core-js/features/string');

let settings = { method: "GET" };

const borderOffset = 5;
const imageOffset = 50;
var difficultyLength = 0;
var difficultyCount = 0;
var difficultyPadding = 10;
var difficultyTextHeight = 138;
var difficultyFontSize = 20;

var imageReady = false;
var processing = false;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

let linkedAccounts = [
    {
        discordID: "123456789",
        blUserID: "123456789"
    }
];

client.once('ready', () => {
	console.log('Ready!');
    let rawAccountData = fs.readFileSync('linkedAccounts.json');
    linkedAccounts = JSON.parse(rawAccountData);
});

var highestDiffId = 0;

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;

	if (commandName === 'link') {
        let user = interaction.user;
        for(var i = 0; i < linkedAccounts.length; i++) {
            if(linkedAccounts[i].discordID == user.id) {
                await interaction.reply({ content: `Your account is already linked!`, ephemeral: true });
                return;
            }
        }
        if(isNaN(interaction.options.getString('userid'))) {
            await interaction.reply({ content: `That is not a valid ID. You can find it ingame or in your profile's url.`, ephemeral: true });
            return;
        }
        try {
            let url = "https://beatleader.azurewebsites.net/player/" + interaction.options.getString('userid');
            await fetch(url, { method: "GET" })
                .then(res => res.json())
                .then(async (json) => {
                    await interaction.reply({ content: `${user.tag} has been linked with BeatLeader account ${json.name}!`, ephemeral: true });
                    linkedAccounts.push({
                        discordID: user.id,
                        blUserID: interaction.options.getString('userid')
                    });
                    WriteToFile(linkedAccounts);
            });
        }
        catch(e) {
            console.log(e);
            await interaction.reply({content: "A player with that `userID` doesn't exist!"});
        }

	} else if(commandName === 'unlink') {
        let user = interaction.user;
        for(var i = 0; i < linkedAccounts.length; i++) {
            if(linkedAccounts[i].discordID == user.id) {
                linkedAccounts.splice(i, 1);
                WriteToFile(linkedAccounts);
                await interaction.reply({ content: `Your account has been unlinked!`, ephemeral: true });
                return;
            }
        }
        await interaction.reply({ content: `You don't have an account linked!`, ephemeral: true });
                return;
    } else if(commandName === 'rank') {
        if(processing)
            return await interaction.reply({content: 'Please wait while BeatLeader is processing an image.', ephemeral: true})
        let user = interaction.user;
        var userID = interaction.options.getString('userid');
        if(isNaN(userID)) {
            await interaction.reply({ content: `That is not a valid ID.`, ephemeral: false });
            return;
        }
        let mentionable = interaction.options.getMentionable('mentionable');
        var attempt = 0;
        if(userID != undefined && mentionable == undefined) {
            await interaction.deferReply();
            const file = new MessageAttachment(`./output/${userID}.png`);
            var cancelProcess = false;
            let url = "https://beatleader.azurewebsites.net/player/" + userID;
            await fetch(url, { method: "GET" })
                .then(async res => {
                    try {
                        let json = await res.json();
                    } catch (error) {
                        console.log(error);
                        await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                        cancelProcess = true;
                    }
                });
            if(cancelProcess)
                return;
            var sendError = "";
            const user = await client.users.fetch('396771959305797643');
            async function attemptDrawing() {
                attempt++;
                await startDrawing(userID);
                try {
                    await waitUntil(() => imageReady == true);
                    const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setURL("https://www.beatleader.xyz/u/" + userID)
                            .setLabel('View on BeatLeader')
                            .setStyle('LINK'),
                    );
                    await interaction.editReply({files: [file], components: [row]});
                    processing = false;
                    clearCacheFolders();
                    return false;
                } catch (error) {
                    console.log(error);

                    processing = false;
                    sendError = 'An error has occurred: \n ```\n' + error + '\n```';
                    if(attempt < 3)
                        await attemptDrawing();
                    else
                        return true;
                }
            }
            if(await attemptDrawing()) {
                await interaction.editReply({content: "An error has occurred. Please try again."});
                user.send(sendError);
                clearCacheFolders();
            }
            return;
            
        } else if(userID == undefined && mentionable != undefined) {
            for(var i = 0; i < linkedAccounts.length; i++) {
                if(linkedAccounts[i].discordID == mentionable.id) {
                    await interaction.deferReply();
                    const file = new MessageAttachment(`./output/${linkedAccounts[i].blUserID}.png`);
                    let url = "https://beatleader.azurewebsites.net/player/" + linkedAccounts[i].blUserID;
                    await fetch(url, { method: "GET" })
                        .then(async res => {
                            try {
                                let json = await res.json();
                            } catch (error) {
                                console.log(error);
                                await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                                cancelProcess = true;
                            }
                        });
                    if(cancelProcess)
                        return;
                    var sendError = "";
                    const user = await client.users.fetch('396771959305797643');
                    async function attemptDrawing() {
                        attempt++;
                        await startDrawing(linkedAccounts[i].blUserID);
                        try {
                            await waitUntil(() => imageReady == true);
                            const row = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setURL("https://www.beatleader.xyz/u/" + linkedAccounts[i].blUserID)
                                    .setLabel('View on BeatLeader')
                                    .setStyle('LINK'),
                            );
                            await interaction.editReply({files: [file], components: [row]});
                            processing = false;
                            clearCacheFolders();
                            return false;
                        } catch (error) {
                            console.log(error);
                            processing = false;
                            sendError = 'An error has occurred: \n ```\n' + error + '\n```';
                            if(attempt < 3)
                                await attemptDrawing();
                            else
                                return true;
                        }
                    }
                    if(await attemptDrawing()) {
                        await interaction.editReply({content: "An error has occurred. Please try again."});
                        user.send(sendError);
                        clearCacheFolders();
                    }
                    return;
                }
            }
            await interaction.reply({ content: `The user you mentioned doesn't have an account linked.`, ephemeral: true });
        } else if(userID != undefined && mentionable != undefined) {
            await interaction.reply({ content: `There was an error in your command.`, ephemeral: true });
        } else {
            for(var i = 0; i < linkedAccounts.length; i++) {
                if(linkedAccounts[i].discordID == user.id) {
                    await interaction.deferReply();
                    const file = new MessageAttachment(`./output/${linkedAccounts[i].blUserID}.png`);
                    let url = "https://beatleader.azurewebsites.net/player/" + linkedAccounts[i].blUserID;
                    await fetch(url, { method: "GET" })
                        .then(async res => {
                            try {
                                let json = await res.json();
                            } catch (error) {
                                console.log(error);
                                await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                                cancelProcess = true;
                            }
                        });
                    if(cancelProcess)
                        return;
                    var sendError = "";
                    const user = await client.users.fetch('396771959305797643');
                    async function attemptDrawing() {
                        attempt++;
                        await startDrawing(linkedAccounts[i].blUserID);
                        try {
                            await waitUntil(() => imageReady == true);
                            const row = new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setURL("https://www.beatleader.xyz/u/" + linkedAccounts[i].blUserID)
                                    .setLabel('View on BeatLeader')
                                    .setStyle('LINK'),
                            );
                            await interaction.editReply({files: [file], components: [row]});
                            processing = false;
                            clearCacheFolders();
                            return false;
                        } catch (error) {
                            console.log(error);

                            processing = false;
                            sendError = 'An error has occurred: \n ```\n' + error + '\n```';
                            if(attempt < 3)
                                await attemptDrawing();
                            else
                                return true;
                        }
                    }
                    if(await attemptDrawing()) {
                        await interaction.editReply({content: "An error has occurred. Please try again."});
                        user.send(sendError);
                        clearCacheFolders();
                    }
                    return;
                }
            }
            await interaction.reply({ content: `You don't have an account linked.`, ephemeral: true });
        }
    } else if(commandName === 'map') {
        var key = interaction.options.getString('key');
        if(processing)
            return await interaction.reply({content: 'Please wait while BeatLeader is processing an image.', ephemeral: true})
        var attempt = 0;
        await interaction.deferReply();
        const file = new MessageAttachment(`./output/${key}.png`);
        let url = "https://api.beatsaver.com/maps/id/" + key;
        await fetch(url, { method: "GET" })
            .then(async res => {
                try {
                    let json = await res.json();
                    if(json.error != undefined)
                        if(json.error == "Not Found") {
                            await interaction.editReply({content: "A beatmap with that `key` doesn't exist!"});
                            cancelProcess = true;
                        }
                            
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({content: "A beatmap with that `key` doesn't exist!"});
                    cancelProcess = true;
                }
            });
        if(cancelProcess)
            return;
        var sendError = "";
        const user = await client.users.fetch('396771959305797643');
        async function attemptDrawing() {
            attempt++;
            await startDrawingMap(key);
            try {
                await waitUntil(() => imageReady == true);
                const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setURL("https://beatsaver.com/maps/" + key)
                        .setLabel('View on BeatSaver')
                        .setStyle('LINK'),
                    new MessageButton()
                        .setURL("https://skystudioapps.com/bs-viewer/?id=" + key)
                        .setLabel('Map Preview')
                        .setStyle('LINK'),
                    new MessageButton()
                        .setURL("https://www.beatleader.xyz/leaderboard/global/" + key + highestDiffId)
                        .setLabel('View Leaderboard')
                        .setStyle('LINK'),
                );
                await interaction.editReply({files: [file], components: [row]});
                processing = false;
                clearCacheFolders();
                return false;
            } catch (error) {
                console.log(error);

                processing = false;
                sendError = 'An error has occurred: \n ```\n' + error + '\n```';
                if(attempt < 3)
                    await attemptDrawing();
                else
                    return true;
            }
        }
        if(await attemptDrawing()) {
            await interaction.editReply({content: "An error has occurred. Please try again."});
            user.send(sendError);
            clearCacheFolders();
        }
        return;
    }
});

client.on('messageCreate', async message => {
    if (message.attachments?.size > 0) {
        for (let attachment of message.attachments.values()) {
            if (attachment.name?.endsWith(".bsor")) {
                await message.reply(
                    {
                        content: `See here: <https://www.replay.beatleader.xyz/?link=${attachment.url}>`,
                        allowedMentions: {parse: []}
                    });
                return;
            }
        }
    }
});

client.login(token);

function clearCacheFolders() {
    fs.readdir("./avatars/", (err, files) => {
    if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join("./avatars/", file), err => {
                if (err) throw err;
            });
        }
    });
    fs.readdir("./output/", (err, files) => {
        if (err) throw err;
    
            for (const file of files) {
                fs.unlink(path.join("./output/", file), err => {
                    if (err) throw err;
                });
            }
        });
}

function WriteToFile(jsonData) {
    let data = JSON.stringify(jsonData);
    fs.unlink('linkedAccounts.json', (err) => {
        if (err) {
          console.error(err)
          return
        }
      
        fs.writeFileSync('linkedAccounts.json', data);
      })
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function drawEasy(ctx, stars) {
    var diff;
    if(stars != 0)
        diff = "E" + " (" + stars + "⭐)";
    else
        diff = "Easy";
    ctx.font = 'bold ' + difficultyFontSize +'px Arial';
    var nameLength = ctx.measureText(diff);
    if(difficultyCount == 0) {
        ctx.fillStyle = "#008055"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2), imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2), imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
        return;
    }
    else {
        ctx.fillStyle = "#008055"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
    }
}
function drawNormal(ctx, stars) {
    var diff;
    if(stars != 0)
        diff = "N" + " (" + stars + "⭐)";
    else
        diff = "Normal";
    ctx.font = 'bold ' + difficultyFontSize +'px Arial';
    var nameLength = ctx.measureText(diff);
    if(difficultyCount == 0) {
        ctx.fillStyle = "#1268A1"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2), imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2), imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
        return;
    }
    else {
        ctx.fillStyle = "#1268A1"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
    }
}
function drawHard(ctx, stars) {
    var diff;
    if(stars != 0)
        diff = "H" + " (" + stars + "⭐)";
    else
        diff = "Hard";
    ctx.font = 'bold ' + difficultyFontSize +'px Arial';
    var nameLength = ctx.measureText(diff);
    if(difficultyCount == 0) {
        ctx.fillStyle = "#BD5500"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2), imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2), imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
        return;
    }
    else {
        ctx.fillStyle = "#BD5500"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
    }
}
function drawExpert(ctx, stars) {
    var diff;
    if(stars != 0)
        diff = "E" + " (" + stars + "⭐)";
    else
        diff = "Expert";
    ctx.font = 'bold ' + difficultyFontSize +'px Arial';
    var nameLength = ctx.measureText(diff);
    if(difficultyCount == 0) {
        ctx.fillStyle = "#B52A1C"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2), imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2), imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
        return;
    }
    else {
        ctx.fillStyle = "#B52A1C"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
    }
}
function drawExpertPlus(ctx, stars) {
    var diff;
    if(stars != 0)
        diff = "E+" + " (" + stars + "⭐)";
    else
        diff = "Expert+";
    ctx.font = 'bold ' + difficultyFontSize +'px Arial';
    var nameLength = ctx.measureText(diff);
    if(difficultyCount == 0) {
        ctx.fillStyle = "#454088"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2), imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2), imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
        return;
    }
    else {
        ctx.fillStyle = "#454088"
        roundRect(ctx, imageOffset + 150 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + 150 - 40, nameLength.width + 30, 40, 20, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(diff, imageOffset + 165 + (imageOffset / 2) + difficultyLength + difficultyPadding * difficultyCount, imageOffset + difficultyTextHeight);
        difficultyCount += 1;
        difficultyLength += nameLength.width + 30;
    }
}

async function startDrawingMap(key) {

    processing = true;
    imageReady = false;

    difficultyCount = 0;
    difficultyLength = 0;

    const canvas = createCanvas(1000, 400)
    const ctx = canvas.getContext('2d')

    let url = "https://api.beatsaver.com/maps/id/" + key;
    await fetch(url, settings)
      .then(res => res.json())
      .then(async (json) => {
        const title = json.name;
        if(title == undefined)
            return true;
        const coverURL = json.versions[0].coverURL;
        const mapper = json.metadata.levelAuthorName;
        const ranked = json.ranked;
        const seconds = json.metadata.duration;
        const songLength = "🕗" + Math.floor(seconds / 60) + ":" + String(seconds % 60).padEnd(2, "0");
        const BPM = "🎵" + json.metadata.bpm;
        const rating = "📈" + Math.round(json.stats.score * 100 * 100) / 100 + "%";
        const uploadDate = json.uploaded;
        const date = "📅" + uploadDate.split("T")[0];


        ctx.lineWidth = 10;
        ctx.fillStyle = '#222222';
        ctx.strokeStyle = 'rgb(255,255,0)';
        roundRect(ctx, borderOffset, borderOffset, canvas.width - borderOffset*2, canvas.height - borderOffset*2, 50, true);

        if(ranked)
            ctx.fillStyle = "#F39C12";
        else
            ctx.fillStyle = "white";
        ctx.font = 'bold 75px Arial'
        var nameLength = ctx.measureText(title);
        var newFontSize = 75;
        while(nameLength.width > 750) {
            newFontSize--;
            ctx.font = `bold ${newFontSize}px Arial`;
            nameLength = ctx.measureText(title);
        }

        ctx.fillText(title, imageOffset + 175, imageOffset + 50);
        ctx.fillStyle = "white";
        ctx.font = '35px Arial'
        ctx.fillText(mapper, imageOffset + 175, imageOffset + 95);

        const cover = await loadImage(coverURL);
        ctx.drawImage(cover, imageOffset, imageOffset, 150, 150)

        for(var i = 0; i < json.versions[0].diffs.length; i++) {
            let diff = json.versions[0].diffs[i];
            if(diff.difficulty == "Easy" && diff.characteristic == "Standard") {
                if(diff.stars == undefined)
                    drawEasy(ctx, 0);
                else
                    drawEasy(ctx, diff.stars);
                highestDiffId = 11;
            }
            if(diff.difficulty == "Normal" && diff.characteristic == "Standard") {
                if(diff.stars == undefined)
                    drawNormal(ctx, 0);
                else
                    drawNormal(ctx, diff.stars);
                highestDiffId = 31;
            }
            if(diff.difficulty == "Hard" && diff.characteristic == "Standard") {
                if(diff.stars == undefined)
                    drawHard(ctx, 0);
                else
                    drawHard(ctx, diff.stars);
                highestDiffId = 51;
            }
            if(diff.difficulty == "Expert" && diff.characteristic == "Standard") {
                if(diff.stars == undefined)
                    drawExpert(ctx, 0);
                else
                    drawExpert(ctx, diff.stars);
                highestDiffId = 71;
            }
            if(diff.difficulty == "ExpertPlus" && diff.characteristic == "Standard") {
                if(diff.stars == undefined)
                    drawExpertPlus(ctx, 0);
                else
                    drawExpertPlus(ctx, diff.stars);
                highestDiffId = 91;
            }
                
        }

        ctx.fillStyle = "white";
        ctx.font = 'bold 35px Arial'
        ctx.fillText(songLength, 50 + imageOffset, canvas.height - imageOffset *2);
        ctx.fillText(BPM, 283, canvas.height - imageOffset *2);
        ctx.fillText(rating, 483, canvas.height - imageOffset *2);
        ctx.fillText(date, 683, canvas.height - imageOffset *2);

        const out = await fs.createWriteStream(`${__dirname}/output/${key}.png`)
        const stream = await canvas.createPNGStream()
        stream.pipe(out)
        out.on('finish', () => {
            console.log(`The PNG file was created from conversion. \n Song Name: ${title}`);
            imageReady = true;
        })
    })
}
async function startDrawing(userID) {

    processing = true;
    imageReady = false;

    const canvas = createCanvas(800, 400)
    const ctx = canvas.getContext('2d')

    let url = "https://beatleader.azurewebsites.net/player/" + userID;
    await fetch(url, settings)
      .then(res => res.json())
      .then(async (json) => {
        var username = json.name;
        var globalRank = "#" + json.rank;
        var regionalRank = "#" + json.countryRank;
        var pp = json.pp;
        var region = json.country;
        var regionImgPath = "https://cdn.beatleader.xyz/flags/" + region.toLowerCase() + ".png";
        var imgPath = json.avatar;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.lineWidth = 10;
        ctx.fillStyle = '#222222';
        ctx.strokeStyle = HSVtoRGB(Math.max(0, pp - 1000) / 18000, 1.0, 1.0);
        roundRect(ctx, borderOffset, borderOffset, canvas.width - borderOffset*2, canvas.height - borderOffset*2, 50, true);

        ctx.fillStyle = "white";
        ctx.font = 'bold 75px Arial'
        var nameLength = ctx.measureText(username);
        var newFontSize = 75;
        while(nameLength.width > 550) {
            newFontSize--;
            ctx.font = `bold ${newFontSize}px Arial`;
            nameLength = ctx.measureText(username);
        }
        ctx.fillText(username, imageOffset + 175, imageOffset + 100);


        ctx.font = 'bold 50px Arial';
        var globalTextWidth = ctx.measureText(globalRank).width;
        ctx.fillStyle = getRankColor(globalRank);
        roundRect(ctx, 82.5 - 25, 320 - 70, globalTextWidth + 50, 100, 10, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(globalRank, 82.5, 320);

        ctx.font = 'bold 50px Arial';
        var regionalTextWidth = ctx.measureText(regionalRank).width;
        ctx.fillStyle = getRankColor(regionalRank);
        roundRect(ctx, 82.5 + (globalTextWidth + 50) + 20 - 25, 320 - 70, regionalTextWidth + 85 + 50, 100, 10, true, false);
        ctx.fillStyle = "white";
        ctx.fillText(regionalRank, 82.5 + (globalTextWidth + 50) + 20, 320);
        const regionImg = await loadImage(regionImgPath);
        ctx.drawImage(regionImg, 82.5 + (globalTextWidth + 50) + 30 + regionalTextWidth, 282, 80, 40)
        
        ctx.textAlign = "right";
        ctx.fillStyle = HSVtoRGB(Math.max(0, pp - 1000) / 18000, 1.0, 1.0);

        ctx.fillText(Math.round(pp * 100) / 100 + "pp", canvas.width - 50, 320);

        ctx.fillStyle = "#888888";
        //roundRect(ctx, 225 + 20, 250, 150, 100, 10, true, false);

        ctx.lineWidth = 0;
        ctx.strokeStyle = '#222222';
        roundRect(ctx, imageOffset, imageOffset, 150, 150, 80, false);
        ctx.clip();

        var splitUrl = imgPath.split('.');

        http.get(imgPath, response => {
            response.on('readable', async () => {
                const chunk = response.read(imageType.minimumBytes);
                response.destroy();
                try {
                    console.log(imageType(chunk).ext)
                    switch(imageType(chunk).ext) {
                        case "png":
                            const imgPng = await loadImage(imgPath);
                            ctx.drawImage(imgPng, imageOffset, imageOffset, 150, 150)
                            const outPng = await fs.createWriteStream(`${__dirname}/output/${userID}.png`)
                            const streamPng = await canvas.createPNGStream()
                            streamPng.pipe(outPng)
                            outPng.on('finish', () => {
                                console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                imageReady = true;
                            })
                            break;
                        case "jpg":
                            const imgJpg = await loadImage(imgPath);
                            ctx.drawImage(imgJpg, imageOffset, imageOffset, 150, 150)
                            const outJpg = await fs.createWriteStream(`${__dirname}/output/${userID}.png`)
                            const streamJpg = await canvas.createPNGStream()
                            streamJpg.pipe(outJpg)
                            outJpg.on('finish', () => {
                                console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                imageReady = true;
                            })
                            break;
                        case "webp":
                            const downloader = new Downloader({
                                url: imgPath,
                                directory: "./avatars/",
                                fileName: `${userID}.webp`,
                                cloneFiles: false,
                            });
                            try {
                                await downloader.download();
                            
                                console.log("All done");
                                const result = await webp.dwebp(`./avatars/${userID}.webp`, `./avatars/${userID}.jpg`,"-o",logging="-v");
                            } catch (error) {
                                console.log("Download failed", error);
                            }
                        
                            const imgWebp = await loadImage(`./avatars/${userID}.jpg`);
                            ctx.drawImage(imgWebp, imageOffset, imageOffset, 150, 150)
                            const outWebp = await fs.createWriteStream(`${__dirname}/output/${userID}.png`)
                            const streamWebp = await canvas.createPNGStream()
                            streamWebp.pipe(outWebp)
                            outWebp.on('finish', () => {
                                console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                imageReady = true;
                            })
                            break;
                        default:
                            const avatarDownloader = new Downloader({
                                url: imgPath,
                                directory: "./avatars/",
                                fileName: `${userID}.` + splitUrl[splitUrl.length - 1],
                                cloneFiles: false,
                            });
                            try {
                                await avatarDownloader.download();
                                console.log("All done");
                            } catch (error) {
                                console.log("Download failed", error);
                            }
    
                            Jimp.read(`./avatars/${userID}.` + splitUrl[splitUrl.length - 1], async function (err, image) {
                                await image.writeAsync(`./avatars/${userID}.jpg`);
                                const img = await loadImage(`./avatars/${userID}.jpg`);
                                ctx.drawImage(img, imageOffset, imageOffset, 150, 150)
                                const out = await fs.createWriteStream(`${__dirname}/output/${userID}.png`)
                                const stream = await canvas.createPNGStream()
                                stream.pipe(out)
                                out.on('finish', () => {
                                    console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                    imageReady = true;
                                })
                            })
                            break;
                    }
                } catch (error) {
                    console.log(error);
                }
                
            });
        });        
    });
}
  
function getRankColor(rank) {
    switch(rank) {
        case '#3':
            return "#8B4513";
        case '#2':
            return "#888888";
        case '#1':
            return "#B8860B";
        default:
            return "#3E3E3E";
    }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
    stroke = true;
    }
    if (typeof radius === 'undefined') {
    radius = 5;
    }
    if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
        radius[side] = radius[side] || defaultRadius[side];
    }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
    ctx.fill();
    }
    if (stroke) {
    ctx.stroke();
    }
    
}