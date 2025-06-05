import { RenderingEngine } from "../engine";
import { Float3, Float44 } from "../math";
import { IDisposable } from "../objects";

export abstract class Camera implements IDisposable {
    viewMatrix: Float44;
    position: Float3;
    engine: RenderingEngine;
    distance: number;

    constructor() {
        this.viewMatrix = Float44.identity();
        this.position = Float3.zero();
    }

    initialize(engine: RenderingEngine) {
        this.engine = engine;
    }

    update(deltaTime: number) { 

    }

    dispose() {
        this.viewMatrix = null;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    getPosition() {
        return this.position;
    }

    abstract setDistance(distance: number): void;

    abstract getDistance(): number;
}