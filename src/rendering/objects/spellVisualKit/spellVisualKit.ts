import { Float3, Float44 } from "@app/math";
import { BeamVisualKitEffectData, ModelAttachVisualKitEffectData, RecordIdentifier, SpellVisualKitEffectType, SpellVisualKitMetadata } from "@app/metadata";
import { IDataManager, IObjectFactory, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";

import { ISpellVisualKit, SpellVisualKitEvents } from "./interfaces";
import { IM2Model } from "../m2Model";
import { Positioner } from "../positioner";
import { IWorldPositionedObject } from "../interfaces";
import { ModelAttachEffect } from "./modelAttachEffect";


export class SpellVisualKitModel<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent | SpellVisualKitEvents>
    implements ISpellVisualKit<TParentEvent> {
    spellVisualKitId: RecordIdentifier;
    metadata: SpellVisualKitMetadata;
    effectsLoaded: boolean;

    private effectObjects: IWorldPositionedObject[];
    private attachedToModel: IM2Model;
    private dataManager: IDataManager;
    private objectFactory: IObjectFactory;

    constructor(dataManager: IDataManager, objectFactory: IObjectFactory) {
        super();

        this.objectFactory = objectFactory;
        this.dataManager = dataManager;
        this.effectObjects = [];
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
        
        for (const obj of this.effectObjects) {
            obj.update(deltaTime);
        }
    }

    draw(): void {
        if (this.isDisposing) {
            return;
        }

        for (const obj of this.effectObjects) {
            obj.draw();
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
            switch(effect.type) {
                case SpellVisualKitEffectType.ModelAttach: 
                    this.processModelAttachEffect(effect as ModelAttachVisualKitEffectData); break;
                case SpellVisualKitEffectType.Beam:
                    this.processBeamEffect(effect as BeamVisualKitEffectData); break;
            }
        }

        this.processCallbacks("metadataLoaded")
    }

    private processModelAttachEffect(data: ModelAttachVisualKitEffectData) {
        var effect = new ModelAttachEffect(this.objectFactory);
        effect.once("loaded", this.onEffectLoaded.bind(this));
        this.effectObjects.push(effect);

        const attachmentId = effect.loadModelAttachEffect(data);
        if (attachmentId >= 0) {
            if (this.attachedToModel) {
                this.attachedToModel.once("modelDataLoaded", () => {
                    this.attachedToModel.addAttachedModel(effect, this.attachedToModel.getAttachment(attachmentId));
                })
            }
        } else {
            this.addChild(effect);
        }
    }

    private processBeamEffect(data: BeamVisualKitEffectData) {

    }

    private onEffectLoaded() {
        this.effectsLoaded = this.effectObjects.every(x => x.isLoaded);
        if (this.isLoaded) {
            this.processCallbacks("loaded");
        }
    }
}