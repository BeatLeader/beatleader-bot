import { MikroORM, SqliteDriver, EntityManager } from "@mikro-orm/sqlite";
import { TsMorphMetadataProvider } from "@mikro-orm/reflection";
import Logger from "../util/logger";

export default class Database {
  private _orm!: MikroORM;
  private _em!: EntityManager<SqliteDriver>;

  constructor() {
    this.init();
  }

  public async init(): Promise<void> {
    const orm = await MikroORM.init<SqliteDriver>({
      entities: ["./dist/database/entities/*.js"],
      type: "sqlite",
      host: "file:./database.sqlite",
      dbName: "database.sqlite",
      debug: true,
      metadataProvider: TsMorphMetadataProvider,
    }).catch((err) => {
      Logger.error("Database", "Failed to initialize database");
      Logger.error("Database", err);
      console.error(err);
      process.exit(1);
    });

    this._orm = orm;
    this._em = orm.em;

    Logger.info("Database", "Database initialized");
  }

  public async close(): Promise<void> {
    await this._orm.close(true);
  }

  get em() {
    return this._em.fork();
  }

  get orm() {
    return this._orm;
  }
}
