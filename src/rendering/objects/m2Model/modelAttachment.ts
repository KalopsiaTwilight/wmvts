import { Float44 } from "@app/math";
import { WoWAttachmentData } from "@app/modeldata";

import { WorldPositionedObject } from "../worldPositionedObject";

import { IM2Model } from "../m2Model";


export class ModelAttachment<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent> {
    private parentModel: IM2Model;
    private attachment: WoWAttachmentData;

    constructor(parent: IM2Model, attachment: WoWAttachmentData) {
        super();

        this.parentModel = parent;
        this.parentModel.addChild(this);
        this.attachment = attachment;
    }

    get isLoaded(): boolean {
        return this.children.every(x => x.isLoaded);
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }
        
        const bone = this.parentModel.getBone(this.attachment.bone);
        Float44.translate(bone.positionMatrix, this.attachment.position, this.localModelMatrix);
        this.updateModelMatrixFromParent();
    }

    draw(): void {
        if (this.isDisposing) {
            return;
        }
    }

    pauseAnimation() {
        for(const child of this.children) {
            const m2Model = child as IM2Model;
            m2Model.pauseAnimation();
        }
    }

    resumeAnimation() {
        for(const child of this.children) {
            const m2Model = child as IM2Model;
            m2Model.resumeAnimation();
        }
    }
}