import { Float3, Float44 } from "@app/math"
import { IRenderer } from "@app/rendering";

import { Disposable } from "@app/disposable";
import { CallbackFn, ICamera } from "@app/interfaces";

export class RotatingCamera extends Disposable implements ICamera {
    resizeCallbackFn: CallbackFn<IRenderer>
    resizeOnSceneExpand: boolean;
    renderer: IRenderer;

    viewMatrix: Float44;

    time: number;
    radius: number;
    rotateSpeed: number;

    constructor(resizeOnSceneExpand = true) {
        super();
        this.viewMatrix = Float44.identity();
        this.resizeOnSceneExpand = resizeOnSceneExpand;
    }

    getViewMatrix(): Float44 {
        if (this.isDisposing) {
            return Float44.identity();
        }
        
        return this.viewMatrix;
    }

    attachToRenderer(renderer: IRenderer): void {
        if (this.isDisposing) {
            return;
        }
        
        this.renderer = renderer;

        this.time = 0;
        this.radius = 50;
        this.rotateSpeed = 50 * 1/1000;

        if (this.resizeOnSceneExpand) {
            this.resizeCallbackFn = () => {
                this.scaleToSceneBoundingBox();
            };
            this.renderer.on("sceneBoundingBoxUpdate", this.resizeCallbackFn);
            this.scaleToSceneBoundingBox();
        }
    }

    update(deltaTime: number) {
        if (this.isDisposing) {
            return;
        }
        
        this.time = (this.time + deltaTime) % (360 * 1/this.rotateSpeed)
        let currentAngle = Math.floor(this.time / (1/this.rotateSpeed));
        
        // // Compute a matrix for the camera
        var cameraAngleRadians = currentAngle * Math.PI / 180;
        var cameraMatrix = Float44.identity();
        Float44.rotateX(cameraMatrix, 90 * Math.PI / 180, cameraMatrix);
        Float44.rotateY(cameraMatrix, cameraAngleRadians, cameraMatrix);
        Float44.translate(cameraMatrix, Float3.create(0, 0, this.radius), cameraMatrix);

        // // Make a view matrix from the camera matrix
        Float44.invert(cameraMatrix, this.viewMatrix);
    }
    
    override dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        this.renderer.on("sceneBoundingBoxUpdate", this.resizeCallbackFn)

        this.viewMatrix = null;
        this.renderer = null;
    }

    private scaleToSceneBoundingBox(): void {
        if (this.isDisposing) {
            return;
        }

        const { min, max } = this.renderer.getSceneBoundingBox();
        const diff = Float3.subtract(max, min);
        const distance = Float3.length(diff)

        this.radius = distance;
    }
}