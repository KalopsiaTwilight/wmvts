import { 
    CharacterCustomizationOptionChoiceData, CharacterCustomizationOptionChoiceElementData,
    CharacterMetadata 
} from "@app/metadata";
import { RenderingEngine, ITexture } from "@app/rendering";

import { M2Model } from "../m2Model";
import { WorldPositionedObject } from "../worldPositionedObject";
import { SkinLayerTextureCombiner } from "./skinLayerTextureCombiner";


const DEFAULT_GEOSET_IDS = [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 2, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export class CharacterModel extends WorldPositionedObject {
    fileId: number;
    modelId: number;
    race: number;
    gender: number;
    class: number;


    private characterMetadata: CharacterMetadata;
    private m2Model: M2Model;
    private customizationChoices: CharacterCustomizationOptionChoiceData[];
    private customizationGeosets: { [key: number]: number};


    private textureLayerBaseFileIds: { [key: string]: [number, number, number] }
    private textureLayerBaseTextures: { [key: string]: [ITexture, ITexture, ITexture] }
    private textureLayerCombiners: { [key: string]: SkinLayerTextureCombiner }
    private skinLayerTexturesLoaded: boolean;

    constructor(modelId: number) {
        super();
        this.modelId = modelId;
        this.gender = (modelId-1) % 2;
        this.race = Math.ceil(modelId / 2);
        this.class = 6;

        this.textureLayerBaseFileIds = {};
        this.textureLayerBaseTextures = {};
        this.textureLayerCombiners = {};
        this.skinLayerTexturesLoaded = false;
    }

    override update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        this.m2Model.update(deltaTime);
    }
    
    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);

        this.engine.getCharacterMetadata(this.modelId).then(this.onCharacterMetadataLoaded.bind(this));
    }

    override dispose(): void {
        super.dispose();
        if (this.m2Model) {
            this.m2Model.dispose();
        }
        this.characterMetadata = null;
        this.customizationChoices = null;
        this.textureLayerBaseFileIds = null;
        this.textureLayerBaseTextures = null;
        this.textureLayerCombiners = null;
    }

    draw(): void {
        this.m2Model.draw();
    }

    getAnimations(): number[] {
        return this.m2Model.getAnimations();
    }

    useAnimation(id: number) {
        this.m2Model.useAnimation(id);
    }

    pauseAnimation() {
        this.m2Model.pauseAnimation();
    }

    resumeAnimation() {
        this.m2Model.resumeAnimation();
    }

    setAnimationSpeed(speed: number) {
        this.m2Model.setAnimationSpeed(speed);
    }

    toggleGeoset(geosetId: number, show: boolean) {
        this.m2Model.toggleGeoset(geosetId, show);
    }

    toggleGeosets(start: number, end: number, show: boolean) {
        this.m2Model.toggleGeosets(start, end, show);
    }

    setCustomizationChoice(optionId: number, choiceId: number) {
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
    }

    get isLoaded(): boolean {
        return this.m2Model && this.m2Model.isLoaded && this.skinLayerTexturesLoaded;
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
        this.m2Model = new M2Model(data.fileDataId);
        this.m2Model.parent = this;
        this.m2Model.initialize(this.engine);

        if (!this.parent) {
            this.m2Model.on("modelDataLoaded", () => {
                this.engine.sceneCamera.resizeForBoundingBox(this.m2Model.worldBoundingBox);
            })
        }

        this.setDefaultCustomizations();
        this.applyCustomizations();
    }

    private setDefaultCustomizations() {
        this.customizationChoices = [];
        for (const opt of this.characterMetadata.characterCustomizationData.options) {
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

                const textureLayer = this.characterMetadata.characterCustomizationData.textureLayers.find(
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
            const layer = this.characterMetadata.characterCustomizationData.textureLayers[parseInt(key, 10)];
            const material = this.characterMetadata.characterCustomizationData.modelMaterials.find(x => x.textureType === layer.textureType)
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

        const layers = this.characterMetadata.characterCustomizationData.textureLayers.sort((a,b) => a.chrModelTextureTargetId - b.chrModelTextureTargetId);
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
                const section = this.characterMetadata.characterCustomizationData.textureSections.find(x => x.sectionType === layer.textureSection)
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

        
        this.m2Model.on("texturesLoaded", () => {
            for(const key in (this.textureLayerCombiners)) {
                const textureIndex = this.m2Model.modelData.textures.findIndex(x => x.type === parseInt(key, 10));
                if (textureIndex < 0) {
                    return;
                }
                this.m2Model.textureObjects[textureIndex].swapFor(this.textureLayerCombiners[key].diffuseTexture)
            }
        })
        this.skinLayerTexturesLoaded = true;
    }

    private updateGeosets() {
        this.m2Model.on("texturesLoaded", (model) => {
            model.toggleGeosets(0, 5300, false);
            model.toggleGeoset(0, true);
            const geosetIds = [...DEFAULT_GEOSET_IDS];
            for(const geoSetType in this.customizationGeosets) {
                geosetIds[parseInt(geoSetType, 10)] = this.customizationGeosets[geoSetType];
            }
            for(let i = 0; i < geosetIds.length; i++) {
                model.toggleGeoset(i * 100 + geosetIds[i], true);
            }
        }, true)
    }
}