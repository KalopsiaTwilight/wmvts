import { WoWModelViewer, WoWModelServerDataProvider, M2Model, WMOModel, SimpleProgressReporter } from "../src/index"

// import { TestModel } from "./testModel"

const containerElement = document.createElement("div");
containerElement.style.width = "800px"
containerElement.style.height = "600px";
containerElement.style.background = "red";
document.body.append(containerElement);

var progress = new SimpleProgressReporter(containerElement);

new WoWModelViewer({
    container: containerElement,
    dataLoader: new WoWModelServerDataProvider("https://localhost:7074"),
    progressReporter: progress,
    scene: {
        objects: [
            // new M2Model(2120018),
            new WMOModel(106698)
        ]
    }
})

