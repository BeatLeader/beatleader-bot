import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export default class BaseCommand<Type = SlashCommandBuilder> {

    public builder: Type;
    public execute: (interaction: CommandInteraction) => Promise<void>;

    constructor(builder: Type, execute: (interaction: CommandInteraction) => Promise<void>) {
        this.builder = builder;
        this.execute = execute;
    }

}