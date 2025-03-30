import { RenderingEngine } from "../engine";
import { Float44 } from "../math";
import { IDisposable } from "../objects";

export abstract class Camera implements IDisposable {
    viewMatrix: Float44;
    engine: RenderingEngine;

    constructor() {
        this.viewMatrix = Float44.identity();
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

    setDistance(distance: number) {
        
    }
}