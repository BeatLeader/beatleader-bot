import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import Logger from "../../util/logger";
import { Image, loadImage } from "@napi-rs/canvas";

export default class AssetCache {
  public static readonly ASSET_LOCATION = "assets/cache";
  public static readonly ASSET_URL = "https://cdn.assets.beatleader.xyz/";
  public static readonly CURRENT_REVISION = 1;

  public static readonly ASSET_LIST = {
    // booster
    Booster_Tier1: "Booster_Tier1.webp",

    // theSun
    TheSun_Tier1: "TheSun_Tier1.webp",
    TheSun_Tier2: "TheSun_Tier2.webp",
    TheSun_Tier3: "TheSun_Tier3.webp",

    // theMoon
    TheMoon_Tier1: "TheMoon_Tier1.webp",
    TheMoon_Tier2: "TheMoon_Tier2.webp",
    TheMoon_Tier3: "TheMoon_Tier3.webp",

    // theStar

    TheStar_Tier1: "TheStar_Tier1.webp",
    TheStar_Tier2: "TheStar_Tier2.webp",
    TheStar_Tier3: "TheStar_Tier3.webp",

    // sparks
    Sparks_Tier1: "Spark_Tier1.webp",
    Sparks_Tier2: "Spark_Tier2.webp",
    Sparks_Tier3: "Spark_Tier3.webp",

    // special
    Special_Tier1: "Special_Tier1.webp",
    Special_Tier2: "Special_Tier2.webp",
    Special_Tier3: "Special_Tier3.webp",
  };

  private static _cache: Map<string, Image>;

  public static async init(): Promise<void> {
    let assetPersistance: {
      hasLoaded: boolean;
      revision: number;
    } = fs.existsSync(path.join(AssetCache.ASSET_LOCATION, "persistance.json"))
      ? JSON.parse(fs.readFileSync(path.join(AssetCache.ASSET_LOCATION, "persistance.json"), "utf-8"))
      : {
          hasLoaded: false,
          revision: 0,
        };

    if (assetPersistance.revision < AssetCache.CURRENT_REVISION) {
      // cache is outdated, perform an update

      Logger.warn("AssetCache", "Asset Cache is outdated, performing an update...");
      fs.mkdirSync(AssetCache.ASSET_LOCATION, { recursive: true });
      await this.downloadAssets();

      Logger.info("AssetCache", "Update complete!");
      assetPersistance.hasLoaded = true;
      assetPersistance.revision = AssetCache.CURRENT_REVISION;

      fs.writeFileSync(
        path.join(AssetCache.ASSET_LOCATION, "persistance.json"),
        JSON.stringify(assetPersistance)
      );
    } else Logger.info("AssetCache", "Asset Cache is up to date!");
  }

  private static async downloadAssets(): Promise<void> {
    await Promise.all(
      Object.keys(AssetCache.ASSET_LIST).map(async (key) => {
        const asset = AssetCache.ASSET_LIST[key as keyof typeof AssetCache.ASSET_LIST];
        const start = Date.now();

        Logger.debug("AssetCache", `Loading asset ${key}...`);

        const response = await fetch(AssetCache.ASSET_URL + asset);
        const buffer = await response.buffer();
        fs.writeFileSync(path.join(AssetCache.ASSET_LOCATION, asset), buffer);

        Logger.debug("AssetCache", `Loaded asset ${key}! (took ${Date.now() - start}ms)`);
      })
    );
  }

  public static async get(asset: string): Promise<Image | undefined> {
    if (this._cache.has(asset)) return this._cache.get(asset);

    const img = await loadImage(path.join(AssetCache.ASSET_LOCATION, asset)).catch((e) => {
      Logger.error("AssetCache", `Error: asset ${asset} failed to load. More info:\n${e}`);
      return undefined;
    });

    return img;
  }
}
