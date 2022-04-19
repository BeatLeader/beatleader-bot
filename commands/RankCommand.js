const { SlashCommandBuilder } = require("@discordjs/builders");
const {
    Client,
    CommandInteraction,
    MessageAttachment,
    MessageEmbed,
} = require("discord.js");
const Command = require("../classes/Command");
const GlobalVariables = require("../GlobalVariables");
const { createCanvas, loadImage } = require("canvas");
const http = require("https");
const fs = require("fs");
const fetch = require("node-fetch");
const Downloader = require("nodejs-file-downloader");
const Jimp = require("jimp");
const webp = require("webp-converter");
const imageType = require("image-type");
const { waitUntil } = require("async-wait-until/dist/commonjs");

class RankCommand extends Command {
    /**
     * The basis for a command.
     * @param {SlashCommandBuilder} data The command data.
     * @param {boolean} testing If `true`, the command will only be registered on the GUILD_ID in `.env`
     */
    constructor() {
        super(
            new SlashCommandBuilder()
                .setName("rank")
                .setDescription(`Replies with user's leaderboard rank!`)
                .addStringOption((option) =>
                    option
                        .setName("userid")
                        .setDescription(
                            `The User ID of the BeatLeader account.`
                        )
                        .setRequired(false)
                )
                .addMentionableOption((option) =>
                    option
                        .setName("mentionable")
                        .setDescription(
                            `Mention the user with a linked BeatLeader account.`
                        )
                        .setRequired(false)
                ),
            true
        );

        this.settings = { method: "GET" };
        this.borderOffset = 5;
        this.imageOffset = 50;
        this.attempt = 0;
        this.globalVars = GlobalVariables;
    }

    /**
     * Converts HSV to RGB.
     * @param {number} h The hue.
     * @param {number} s The saturation.
     * @param {number} v The value.
     * @returns
     */
    HSVtoRGB(h, s, v) {
        var r, g, b, i, f, p, q, t;
        if (arguments.length === 1) {
            (s = h.s), (v = h.v), (h = h.h);
        }
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                (r = v), (g = t), (b = p);
                break;
            case 1:
                (r = q), (g = v), (b = p);
                break;
            case 2:
                (r = p), (g = v), (b = t);
                break;
            case 3:
                (r = p), (g = q), (b = v);
                break;
            case 4:
                (r = t), (g = p), (b = v);
                break;
            case 5:
                (r = v), (g = p), (b = q);
                break;
        }
        return this.rgbToHex(
            Math.round(r * 255),
            Math.round(g * 255),
            Math.round(b * 255)
        );
    }

    /**
     * Converts RGB to hex.
     * @param {any} r The red value.
     * @param {any} g The green value.
     * @param {any} b The blue value.
     * @returns
     */
    rgbToHex(r, g, b) {
        return (
            "#" +
            this.componentToHex(r) +
            this.componentToHex(g) +
            this.componentToHex(b)
        );
    }

    /**
     * Converts a component to a hex value.
     * @param {any} c The component.
     * @returns
     */
    componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    /**
     * Starts drawing the rank image.
     * @param {string} userID The user ID to create the image from.
     */
    async startDrawing(userID) {
        this.globalVars.processing = true;
        this.globalVars.imageReady = false;

        let settings = { method: "GET" };

        const canvas = createCanvas(800, 400);
        const ctx = canvas.getContext("2d");

        let url = "https://beatleader.azurewebsites.net/player/" + userID;
        await fetch(url, settings)
            .then((res) => res.json())
            .then(async (json) => {
                var username = json.name;
                var globalRank = "#" + json.rank;
                var regionalRank = "#" + json.countryRank;
                var pp = json.pp;
                var region = json.country;
                var regionImgPath =
                    "https://cdn.beatleader.xyz/flags/" +
                    region.toLowerCase() +
                    ".png";
                var imgPath = json.avatar;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                ctx.lineWidth = 10;
                ctx.fillStyle = "#222222";
                ctx.strokeStyle = "rgb(255,255,0)";
                this.roundRect(
                    ctx,
                    this.borderOffset,
                    this.borderOffset,
                    canvas.width - this.borderOffset * 2,
                    canvas.height - this.borderOffset * 2,
                    50,
                    true
                );

                ctx.fillStyle = "white";
                ctx.font = "bold 75px Arial";
                var nameLength = ctx.measureText(username);
                var newFontSize = 75;
                while (nameLength.width > 550) {
                    newFontSize--;
                    ctx.font = `bold ${newFontSize}px Arial`;
                    nameLength = ctx.measureText(username);
                }
                ctx.fillText(
                    username,
                    this.imageOffset + 175,
                    this.imageOffset + 100
                );

                ctx.font = "bold 50px Arial";
                var globalTextWidth = ctx.measureText(globalRank).width;
                ctx.fillStyle = this.getRankColor(globalRank);
                this.roundRect(
                    ctx,
                    82.5 - 25,
                    320 - 70,
                    globalTextWidth + 50,
                    100,
                    10,
                    true,
                    false
                );
                ctx.fillStyle = "white";
                ctx.fillText(globalRank, 82.5, 320);

                ctx.font = "bold 50px Arial";
                var regionalTextWidth = ctx.measureText(regionalRank).width;
                ctx.fillStyle = this.getRankColor(regionalRank);
                this.roundRect(
                    ctx,
                    82.5 + (globalTextWidth + 50) + 20 - 25,
                    320 - 70,
                    regionalTextWidth + 85 + 50,
                    100,
                    10,
                    true,
                    false
                );
                ctx.fillStyle = "white";
                ctx.fillText(
                    regionalRank,
                    82.5 + (globalTextWidth + 50) + 20,
                    320
                );
                const regionImg = await loadImage(regionImgPath);
                ctx.drawImage(
                    regionImg,
                    82.5 + (globalTextWidth + 50) + 30 + regionalTextWidth,
                    282,
                    80,
                    40
                );

                ctx.textAlign = "right";
                ctx.fillStyle = this.HSVtoRGB(
                    Math.max(0, pp - 1000) / 18000,
                    1.0,
                    1.0
                );

                ctx.fillText(
                    Math.round(pp * 100) / 100 + "pp",
                    canvas.width - 50,
                    320
                );

                ctx.fillStyle = "#888888";
                //this.roundRect(ctx, 225 + 20, 250, 150, 100, 10, true, false);

                ctx.lineWidth = 0;
                ctx.strokeStyle = "#222222";
                this.roundRect(
                    ctx,
                    this.imageOffset,
                    this.imageOffset,
                    150,
                    150,
                    80,
                    false
                );
                ctx.clip();

                var splitUrl = imgPath.split(".");

                http.get(imgPath, (response) => {
                    response.on("readable", async () => {
                        const chunk = response.read(imageType.minimumBytes);
                        response.destroy();
                        try {
                            console.log(imageType(chunk).ext);
                            switch (imageType(chunk).ext) {
                                case "png":
                                    const imgPng = await loadImage(imgPath);
                                    ctx.drawImage(
                                        imgPng,
                                        this.imageOffset,
                                        this.imageOffset,
                                        150,
                                        150
                                    );
                                    const outPng = await fs.createWriteStream(
                                        `${__dirname}/../${userID}.png`
                                    );
                                    const streamPng =
                                        await canvas.createPNGStream();
                                    streamPng.pipe(outPng);
                                    outPng.on("finish", () => {
                                        console.log(
                                            `The PNG file was created from conversion. \n Name: ${username}`
                                        );
                                        this.globalVars.imageReady = true;
                                    });
                                    break;
                                case "jpg":
                                    const imgJpg = await loadImage(imgPath);
                                    ctx.drawImage(
                                        imgJpg,
                                        this.imageOffset,
                                        this.imageOffset,
                                        150,
                                        150
                                    );
                                    const outJpg = await fs.createWriteStream(
                                        `${__dirname}/${userID}.png`
                                    );
                                    const streamJpg =
                                        await canvas.createPNGStream();
                                    streamJpg.pipe(outJpg);
                                    outJpg.on("finish", () => {
                                        console.log(
                                            `The PNG file was created from conversion. \n Name: ${username}`
                                        );
                                        this.globalVars.imageReady = true;
                                    });
                                    break;
                                case "webp":
                                    await fs.access(
                                        `${userID}.jpg`,
                                        fs.constants.F_OK,
                                        async (err) => {
                                            if (!err) {
                                                const imgWebp = await loadImage(
                                                    `${userID}.jpg`
                                                );
                                                ctx.drawImage(
                                                    imgWebp,
                                                    this.imageOffset,
                                                    this.imageOffset,
                                                    150,
                                                    150
                                                );
                                                const outWebp =
                                                    await fs.createWriteStream(
                                                        `${__dirname}/${userID}.png`
                                                    );
                                                const streamWebp =
                                                    await canvas.createPNGStream();
                                                streamWebp.pipe(outWebp);
                                                outWebp.on("finish", () => {
                                                    console.log(
                                                        `The PNG file was created from cache. \n Name: ${username}`
                                                    );
                                                    this.globalVars.imageReady = true;
                                                });
                                                return;
                                            } else {
                                                const downloader =
                                                    new Downloader({
                                                        url: imgPath,
                                                        directory: "./",
                                                        fileName: `${userID}.webp`,
                                                        cloneFiles: false,
                                                    });
                                                try {
                                                    await downloader.download();

                                                    console.log("All done");
                                                    const result =
                                                        await webp.dwebp(
                                                            `${userID}.webp`,
                                                            `${userID}.jpg`,
                                                            "-o",
                                                            (logging = "-v")
                                                        );
                                                } catch (error) {
                                                    console.log(
                                                        "Download failed",
                                                        error
                                                    );
                                                }

                                                const imgWebp = await loadImage(
                                                    `${userID}.jpg`
                                                );
                                                ctx.drawImage(
                                                    imgWebp,
                                                    this.imageOffset,
                                                    this.imageOffset,
                                                    150,
                                                    150
                                                );
                                                const outWebp =
                                                    await fs.createWriteStream(
                                                        `${__dirname}/${userID}.png`
                                                    );
                                                const streamWebp =
                                                    await canvas.createPNGStream();
                                                streamWebp.pipe(outWebp);
                                                outWebp.on("finish", () => {
                                                    console.log(
                                                        `The PNG file was created from conversion. \n Name: ${username}`
                                                    );
                                                    this.globalVars.imageReady = true;
                                                });
                                            }
                                        }
                                    );
                                    break;
                                default:
                                    await fs.access(
                                        `${userID}.jpg`,
                                        fs.constants.F_OK,
                                        async (err) => {
                                            if (!err) {
                                                const img = await loadImage(
                                                    `${userID}.jpg`
                                                );
                                                ctx.drawImage(
                                                    img,
                                                    this.imageOffset,
                                                    this.imageOffset,
                                                    150,
                                                    150
                                                );
                                                const out =
                                                    await fs.createWriteStream(
                                                        `${__dirname}/${userID}.png`
                                                    );
                                                const stream =
                                                    await canvas.createPNGStream();
                                                stream.pipe(out);
                                                out.on("finish", () => {
                                                    console.log(
                                                        `The PNG file was created from cache. \n Name: ${username}`
                                                    );
                                                    this.globalVars.imageReady = true;
                                                });
                                            } else {
                                                const avatarDownloader =
                                                    new Downloader({
                                                        url: imgPath,
                                                        directory: "./",
                                                        fileName:
                                                            `${userID}.` +
                                                            splitUrl[
                                                                splitUrl.length -
                                                                    1
                                                            ],
                                                        cloneFiles: false,
                                                    });
                                                try {
                                                    await avatarDownloader.download();
                                                    console.log("All done");
                                                } catch (error) {
                                                    console.log(
                                                        "Download failed",
                                                        error
                                                    );
                                                }

                                                Jimp.read(
                                                    `${userID}.` +
                                                        splitUrl[
                                                            splitUrl.length - 1
                                                        ],
                                                    async function (
                                                        err,
                                                        image
                                                    ) {
                                                        await image.writeAsync(
                                                            `${userID}.jpg`
                                                        );
                                                        const img =
                                                            await loadImage(
                                                                `${userID}.jpg`
                                                            );
                                                        ctx.drawImage(
                                                            img,
                                                            this.imageOffset,
                                                            this.imageOffset,
                                                            150,
                                                            150
                                                        );
                                                        const out =
                                                            await fs.createWriteStream(
                                                                `${__dirname}/${userID}.png`
                                                            );
                                                        const stream =
                                                            await canvas.createPNGStream();
                                                        stream.pipe(out);
                                                        out.on("finish", () => {
                                                            console.log(
                                                                `The PNG file was created from conversion. \n Name: ${username}`
                                                            );
                                                            this.globalVars.imageReady = true;
                                                        });
                                                    }
                                                );
                                            }
                                        }
                                    );
                                    break;
                            }
                        } catch (error) {
                            console.log(error);
                        }
                    });
                });
            });
    }

    /**
     * Attempts to draw a rank image with a user ID.
     * @param {string} userID
     * @param {CommandInteraction} interaction
     * @param {MessageEmbed} exampleEmbed
     * @param {MessageAttachment} file
     * @returns
     */
    async attemptDrawingWithUserID(userID, interaction, exampleEmbed, file) {
        this.attempt++;
        await this.startDrawing(userID);
        try {
            await waitUntil(() => this.globalVars.imageReady == true);
            await interaction.editReply({
                embeds: [exampleEmbed],
                files: [file],
            });
            this.globalVars.processing = false;
            return false;
        } catch (error) {
            console.log(error);

            this.globalVars.processing = false;
            sendError = "An error has occurred: \n ```\n" + error + "\n```";
            if (this.attempt < 3)
                await attemptDrawingWithUserID(
                    userID,
                    interaction,
                    exampleEmbed,
                    file
                );
            else return true;
        }
    }

    /**
     * Attempts a drawing with a user ID linked to a Discord account.
     * @param {string} blUserID
     * @param {CommandInteraction} interaction
     * @param {MessageEmbed} exampleEmbed
     * @param {MessageAttachment} file
     * @returns
     */
    async attemptDrawingWithLinkedUserID(
        blUserID,
        interaction,
        exampleEmbed,
        file
    ) {
        this.attempt++;
        await this.startDrawing(blUserID);
        try {
            await waitUntil(() => this.globalVars.imageReady == true);
            await interaction.editReply({
                embeds: [exampleEmbed],
                files: [file],
            });
            this.globalVars.processing = false;
            return false;
        } catch (error) {
            console.log(error);
            this.globalVars.processing = false;
            sendError = "An error has occurred: \n ```\n" + error + "\n```";
            if (this.attempt < 3)
                await this.attemptDrawingWithLinkedUserID(
                    blUserID,
                    interaction,
                    exampleEmbed,
                    file
                );
            else return true;
        }
    }

    /**
     * Attempts a drawing with a user ID linked to a Discord account. (duplicate of {@link attemptDrawingWithLinkedUserID}?)
     * @param {string} blUserID
     * @param {CommandInteraction} interaction
     * @param {MessageEmbed} exampleEmbed
     * @param {MessageAttachment} file
     * @returns
     */
    async attemptDrawingWithLinkedUserID2(
        blUserID,
        interaction,
        exampleEmbed,
        file
    ) {
        this.attempt++;
        await this.startDrawing(blUserID);
        try {
            await waitUntil(() => this.globalVars.imageReady == true);
            await interaction.editReply({
                embeds: [exampleEmbed],
                files: [file],
            });
            this.globalVars.processing = false;
            return false;
        } catch (error) {
            console.log(error);

            this.globalVars.processing = false;
            sendError = "An error has occurred: \n ```\n" + error + "\n```";
            if (this.attempt < 3)
                await this.attemptDrawingWithLinkedUserID2(
                    blUserID,
                    interaction,
                    exampleEmbed,
                    file
                );
            else return true;
        }
    }

    /**
     * Returns a hexadecimal string based on the provided rank.
     * @param {string} rank
     * @returns
     */
    getRankColor(rank) {
        switch (rank) {
            case "#3":
                return "#8B4513";
            case "#2":
                return "#888888";
            case "#1":
                return "#B8860B";
            default:
                return "#3E3E3E";
        }
    }

    /**
     * A helper to create a round rectangle.
     * @param {*} ctx
     * @param {*} x
     * @param {*} y
     * @param {*} width
     * @param {*} height
     * @param {*} radius
     * @param {*} fill
     * @param {*} stroke
     */
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke === "undefined") {
            stroke = true;
        }
        if (typeof radius === "undefined") {
            radius = 5;
        }
        if (typeof radius === "number") {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
            var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius.br,
            y + height
        );
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

    /**
     * Executes the command.
     * @param {Client} client The bot client.
     * @param {CommandInteraction} interaction The command interaction.
     */
    async execute(client, interaction) {
        let rawAccountData = fs.readFileSync("linkedAccounts.json");
        let linkedAccounts = JSON.parse(rawAccountData);

        if (this.globalVars.processing)
            return await interaction.reply({
                content: "Please wait while BeatLeader is processing an image.",
                ephemeral: true,
            });
        let user = interaction.user;
        var userID = interaction.options.getString("userid");
        if (isNaN(userID)) {
            await interaction.reply({
                content: `That is not a valid ID.`,
                ephemeral: false,
            });
            return;
        }
        let mentionable = interaction.options.getMentionable("mentionable");
        if (userID != undefined && mentionable == undefined) {
            await interaction.deferReply();
            let url = "https://beatleader.azurewebsites.net/player/" + userID;
            const file = new MessageAttachment(`${userID}.png`);
            const exampleEmbed = new MessageEmbed();
            var cancelProcess = false;
            await fetch(url, { method: "GET" }).then(async (res) => {
                try {
                    let json = await res.json();
                    exampleEmbed.setColor(
                        this.HSVtoRGB(
                            Math.max(0, json.pp - 1000) / 18000,
                            1.0,
                            1.0
                        )
                    );
                } catch (error) {
                    console.log(error);
                    await interaction.editReply({
                        content: "A player with that `userID` doesn't exist!",
                    });
                    cancelProcess = true;
                }
            });
            if (cancelProcess) return;
            exampleEmbed.setAuthor({
                name: "View on BeatLeader",
                url: "https://www.beatleader.xyz/u/" + userID,
                iconURL:
                    "https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png",
            });
            exampleEmbed.setImage("attachment://" + userID + ".png");
            var sendError = "";
            const user = await client.users.fetch("396771959305797643");
            if (
                await this.attemptDrawingWithUserID(
                    userID,
                    interaction,
                    exampleEmbed,
                    file
                )
            ) {
                await interaction.editReply({
                    content: "An error has occurred. Please try again.",
                });
                user.send(sendError);
            }
            return;
        } else if (userID == undefined && mentionable != undefined) {
            for (var i = 0; i < linkedAccounts.length; i++) {
                if (linkedAccounts[i].discordID == mentionable.id) {
                    await interaction.deferReply();

                    let url =
                        "https://beatleader.azurewebsites.net/player/" +
                        linkedAccounts[i].blUserID;
                    const file = new MessageAttachment(
                        `${linkedAccounts[i].blUserID}.png`
                    );
                    const exampleEmbed = new MessageEmbed();
                    var cancelProcess = false;
                    await fetch(url, { method: "GET" }).then(async (res) => {
                        try {
                            let json = await res.json();
                            exampleEmbed.setColor(
                                this.HSVtoRGB(
                                    Math.max(0, json.pp - 1000) / 18000,
                                    1.0,
                                    1.0
                                )
                            );
                        } catch (error) {
                            console.log(error);
                            await interaction.editReply({
                                content:
                                    "A player with that `userID` doesn't exist!",
                            });
                            cancelProcess = true;
                        }
                    });
                    if (cancelProcess) return;
                    exampleEmbed.setAuthor({
                        name: "View on BeatLeader",
                        url:
                            "https://www.beatleader.xyz/u/" +
                            linkedAccounts[i].blUserID,
                        iconURL:
                            "https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png",
                    });
                    exampleEmbed.setImage(
                        "attachment://" + linkedAccounts[i].blUserID + ".png"
                    );
                    var sendError = "";
                    const user = await client.users.fetch("396771959305797643");

                    if (
                        await this.attemptDrawingWithLinkedUserID(
                            linkedAccounts[i].blUserID,
                            interaction,
                            exampleEmbed,
                            file
                        )
                    ) {
                        await interaction.editReply({
                            content: "An error has occurred. Please try again.",
                        });
                        user.send(sendError);
                    }
                    return;
                }
            }
            await interaction.reply({
                content: `The user you mentioned doesn't have an account linked.`,
                ephemeral: true,
            });
        } else if (userID != undefined && mentionable != undefined) {
            await interaction.reply({
                content: `There was an error in your command.`,
                ephemeral: true,
            });
        } else {
            for (var i = 0; i < linkedAccounts.length; i++) {
                if (linkedAccounts[i].discordID == user.id) {
                    await interaction.deferReply();
                    let url =
                        "https://beatleader.azurewebsites.net/player/" +
                        linkedAccounts[i].blUserID;
                    const file = new MessageAttachment(
                        `${linkedAccounts[i].blUserID}.png`
                    );
                    const exampleEmbed = new MessageEmbed();
                    var cancelProcess = false;
                    await fetch(url, { method: "GET" }).then(async (res) => {
                        try {
                            let json = await res.json();
                            exampleEmbed.setColor(
                                this.HSVtoRGB(
                                    Math.max(0, json.pp - 1000) / 18000,
                                    1.0,
                                    1.0
                                )
                            );
                        } catch (error) {
                            console.log(error);
                            await interaction.editReply({
                                content:
                                    "A player with that `userID` doesn't exist!",
                            });
                            cancelProcess = true;
                        }
                    });
                    if (cancelProcess) return;
                    exampleEmbed.setAuthor({
                        name: "View on BeatLeader",
                        url:
                            "https://www.beatleader.xyz/u/" +
                            linkedAccounts[i].blUserID,
                        iconURL:
                            "https://github.com/BeatLeader/beatleader-website/raw/master/public/assets/favicon-96x96.png",
                    });
                    exampleEmbed.setImage(
                        "attachment://" + linkedAccounts[i].blUserID + ".png"
                    );
                    var sendError = "";
                    const user = await client.users.fetch("396771959305797643");
                    if (
                        await this.attemptDrawingWithLinkedUserID2(
                            linkedAccounts[i].blUserID,
                            interaction,
                            exampleEmbed,
                            file
                        )
                    ) {
                        await interaction.editReply({
                            content: "An error has occurred. Please try again.",
                        });
                        user.send(sendError);
                    }
                    return;
                }
            }
            await interaction.reply({
                content: `You don't have an account linked.`,
                ephemeral: true,
            });
        }
    }
}

module.exports = RankCommand;
