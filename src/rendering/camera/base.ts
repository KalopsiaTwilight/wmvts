import { RenderingEngine } from "../engine";
import { BoundingBox, Float3, Float44 } from "../math";
import { IDisposable } from "../objects";

export abstract class Camera implements IDisposable {
    isDisposing: boolean;
    viewMatrix: Float44;
    position: Float3;
    engine: RenderingEngine;
    lastBoundingBox: BoundingBox;

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
        this.isDisposing = true;
        this.viewMatrix = null;
        this.position = null;
        this.lastBoundingBox = null;
    }

    getViewMatrix() {
        return this.viewMatrix;
    }

    getPosition() {
        return this.position;
    }

    abstract resizeForBoundingBox(boundingBox?: BoundingBox): void;

    abstract getBoundingBox(): BoundingBox;
}