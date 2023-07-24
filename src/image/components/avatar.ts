import { Canvas, loadImage } from "@napi-rs/canvas";
import BaseComponent from "./base.component";
import AssetCache from "../loader/assetCache";

export interface AvatarComponentParams {
  avatarUrl: string;
  decoration?: string;
  decorationHue?: number;
  decorationSaturation?: number;
  width: number;
  height: number;
}

export default class AvatarComponent extends BaseComponent<AvatarComponentParams> {
  constructor(protected params: AvatarComponentParams) {
    super(params);
  }

  public override async generate(): Promise<Canvas> {
    const canvas = new Canvas(this.params.width, this.params.height);
    const ctx = canvas.getContext("2d");

    const avatar = await loadImage(this.params.avatarUrl);
    ctx.drawImage(avatar, 0, 0, this.params.width, this.params.height);

    if (this.params.decoration) {
        // create a second canvas for the donator decorations
      const decorationCanvas = new Canvas(this.params.width, this.params.height);
      const dctx = decorationCanvas.getContext("2d");
      const decorationImage = await AssetCache.get(this.params.decoration);

      if (decorationImage) {
        dctx.drawImage(decorationImage, 0, 0, this.params.width, this.params.height);
        dctx.filter = `hue-rotate(${this.params.decorationHue}deg) saturate(${this.params.decorationSaturation}%)`;

        ctx.drawImage(decorationCanvas, 0, 0, this.params.width, this.params.height)
      }
    }

    return canvas;
  }
}
