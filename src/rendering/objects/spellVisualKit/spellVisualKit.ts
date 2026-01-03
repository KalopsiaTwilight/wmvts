import { Float3, Float44 } from "@app/math";
import { ModelAttachVisualKitEffectData, RecordIdentifier, SpellVisualKitEffectType, SpellVisualKitMetadata } from "@app/metadata";
import { IDataManager, IObjectFactory, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";

import { ISpellVisualKit, SpellVisualKitEvents } from "./interfaces";
import { IM2Model } from "../m2Model";


export class SpellVisualKitModel<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent | SpellVisualKitEvents>
    implements ISpellVisualKit<TParentEvent> {
    spellVisualKitId: RecordIdentifier;
    metadata: SpellVisualKitMetadata;
    effectsLoaded: boolean;

    private attachedToModel: IM2Model;
    private dataManager: IDataManager;
    private objectFactory: IObjectFactory;

    constructor(dataManager: IDataManager, objectFactory: IObjectFactory) {
        super();

        this.objectFactory = objectFactory;
        this.dataManager = dataManager;
    }

    get isLoaded(): boolean {
        return this.metadata != null && this.effectsLoaded;
    }

    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        if (this.spellVisualKitId && !this.isLoaded) {
            this.dataManager.getSpellVisualKitMetadata(this.spellVisualKitId).then(this.onSpellVisualKitMetadataLoaded.bind(this));
        }
    }

    attachTo(model: IM2Model): void {
        if (this.isDisposing) {
            return;
        }

        if (this.attachedToModel) {
            throw "Spell visual kit is already attached to a different model.";
        }

        this.attachedToModel = model;
        this.attachedToModel.addChild(this);
    }

    loadSpellVisualKitId(id: RecordIdentifier): void {
        if (this.isDisposing) {
            return;
        }

        if (this.spellVisualKitId === id) {
            return;
        }

        this.spellVisualKitId = id;
        if (this.renderer) {
            this.dataManager.getSpellVisualKitMetadata(this.spellVisualKitId).then(this.onSpellVisualKitMetadataLoaded.bind(this));
        }
    }

    update(deltaTime: number): void {
        if (this.isDisposing) {
            return;
        }
        
        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    draw(): void {
        if (this.isDisposing) {
            return;
        }

        for (const child of this.children) {
            child.draw();
        }
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.metadata = null;
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

    protected canExecuteCallbackNow(type: TParentEvent | "loaded" | SpellVisualKitEvents): boolean {
        switch(type) {
            case "metadataLoaded": return this.metadata != null;
        }
        return super.canExecuteCallbackNow(type);
    }

    private onSpellVisualKitMetadataLoaded(metadata: SpellVisualKitMetadata) {
        if (!metadata) {
            this.dispose();
            return;
        }

        if (this.isDisposing) {
            return;
        }

        this.metadata = metadata;

        for(const effect of this.metadata.effects) {
            // TODO: Work out other effect types
            if (effect.type === SpellVisualKitEffectType.ModelAttach) {
                this.processModelAttachEffect(effect as ModelAttachVisualKitEffectData);
            }
        }

        this.processCallbacks("metadataLoaded")
    }

    private processModelAttachEffect(data: ModelAttachVisualKitEffectData) {
        if (!data.spellVisualEffectName) {
            return;
        }

        const modelId = data.spellVisualEffectName.modelFileDataId;
        if (modelId <= 0) {
            return;
        }

        const model = this.objectFactory.createM2Model(modelId);
        this.addChild(model);
        model.once("loaded", () => {
            this.onEffectLoaded();
        })

        if (data.spellVisualEffectName.textureFileDataId) {
            this.renderer.getTexture(model, data.spellVisualEffectName.textureFileDataId).then((texture) => {
                model.swapTexture(0, texture);
            })
        }

        // TODO: Use variation values?
        const offset = Float3.copy(data.offset);
        let { yaw, pitch, roll, scale } = data;

        // TODO: How to combine transform and attachment positioning: Maybe 2 seperate matrices that form localPos?
        const transformMatrix = Float44.transformMatrix(offset, yaw, pitch, roll, scale);
        // TODO: Check if this is necessary
        Float44.scale(transformMatrix, Float3.fromScalar(data.spellVisualEffectName.scale));

        const attachmentId = data.attachmentId;
        if (attachmentId >= 0) {
            if (this.attachedToModel) {
                this.attachedToModel.once("modelDataLoaded", () => {
                    this.attachedToModel.addAttachedModel(model, this.attachedToModel.getAttachment(attachmentId));
                })
            }
        } 
        
        if (data.positioner) {
            // TODO: Handle positioners
        }
    }

    private onEffectLoaded() {
        this.effectsLoaded = this.children.every(x => x.isLoaded);
        if (this.isLoaded) {
            this.processCallbacks("loaded");
        }
    }
}