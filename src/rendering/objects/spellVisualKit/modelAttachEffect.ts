import { ModelAttachVisualKitEffectData } from "@app/metadata";
import { Float3, Float44 } from "@app/math";
import { IObjectFactory } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";
import { IM2Model } from "../m2Model";
import { Positioner } from "../positioner";


export class ModelAttachEffect<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent> {
    objectFactory: IObjectFactory;
    model: IM2Model;
    textureLoaded: boolean;
    positioner: Positioner;

    transformMatrix: Float44;

    constructor(objectFactory: IObjectFactory) {
        super();
        
        this.objectFactory = objectFactory;
        this.transformMatrix = Float44.identity();
    }

    get isLoaded() {
        return this.model?.isLoaded && this.textureLoaded;
    }

    update(deltaTime: number): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.positioner.update(deltaTime);
        Float44.multiply(this.transformMatrix, this.positioner.transformMatrix, this.localModelMatrix);
        this.updateModelMatrixFromParent();

        for(const child of this.children) {
            child.update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        for(const child of this.children) {
            child.draw();
        }
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
    }

     loadModelAttachEffect(data: ModelAttachVisualKitEffectData) {
        if (!data.spellVisualEffectName) {
            return;
        }

        const modelId = data.spellVisualEffectName.modelFileDataId;
        if (modelId <= 0) {
            return;
        }

        this.model = this.objectFactory.createM2Model(modelId);
        this.addChild(this.model);

        if (data.spellVisualEffectName.textureFileDataId) {
            this.renderer.getTexture(this.model, data.spellVisualEffectName.textureFileDataId).then((texture) => {
                this.model.swapTexture(0, texture);
                this.textureLoaded = true;
            })
        } else {
            this.textureLoaded = true;
        }

        // TODO: Use variation values?
        const offset = Float3.copy(data.offset);
        let { yaw, pitch, roll, scale } = data;

        
        Float44.transformMatrix(offset, yaw, pitch, roll, scale, this.transformMatrix);
        Float44.scale(this.transformMatrix, Float3.fromScalar(data.spellVisualEffectName.scale), this.transformMatrix);
        this.setModelMatrixFromMatrix(this.transformMatrix);
        
        if (data.positioner) {
            this.positioner = new Positioner(data.positioner);
        }

        const attachmentId = data.attachmentId;
        return attachmentId;
    }
}