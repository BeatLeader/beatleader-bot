import { Entity, PrimaryKey } from "@mikro-orm/core";

@Entity()
export class Link {
    
    @PrimaryKey()
    userId!: number;

    @PrimaryKey()
    discordId!: string;

}