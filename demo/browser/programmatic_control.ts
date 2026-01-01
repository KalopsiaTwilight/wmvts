import { 
    AABB, Camera, EquipmentSlot, Float3, IItemModel, InventoryType, NodeWoWModelViewer, 
    RawImageData, WoWModelServerDataProvider 
} from "../../src";

// This demo shows how you can use the node viewer in a browser to manually control the render time etc.
// The end result is an item preview in the browser similar to the output of the node/render_item_previews.ts example.

async function main() {
    console.log("Initializing graphics layer...");

    const width = 1024;
    const height = 1024;

    const canvas = document.createElement("canvas");
    document.body.append(canvas);

    const createGl = (width: number, height: number, opts?: WebGLContextAttributes) => {
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext("webgl", opts)!;
    }

    console.log("Setting up renderer...");
    const dataLoader = new WoWModelServerDataProvider("https://localhost:7074");
    const viewer = new NodeWoWModelViewer({
        getImgData: getImageData,
        onError: console.error,
        createGl,
        width: width,
        height: height,
        dataLoader: dataLoader,
        scene: {
            cameraFov: 90
        }
    })

    const camera = new Camera(false);
    viewer.resize(width, height);
    viewer.useCamera(camera);

    const characterModel = viewer.addCharacterModel(2);
    // Set skin to preview skin
    characterModel.setCustomizationChoice(14, 100);
    // Set eye color to none
    characterModel.setCustomizationChoice(464, 7198);
    // Set makeup to none
    characterModel.setCustomizationChoice(516, 4963);
    // Set hair to bald
    characterModel.setCustomizationChoice(16, 7473);

    console.log("Loading character model...");
    await characterModel.onceAsync("loaded");

    let itemModel: IItemModel;
    const type = InventoryType.Shoulders;
    const slot = inventoryTypeToSlot(type);
    const displayId = 125060;

    if (shouldDisplayModelOnlyForType(type)) {
        viewer.removeSceneObject(characterModel, false);
        itemModel = viewer.addItemModel(displayId);
    } else {
        viewer.addSceneObject(characterModel);
        itemModel = characterModel.equipItem(slot, displayId);
    }

    console.log("Loading item model...");
    await itemModel.onceAsync("loaded");

    if (!shouldDisplayModelOnlyForType(type)) {
        const cameraData = getCameraDataForInventoryType(type);
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

    for (let i = 0; i < 1000; i++) {
        console.log("Draw...");
        viewer.draw(0)
        await sleep(1000);
    }

    console.log("All done!");
}

function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

function shouldDisplayModelOnlyForType(type: InventoryType) {
    switch (type) {
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
    switch (type) {
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
    switch (type) {
        case InventoryType.Quiver:
        case InventoryType.Back: return [Float3.create(-1.3, 0.8, 0), Float3.create(0, -Math.PI / 2, 0)];
        case InventoryType.Shirt:
        case InventoryType.Chest: return [Float3.create(0.75, 1.4, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Robe: return [Float3.create(1.3, 0.8, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Hands: return [Float3.create(0.75, 0.98, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Head: return [Float3.create(0.75, 1.88, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Legs: return [Float3.create(0.9, 0.68, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Feet: return [Float3.create(0.8, 0.28, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Waist: return [Float3.create(0.8, 1.12, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Wrists: return [Float3.create(0.75, 0.98, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Shoulders: return [Float3.create(0.8, 1.53, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.Tabard: return [Float3.create(1.3, 0.8, 0), Float3.create(0, Math.PI / 2, 0)];
        case InventoryType.MainHand:
        case InventoryType.OneHand:
        case InventoryType.TwoHand: return [Float3.create(0, 1, 1.3), Float3.create(0, 0, 0)];
        case InventoryType.Ranged:
        case InventoryType.RangedRight:
        case InventoryType.Thrown:
        case InventoryType.OffHand: return [Float3.create(0.08, 0.85, -1.3), Float3.create(0, Math.PI, 0)];
        case InventoryType.HeldInOffHand:
        case InventoryType.Shield: return [Float3.create(0.12, 1, -1.3), Float3.create(0, Math.PI, 0)];
        default: return [Float3.create(1.5, 1, 0), Float3.create(0, Math.PI / 2, 0)]
    }
}


const imgCanvas = document.createElement("canvas");
const img2DContext = imgCanvas.getContext("2d")!;

async function getImageData(blob: Blob) {
    return new Promise<RawImageData>((res, rej) => {
        const img = new Image();
        img.onload = () => {
            imgCanvas.width = img.width;
            imgCanvas.height = img.height;
            img2DContext?.drawImage(img, 0, 0);
            const imgData = img2DContext.getImageData(0, 0, img.width, img.height);
            res({
                width: img.width,
                height: img.height,
                pixelData: new Uint8Array(imgData.data.buffer)
            });
        }
        img.onerror = (evt, src, line, col, err) => {
        }
        img.src = window.URL.createObjectURL(blob)
    });
}

main();