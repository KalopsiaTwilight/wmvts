
import { InventoryType } from "@app/metadata";
import { WoWAttachmentData } from "@app/modeldata";
import { Float44 } from "@app/rendering/math";

import { ItemModel } from "../itemModel";

import { CharacterModel } from "./characterModel";

export enum EquipmentSlot {
    Start        = 0,
    Head         = 0,
    Neck         = 1,
    Shoulders    = 2,
    Body         = 3,
    Chest        = 4,
    Waist        = 5,
    Legs         = 6,
    Feet         = 7,
    Wrists       = 8,
    Hands        = 9,
    Finger1      = 10,
    Finger2      = 11,
    Trinket1     = 12,
    Trinket2     = 13,
    Back         = 14,
    MainHand     = 15,
    OffHand      = 16,
    Ranged       = 17,
    Tabard       = 18,
    End          = 19
}

export interface EquippedItemData {
    displayId1: number;
    displayId2?: number;

    attachmentIds: number[],
    attachments: WoWAttachmentData[];
    attachmentMatrices: Float44[];
    model1: ItemModel
    model2?: ItemModel;
}

export class CharacterInventory {
    inventoryData: { [key: number]: EquippedItemData }
    parent: CharacterModel

    constructor(parent: CharacterModel) {
        this.parent = parent;
        this.inventoryData = { };
    }

    equipItem(slot: EquipmentSlot, displayId1: number, displayId2?: number) {
        this.unloadItem(slot);

        const model1 = new ItemModel(displayId1);
        model1.equipTo(this.parent);
        model1.on("metadataLoaded", (model) => {
            const attachments = this.getAttachmentIdsForSlot(slot, model.itemMetadata.inventoryType);
            this.inventoryData[slot].attachmentIds = attachments;
            this.inventoryData[slot].attachmentMatrices = attachments.map(() => Float44.identity());
            this.parent.on("modelDataLoaded", () => {
                const data = this.inventoryData[slot];
                data.attachments = data.attachmentIds.map(i => this.parent.modelData.attachments.find(x => x.id === i));
            })
        })
        model1.on("sectionTexturesLoaded", (model) => {
            for(const section in model.sectionTextures) {
                const sectionNr = parseInt(section, 10);
                this.parent.setTexturesForSection(sectionNr, slot, model.sectionTextures[section])
            }
        });

        let model2: ItemModel;
        if (displayId2) {
            model2 = new ItemModel(displayId2);
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
        this.unloadItem(slot);
    }

    update(deltaTime: number) {
        for(const slot in this.inventoryData) {
            const data = this.inventoryData[slot];
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
        for(const slot in this.inventoryData) {
            const data = this.inventoryData[slot];
            if (!data) {
                continue;
            }
            this.inventoryData[slot].model1.draw();
            if (this.inventoryData[slot].model2) {
                this.inventoryData[slot].model2.draw();
            }
        }
    }

    dispose() {
        for(const slot in this.inventoryData) {
            this.unloadItem(slot as unknown as EquipmentSlot);
        }
    }

    private updateComponentAttachments(data: EquippedItemData, model: ItemModel) {
        for(let i = 0; i < data.attachmentIds.length; i++) {
            const attachmentData = data.attachments[i];
            if (attachmentData) {
                Float44.copy(this.parent.boneData[attachmentData.bone].positionMatrix, data.attachmentMatrices[i]);
                Float44.translate(data.attachmentMatrices[i], attachmentData.position, data.attachmentMatrices[i]);

                const component = i === 0 ? model.component1 : model.component2;
                if (component) {
                    component.setModelMatrixFromMatrix(data.attachmentMatrices[i]);
                }
            }
        }
    }

    private unloadItem(slot: EquipmentSlot) {
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