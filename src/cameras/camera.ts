import { CallbackFn, ICamera } from "@app/interfaces";
import { AABB, Float3, Float4, Float44 } from "@app/math"
import { IRenderer } from "@app/rendering";

import { Disposable } from "../disposable";

export class Camera extends Disposable implements ICamera {
    resizeCallbackFn: CallbackFn<IRenderer>;
    resizeOnSceneExpand: boolean;

    cameraMatrix: Float44;
    viewMatrix: Float44;
    position: Float3;
    rotation: Float3;
    renderer: IRenderer;

    constructor(resizeOnSceneExpand = true) {
        super();
        this.viewMatrix = Float44.identity();
        this.cameraMatrix = Float44.identity();

        Float44.rotateX(this.viewMatrix, -90 * Math.PI / 180, this.viewMatrix);
        Float44.invert(this.viewMatrix);
        this.position = Float3.zero();
        this.rotation = Float3.zero();
        this.resizeOnSceneExpand = resizeOnSceneExpand;
    }

    setPosition(position: Float3) {
        if (this.isDisposing) {
            return;
        }

        Float3.copy(position, this.position);
        this.recreateViewMatrix();
    }

    setRotation(rotation: Float3) {
        if (this.isDisposing) {
            return;
        }

        Float3.copy(rotation, this.rotation);
        this.recreateViewMatrix();
    }

    setRoll(angle: number) {
        if (this.isDisposing) {
            return;
        }
        
        this.rotation[0] = angle;
        this.recreateViewMatrix();
    }
    
    setRollDeg(angle: number) {
        if (this.isDisposing) {
            return;
        }

        this.rotation[0] = angle * Math.PI / 180;
        this.recreateViewMatrix();
    }

    setPitch(angle: number) {
        if (this.isDisposing) {
            return;
        }

        this.rotation[1] = angle;
        this.recreateViewMatrix();
    }
    
    setPitchDeg(angle: number) {
        if (this.isDisposing) {
            return;
        }

        this.rotation[1] = angle * Math.PI / 180;
        this.recreateViewMatrix();
    }

    setYaw(angle: number) {
        if (this.isDisposing) {
            return;
        }

        this.rotation[2] = angle;
        this.recreateViewMatrix();
    }

    setYawDeg(angle: number) {
        if (this.isDisposing) {
            return;
        }

        this.rotation[2] = angle * Math.PI / 180;
        this.recreateViewMatrix();
    }

    attachToRenderer(renderer: IRenderer) {
        if (this.isDisposing) {
            return;
        }

        this.renderer = renderer;
        
        if (this.resizeOnSceneExpand) {
            this.resizeCallbackFn = () => {
                this.scaleToSceneBoundingBox();
            };
            this.renderer.on("sceneBoundingBoxUpdate", this.resizeCallbackFn);
            this.scaleToSceneBoundingBox();
        }
    }

    update(deltaTime: number) { 

    }

    override dispose() {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.renderer.off("sceneBoundingBoxUpdate", this.resizeCallbackFn);
        this.viewMatrix = null;
        this.position = null;
        this.rotation = null;
        this.renderer = null;
    }

    getViewMatrix() {
        if (this.isDisposing) {
            return Float44.identity();
        }

        return this.viewMatrix;
    }

    private scaleToSceneBoundingBox() {
        if (this.isDisposing) {
            return;
        }

        const bb = this.renderer.getSceneBoundingBox();
        const sphereRadius = AABB.sphereRadius(bb);
        AABB.center(bb, this.position);

        const fov = this.renderer.fov;
        const distance = sphereRadius * 2 / Math.tan(fov / 2);
        this.position[0] += distance;

        Float3.zero(this.rotation);
        this.rotation[1] = Math.PI/2;

        this.recreateViewMatrix();
    }

    private recreateViewMatrix() {
        const rotation = Float4.quatFromEulers(this.rotation[0], this.rotation[1], this.rotation[2]);
        const rotMatrix = Float44.fromQuat(rotation);
        
        Float44.identity(this.cameraMatrix);    
        Float44.rotateX(this.cameraMatrix, 90 * Math.PI / 180, this.cameraMatrix);
        Float44.translate(this.cameraMatrix, this.position, this.cameraMatrix);
        Float44.multiply(this.cameraMatrix, rotMatrix, this.cameraMatrix);
        
        Float44.invert(this.cameraMatrix, this.viewMatrix);
    }
}