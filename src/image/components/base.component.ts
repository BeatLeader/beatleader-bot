import { Canvas } from "@napi-rs/canvas";

export default class BaseComponent<Params = any> {
    constructor(protected params: Params & {
        width: number;
        height: number;
    }) {}
    
    public async generate(): Promise<Canvas> {
        throw new Error("Not implemented. Please extend this class and implement the generate method.");
    }
}