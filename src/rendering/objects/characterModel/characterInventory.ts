
import { InventoryType, ItemFeatureFlag } from "@app/metadata";
import { Disposable } from "@app/disposable";
import { WoWAttachmentData } from "@app/modeldata";
import { Float44 } from "@app/math";
import { IDisposable } from "@app/interfaces";
import { IIoCContainer, IObjectFactory } from "@app/rendering/interfaces";

import { IItemModel } from "../itemModel";
import { IM2Model } from "../m2Model";

import { EquipmentSlot, GeoSet } from "./interfaces";
import { type CharacterModel } from "./characterModel";

export interface EquippedItemData {
    displayId1: number;
    displayId2?: number;

    attachmentIds: number[],
    attachments: WoWAttachmentData[];
    attachmentMatrices: Float44[];
    model1: IItemModel
    model2?: IItemModel;
} 

const equipmentSlotToGeosetsMap: { [key in EquipmentSlot]: GeoSet[] } = {
    [EquipmentSlot.Head]: [GeoSet.Helmet, GeoSet.Head],
    [EquipmentSlot.Neck]: [],
    [EquipmentSlot.Shoulders]: [GeoSet.Shoulders],
    [EquipmentSlot.Body]: [GeoSet.Sleeves, GeoSet.ShirtDoublet, GeoSet.LowerBody, GeoSet.Torso, GeoSet.ArmUpper],
    [EquipmentSlot.Shirt]: [GeoSet.Sleeves, GeoSet.ShirtDoublet],
    [EquipmentSlot.Waist]: [GeoSet.Belt],
    [EquipmentSlot.Legs]: [GeoSet.PantDoublet, GeoSet.Legcuffs, GeoSet.LowerBody],
    [EquipmentSlot.Feet]: [GeoSet.Boots, GeoSet.Feet],
    [EquipmentSlot.Wrists]: [GeoSet.HandAttachments],
    [EquipmentSlot.Hands]: [GeoSet.Wrists, GeoSet.HandAttachments],
    [EquipmentSlot.Finger1]: [],
    [EquipmentSlot.Finger2]: [],
    [EquipmentSlot.Trinket1]: [],
    [EquipmentSlot.Trinket2]: [],
    [EquipmentSlot.Back]: [GeoSet.Cloak],
    [EquipmentSlot.MainHand]: [],
    [EquipmentSlot.OffHand]: [],
    [EquipmentSlot.Ranged]: [],
    [EquipmentSlot.Tabard]: [GeoSet.Tabard],
    [EquipmentSlot.End]: [],
}


const slotToPriorityMap: { [key in EquipmentSlot]: number } = {
    [EquipmentSlot.Head]: 11,
    [EquipmentSlot.Neck]: 0,
    [EquipmentSlot.Shoulders]: 10,
    [EquipmentSlot.Body]: 5,
    [EquipmentSlot.Shirt]: 1,
    [EquipmentSlot.Waist]: 8,
    [EquipmentSlot.Legs]: 2,
    [EquipmentSlot.Feet]: 3,
    [EquipmentSlot.Wrists]: 4,
    [EquipmentSlot.Hands]: 6,
    [EquipmentSlot.Finger1]: 0,
    [EquipmentSlot.Finger2]: 0,
    [EquipmentSlot.Trinket1]: 0,
    [EquipmentSlot.Trinket2]: 0,
    [EquipmentSlot.Back]: 9,
    [EquipmentSlot.MainHand]: 0,
    [EquipmentSlot.OffHand]: 0,
    [EquipmentSlot.Ranged]: 0,
    [EquipmentSlot.Tabard]: 7,
    [EquipmentSlot.End]: 0,
}

export class CharacterInventory extends Disposable implements IDisposable {
    inventoryData: { [key in EquipmentSlot]?: EquippedItemData }
    parent: CharacterModel
    isDisposing: boolean;
    private objectFactory: IObjectFactory;

    get isLoaded() {
        for(const slot in this.inventoryData) {
            const data = this.inventoryData[slot as unknown as EquipmentSlot];
            if (!data.model1.isLoaded || (data.model2 && !data.model2.isLoaded)) {
                return false;
            }
        }
        return true;
    }

    constructor(parent: CharacterModel, iocContainer: IIoCContainer) {
        super();
        this.parent = parent;
        this.inventoryData = { };
        this.objectFactory = iocContainer.getObjectFactory();
    }

    equipItem(slot: EquipmentSlot, displayId1: number, displayId2?: number) {
        if (this.isDisposing) {
            return;
        }
        
        this.unloadItem(slot);

        const model1 = this.objectFactory.createItemModel(displayId1);
        model1.equipTo(this.parent);
        model1.once("metadataLoaded", (model: IItemModel) => {
            const attachments = this.getAttachmentIdsForSlot(slot, model.itemMetadata.inventoryType);
            this.inventoryData[slot].attachmentIds = attachments;
            this.inventoryData[slot].attachmentMatrices = attachments.map(() => Float44.identity());
            this.parent.once("modelDataLoaded", () => {
                const data = this.inventoryData[slot];
                data.attachments = data.attachmentIds.map(i => this.parent.modelData.attachments.find(x => x.id === i));
            })
        })
        model1.once("componentsLoaded", (model: IItemModel) => {
            this.updateAttachmentGeosets(slot, model);
        })
        model1.once("sectionTexturesLoaded", (model: IItemModel) => {
            for(const section in model.sectionTextures) {
                const sectionNr = parseInt(section, 10);
                let priority = slotToPriorityMap[slot];
                if (slot == EquipmentSlot.Hands && model.itemMetadata.geosetGroup[0] === 0) {
                    priority -= 2;
                }
                this.parent.setTexturesForSection(sectionNr, slot, priority, model.sectionTextures[section]);
            }
            this.parent.reloadSkinTextures();
            this.parent.updateGeosets();
        });

        let model2: IItemModel;
        if (displayId2) {
            model2 = this.objectFactory.createItemModel(displayId2);
            model2.equipTo(this.parent);
        }

        this.inventoryData[slot] = {
            displayId1,
            displayId2,
            model1,
            model2,
            attachmentIds: [],
            attachments: [],
            attachmentMatrices: []
        }
    }

    unequipItem(slot: EquipmentSlot) {
        if (this.isDisposing) {
            return;
        }
        this.unloadItem(slot);
    }

    update(deltaTime: number) {
        if (this.isDisposing) {
            return;
        }

        for(const slot in this.inventoryData) {
            const data = this.inventoryData[slot as unknown as EquipmentSlot];
            if (!data) {
                continue;
            }

            
            // TODO: Kinda ugly to do everything twice for different shoulder transmogs. Maybe consider override in itemmodel?
            this.updateComponentAttachments(data, data.model1);
            data.model1.update(deltaTime);


            if (data.model2) {
                this.updateComponentAttachments(data, data.model2);
                data.model2.update(deltaTime);
            }
        }
    }

    draw() {
        if (this.isDisposing) {
            return;
        }

        for(const slot in this.inventoryData) {
            const data = this.inventoryData[slot as unknown as EquipmentSlot];
            if (!data) {
                continue;
            }
            data.model1.draw();
            if (data.model2) {
                data.model2.draw();
            }
        }
    }

    dispose() {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        for(const slot in this.inventoryData) {
            this.unloadItem(slot as unknown as EquipmentSlot);
        }
        this.inventoryData = null;
        this.parent = null;
    }

    getGeosetToggles(): { [key in GeoSet]?: number }  {
        if (!this.isLoaded || this.isDisposing) {
            return { };
        }
        const geoSetMap: { [key in GeoSet]?: number } = {};

        const helmItem = this.inventoryData[EquipmentSlot.Head];
        if (helmItem) {
            const metadata = helmItem.model1.itemMetadata;
            const hideGeosetData = this.parent.gender === 0 ? metadata.hideGeoset1 : metadata.hideGeoset2;
            if (hideGeosetData) {
                for(const hideGeoset of hideGeosetData) {
                    if (hideGeoset.raceId !== this.parent.race) {
                        continue;
                    }
                    
                    geoSetMap[hideGeoset.geosetGroup as GeoSet] = -1;
                }
            }
        }

        // TODO: Process geoset override when handling 10.x and later, no data for it currently.

        const priorityOrderedSlots = Object.values(EquipmentSlot)
            .sort((a,b) => slotToPriorityMap[a as EquipmentSlot] - slotToPriorityMap[b as EquipmentSlot]) as EquipmentSlot[];
        for(const slot of priorityOrderedSlots) {
            const item = this.inventoryData[slot];
            if (!item) {
                continue;
            }

            const geoSets = equipmentSlotToGeosetsMap[slot];
            const itemGeosets = item.model1.itemMetadata.geosetGroup;
            for(let i = 0; i < geoSets.length; i++) {
                if (!itemGeosets[i]) {
                    continue;
                }

                geoSetMap[geoSets[i]] = itemGeosets[i] + 1;
            }
        }

        // Disable sleeves when wielding gloves
        const handItem = this.inventoryData[EquipmentSlot.Hands];
        if (handItem && handItem.model1.itemMetadata.geosetGroup[0]) {
            geoSetMap[GeoSet.Sleeves] = 1;
        }

        // Handle tabard special cases
        const tabardItem = this.inventoryData[EquipmentSlot.Tabard];
        if (tabardItem) {
            if(tabardItem.model1.itemMetadata.flags & ItemFeatureFlag.UnknownEffect1)
            {
                geoSetMap[GeoSet.Torso] = 2;
            }
            if (!geoSetMap[GeoSet.Tabard]) {
                const waistItem = this.inventoryData[EquipmentSlot.Waist];
                if (waistItem && (waistItem.model1.itemMetadata.flags & ItemFeatureFlag.DisableTabardGeo)) {
                    geoSetMap[GeoSet.Tabard] = 3;
                } else {
                    geoSetMap[GeoSet.Tabard] = 2;
                }
            }
        }

        const feetItem = this.inventoryData[EquipmentSlot.Feet];
        if (feetItem) {
            if (!geoSetMap[GeoSet.Feet] && feetItem.model1.itemMetadata.flags & ItemFeatureFlag.UnknownEffect1) {
                geoSetMap[GeoSet.Feet] = 2;
            } else { 
                geoSetMap[GeoSet.Feet] = 1;
            }
        } else {
            geoSetMap[GeoSet.Feet] = 1;
        }

        // Disable lower body stuff if robe geo is set.
        if (geoSetMap[GeoSet.LowerBody]) {
            geoSetMap[GeoSet.Legcuffs] = 1;
            geoSetMap[GeoSet.PantDoublet] = 1;
            geoSetMap[GeoSet.Boots] = 1;
            geoSetMap[GeoSet.Tabard] = 1;
        }

        return geoSetMap;
    }

    private updateAttachmentGeosets(slot: EquipmentSlot, model: IItemModel) {
        if (this.isDisposing) {
            return;
        }
        
        const itemMeta = model.itemMetadata;
        const geoSets = equipmentSlotToGeosetsMap[slot];
        if (model.component1) {
            this.updateAttachmentGeoSetsForComponent(model.component1, geoSets, itemMeta.geosetGroup, itemMeta.attachmentGeosetGroup)
        }
        if (model.component2) {
            this.updateAttachmentGeoSetsForComponent(model.component2, geoSets, itemMeta.geosetGroup, itemMeta.attachmentGeosetGroup)
        }
    }

    private updateAttachmentGeoSetsForComponent(component: IM2Model, geoSets: GeoSet[], geosetGroup: number[], attachmentGeosetGroup: number[]) {
        if (this.isDisposing) {
            return;
        }

        component.toggleGeosets(1, 5300, false);
        for(let i = 0; i < geoSets.length; i++) {
            const groupVal = geoSets[i] * 100;
            if (geosetGroup[i] > 0) {
                component.toggleGeoset(groupVal + geosetGroup[i], true);
            } 
            if (attachmentGeosetGroup[i] > 0) {
                component.toggleGeoset(groupVal + attachmentGeosetGroup[i] + 1, true);
            }
        }
    }

    private updateComponentAttachments(data: EquippedItemData, model: IItemModel) {
        if (this.isDisposing) {
            return;
        }
        
        const parentBoneData = this.parent.boneData;
        if (!parentBoneData) {
            return;
        }
        for(let i = 0; i < data.attachmentIds.length; i++) {
            const attachmentData = data.attachments[i];
            if (attachmentData) {
                Float44.translate(parentBoneData[attachmentData.bone].positionMatrix, attachmentData.position, data.attachmentMatrices[i]);

                const component = i === 0 ? model.component1 : model.component2;
                if (component) {
                    component.setModelMatrixFromMatrix(data.attachmentMatrices[i]);
                }
            }
        }
    }

    private unloadItem(slot: EquipmentSlot) {
        if (this.isDisposing) {
            return;
        }

        const data = this.inventoryData[slot];
        if (!data) {
            return;
        }

        data.model1.dispose();
        if (data.model2) {
            data.model2.dispose()
        }
        this.inventoryData[slot] = null;
        this.parent.clearTexturesForSlot(slot);
    }

    private getAttachmentIdsForSlot(slot: EquipmentSlot, type: InventoryType) : number[] {
        if (this.isDisposing) {
            return;
        }
        
        switch(slot) {
            case EquipmentSlot.Head: return [11];
            case EquipmentSlot.Shoulders: return [6,5];
            case EquipmentSlot.Waist: return [53];
            case EquipmentSlot.Back: return [57];
            case EquipmentSlot.MainHand: return [1];
            case EquipmentSlot.OffHand: return type === InventoryType.Shield ? [0] : [2];
            case EquipmentSlot.Ranged: return type === InventoryType.Quiver ? [55] : [2];
            default: return [];
        }
    }
}