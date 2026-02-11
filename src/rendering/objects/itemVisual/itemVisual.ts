import { Float3 } from "@app/math";
import { ItemVisualMetadata, RecordIdentifier } from "@app/metadata";
import { IDataManager, IObjectFactory, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";
import { IItemModel } from "../itemModel";

import { IItemVisual, ItemVisualEvents } from "./interfaces";
import { IM2Model } from "../m2Model";


export class ItemVisualModel<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent | ItemVisualEvents>
    implements IItemVisual<TParentEvent> {
    itemVisualId: RecordIdentifier;
    itemVisualMetadata: ItemVisualMetadata;
    attachedItemModel: IItemModel;
    effectsLoaded: boolean;

    private effectModels: IM2Model[];

    private dataManager: IDataManager;
    private objectFactory: IObjectFactory;
    private attachedItemComponentModel: IM2Model;

    constructor(dataManager: IDataManager, objectFactory: IObjectFactory) {
        super();

        this.objectFactory = objectFactory;
        this.dataManager = dataManager;
        this.effectModels = [];
    }

    get isLoaded(): boolean {
        return this.itemVisualMetadata != null && this.effectsLoaded;
    }

    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        if (this.itemVisualId && !this.isLoaded) {
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
        
        for (const effect of this.effectModels) {
            effect.update(deltaTime);
        }
    }

    draw(): void {
        if (this.isDisposing) {
            return;
        }

        for (const effect of this.effectModels) {
            effect.draw();
        }
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        for(const effect of this.effectModels) {
            effect.dispose();
        }
        this.effectModels = null;
        this.attachedItemModel = null;
        this.attachedItemComponentModel = null;
        this.itemVisualMetadata = null;
        this.dataManager = null;
        this.objectFactory = null;
    }

    pauseAnimation() {
        this.once("effectsLoaded", () => {
            for(const child of this.children) {
                const m2Model = child as IM2Model;
                m2Model.pauseAnimation();
            }
        })
    }

    resumeAnimation() {
        this.once("effectsLoaded", () => {
            for(const child of this.children) {
                const m2Model = child as IM2Model;
                m2Model.resumeAnimation();
            }
        })
    }

    protected canExecuteCallbackNow(type: TParentEvent | "loaded" | ItemVisualEvents): boolean {
        switch(type) {
            case "effectsLoaded": return this.effectsLoaded;
            case "metadataLoaded": return this.itemVisualMetadata != null;
        }
        return super.canExecuteCallbackNow(type);
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

        this.attachedItemModel.once("componentsLoaded", () => {
            const effectsLoadedPromises: Promise<IM2Model>[] = [];
            for (let i = 0; i < this.itemVisualMetadata.effects.length; i++) {
                const effect = this.itemVisualMetadata.effects[i];
                if (effect.subClassId !== -1 && effect.subClassId != this.attachedItemModel.subClassId) {
                    continue;
                }

                if (effect.modelFileDataId) {
                    const subModel = this.objectFactory.createM2Model(effect.modelFileDataId);
                    this.effectModels.push(subModel);
                    this.addChild(subModel);
                    subModel.once("disposed", () => this.dispose());

                    const scaleVector = Float3.create(effect.scale, effect.scale, effect.scale);
                    subModel.scale = scaleVector;

                    const attachmentId = effect.attachmentId -1;
                    if (attachmentId !== -1) {
                        const attachment = this.attachedItemComponentModel.getAttachment(attachmentId);
                        this.attachedItemComponentModel.addAttachedModel(subModel, attachment);
                    }
                    // TODO: Figure out what attachmentId 0 does

                    effectsLoadedPromises.push(subModel.onceAsync("loaded"));
                }

                if (effect.spellVisualKitId) {
                    const spellKit = this.objectFactory.createSpellVisualKit(effect.spellVisualKitId);
                    const attachToModel = this.attachedItemComponentModel ? this.attachedItemComponentModel : this.attachedItemModel.character;
                    if (attachToModel) {
                        spellKit.attachTo(attachToModel);
                    }
                    this.addChild(spellKit);
                }
            }

            Promise.all(effectsLoadedPromises).then(() => {
                this.effectsLoaded = true;
                this.processCallbacks("effectsLoaded");
                this.processCallbacks("loaded");
            })
        });

        
        this.processCallbacks("metadataLoaded")
    }
}