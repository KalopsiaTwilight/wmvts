import { Float3, Float44 } from "@app/math";
import { ItemVisualMetadata, RecordIdentifier } from "@app/metadata";
import { IDataManager, IObjectFactory, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";
import { IItemModel } from "../itemModel";

import { IItemVisual, ItemVisualEvents, IItemVisualEffectData } from "./interfaces";
import { IM2Model } from "../m2Model";
import { WoWAttachmentData } from "@app/modeldata";


export class ItemVisualModel<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent | ItemVisualEvents>
    implements IItemVisual<TParentEvent> {
    itemVisualId: RecordIdentifier;
    itemVisualMetadata: ItemVisualMetadata;
    attachedItemModel: IItemModel;
    effectdata: IItemVisualEffectData[];

    private dataManager: IDataManager;
    private objectFactory: IObjectFactory;
    private attachedItemComponentModel: IM2Model;

    constructor(dataManager: IDataManager, objectFactory: IObjectFactory) {
        super();

        this.objectFactory = objectFactory;
        this.dataManager = dataManager;
        this.effectdata = [];
    }

    get isLoaded(): boolean {
        throw new Error("Method not implemented.");
    }

    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        if (this.itemVisualId) {
            this.dataManager.getItemVisualMetadata(this.itemVisualId).then(this.onItemVisualMetadataLoaded.bind(this));
        }
    }

    attachTo(item: IItemModel): void {
        if (this.isDisposing) {
            return;
        }

        this.attachedItemModel = item;
        this.attachedItemModel.once("componentsLoaded", () => {
            // TODO: Get main component from item
            this.attachedItemComponentModel = this.attachedItemModel.component1;
            // this.attachToRenderer(this.attachedItemModel.renderer);
            this.attachedItemComponentModel.addChild(this);
            this.updateModelMatrixFromParent();
        })
    }

    loadItemVisualId(itemVisualId: RecordIdentifier): void {
        if (this.isDisposing) {
            return;
        }

        if (this.itemVisualId === itemVisualId) {
            return;
        }

        this.itemVisualId = itemVisualId;
        if (this.renderer) {
            this.dataManager.getItemVisualMetadata(this.itemVisualId).then(this.onItemVisualMetadataLoaded.bind(this));
        }
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }

        if (!this.attachedItemModel || !this.attachedItemComponentModel || !this.attachedItemModel.character) {
            return;
        }

        
        for (const effect of this.effectdata) {
            const attachmentData = effect.attachment;
            if (attachmentData) {
                const bone = this.attachedItemComponentModel.getBone(attachmentData.bone);

                Float44.translate(bone.positionMatrix, attachmentData.position, effect.attachmentMatrix);
                Float44.scale(effect.attachmentMatrix, effect.scaleVector, effect.attachmentMatrix);
                effect.model.setModelMatrixFromMatrix(effect.attachmentMatrix);
            }

            effect.model.update(deltaTime);
        }
    }

    draw(): void {
        if (this.isDisposing) {
            return;
        }

        for (const effect of this.effectdata) {
            effect.model.draw();
        }
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.attachedItemModel = null;
        this.attachedItemComponentModel = null;
        this.itemVisualMetadata = null;
        this.dataManager = null;
        this.objectFactory = null;
        for (const effect of this.effectdata) {
            effect.model.dispose();
        }
        this.effectdata = null;
    }


    private onItemVisualMetadataLoaded(metadata: ItemVisualMetadata) {
        if (!metadata) {
            this.dispose();
            return;
        }

        if (this.isDisposing) {
            return;
        }

        if (!this.attachedItemModel) {
            return;
        }

        this.itemVisualMetadata = metadata;
        this.effectdata = [];

        this.attachedItemModel.once("componentsLoaded", () => {
            const effectsLoadedPromises: Promise<IM2Model>[] = [];
            for (let i = 0; i < this.itemVisualMetadata.effects.length; i++) {
                const effect = this.itemVisualMetadata.effects[i];
                if (effect.subClassId !== -1 && effect.subClassId != this.attachedItemModel.subClassId) {
                    continue;
                }

                if (effect.modelFileDataId) {
                    const subModel = this.objectFactory.createM2Model(effect.modelFileDataId);
                    this.addChild(subModel);
                    subModel.once("disposed", () => this.dispose());

                    const scaleVector = Float3.create(effect.scale, effect.scale, effect.scale);

                    let attachment: WoWAttachmentData;
                    const attachmentId = effect.attachmentId -1;
                    if (attachmentId !== -1) {
                        attachment = this.attachedItemComponentModel.getAttachment(attachmentId);
                    }
                    // TODO: Figure out what attachmentId 0 does

                    this.effectdata.push({
                        model: subModel,
                        scaleVector,
                        attachment,
                        attachmentMatrix: Float44.identity()
                    })
                    effectsLoadedPromises.push(subModel.onceAsync("loaded"));
                }
                // TODO: figure out spell effect kits
            }

            Promise.all(effectsLoadedPromises).then(() => {
                this.processCallbacks("effectsLoaded");
                this.processCallbacks("loaded");
            })
        });

        
        this.processCallbacks("metadataLoaded")
    }
}