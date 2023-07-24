import BaseImage from "./base.image";

export type RankImageParams = {
  userId: string;
};

export default class RankImage extends BaseImage<RankImageParams> {
  constructor(protected params: RankImageParams) {
    super(params);
  }

  public override async generate(): Promise<Buffer> {
    throw new Error("Not implemented yet.");
  }
}
