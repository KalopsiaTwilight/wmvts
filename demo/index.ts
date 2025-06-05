import { WoWModelViewer, WoWModelServerDataProvider, SimpleProgressReporter } from "../src/index"

const containerElement = document.createElement("div");
containerElement.style.width = "100%"
containerElement.style.height = "100vh";
containerElement.style.background = "red";
document.body.append(containerElement);

var progress = new SimpleProgressReporter(containerElement);

const viewer = new WoWModelViewer({
    container: containerElement,
    dataLoader: new WoWModelServerDataProvider("https://localhost:7074"),
    progressReporter: progress,
});

// viewer.addM2Model(2120018);
viewer.addWMOModel(106698); 