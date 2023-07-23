export default class BaseImage<Params = any> {
  constructor(protected params: Params) {}

  public async generate(): Promise<Buffer> {
    throw new Error("Not implemented. Please extend this class and implement the generate method.");
  }
}
