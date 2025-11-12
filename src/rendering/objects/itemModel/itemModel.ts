import { AABB, CharacterModel, Float3, Float44, ITexture, M2Model, RenderingEngine } from "@app/rendering";
import { InventoryType, ItemMetadata } from "@app/metadata";
import { CallbackFn, ICallbackManager, IImmediateCallbackable } from "@app/utils";

import { ParticeColorOverride, ParticleColorOverrides, WorldPositionedObject } from "../";


function parseIntToColor(val: number, dest: Float3) {
    return Float3.set(dest, ((val >> 16) & 255), ((val >> 8) & 255), ((val >> 0) & 255));
}

export type ItemModelCallbackType = "metadataLoaded" | "sectionTexturesLoaded" | "componentsLoaded" 

export class ItemModel extends WorldPositionedObject implements IImmediateCallbackable<ItemModelCallbackType> {
    fileId: number;
    displayInfoId: number;
    itemMetadata: ItemMetadata

    componentsLoaded: boolean;
    texturesLoaded: boolean;

    character?: CharacterModel;

    component1?: M2Model;
    component2?: M2Model;
    sectionTextures: { [key: number]: [ITexture, ITexture, ITexture]};

    callbackMgr: ICallbackManager<ItemModelCallbackType, ItemModel>

    private isInitialized: boolean;

    constructor(displayInfoId: number) {
        super();
        this.displayInfoId = displayInfoId;
        this.sectionTextures = { };
        this.isInitialized = false;
    }
    
    override initialize(engine: RenderingEngine): void {

        if (!this.isInitialized) {
            this.isInitialized = true;
            super.initialize(engine);
            this.engine.getItemMetadata(this.displayInfoId).then(this.onItemMetadataLoaded.bind(this));

            this.callbackMgr = this.engine.getCallbackManager(this);
        }
    }

    override get isLoaded(): boolean {
        return this.itemMetadata != null && this.componentsLoaded;
    }

    override update(deltaTime: number) {
        super.update(deltaTime);

        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.updateAttachedBones();
        
        if (this.component1) {
            this.component1.update(deltaTime);
        }

        if (this.component2) {
            this.component2.update(deltaTime);
        }
    }

    private updateAttachedBones() {
        if (!this.character || !this.character.isLoaded ||  (!this.component1 && !this.component2)) {
            return;
        }

        const characterBones = this.character.boneData;
        const parentBoneMap: { [key: number]: number} = {};
        for(let i = 0; i < characterBones.length; i++) {
            parentBoneMap[characterBones[i].crc] = i;
        }
        if (this.component1?.boneData?.length) {
            for(let i = 0; i < this.component1.boneData.length; i++) {
                const boneData = this.component1.boneData[i];
                const parentBoneIndex = parentBoneMap[boneData.crc];
                if (!parentBoneIndex) {
                    continue;
                }
                boneData.isOverriden = true;
                Float44.copy(characterBones[parentBoneIndex].positionMatrix, boneData.positionMatrix);
            }
        }
        if (this.component2?.boneData?.length) {
            for(let i = 0; i < this.component2.boneData.length; i++) {
                const boneData = this.component2.boneData[i];
                const parentBoneIndex = parentBoneMap[boneData.crc];
                if (!parentBoneIndex) {
                    continue;
                }
                boneData.isOverriden = true;
                Float44.copy(characterBones[parentBoneIndex].positionMatrix, boneData.positionMatrix);
            }
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

    equipTo(character: CharacterModel) {
        this.character = character;
        this.parent = character;
        this.character.children.push(this);
        this.updateModelMatrixFromParent();
        this.initialize(character.engine);
    }

    override dispose(): void {
        super.dispose();
        this.itemMetadata = null;
        this.character = null;
    }

    on(type: ItemModelCallbackType, fn: CallbackFn<ItemModel>, persistent = false): void {
        this.callbackMgr.addCallback(type, fn, persistent);
    }

    canExecuteCallback(type: ItemModelCallbackType): boolean {
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

        this.itemMetadata = metadata;
        const race = this.character ? this.character.race : 1;
        const gender = this.character ? this.character.gender : 0;
        const charClass = this.character ? this.character.class : 1;

        let particleColorOverride: ParticleColorOverrides = [null, null, null];
        if (metadata.particleColor) {
            for(let i = 0; i < metadata.particleColor.start.length; i++) {
                let override: ParticeColorOverride = [Float3.zero(), Float3.zero(), Float3.zero()];
                parseIntToColor(metadata.particleColor.start[i], override[0]);
                parseIntToColor(metadata.particleColor.mid[i], override[1]);
                parseIntToColor(metadata.particleColor.end[i], override[2]);
                particleColorOverride[i] = override;
            }
        }

        if (metadata.component1) {
            const position = this.itemMetadata.inventoryType === InventoryType.Shoulders ? 0 : -1;

            const fileId = this.engine.modelPickingStrategy(metadata.component1.modelFiles, position, race, gender, charClass);
            if (fileId) {
                const textureId = this.engine.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
                this.component1 = new M2Model(fileId);
                this.addChild(this.component1);
                // TODO: Test if it's always index 0 or type: 2 or w/e
                this.component1.setTexture(0, textureId);
                this.component1.on("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component1.particleColorOverrides = particleColorOverride;
                }
            }
        }

        if (metadata.component2) {
            const position = this.itemMetadata.inventoryType === InventoryType.Shoulders ? 1 : -1;

            const fileId = this.engine.modelPickingStrategy(metadata.component2.modelFiles, position, race, gender, charClass);
            if (fileId) {
                const textureId = this.engine.texturePickingStrategy(metadata.component1.textureFiles, race, gender, charClass)[0];
                this.component2 = new M2Model(fileId);
                this.addChild(this.component2);
                // TODO: Test if it's always index 0 or type: 2 or w/e
                this.component2.setTexture(0, textureId);
                this.component2.on("texturesLoaded", this.onComponentLoaded.bind(this))
                if (particleColorOverride) {
                    this.component2.particleColorOverrides = particleColorOverride;
                }
            }
        }


        if (metadata.componentSections) {
            const loadingPromises: Promise<void>[] = [];
            const unkTexture = this.engine.getSolidColorTexture([0,0,0,0]);
            for(const section of metadata.componentSections) {
                this.sectionTextures[section.section] = [unkTexture, unkTexture, unkTexture];
                const textureIds = this.engine.texturePickingStrategy(section.textures, race, gender, charClass);

                for(let i = 0; i < 2; i++) {
                    if (textureIds[i]) {
                        const promise = this.engine.getTexture(textureIds[i]).then((texture) => {
                            this.sectionTextures[section.section][i] = texture;
                        });
                        loadingPromises.push(promise);
                    }
                }
            }
            Promise.all(loadingPromises).then(this.onTexturesLoaded.bind(this));
        }

        this.callbackMgr.processCallbacks("metadataLoaded")
    }

    private onComponentLoaded() {
        if (this.component1 && !this.component1.isLoaded) {
            return;
        }
        if (this.component2 && !this.component2.isLoaded) {
            return;
        }

        this.componentsLoaded = true;
        if (!this.parent) {
            if (this.component1 || this.component2) {
                let bb: AABB;
                if (this.component1 &&  this.component2) {
                    bb = AABB.merge(this.component1.worldBoundingBox, this.component2.worldBoundingBox);
                } else {
                    bb = this.component1 ? this.component1.worldBoundingBox : this.component2.worldBoundingBox;
                }
                this.engine.sceneCamera.resizeForBoundingBox(bb);
            }
        }

        this.callbackMgr.processCallbacks("componentsLoaded");
    }

    private onTexturesLoaded() {
        this.texturesLoaded = true;
        this.callbackMgr.processCallbacks("sectionTexturesLoaded");
    }
}