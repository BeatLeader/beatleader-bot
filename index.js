const { Client, Intents, MessageEmbed, MessageAttachment } = require('discord.js');
const { createCanvas, loadImage } = require('canvas')
const { token } = require('./config.json');
const http = require('https')
const fs = require('fs');
const fetch = require('node-fetch');
const Downloader = require("nodejs-file-downloader");
const Jimp = require("jimp");
const webp = require('webp-converter');
const imageType = require('image-type');
const { waitUntil } = require('async-wait-until/dist/commonjs');
const { notStrictEqual } = require('assert');
const { send } = require('process');

let settings = { method: "GET" };

const borderOffset = 5;
const imageOffset = 50;

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
            let url = "https://beatleader.azurewebsites.net/player/" + userID;
            const file = new MessageAttachment(`${userID}.png`);
                    const exampleEmbed = new MessageEmbed()
                    var cancelProcess = false;
                    await fetch(url, { method: "GET" })
                        .then(async res => {
                            try {
                                let json = await res.json();
                                exampleEmbed.setColor(HSVtoRGB(Math.max(0, json.pp - 1000) / 18000, 1.0, 1.0));
                            } catch (error) {
                                console.log(error);
                                await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                                cancelProcess = true;
                            }
                        });
                    if(cancelProcess)
                        return;
                    exampleEmbed.setAuthor({ name: "View on BeatLeader", url: "https://www.beatleader.xyz/u/" + userID, iconURL: 'https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png' })
                    exampleEmbed.setImage("attachment://" + userID + ".png");
                    var sendError = "";
                    const user = await client.users.fetch('396771959305797643');
                    async function attemptDrawing() {
                        attempt++;
                        await startDrawing(userID);
                        try {
                            await waitUntil(() => imageReady == true);
                            await interaction.editReply({embeds: [exampleEmbed], files: [file]});
                            processing = false;
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
                    }
                    return;
            
        } else if(userID == undefined && mentionable != undefined) {
            for(var i = 0; i < linkedAccounts.length; i++) {
                if(linkedAccounts[i].discordID == mentionable.id) {
                    await interaction.deferReply();
                    
                    let url = "https://beatleader.azurewebsites.net/player/" + linkedAccounts[i].blUserID;
                    const file = new MessageAttachment(`${linkedAccounts[i].blUserID}.png`);
                    const exampleEmbed = new MessageEmbed()
                    var cancelProcess = false;
                    await fetch(url, { method: "GET" })
                        .then(async res => {
                            try {
                                let json = await res.json();
                                exampleEmbed.setColor(HSVtoRGB(Math.max(0, json.pp - 1000) / 18000, 1.0, 1.0));
                            } catch (error) {
                                console.log(error);
                                await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                                cancelProcess = true;
                            }
                        });
                    if(cancelProcess)
                        return;
                    exampleEmbed.setAuthor({ name: "View on BeatLeader", url: "https://www.beatleader.xyz/u/" + linkedAccounts[i].blUserID, iconURL: 'https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png' })
                    exampleEmbed.setImage("attachment://" + linkedAccounts[i].blUserID + ".png");
                    var sendError = "";
                    const user = await client.users.fetch('396771959305797643');
                    async function attemptDrawing() {
                        attempt++;
                        await startDrawing(linkedAccounts[i].blUserID);
                        try {
                            await waitUntil(() => imageReady == true);
                            await interaction.editReply({embeds: [exampleEmbed], files: [file]});
                            processing = false;
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
                    let url = "https://beatleader.azurewebsites.net/player/" + linkedAccounts[i].blUserID;
                    const file = new MessageAttachment(`${linkedAccounts[i].blUserID}.png`);
                    const exampleEmbed = new MessageEmbed()
                    var cancelProcess = false;
                    await fetch(url, { method: "GET" })
                        .then(async res => {
                            try {
                                let json = await res.json();
                                exampleEmbed.setColor(HSVtoRGB(Math.max(0, json.pp - 1000) / 18000, 1.0, 1.0));
                            } catch (error) {
                                console.log(error);
                                await interaction.editReply({content: "A player with that `userID` doesn't exist!"});
                                cancelProcess = true;
                            }
                        });
                    if(cancelProcess)
                        return;
                    exampleEmbed.setAuthor({ name: "View on BeatLeader", url: "https://www.beatleader.xyz/u/" + linkedAccounts[i].blUserID, iconURL: 'https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png' })
                    exampleEmbed.setImage("attachment://" + linkedAccounts[i].blUserID + ".png");
                    var sendError = "";
                    const user = await client.users.fetch('396771959305797643');
                    async function attemptDrawing() {
                        attempt++;
                        await startDrawing(linkedAccounts[i].blUserID);
                        try {
                            await waitUntil(() => imageReady == true);
                            await interaction.editReply({embeds: [exampleEmbed], files: [file]});
                            processing = false;
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
                    }
                    return;
                }
            }
            await interaction.reply({ content: `You don't have an account linked.`, ephemeral: true });
        }
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
        ctx.strokeStyle = 'rgb(255,255,0)';
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
                            const outPng = await fs.createWriteStream(`${__dirname}/${userID}.png`)
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
                            const outJpg = await fs.createWriteStream(`${__dirname}/${userID}.png`)
                            const streamJpg = await canvas.createPNGStream()
                            streamJpg.pipe(outJpg)
                            outJpg.on('finish', () => {
                                console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                imageReady = true;
                            })
                            break;
                        case "webp":
                            await fs.access(`${userID}.jpg`, fs.constants.F_OK, async (err) => {
                                if(!err) {
                                    const imgWebp = await loadImage(`${userID}.jpg`);
                                    ctx.drawImage(imgWebp, imageOffset, imageOffset, 150, 150)
                                    const outWebp = await fs.createWriteStream(`${__dirname}/${userID}.png`)
                                    const streamWebp = await canvas.createPNGStream()
                                    streamWebp.pipe(outWebp)
                                    outWebp.on('finish', () => {
                                        console.log(`The PNG file was created from cache. \n Name: ${username}`);
                                        imageReady = true;
                                    })
                                    return;
                                }
                                else {
                                    const downloader = new Downloader({
                                        url: imgPath,
                                        directory: "./",
                                        fileName: `${userID}.webp`,
                                        cloneFiles: false,
                                    });
                                    try {
                                        await downloader.download();
                                    
                                        console.log("All done");
                                        const result = await webp.dwebp(`${userID}.webp`, `${userID}.jpg`,"-o",logging="-v");
                                    } catch (error) {
                                        console.log("Download failed", error);
                                    }
                                
                                    const imgWebp = await loadImage(`${userID}.jpg`);
                                    ctx.drawImage(imgWebp, imageOffset, imageOffset, 150, 150)
                                    const outWebp = await fs.createWriteStream(`${__dirname}/${userID}.png`)
                                    const streamWebp = await canvas.createPNGStream()
                                    streamWebp.pipe(outWebp)
                                    outWebp.on('finish', () => {
                                        console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                        imageReady = true;
                                    })
                                }
                            });
                            break;
                        default:
                            await fs.access(`${userID}.jpg`, fs.constants.F_OK, async (err) => {
                                if(!err) {
                                    const img = await loadImage(`${userID}.jpg`);
                                    ctx.drawImage(img, imageOffset, imageOffset, 150, 150)
                                    const out = await fs.createWriteStream(`${__dirname}/${userID}.png`)
                                    const stream = await canvas.createPNGStream()
                                    stream.pipe(out)
                                    out.on('finish', () => {
                                        console.log(`The PNG file was created from cache. \n Name: ${username}`);
                                        imageReady = true;
                                    })
                                }
                                else {
                                    const avatarDownloader = new Downloader({
                                        url: imgPath,
                                        directory: "./",
                                        fileName: `${userID}.` + splitUrl[splitUrl.length - 1],
                                        cloneFiles: false,
                                    });
                                    try {
                                        await avatarDownloader.download();
                                        console.log("All done");
                                    } catch (error) {
                                        console.log("Download failed", error);
                                    }
            
                                    Jimp.read(`${userID}.` + splitUrl[splitUrl.length - 1], async function (err, image) {
                                        await image.writeAsync(`${userID}.jpg`);
                                        const img = await loadImage(`${userID}.jpg`);
                                        ctx.drawImage(img, imageOffset, imageOffset, 150, 150)
                                        const out = await fs.createWriteStream(`${__dirname}/${userID}.png`)
                                        const stream = await canvas.createPNGStream()
                                        stream.pipe(out)
                                        out.on('finish', () => {
                                            console.log(`The PNG file was created from conversion. \n Name: ${username}`);
                                            imageReady = true;
                                        })
                                    })
                                }
                            });
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