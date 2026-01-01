import createGl from "gl";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

import { 
    EquipmentSlot, Float4, NodeWoWModelViewer, WoWModelServerDataProvider, ItemToDisplayInfoMetadata, 
    InventoryType, Float3, IItemModel, AABB 
} from "../../src";

// This demo shows how you can use the node viewer to render item previews for a dressing room type application.

// Node seems to distrust all self signed certificates so this is necessary to use the development WoWModelServer.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// You will have to set this environment variable to the path where you extracted the metadata files 
// for the modelviewer server for this example to work (or you can set the path here directly in the script). 
const extractionPath = process.env.WebWmvPath;
if (!extractionPath) {
    throw "Extraction path was not set to a valid variable.";
}

const itemMetadataPath = "metadata/itemdisplayinfos";
const inputPath = path.join(extractionPath, itemMetadataPath);

// This is the path where preview images will be saved. Change as preferred.
const outputPath =  path.join(extractionPath, "itempreviews");

/*----------------------------------------\
|  Main code for the example starts here:
\*---------------------------------------*/

async function main() {
    console.log("Initializing graphics layer...");

    const bgColorRGBA = Float4.create(30, 30, 30, 255);
    const width = 1024;
    const height = 1024;

    console.log("Setting up renderer...");
    const dataLoader = new WoWModelServerDataProvider("https://localhost:7074");
    const bgColor = Float4.scale(bgColorRGBA, 1/255);

    const viewer = new NodeWoWModelViewer({
        getImgData: getImageData,
        onError: (type, id, err) => { throw err; },
        createGl: createGl,
        width: width,
        height: height,
        dataLoader: dataLoader,
        scene: {
            backgroundColor: bgColor,
            cameraFov: 90
        }
    })

    console.log("Loading model...");
    const camera = viewer.useStaticCamera(false);
    const characterModel = viewer.addCharacterModel(2);
    
    // Set skin to preview skin
    characterModel.setCustomizationChoice(14, 100);
    // Set eye color to none
    characterModel.setCustomizationChoice(464, 7198);
    // Set makeup to none
    characterModel.setCustomizationChoice(516, 4963);
    // Set hair to bald
    characterModel.setCustomizationChoice(16, 7473);
    await characterModel.onceAsync("loaded");

    console.log("Getting input files...");
    const files = await fs.readdir(inputPath);
    for(const file of files) {
        const rawJsonFilePath = path.join(inputPath, file);
        const rawJson = await fs.readFile(rawJsonFilePath, 'utf8');
        const itemInfo = JSON.parse(rawJson) as ItemToDisplayInfoMetadata;

        console.log("Processing item id: " + itemInfo.itemId);
        const slot = inventoryTypeToSlot(itemInfo.inventoryType);

        for(const displayInfo of itemInfo.displayInfos) {
            console.log("Processing displayinfo id: " + displayInfo.displayInfoId + " for slot: " + slot);
            const outputFileName = path.join(outputPath, `${displayInfo.displayInfoId}.webp`)

            try {
                await fs.access(outputFileName, fs.constants.F_OK);
                console.log("Output file already exists. Skipping displayinfo id: " + displayInfo.displayInfoId);
                continue;
            }
            catch {
                // File does not exists, generate output
            }

            let itemModel: IItemModel;
            if (shouldDisplayModelOnlyForType(itemInfo.inventoryType)) {
                viewer.removeSceneObject(characterModel, false);
                itemModel = viewer.addItemModel(displayInfo.displayInfoId);
            } else {
                viewer.addSceneObject(characterModel);
                itemModel = characterModel.equipItem(slot, displayInfo.displayInfoId);
            }
        
            console.log("Loading item model...");
            await itemModel.onceAsync("loaded");
        
            if (!shouldDisplayModelOnlyForType(itemInfo.inventoryType)) {
                const cameraData = getCameraDataForInventoryType(itemInfo.inventoryType);
                camera.setPosition(cameraData[0]);
                camera.setRotation(cameraData[1]);
            } else {
                camera.setRotation([0, Math.PI, 0]);
                // Position camera so it's facing the weapon model from the right hand side, far enough to capture the entire boundingbox
                const cameraPosition = Float3.zero();
                const bb = viewer.getSceneBoundingBox();
                const sphereRadius = AABB.sphereRadius(bb);
                AABB.center(bb, cameraPosition);

                const fov = viewer.getCameraFov();
                const distance = sphereRadius * 2 / Math.tan(fov / 2);
                cameraPosition[2] -= distance;

                camera.setPosition(cameraPosition);
            }

            console.log("Starting to draw...");
            viewer.draw(0);

            console.log("Writing output...");
            const pixels = viewer.getPixels();
            await writeOutput(outputFileName, pixels, bgColorRGBA, height, width);

            characterModel.unequipItem(slot);
            viewer.removeSceneObject(characterModel, false);
            itemModel.dispose();
        }
    }
}


function shouldDisplayModelOnlyForType(type: InventoryType) {
    switch(type) {
        case InventoryType.TwoHand: 
        case InventoryType.MainHand:
        case InventoryType.OneHand:
        case InventoryType.OffHand: 
        case InventoryType.Shield:
        case InventoryType.HeldInOffHand:
        case InventoryType.Ranged: 
        case InventoryType.RangedRight:
        case InventoryType.Thrown: return true;
        default: return false;
    }
}

function inventoryTypeToSlot(type: InventoryType) {
    switch(type) {
        case InventoryType.Back: return EquipmentSlot.Back;
        case InventoryType.Head: return EquipmentSlot.Head;
        case InventoryType.Shoulders: return EquipmentSlot.Shoulders;
        case InventoryType.Shirt: return EquipmentSlot.Shirt;
        case InventoryType.Chest: return EquipmentSlot.Body;
        case InventoryType.Robe: return EquipmentSlot.Body;
        case InventoryType.Waist: return EquipmentSlot.Waist;
        case InventoryType.Hands: return EquipmentSlot.Hands;
        case InventoryType.Wrists: return EquipmentSlot.Wrists;
        case InventoryType.Legs: return EquipmentSlot.Legs;
        case InventoryType.Feet: return EquipmentSlot.Feet;
        case InventoryType.Tabard: return EquipmentSlot.Tabard;
        case InventoryType.TwoHand: 
        case InventoryType.MainHand:
        case InventoryType.OneHand: return EquipmentSlot.MainHand;
        case InventoryType.OffHand: 
        case InventoryType.Shield:
        case InventoryType.HeldInOffHand: return EquipmentSlot.OffHand;
        case InventoryType.Quiver:
        case InventoryType.Ranged: 
        case InventoryType.RangedRight:
        case InventoryType.Thrown: return EquipmentSlot.Ranged;
        default: return EquipmentSlot.End;
    }
}

function getCameraDataForInventoryType(type: InventoryType): [Float3, Float3] {
    switch(type) {
        case InventoryType.Quiver:
        case InventoryType.Back: return [Float3.create(-1.3, 0.8, 0), Float3.create(0, -Math.PI/2, 0)];
        case InventoryType.Shirt:
        case InventoryType.Chest: return [Float3.create(0.75, 1.4, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Robe: return [Float3.create(1.3, 0.8, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Hands: return [Float3.create(0.75, 0.98, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Head: return [Float3.create(0.75, 1.88, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Legs: return [Float3.create(0.9, 0.68, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Feet: return [Float3.create(0.8, 0.28, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Waist: return [Float3.create(0.8, 1.12, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Wrists: return [Float3.create(0.75, 0.98, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Shoulders: return [Float3.create(0.8, 1.53, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.Tabard: return [Float3.create(1.3, 0.8, 0), Float3.create(0, Math.PI/2, 0)];
        case InventoryType.MainHand: 
        case InventoryType.OneHand:
        case InventoryType.TwoHand: return [Float3.create(0, 1, 1.3), Float3.create(0, 0, 0)];
        case InventoryType.Ranged:
        case InventoryType.RangedRight:
        case InventoryType.Thrown:
        case InventoryType.OffHand: return [Float3.create(0.08, 0.85, -1.3), Float3.create(0, Math.PI, 0)];       
        case InventoryType.HeldInOffHand:
        case InventoryType.Shield: return [Float3.create(0.12, 1, -1.3), Float3.create(0, Math.PI, 0)];
        default: return [Float3.create(1.5, 1, 0), Float3.create(0, Math.PI/2, 0)]
    }
}

async function writeOutput(fileName: string, pixels: Uint8Array<ArrayBuffer>, bgColorRGBA: Float4, height: number, width: number) {
    // Replace background pixels with transparant pixels
    for(let i = 0; i < pixels.length; i++) {
        let match = true;
        for(let j = 0; j < bgColorRGBA.length; j++) {
            match = match && pixels[i+j] === bgColorRGBA[j];
        }
        if (match) {
            pixels[i] = 0;
            pixels[i+1] = 0;
            pixels[i+2] = 0;
            pixels[i+3] = 0;
        }
    }

    await sharp(pixels, {
        raw: {
            channels: 4,
            height, width,
        }
    })
    .rotate(180)
    .webp({ lossless: true }).toFile(fileName);
}

async function getImageData(blob: Blob) {
    const buffer = await blob.arrayBuffer();
    const sharpObj = sharp(buffer);
    const metaData = await sharpObj.metadata();
    const pixelData = await sharp(buffer)
        .ensureAlpha()
        .toColorspace("srgb")
        .toFormat("raw", {
            depth: "uchar"
        }).toBuffer()
    return {
        width: metaData.width,
        height: metaData.height,
        pixelData: pixelData
    }
}

main();