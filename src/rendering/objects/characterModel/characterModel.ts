import { WoWModelData } from "@app/modeldata";
import { CharacterCustomizationOptionChoiceData, CharacterCustomizationOptionChoiceElementData, CharacterMetadata } from "@app/metadata";


import { M2Model } from "../m2Model";
import { WorldPositionedObject } from "../worldPositionedObject";
import { RenderingEngine } from "@app/rendering/engine";
import { ITexture } from "@app/rendering/graphics";

interface TextureLayerData {
    textureType: number,
    textureIds: [number, number, number]
}

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
    private textureLayers: { [key: string]: [number, number, number] }
    private customizationGeosets: { [key: number]: number};

    constructor(modelId: number) {
        super();
        this.modelId = modelId;
        this.gender = (modelId-1) % 2;
        this.race = Math.ceil(modelId / 2);
        this.class = -1;

        this.textureLayers = {};
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
        this.textureLayers = null;
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

    get isLoaded(): boolean {
        return this.m2Model && this.m2Model.isLoaded;
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
                this.textureLayers[textureLayer.layer] = textureIds
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

        this.loadSkinTextures();
        this.updateGeosets();
    }

    private loadSkinTextures() {
        for(const key in this.textureLayers) {
            const layer = this.characterMetadata.characterCustomizationData.textureLayers[parseInt(key, 10)];
            if (!layer) {
                continue;
            }
            if (layer.textureSection !== -1) {
                continue;
                // TODO: Overlay
            }
            
            this.m2Model.on("modelDataLoaded", () => {
                const textureIndex = this.m2Model.modelData.textures.findIndex(x => x.type === layer.textureType);
                if (textureIndex < 0) {
                    return;
                }
                this.m2Model.setTexture(textureIndex, this.textureLayers[key][0]);
            })
        }
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