import { AABB, Float3 } from "@app/math"; 
import { InventoryType, ItemMetadata } from "@app/metadata";
import { CallbackFn, ICallbackManager } from "@app/utils";
import { ITexture } from "@app/rendering/graphics";
import { IRenderingEngine } from "@app/rendering/interfaces";

import { WorldPositionedObject } from "../worldPositionedObject";
import { ICharacterModel } from "../characterModel";
import { M2Model, IM2Model, ParticleColorOverride, ParticleColorOverrides } from "../m2Model";

import { IItemModel, ItemModelCallbackType } from "./interfaces";

function parseIntToColor(val: number, dest: Float3) {
    return Float3.set(dest, ((val >> 16) & 255), ((val >> 8) & 255), ((val >> 0) & 255));
}
export class ItemModel extends WorldPositionedObject implements IItemModel{
    fileId: number;
    displayInfoId: number;
    itemMetadata: ItemMetadata

    componentsLoaded: boolean;
    texturesLoaded: boolean;

    character?: ICharacterModel;

    component1?: IM2Model;
    component2?: IM2Model;
    sectionTextures: { [key: number]: [ITexture, ITexture, ITexture] };

    component1Texture?: ITexture;
    component2Texture?: ITexture;

    callbackMgr: ICallbackManager<ItemModelCallbackType, ItemModel>

    private isInitialized: boolean;

    constructor(displayInfoId: number) {
        super();
        this.displayInfoId = displayInfoId;
        this.sectionTextures = { };
        this.isInitialized = false;
    }
    
    override initialize(engine: IRenderingEngine): void {
        if (!this.isInitialized) {
            this.isInitialized = true;
            super.initialize(engine);
            this.engine.getItemMetadata(this.displayInfoId).then(this.onItemMetadataLoaded.bind(this));

            this.callbackMgr = this.engine.getCallbackManager(this);
        }
    }

    override get isLoaded(): boolean {
        return this.itemMetadata != null && this.texturesLoaded && this.componentsLoaded;
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
    }

    equipTo(character: ICharacterModel) {
        if (this.isDisposing) {
            return;
        }

        this.character = character;
        this.parent = character;
        this.character.children.push(this);
        this.updateModelMatrixFromParent();
        this.initialize(character.engine);
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
        this.sectionTextures = null;
        this.component1Texture = null;
        this.component2Texture = null;
        this.callbackMgr = null;
    }

    on(type: ItemModelCallbackType, fn: CallbackFn<ItemModel>, persistent = false): void {
        if (this.isDisposing) {
            return;
        }

        this.callbackMgr.addCallback(type, fn, persistent);
    }

    canExecuteCallback(type: ItemModelCallbackType): boolean {
        if (this.isDisposing) {
            return false;
        }

        let dataNeeded: unknown;
        switch(type) {
            case "metadataLoaded": dataNeeded = this.itemMetadata; break;
            case "componentsLoaded": dataNeeded = this.componentsLoaded; break;
            case "sectionTexturesLoaded": dataNeeded = this.texturesLoaded; break;
            default: dataNeeded = null; break;
        }
        return !!dataNeeded;
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

            const modelFileId = this.engine.modelPickingStrategy(metadata.component1.modelFiles, position, race, gender, charClass);
            const textureFileId = this.engine.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
            if (textureFileId) {
                this.component1Texture = this.engine.getUnknownTexture();
                const promise = this.engine.getTexture(textureFileId).then((texture) => {
                    this.component1Texture.swapFor(texture);
                    if (this.component1) {
                        // TODO: Test if it's always index 0 or type: 2 or w/e
                        this.component1.swapTextureType(2, texture);
                    }
                });
                textureLoadingPromises.push(promise);
            }
            if (modelFileId) {
                this.component1 = new M2Model(modelFileId);
                this.addChild(this.component1);
                this.component1.attachTo(this.character);
                this.component1.on("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component1.setParticleColorOverride(particleColorOverride);
                }
            }
        }

        if (metadata.component2) {
            const position = this.itemMetadata.inventoryType === InventoryType.Shoulders ? 1 : -1;

            const modelFileId = this.engine.modelPickingStrategy(metadata.component1.modelFiles, position, race, gender, charClass);
            const textureFileId = this.engine.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
            if (textureFileId) {
                this.component2Texture = this.engine.getUnknownTexture();
                const promise = this.engine.getTexture(textureFileId).then((texture) => {
                    this.component2Texture.swapFor(texture);
                    if (this.component2) {
                        // TODO: Test if it's always index 0 or type: 2 or w/e
                        this.component2.swapTextureType(2, texture);
                    }
                });
                textureLoadingPromises.push(promise);
            }
            if (modelFileId) {
                this.component2 = new M2Model(modelFileId);
                this.addChild(this.component2);
                this.component2.attachTo(this.character);
                this.component2.on("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component2.setParticleColorOverride(particleColorOverride);
                }
            }
        }

        if (metadata.componentSections) {
            const unkTexture = this.engine.getUnknownTexture();
            for(const section of metadata.componentSections) {
                this.sectionTextures[section.section] = [unkTexture, unkTexture, unkTexture];
                const textureIds = this.engine.texturePickingStrategy(section.textures, race, gender, charClass);

                for(let i = 0; i < 2; i++) {
                    if (textureIds[i]) {
                        const promise = this.engine.getTexture(textureIds[i]).then((texture) => {
                            this.sectionTextures[section.section][i] = texture;
                        });
                        textureLoadingPromises.push(promise);
                    }
                }
            }
        }

        this.callbackMgr.processCallbacks("metadataLoaded")
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

        this.callbackMgr.processCallbacks("componentsLoaded");
    }

    private onTexturesLoaded() {
        if (this.isDisposing) {
            return;
        }
        this.texturesLoaded = true;
        this.callbackMgr.processCallbacks("sectionTexturesLoaded");
    }
}