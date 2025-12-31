import { 
    CharacterCustomizationChoiceData, CharacterCustomizationElementData,
    CharacterCustomizationtItemGeoModifyData,
    CharacterMetadata, 
    FileIdentifier,
    RecordIdentifier
} from "@app/metadata";
import { ITexture } from "@app/rendering/graphics";
import { IDataManager, IObjectFactory, IRenderer } from "@app/rendering/interfaces";
import { ITexturePickingStrategy } from "@app/rendering/strategies";

import { IItemModel } from "../itemModel";
import { AnimationState, IM2Model, M2Model } from "../m2Model";

import { SkinLayerTextureCombiner } from "./skinLayerTextureCombiner";
import { CharacterModelEvents, EquipmentSlot, GeoSet, ICharacterModel, TextureSection } from "./interfaces"
import { CharacterInventory } from "./characterInventory";
import { IPseudoRandomNumberGenerator } from "@app/math";

const OFFHAND_BONE_IDS = [13, 14, 15, 16, 17, 88, 89];
const MAINHAND_BONE_IDS = [8, 9, 10, 11, 12, 86, 87];

const DEFAULT_GEOSET_IDS = [1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 2, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export class CharacterModel<TParentEvent extends string = never> extends M2Model<TParentEvent | CharacterModelEvents> implements ICharacterModel<TParentEvent> {
    modelId: RecordIdentifier;
    race: number;
    gender: number;
    class: number;

    characterMetadata: CharacterMetadata;
    customizationChoices: CharacterCustomizationChoiceData[];
    itemGeoModifyData: CharacterCustomizationtItemGeoModifyData[]
    customizationGeosets: { [key: number]: number};

    private textureLayerBaseFileIds: { [key: string]: [number, number, number] }
    textureLayerBaseTextures: { [key: string]: [ITexture, ITexture, ITexture] }
    textureLayerCombiners: { [key: string]: SkinLayerTextureCombiner }
    private skinnedModels: { [key: FileIdentifier]: IM2Model }
    private inventory: CharacterInventory;
    private texturePickingStrategy: ITexturePickingStrategy;
    private objectFactory: IObjectFactory;

    constructor(dataManager: IDataManager, rng: IPseudoRandomNumberGenerator, objectFactory: IObjectFactory, texturePickingStrategy: ITexturePickingStrategy) {
        super(dataManager, rng);
        this.class = 0;

        this.inventory = new CharacterInventory(this, objectFactory);
        this.texturePickingStrategy = texturePickingStrategy;
        this.objectFactory = objectFactory;
    }
    
    override attachToRenderer(renderer: IRenderer): void {
        super.attachToRenderer(renderer);
        if (this.modelId) {
            this.dataManager.getCharacterMetadata(this.modelId).then(this.onCharacterMetadataLoaded.bind(this));
        }
    }

    loadModelId(modelId: RecordIdentifier) {
        this.modelId = modelId;
        this.gender = (modelId-1) % 2;
        this.race = Math.ceil(modelId / 2);

        this.textureLayerBaseFileIds = {};
        this.textureLayerBaseTextures = {};
        this.textureLayerCombiners = {};
        this.skinnedModels = {};
        if (this.renderer) {
            this.dataManager.getCharacterMetadata(this.modelId).then(this.onCharacterMetadataLoaded.bind(this));
        }
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.characterMetadata = null;
        this.customizationChoices = null;
        this.itemGeoModifyData = null;
        this.customizationGeosets = null;
        this.textureLayerBaseFileIds = null;
        this.textureLayerBaseTextures = null;
        for(const key in this.textureLayerCombiners) {
            this.textureLayerCombiners[key].dispose();
        }
        this.textureLayerCombiners = null;
        for(const key in this.skinnedModels) {
            this.skinnedModels[key].dispose();
        }
        this.skinnedModels = null;
        this.inventory.dispose();
        this.inventory = null;
    }

    override get isLoaded(): boolean {
        return super.isLoaded && this.skinLayerTexturesLoaded;
    }

    get customizationData() {
        return this.characterMetadata.characterCustomizationData;
    }

    get skinLayerTexturesLoaded() {
        if (!this.characterMetadata) {
            return false;
        }

        for(const key in this.textureLayerBaseFileIds) {
            const fileIds = this.textureLayerBaseFileIds[key];
            for(let i = 0; i < fileIds.length; i++) {
                if (this.textureLayerBaseTextures[key][i]?.fileId != fileIds[i]) {
                    return false;
                }
            }
        }
        return true;
    }

    override update(deltaTime: number) {
        if (this.isDisposing) {
            return;
        }

        super.update(deltaTime);

        this.inventory.update(deltaTime);

        for(const fileId in this.skinnedModels) {
            this.skinnedModels[fileId].update(deltaTime);
        }
    }

    override draw() {
        if (this.isDisposing || !this.isLoaded) {
            return;
        }

        super.draw();

        this.inventory.draw();
        
        for(const fileId in this.skinnedModels) {
            this.skinnedModels[fileId].draw();
        }
    }

    protected override canExecuteCallbackNow(type: CharacterModelEvents): boolean {
        if (this.isDisposing) {
            return false;
        }
        switch(type) {
            case "characterMetadataLoaded": return this.characterMetadata != null;
            case "skinTexturesLoaded": return this.skinLayerTexturesLoaded;
            default: return super.canExecuteCallbackNow(type);
        }
    }

    setCustomizationChoice(optionId: number, choiceId: number) {
        if (this.isDisposing) {
            return;
        }
        this.once("characterMetadataLoaded", () => {
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

    equipItem(slot: EquipmentSlot, displayId1: number): IItemModel;
    equipItem(slot: EquipmentSlot, displayId1: number, displayId2: number): [IItemModel, IItemModel];
    equipItem(slot: EquipmentSlot, displayId1: number, displayId2?: number) {
        if (this.isDisposing) {
            return;
        }
        return this.inventory.equipItem(slot, displayId1, displayId2);
    }

    unequipItem(slot: EquipmentSlot) {
        if (this.isDisposing) {
            return;
        }
        this.inventory.unequipItem(slot);
    }

    reloadSkinTextures() {
        if (this.skinLayerTexturesLoaded) {
            this.updateSkinTextures();
        }
    }

    updateGeosets() {
        if (this.isDisposing) {
            return;
        }
        this.once("texturesLoaded", () => { 
            this.onGeosetUpdate();
        });
    }

    setHandAnimation(mainHand: boolean, closed: boolean) {
        this.once("modelDataLoaded", () => {
            const boneIds = mainHand ? MAINHAND_BONE_IDS : OFFHAND_BONE_IDS;
            for(const boneId of boneIds) {
                const bone = this.getBoneById(boneId);
                if (!bone) {
                    continue;
                }
                if (!bone.animationState) {
                    bone.animationState = new AnimationState(this.modelData.animations, this.modelData.globalLoops);
                }
                bone.animationState.useAnimation(closed ? 15 : 0);
            }
        })
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

        this.loadFileId(data.fileDataId);

        this.loadSkinnedModels();
        this.setDefaultCustomizations();
        this.applyCustomizations();
        this.processCallbacks("characterMetadataLoaded");
    }

    private setDefaultCustomizations() {
        if (this.isDisposing) {
            return;
        }
        this.customizationChoices = [];
        for (const opt of this.customizationData.options) {
            this.customizationChoices.push(opt.choices[0]);
        }
    }

    private applyCustomizations() {
        if (this.isDisposing) {
            return;
        }

        this.itemGeoModifyData = [];
        let boneFileId: FileIdentifier = 0;
        let modelFileId = this.characterMetadata.fileDataId;

        const elemApplicable = (elem: CharacterCustomizationElementData) => 
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
                const textureIds = this.texturePickingStrategy(elem.material.textureFiles, this.race, this.gender, this.class)
                if(!textureIds[0]) {
                    continue;
                }

                const textureLayer = this.customizationData.textureLayers.find(
                    (layer) => layer.chrModelTextureTargetId === elem.material.chrModelTextureTargetId
                );
                if (!textureLayer) {
                    continue;
                }
                
                newSkinLayerTextures[textureLayer.layer] = textureIds
            }
            
            
            const geoSetElements = applicableElements.filter(elem => elem.geoset);
            geoSetElements.sort((a,b) => a.geoset.geosetType - b.geoset.geosetType || a.geoset.geosetId - b.geoset.geosetId)
            for(const elem of geoSetElements) {
                this.customizationGeosets[elem.geoset.geosetType] = elem.geoset.geosetId
            }

            const skinnedModelElements = applicableElements.filter(elem => elem.skinnedModel);
            for(const elem of skinnedModelElements) {
                const model = this.skinnedModels[elem.skinnedModel.collectionsFileDataId];
                model.toggleGeosets(0, 5300, false);
                model.toggleGeoset(elem.skinnedModel.geosetType * 100 + elem.skinnedModel.geosetId, true);
            }

            const custItemGeoModifyElements = applicableElements.filter(elem => elem.custItemGeoModify);
            for(const elem of custItemGeoModifyElements) {
                this.itemGeoModifyData.push(elem.custItemGeoModify);
            }

            const conditionalModelElement = applicableElements.find(elem => elem.conditionalModelFileDataId != 0);
            if (conditionalModelElement) {
                modelFileId = conditionalModelElement.conditionalModelFileDataId;
            }
        }

        this.loadBoneFile(boneFileId);
        this.loadFileId(modelFileId);
        this.loadSkinTextures(newSkinLayerTextures);
        this.updateGeosets();
    }

    private loadSkinTextures(newSkinLayers: { [key: string]: [number, number, number] }) {
        if (this.isDisposing) {
            return;
        }

        this.textureLayerBaseFileIds = { };
        this.textureLayerBaseTextures = { };
        const toLoad: string[] = [];
        for(const key in newSkinLayers) {
            const layer = this.customizationData.textureLayers[parseInt(key, 10)];
            const material = this.customizationData.modelMaterials.find(x => x.textureType === layer.textureType)
            if (!this.textureLayerCombiners[layer.textureType]) {
                this.textureLayerCombiners[layer.textureType] = new SkinLayerTextureCombiner(this, layer.textureType, material.width, material.height)
            }

            this.textureLayerBaseFileIds[key] = newSkinLayers[key];
            this.textureLayerBaseTextures[key] = [null, null, null];
            toLoad.push(key);
        }

        const promises = [];
        for(const key of toLoad) {
            for(let j = 0; j < 3; j++) {
                const fileId = newSkinLayers[key][j];
                if (fileId) {
                    promises.push(this.renderer.getTexture(this, fileId).then((texture) => {
                        const currentFileIds = this.textureLayerBaseFileIds[key];
                        if (currentFileIds && currentFileIds[j] === texture.fileId) {
                            this.textureLayerBaseTextures[key][j] = texture;
                        }
                    }))
                }
            } 
        }
        Promise.all(promises).then(this.onSkinTexturesLoaded.bind(this));
    }

    private onSkinTexturesLoaded() {
        if (this.isDisposing) {
            return;
        }

        this.updateSkinTextures();
        this.processCallbacks("skinTexturesLoaded");
        if (this.isLoaded) {
            this.processCallbacks("loaded");
        }
    }

    private updateSkinTextures() {
        if (this.isDisposing) {
            return;
        }

        if (!this.skinLayerTexturesLoaded) {
            return;
        }

        for(const key in this.textureLayerCombiners) {
            this.textureLayerCombiners[key].clear();
        }

        // Draw base layers
        const [shouldDrawTop, shouldDrawBottom] = this.inventory.shouldDrawUnderwear();
        const layers = this.customizationData.textureLayers.sort((a,b) => a.layer - b.layer);
        for(const layer of layers) {
            if (!this.textureLayerBaseFileIds[layer.layer]) {
                continue;
            }

            const combiner = this.textureLayerCombiners[layer.textureType];
            if (!combiner) {
                continue;
            }

            // skip base upper torso if equipment draws there
            if (layer.textureSection === 3 && !shouldDrawTop) {
                continue;
            }

            // skip base lower torso if equipment draws there
            if (layer.textureSection === 5 && !shouldDrawBottom) {
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

        const inventoryTextures = this.inventory.getItemTextures();
        for(const section in inventoryTextures) {
            const sectionNr = parseInt(section, 10) as TextureSection;
            // TODO: Check if it's always layer 1
            const combiner = this.textureLayerCombiners[1];
            if (!combiner) {
                continue;
            }

            const textureSection = this.customizationData.textureSections.find(x => x.sectionType === parseInt(section, 10));
            if (!textureSection) {
                continue;
            }

            for(const item of inventoryTextures[sectionNr]) {
                combiner.drawTextureSection(item, textureSection.x, textureSection.y, textureSection.width,textureSection.height, 0);
            }
        }

        // Cloaks are unusual in that they use a geoset in the model without a normal skin section texture
        const cloakItem = this.inventory.inventoryData[EquipmentSlot.Back];
        if(cloakItem) {
            this.swapTextureType(2, cloakItem.model1.component1Texture);
        }
        
        this.once("texturesLoaded", () => {
            for(const key in this.textureLayerCombiners) {
                this.swapTextureType(parseInt(key, 10), this.textureLayerCombiners[key].outputTexture);
            }
        })
    }

    private onGeosetUpdate() {
        if (this.isDisposing) {
            return;
        }

        this.toggleGeosets(0, 5300, false);
        const geosetIds = [...DEFAULT_GEOSET_IDS];
        for(const geoSetType in this.customizationGeosets) {
            geosetIds[parseInt(geoSetType, 10)] = this.customizationGeosets[geoSetType];
        }
        for(let i = 0; i < geosetIds.length; i++) {
            this.toggleGeoset(i * 100 + geosetIds[i], true);
        }
        const equipmentToggles = this.inventory.getGeosetToggles();
        for(const key in equipmentToggles) {
            const group = parseInt(key, 10);
            let val = equipmentToggles[group as GeoSet];

            for(const override of this.itemGeoModifyData) {
                if (override.geosetType === group && override.original === val) {
                    val = override.override;
                    break;
                }
            }

            this.toggleGeosets(group * 100, (group+1) * 100 -1, false);
            if (val > -1) {
                this.toggleGeoset(group * 100 + val, true);
            }
        }
        this.toggleGeoset(0, true);
    }

    private loadSkinnedModels() {
        if (this.isDisposing) {
            return;
        }

        const skinnedModelFileIds = this.customizationData.options
            .reduce((acc, x) => acc.concat(x.choices
                .reduce((acc2, y) => acc2.concat(y.elements
                    .filter(z => z.skinnedModel).map(z => z.skinnedModel.collectionsFileDataId)), 
                [])), 
            []);
        const fileIds = new Set(skinnedModelFileIds);
        if (fileIds.size != 0) {
            for(const fileId of fileIds) {
                const model = this.objectFactory.createM2Model(fileId);
                this.addChild(model);
                model.attachTo(this);
                model.toggleGeosets(0, 5300, false);
                this.skinnedModels[fileId] = model;
            }
        }
    }
}