import { IObjectIdentifier } from "./interfaces";

export class ObjectIdentifier implements IObjectIdentifier {

    counter: number;

    constructor() {
        this.counter = 0;
    }

    createIdentifier(object: unknown): number | string {
        return this.counter++;
    }
}