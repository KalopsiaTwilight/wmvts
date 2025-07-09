import { RenderingEngine } from "../rendering/engine";
import { AABB, Float3, Float44 } from "../rendering/math";
import { IDisposable } from "../rendering/objects";

export class Camera implements IDisposable {
    isDisposing: boolean;
    viewMatrix: Float44;
    position: Float3;
    engine: RenderingEngine;
    lastBoundingBox: AABB;

    constructor() {
        this.viewMatrix = Float44.identity();
        Float44.rotateX(this.viewMatrix, -90 * Math.PI / 180, this.viewMatrix);
        Float44.invert(this.viewMatrix);
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

    resizeForBoundingBox(boundingBox?: AABB) {
        this.lastBoundingBox = boundingBox;

        if (boundingBox) {
            const { min, max } = boundingBox;
            Float3.copy(max, this.position);
            Float44.lookAt(this.position, [0, 0, 0], [0, 0, 1], this.viewMatrix);
            Float44.invert(this.viewMatrix, this.viewMatrix);
        } 
    }

    getBoundingBox(): AABB {
        return this.lastBoundingBox;
    }
}