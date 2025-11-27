import { Disposable } from "@app/disposable";
import { ICamera } from "@app/interfaces";
import { AABB, Float3, Float44 } from "@app/math"
import { IRenderingEngine } from "@app/rendering";

export class Camera extends Disposable implements ICamera {
    viewMatrix: Float44;
    position: Float3;
    engine: IRenderingEngine;

    constructor() {
        super();
        this.viewMatrix = Float44.identity();
        Float44.rotateX(this.viewMatrix, -90 * Math.PI / 180, this.viewMatrix);
        Float44.invert(this.viewMatrix);
        this.position = Float3.zero();
    }

    initialize(engine: IRenderingEngine) {
        this.engine = engine;
    }

    update(deltaTime: number) { 

    }

    dispose() {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.viewMatrix = null;
        this.position = null;
    }

    getViewMatrix() {
        return Float44.copy(this.viewMatrix);
    }

    scaleToBoundingBox(boundingBox: AABB) {
        const { min, max } = boundingBox;
        Float3.copy(max, this.position);
        Float44.lookAt(this.position, [0, 0, 0], [0, 0, 1], this.viewMatrix);
        Float44.invert(this.viewMatrix, this.viewMatrix);
    }
}