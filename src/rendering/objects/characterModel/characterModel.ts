import { 
    CharacterCustomizationOptionChoiceData, CharacterCustomizationOptionChoiceElementData,
    CharacterMetadata 
} from "@app/metadata";
import { RenderingEngine, ITexture } from "@app/rendering";

import { SkinLayerTextureCombiner } from "./skinLayerTextureCombiner";
import { M2Proxy } from "./m2Proxy";
import { CharacterInventory, EquipmentSlot } from "./characterInventory";
import { ICallbackManager, CallbackFn, IImmediateCallbackable } from "@app/utils";


const DEFAULT_GEOSET_IDS = [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 2, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export type CharacterModelCallbackType = "characterMetadataLoaded" | "modelDataLoaded" | "modelTexturesLoaded"

export class CharacterModel extends M2Proxy implements IImmediateCallbackable {
    fileId: number;
    modelId: number;
    race: number;
    gender: number;
    class: number;

    characterMetadata: CharacterMetadata;
    customizationChoices: CharacterCustomizationOptionChoiceData[];
    customizationGeosets: { [key: number]: number};


    private textureLayerBaseFileIds: { [key: string]: [number, number, number] }
    private textureLayerBaseTextures: { [key: string]: [ITexture, ITexture, ITexture] }
    private textureLayerCombiners: { [key: string]: SkinLayerTextureCombiner }
    private skinLayerTexturesLoaded: boolean;
    private inventory: CharacterInventory
    private callbackMgr: ICallbackManager<CharacterModel>;

    constructor(modelId: number) {
        super();
        this.modelId = modelId;
        this.gender = (modelId-1) % 2;
        this.race = Math.ceil(modelId / 2);
        this.class = 0;

        this.textureLayerBaseFileIds = {};
        this.textureLayerBaseTextures = {};
        this.textureLayerCombiners = {};
        this.skinLayerTexturesLoaded = false;
        this.inventory = new CharacterInventory(this);
    }
    
    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);

        this.callbackMgr = engine.getCallbackManager();
        this.callbackMgr.bind(this);
        this.engine.getCharacterMetadata(this.modelId).then(this.onCharacterMetadataLoaded.bind(this));
    }

    override dispose(): void {
        super.dispose();
        this.characterMetadata = null;
        this.customizationChoices = null;
        this.textureLayerBaseFileIds = null;
        this.textureLayerBaseTextures = null;
        this.textureLayerCombiners = null;
    }

    override get isLoaded(): boolean {
        return super.isLoaded && this.skinLayerTexturesLoaded;
    }

    get customizationData() {
        return this.characterMetadata.characterCustomizationData;
    }

    override update(deltaTime: number) {
        super.update(deltaTime);

        this.inventory.update(deltaTime);
    }

    override draw() {
        super.draw();

        this.inventory.draw();
    }
    
    on(type: CharacterModelCallbackType, fn: CallbackFn<CharacterModel>, persistent = false): void {
        this.callbackMgr.addCallback(type, fn, persistent);
    }

    canExecuteCallback(type: CharacterModelCallbackType): boolean {
        switch(type) {
            case "characterMetadataLoaded": return this.characterMetadata != null;
            case "modelDataLoaded": return this.modelData != null;
            case "modelTexturesLoaded": return this.textureObjects != null;
            default: return false;
        }
    }

    setCustomizationChoice(optionId: number, choiceId: number) {
        this.on("characterMetadataLoaded", () => {
            const optionIndex = this.characterMetadata.characterCustomizationData.options.findIndex(x => x.id === optionId);
            if (optionIndex < 0) {
                return;
            }

            const opt = this.characterMetadata.characterCustomizationData.options[optionIndex];
            const choice = opt.choices.find(x => x.id === choiceId);
            if (!choice) {
                return;
            }
            
            this.customizationChoices[optionIndex] = choice;
            this.applyCustomizations();
        })
    }

    equipItem(slot: EquipmentSlot, displayId1: number, displayId2?: number) {
        this.inventory.equipItem(slot, displayId1, displayId2);
    }

    private onCharacterMetadataLoaded(data: CharacterMetadata | null) {
        if (!data) {
            this.dispose();
            return;
        }
        if (this.isDisposing) {
            return;
        }

        this.characterMetadata = data;

        this.createM2Model(data.fileDataId, (model) => {
            model.on("modelDataLoaded", () => {
                this.callbackMgr.processCallbacks("modelDataLoaded")
            });
            model.on("texturesLoaded", () => {
                this.callbackMgr.processCallbacks("modelTexturesLoaded")
            });
        });
        this.setDefaultCustomizations();
        this.applyCustomizations();
        this.callbackMgr.processCallbacks("characterMetadataLoaded")
    }

    private setDefaultCustomizations() {
        this.customizationChoices = [];
        for (const opt of this.customizationData.options) {
            this.customizationChoices.push(opt.choices[0]);
        }
    }

    private applyCustomizations() {
        let boneFileId = 0;
        const elemApplicable = (elem: CharacterCustomizationOptionChoiceElementData) => 
            (elem.relationChoiceID == 0 || this.customizationChoices.some((choice) => choice.id == elem.relationChoiceID))
        
        this.customizationGeosets = {};
        const newSkinLayerTextures: { [key: string]: [number, number, number] } = { };
        for(const choice of this.customizationChoices) {
            const applicableElements = choice.elements.filter(elemApplicable);
            const boneSetElements = applicableElements.filter(elem => elem.boneSet);
            if (boneSetElements.length > 0) {
                boneFileId = boneSetElements[0].boneSet.boneFileDataId;
            }

            const materialElements = applicableElements.filter(elem => elem.material)
            materialElements.sort((a,b) => b.relationChoiceID - a.relationChoiceID)
            for(const elem of materialElements) {
                const textureIds = this.engine.texturePickingStrategy(elem.material.textureFiles, this.race, this.gender, this.class)
                // TODO: Apply fallback race
                if(!textureIds[0]) {
                    continue;
                }

                const textureLayer = this.customizationData.textureLayers.find(
                    (layer) => layer.chrModelTextureTargetId === elem.material.chrModelTextureTargetId
                );
                if (!textureLayer) {
                    continue;
                }
                
                // Load textures 

                newSkinLayerTextures[textureLayer.layer] = textureIds
            }
            
            
            const geoSetElements = applicableElements.filter(elem => elem.geoset);
            geoSetElements.sort((a,b) => a.geoset.geosetType - b.geoset.geosetType || a.geoset.geosetId - b.geoset.geosetId)
            for(const elem of geoSetElements) {
                this.customizationGeosets[elem.geoset.geosetType] = elem.geoset.geosetId
            }
            // TODO: Add skinnedModelElements as seperate models;
            // TODO: Process conditional elements && swap model if necessary
            // TODO: Process CustItemGeoModifyId && set ids;
        }

        this.loadSkinTextures(newSkinLayerTextures);
        this.updateGeosets();
    }

    private loadSkinTextures(newSkinLayers: { [key: string]: [number, number, number] }) {
        const toLoad: string[] = [];
        for(const key in newSkinLayers) {
            const currentIds = this.textureLayerBaseFileIds[key];
            const newIds = newSkinLayers[key];
            
            // TODO: Should this be inited somewhere else?
            const layer = this.customizationData.textureLayers[parseInt(key, 10)];
            const material = this.customizationData.modelMaterials.find(x => x.textureType === layer.textureType)
            if (!this.textureLayerCombiners[layer.textureType]) {
                this.textureLayerCombiners[layer.textureType] = new SkinLayerTextureCombiner(this, layer.textureType, material.width, material.height)
            }

            if (!currentIds || currentIds[0] !== newIds[0] || currentIds[1] !== newIds[1] || currentIds[2] !== newIds[2]) {
                this.textureLayerBaseFileIds[key] = newSkinLayers[key];
                this.textureLayerBaseTextures[key] = [null, null, null];
                toLoad.push(key);
            }
        }
        const promises = [];
        for(const key of toLoad) {
            for(let j = 0; j < 3; j++) {
                const fileId = newSkinLayers[key][j];
                if (fileId) {
                    promises.push(this.engine.getTexture(fileId).then((texture) => {
                        this.textureLayerBaseTextures[key][j] = texture;
                    }))
                }
            } 
        }
        Promise.all(promises).then(this.onSkinTexturesLoaded.bind(this));
    }

    private onSkinTexturesLoaded() {
        for(const key in this.textureLayerCombiners) {
            this.textureLayerCombiners[key].clear();
        }

        const layers = this.customizationData.textureLayers.sort((a,b) => a.chrModelTextureTargetId - b.chrModelTextureTargetId);
        for(const layer of layers) {
            if (!this.textureLayerBaseFileIds[layer.layer]) {
                continue;
            }

            const combiner = this.textureLayerCombiners[layer.textureType];
            if (!combiner) {
                continue;
            }

            let x,y, width,height;
            if (layer.textureSection === -1) {
                x = y= 0;
                width = combiner.width;
                height = combiner.height;
            }
            else {
                const section = this.customizationData.textureSections.find(x => x.sectionType === layer.textureSection)
                if (!section) {
                    continue;
                }

                x = section.x;
                y = section.y;
                width = section.width;
                height = section.height;
            }

            combiner.drawTextureSection(this.textureLayerBaseTextures[layer.layer], x, y, width, height, layer.blendMode);
        }

        this.on("modelTexturesLoaded", () => {
            for(const key in (this.textureLayerCombiners)) {
                const textureIndex = this.modelData.textures.findIndex(x => x.type === parseInt(key, 10));
                if (textureIndex < 0) {
                    return;
                }

                this.swapTexture(textureIndex, this.textureLayerCombiners[key].diffuseTexture);
            }
        })
        this.skinLayerTexturesLoaded = true;
    }

    private updateGeosets() {
        this.on("modelTexturesLoaded", () => {
            this.toggleGeosets(0, 5300, false);
            this.toggleGeoset(0, true);
            const geosetIds = [...DEFAULT_GEOSET_IDS];
            for(const geoSetType in this.customizationGeosets) {
                geosetIds[parseInt(geoSetType, 10)] = this.customizationGeosets[geoSetType];
            }
            for(let i = 0; i < geosetIds.length; i++) {
                this.toggleGeoset(i * 100 + geosetIds[i], true);
            }
        });
    }
}