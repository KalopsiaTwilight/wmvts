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
        resizeToContainer: true
    },
});

// viewer.addM2Model(2120018);
viewer.addWMOModel(106679);
viewer.useCamera(new FirstPersonCamera())