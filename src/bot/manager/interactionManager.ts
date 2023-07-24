import { Collection } from "discord.js";

export default class InteractionManager<T> {
    public interactions: Collection<string, (interaction: T) => any> = new Collection();

    

}