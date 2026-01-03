import { AABB, Float3 } from "@app/math"; 
import { InventoryType, ItemMetadata, RecordIdentifier } from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";
import { IModelPickingStrategy, ITexturePickingStrategy } from "@app/rendering/strategies";
import { IDataManager, IIoCContainer, IObjectFactory, IRenderer } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";
import { ICharacterModel } from "../characterModel";
import { IM2Model, ParticleColorOverride, ParticleColorOverrides } from "../m2Model";

import { IItemModel, ItemModelEvents } from "./interfaces";
import { IItemVisual } from "../itemVisual";
import { ISpellVisualKit } from "../spellVisualKit";

function parseIntToColor(val: number, dest: Float3) {
    return Float3.set(dest, ((val >> 16) & 255), ((val >> 8) & 255), ((val >> 0) & 255));
}
export class ItemModel<TParentEvent extends string = never> extends WorldPositionedObject<TParentEvent | ItemModelEvents> implements IItemModel<TParentEvent> {
    displayInfoId: RecordIdentifier;
    itemMetadata: ItemMetadata

    componentsLoaded: boolean;
    texturesLoaded: boolean;

    character?: ICharacterModel<never>;

    component1?: IM2Model;
    component2?: IM2Model;
    stateSpellVisualKit?: ISpellVisualKit;
    unsheathedSpellVisualKit?: ISpellVisualKit;
    sheathedSpellVisualKit?: ISpellVisualKit;

    sectionTextures: { [key: number]: [ITexture, ITexture, ITexture] };

    component1Texture?: ITexture;
    component2Texture?: ITexture;

    private texturePickingStrategy: ITexturePickingStrategy;
    private modelPickingStrategy: IModelPickingStrategy;
    private objectFactory: IObjectFactory;
    private dataManager: IDataManager;
    private itemVisual: IItemVisual;

    constructor(dataManager: IDataManager, objectFactory: IObjectFactory, texturePickingStrategy: ITexturePickingStrategy, modelPickingStrategy: IModelPickingStrategy) {
        super();
        this.sectionTextures = { };

        this.texturePickingStrategy = texturePickingStrategy;
        this.modelPickingStrategy = modelPickingStrategy;
        this.objectFactory = objectFactory;
        this.dataManager = dataManager;
    }
    
    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        if (this.displayInfoId && !this.isLoaded) {
            this.dataManager.getItemMetadata(this.displayInfoId).then(this.onItemMetadataLoaded.bind(this));
        }
    }

    override get isLoaded(): boolean {
        return this.itemMetadata != null && this.texturesLoaded && this.componentsLoaded && (!this.itemVisual || this.itemVisual.isLoaded);
    }

    get classId(): number {
        return this.itemMetadata?.classId;
    }

    get subClassId(): number {
        return this.itemMetadata?.subclassId;
    }

    get inventoryType(): number {
        return this.itemMetadata?.inventoryType;
    }

    loadDisplayInfoId(displayInfoId: RecordIdentifier) {
        if (this.displayInfoId === displayInfoId) {
            return;
        }

        this.displayInfoId = displayInfoId;
        if (this.renderer) {
            this.dataManager.getItemMetadata(this.displayInfoId).then(this.onItemMetadataLoaded.bind(this));
        }
    }

    override update(deltaTime: number) {
        super.update(deltaTime);

        if (!this.isLoaded || this.isDisposing) {
            return;
        }
        
        if (this.component1) {
            this.component1.update(deltaTime);
        }

        if (this.component2) {
            this.component2.update(deltaTime);
        }

        if (this.itemVisual) {
            this.itemVisual.update(deltaTime);
        }

        if (this.stateSpellVisualKit) {
            this.stateSpellVisualKit.update(deltaTime);
        }

        // TODO: Handle sheathed spell visual kit
        if (this.sheathedSpellVisualKit) {
            // this.sheathedSpellVisualKit.update(deltaTime);
        }

        if (this.unsheathedSpellVisualKit) {
            this.unsheathedSpellVisualKit.update(deltaTime);
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        if (this.component1) {
            this.component1.draw();
        }

        if (this.component2) {
            this.component2.draw();
        }

        if (this.itemVisual) {
            this.itemVisual.draw();
        }

        if (this.stateSpellVisualKit) {
            this.stateSpellVisualKit.draw();
        }

        // TODO: Handle sheathed spell visual kit
        if (this.sheathedSpellVisualKit) {
            // this.sheathedSpellVisualKit.draw();
        }

        if (this.unsheathedSpellVisualKit) {
            this.unsheathedSpellVisualKit.draw();
        }
    }

    equipTo(character: ICharacterModel) {
        if (this.isDisposing) {
            return;
        }

        this.character = character;
        this.parent = character;
        this.character.addChild(this);
        this.updateModelMatrixFromParent();
    }
    
    setItemVisual(itemVisualId: RecordIdentifier) {
        if (this.itemVisual) {
            if (this.itemVisual.itemVisualId === itemVisualId) {
                return;
            }
            this.itemVisual.dispose();
        } 
        
        const itemVisual = this.objectFactory.createItemVisual(itemVisualId);
        itemVisual.once("loaded", () => {
            if (this.isLoaded) {
                this.processCallbacks("loaded");
            }
        })
        this.itemVisual = itemVisual;
        itemVisual.attachTo(this);
        return itemVisual;
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.itemMetadata = null;
        this.character = null;
        if (this.component1) {
            this.component1.dispose();
        }
        this.component1 = null;
        if (this.component2) {
            this.component2.dispose();
        }
        this.component2 = null;
        if (this.stateSpellVisualKit) {
            this.stateSpellVisualKit.dispose();
        }
        this.stateSpellVisualKit = null;
        if (this.sheathedSpellVisualKit) {
            this.sheathedSpellVisualKit.dispose();
        }
        this.sheathedSpellVisualKit = null;
        if (this.unsheathedSpellVisualKit) {
            this.unsheathedSpellVisualKit.dispose();
        }
        this.unsheathedSpellVisualKit = null;
        this.sectionTextures = null;
        this.component1Texture = null;
        this.component2Texture = null;
    }

    protected override canExecuteCallbackNow(type: ItemModelEvents): boolean {
        switch(type) {
            case "metadataLoaded": return this.itemMetadata != null;
            case "componentsLoaded": return this.componentsLoaded;
            case "sectionTexturesLoaded": return this.texturesLoaded;
            default: return super.canExecuteCallbackNow(type);
        }
    }

    private onItemMetadataLoaded(metadata: ItemMetadata) {
        if (!metadata) {
            this.dispose();
            return;
        }
        
        if (this.isDisposing) {
            return;
        }

        this.itemMetadata = metadata;
        const race = this.character ? this.character.race : 1;
        const gender = this.character ? this.character.gender : 0;
        const charClass = this.character ? this.character.class : 1;

        let particleColorOverride: ParticleColorOverrides = [null, null, null];
        if (metadata.particleColor) {
            for(let i = 0; i < metadata.particleColor.start.length; i++) {
                let override: ParticleColorOverride = [Float3.zero(), Float3.zero(), Float3.zero()];
                parseIntToColor(metadata.particleColor.start[i], override[0]);
                parseIntToColor(metadata.particleColor.mid[i], override[1]);
                parseIntToColor(metadata.particleColor.end[i], override[2]);
                particleColorOverride[i] = override;
            }
        }

        const textureLoadingPromises: Promise<void>[] = []; 

        if (metadata.component1) {
            const position = this.itemMetadata.inventoryType === InventoryType.Shoulders ? 0 : -1;

            const modelFileId = this.modelPickingStrategy(metadata.component1.modelFiles, position, race, gender, charClass);
            const textureFileId = this.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
            if (textureFileId) {
                this.component1Texture = this.renderer.getUnknownTexture();
                const promise = this.renderer.getTexture(this, textureFileId).then((texture) => {
                    this.component1Texture = texture;
                    if (this.component1) {
                        // TODO: Test if it's always index 0 or type: 2 or w/e
                        this.component1.swapTextureType(2, texture);
                    }
                });
                textureLoadingPromises.push(promise);
            }
            if (modelFileId) {
                this.component1 = this.objectFactory.createM2Model(modelFileId);
                this.addChild(this.component1);
                this.component1.once("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component1.setParticleColorOverride(particleColorOverride);
                }
            }
        }

        if (metadata.component2) {
            const position = this.itemMetadata.inventoryType === InventoryType.Shoulders ? 1 : -1;

            const modelFileId = this.modelPickingStrategy(metadata.component1.modelFiles, position, race, gender, charClass);
            const textureFileId = this.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
            if (textureFileId) {
                this.component2Texture = this.renderer.getUnknownTexture();
                const promise = this.renderer.getTexture(this, textureFileId).then((texture) => {
                    this.component2Texture = texture;
                    if (this.component2) {
                        // TODO: Test if it's always index 0 or type: 2 or w/e
                        this.component2.swapTextureType(2, texture);
                    }
                });
                textureLoadingPromises.push(promise);
            }
            if (modelFileId) {
                this.component2 = this.objectFactory.createM2Model(modelFileId);
                this.addChild(this.component2);
                this.component2.once("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component2.setParticleColorOverride(particleColorOverride);
                }
            }
        }

        if (metadata.componentSections) {
            for(const section of metadata.componentSections) {
                this.sectionTextures[section.section] = [null, null, null];
                const textureIds = this.texturePickingStrategy(section.textures, race, gender, charClass);

                for(let i = 0; i < 2; i++) {
                    if (textureIds[i]) {
                        const promise = this.renderer.getTexture(this, textureIds[i]).then((texture) => {
                            this.sectionTextures[section.section][i] = texture;
                        });
                        textureLoadingPromises.push(promise);
                    }
                }
            }
        }

        if (metadata.itemVisual) {
            this.setItemVisual(metadata.itemVisual);
        }

        if (metadata.stateSpellVisualKitId) {
            this.stateSpellVisualKit = this.objectFactory.createSpellVisualKit(metadata.stateSpellVisualKitId);
            // TODO: Check if spell visual kit is attached to character or item model.
            if (this.character) {
                this.stateSpellVisualKit.attachTo(this.character);
            } else {
                this.stateSpellVisualKit.attachToRenderer(this.renderer);
            }
        }

        this.processCallbacks("metadataLoaded")
        Promise.all(textureLoadingPromises).then(this.onTexturesLoaded.bind(this));
        this.onComponentLoaded();
    }

    private onComponentLoaded() {
        if (this.isDisposing) {
            return;
        }
        if (this.component1 && !this.component1.isLoaded) {
            return;
        }
        if (this.component2 && !this.component2.isLoaded) {
            return;
        }

        this.componentsLoaded = true;
        if (this.component1 || this.component2) {
            let bb: AABB;
            if (this.component1 &&  this.component2) {
                bb = AABB.merge(this.component1.worldBoundingBox, this.component2.worldBoundingBox);
            } else {
                bb = this.component1 ? this.component1.worldBoundingBox : this.component2.worldBoundingBox;
            }
            this.setBoundingBox(bb);
        }

        this.processCallbacks("componentsLoaded");
        if (this.isLoaded) {
            this.processCallbacks("loaded");
        }
    }

    private onTexturesLoaded() {
        if (this.isDisposing) {
            return;
        }
        this.texturesLoaded = true;
        this.processCallbacks("sectionTexturesLoaded");
        if (this.isLoaded) {
            this.processCallbacks("loaded");
        }
    }
}