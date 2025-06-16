import { WoWModelViewer, WoWModelServerDataProvider, SimpleProgressReporter, FirstPersonCamera } from "../src/index"

const containerElement = document.createElement("div");
containerElement.style.width = "100%"
containerElement.style.height = "100vh";
containerElement.style.background = "red";
document.body.append(containerElement);

var progress = new SimpleProgressReporter(containerElement);

const viewer = new WoWModelViewer({
    dataLoader: new WoWModelServerDataProvider("https://localhost:7074"),
    progressReporter: progress,
    onError: console.log,
    canvas: {
        container: containerElement,
    },
    scene: {
        cameraFov: 90,
        ambientColor: [0.2, 0.1, 0.1, 1],
        lightDirection: [0, 1, 1],
        lightColor: [1, 1, 1, 1]
    }
});

// viewer.addM2Model(2120018);
viewer.addWMOModel(106679);
viewer.useCamera(new FirstPersonCamera())

setTimeout(() => {
    viewer.useAmbientColor([0.3, 0.1, 0.1, 1]);
    viewer.useLightColor([0, 1, 0, 1]);
    viewer.useLightDirection([25, 0, 0]);
    viewer.useClearColor([0, 0, 1, 0.2]);
    viewer.useCameraFov(130);
}, 3000);

setTimeout(() => {
    viewer.disableLighting();
}, 5000);