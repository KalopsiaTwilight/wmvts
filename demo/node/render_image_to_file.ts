import createGl from "gl";
import sharp from "sharp";
import path from "path";

import { Camera, CharacterModel, Float4, NodeRenderer, WebGlGraphics, WoWModelServerDataProvider } from "../../src";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const outputPath = path.resolve(__dirname, "..");
const outputFileName = path.join(outputPath, "output.webp")

async function main() {
    console.log("Initializing graphics layer...");

    const width = 1024;
    const height = 1024;

    const gl = createGl(width, height, { alpha: true, premultipliedAlpha: false });

    console.log("Setting up renderer...");
    const dataLoader = new WoWModelServerDataProvider("https://localhost:7074");
    const graphics = new WebGlGraphics(gl);
    const renderer = new NodeRenderer(graphics, dataLoader, {
        getImageDataFn: getImageData,
        errorHandler: console.error 
    });
    
    const clearColorRGBA = Float4.create(30, 30, 30, 255);
    const clearColor = Float4.scale(clearColorRGBA, 1/255);

    renderer.clearColor = clearColor;
    renderer.fov = 90;
    const camera = new Camera(false);
    camera.setPosition([1.5, 1.0, 0])
    camera.setRotation([0, -Math.PI/2, Math.PI]);
    renderer.switchCamera(camera);
    renderer.resize(width, height);
    
    const model = new CharacterModel(renderer.iocContainer);
    renderer.addSceneObject(model);

    model.pauseAnimation();
    model.loadModelId(2);
    model.equipItem(18, 141459);

    console.log("Loading model...");
    const onceLoaded = new Promise((res, rej) => {
        model.once("loaded", res);
    });

    await onceLoaded;

    console.log("Starting to draw...");
    
    renderer.start();
    renderer.draw();

    console.log("Writing output...");
    console.log();
    const pixels = new Uint8Array(width * height * 4); 
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

    // Replace clearcolor pixels with transparant pixels
    for(let i = 0; i < pixels.length; i++) {
        let match = true;
        for(let j = 0; j < clearColorRGBA.length; j++) {
            match = match && pixels[i+j] === clearColorRGBA[j];
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