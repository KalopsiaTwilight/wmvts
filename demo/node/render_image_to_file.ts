import createGl from "gl";
import sharp from "sharp";
import path from "path";

import { EquipmentSlot, Float4, NodeWoWModelViewer, WoWModelServerDataProvider } from "../../src";

// This demo shows a basic usage of the node viewer to render a character model to file.

// Node seems to distrust all self signed certificates so this is necessary to use the development WoWModelServer.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// This determines the output filename for the rendered image. By default it's placed in the 'demo' directory under the name output.webp
const outputPath = path.resolve(__dirname, "..");
const outputFileName = path.join(outputPath, "output.webp")

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
        onError: (type, id, err) => { throw err; },
        getImgData: getImageData,
        createGl: createGl,
        width: width,
        height: height,
        dataLoader: dataLoader,
        scene: {
            backgroundColor: bgColor,
            cameraFov: 90
        }
    })

    const camera = viewer.useStaticCamera(false);
    camera.setPosition([1.5, 1.0, 0])
    camera.setRotation([0, -Math.PI/2, Math.PI]);
    
    const model = viewer.addCharacterModel(2);
    model.pauseAnimation();
    model.equipItem(EquipmentSlot.Tabard, 141459);
    model.equipItem(EquipmentSlot.Body, 153777);

    console.log("Loading model...");
    await model.onceAsync("loaded");

    console.log("Starting to draw...");
    
    viewer.draw(0);

    console.log("Writing output...");
    console.log();
    const pixels = viewer.getPixels();

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
    .webp({ lossless: true }).toFile(outputFileName);

    console.log("All done!");
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