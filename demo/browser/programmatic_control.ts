import { Camera, NodeWoWModelViewer, RawImageData, WoWModelServerDataProvider } from "../../src";

async function main() {
    console.log("Initializing graphics layer...");

    const width = 1024;
    const height = 1024;

    const canvas = document.createElement("canvas");
    document.body.append(canvas);

    canvas.width = width;
    canvas.height = height;

    const createGl = () => {
        return canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false })!;
    }
    
    console.log("Setting up renderer...");
    const dataLoader = new WoWModelServerDataProvider("https://localhost:7074");
    const viewer = new NodeWoWModelViewer({
        getImgData: getImageData,
        createGl,
        width: width,
        height: height,
        dataLoader: dataLoader,
        scene: {
            cameraFov: 90
        }
    })
    
    const camera = new Camera(false);
    camera.setPosition([1.5, 1.0, 0])
    camera.setRotation([0, -Math.PI/2, Math.PI]);
    viewer.useCamera(camera);
    viewer.resize(width, height);
    
    const model = viewer.addCharacterModel(2);
    model.pauseAnimation();
    model.equipItem(18, 141459);

    console.log("Loading model...");
    const onceLoaded = new Promise((res, rej) => {
        model.once("loaded", res);
    });

    await onceLoaded;

    console.log("Starting to draw...");

    for(let i = 0; i < 20; i++) {
        viewer.draw(0)
        await sleep(5000);
    }

    console.log("All done!");
}


function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
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

main();;