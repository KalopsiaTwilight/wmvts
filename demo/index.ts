import { WoWModelViewer } from "../src/index"

import { TestModel } from "./testModel"

const containerElement = document.createElement("div");
containerElement.style.width = "800px"
containerElement.style.height = "600px";
containerElement.style.background = "red";
document.body.append(containerElement);

new WoWModelViewer({
    container: containerElement,
    scene: {
        objects: [
            new TestModel()
        ]
    }
})

