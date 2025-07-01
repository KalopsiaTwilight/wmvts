import { WoWModelViewer, WoWModelServerDataProvider, SimpleProgressReporter, FirstPersonCamera, OrbitalCamera } from "../src/index"

// Container Height set:

const containerElement = document.createElement("div");
containerElement.style.width = "100%"
containerElement.style.height = "100vh";
containerElement.style.background = "red";
document.body.append(containerElement);

// Flexbox flexible height:

// const flexElement = document.createElement("div");
// flexElement.style.display = "flex";
// document.body.append(flexElement);

// const leftElement = document.createElement("div");
// leftElement.style.width = "250px";
// leftElement.style.backgroundColor = "blue";
// leftElement.style.height = "100vh";
// flexElement.append(leftElement);

// const containerElement = document.createElement("div");
// containerElement.style.width = "100%";
// containerElement.style.flexGrow = "1";
// flexElement.append(containerElement);

var progress = new SimpleProgressReporter(containerElement);
const viewer = new WoWModelViewer({
    // dataLoader: new WoWModelServerDataProvider("https://localhost:7074"),
    dataLoader: new WoWModelServerDataProvider("https://cdn.wowfreedom-rp.com"),
    progressReporter: progress,
    onError: console.log,
    canvas: {
        container: containerElement,
        resizeToContainer: true,
        // requestFrame: (callback) => window.setTimeout(callback, 100)
    },
    scene: {
        // camera: new FirstPersonCamera(),
        camera: new OrbitalCamera(),
        cameraFov: 90,
        ambientColor: [0.2, 0.1, 0.1, 1],
        lightDirection: [0, 1, 1],
        lightColor: [1, 1, 1, 1]
    }
});

viewer.showFps();
// viewer.addM2Model(2120018);
// viewer.addM2Model(199806);
viewer.addM2Model(125644);

// setTimeout(() => {
//     viewer.useAmbientColor([0.3, 0.1, 0.1, 1]);
//     viewer.useLightColor([0, 1, 0, 1]);
//     viewer.useLightDirection([25, 0, 0]);
//     viewer.useClearColor([0, 0, 1, 0.2]);
//     // viewer.useCameraFov(170);
// }, 3000);