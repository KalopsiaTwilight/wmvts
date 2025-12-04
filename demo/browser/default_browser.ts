import { BrowserWoWModelViewer, WoWModelServerDataProvider, SimpleProgressReporter, FirstPersonCamera, EquipmentSlot, IM2Model } from "../../src"

// Create a simple document layout, you can ignore this stuff for reference. This is mostly used for testing the viewer in various layout configurations.

// Container Height set:

// const containerElement = document.createElement("div");
// containerElement.style.width = "100%"
// containerElement.style.height = "100vh";
// containerElement.style.background = "red";
// document.body.append(containerElement);

// Flexbox flexible height:

const flexElement = document.createElement("div");
flexElement.style.display = "flex";
document.body.append(flexElement);

const leftElement = document.createElement("div");
leftElement.style.width = "250px";
leftElement.style.backgroundColor = "blue";
leftElement.style.height = "100vh";
flexElement.append(leftElement);

const containerElement = document.createElement("div");
containerElement.style.width = "100%";
containerElement.style.flexGrow = "1";
flexElement.append(containerElement);

// Add a custom controls for selecting animations

const animSelect = document.createElement("select");
animSelect.id = "ddlAnimationSelect";
animSelect.style.width = "250px";
animSelect.style.height = "32px";
animSelect.style.position = "absolute";
animSelect.style.bottom = "0";
animSelect.style.right = "10px";
flexElement.append(animSelect);

const animSelectLabel = document.createElement("label");
animSelectLabel.htmlFor = "ddlAnimationSelect";
animSelectLabel.style.position = "absolute";
animSelectLabel.style.bottom = "42px";
animSelectLabel.style.right = "10px";
animSelectLabel.style.width = "250px";
animSelectLabel.style.color = "white";
animSelectLabel.textContent = "Animation: "
flexElement.append(animSelectLabel);

/*---------------------\\
| Reference start
\*---------------------*/

// This is the basic modelviewer configuration:

var progress = new SimpleProgressReporter(containerElement);
const viewer = new BrowserWoWModelViewer({
    dataLoader: new WoWModelServerDataProvider("https://localhost:7074"),
    progressReporter: progress,
    onError: console.error,
    canvas: {
        container: containerElement,
        resizeToContainer: true,
    },
    scene: {
        cameraFov: 90,
        ambientColor: [0.3, 0.3, 0.3, 1],
        lightDirection: [0, 1, 1],
        lightColor: [1, 1, 1, 1]
    },
    misc: {
        cacheTtl: 1000
    }
});

// Scene settings can also be changed later:
setTimeout(() => {
    viewer.useAmbientColor([0.3, 0.1, 0.1, 1]);
    viewer.useLightColor([0, 1, 0, 1]);
    viewer.useLightDirection([25, 0, 0]);
    viewer.useClearColor([0, 0, 1, 0.2]);
    viewer.useCameraFov(70);
}, 10000);

// Cameras can also be swapped out:
const camera = new FirstPersonCamera(containerElement);
camera.movementSpeed = 1;
viewer.useCamera(camera);
(window as any).camera = camera;

// Camera also be changed with utility methods like so:
viewer.useOrbitalCamera()


// You can add character models like so: 
const model = viewer.addCharacterModel(2);
// Other models can be added like so:
// const model = viewer.addM2Model(125644); // Riding Phoenix
// const model = viewer.addWMOModel(107243); // Stormwind
// const model = viewer.addM2Model(2120018); // Iron Dwarf hammer
// const model = viewer.addWMOModel(3507293); // Tower with multiple doodadsets

// Once added to the scene, character models can be equipped & customized like so:
model.equipItem(EquipmentSlot.Tabard, 141459);
model.setCustomizationChoice(16, 141)

// Callbacks can be used to retrieve model data when it's available
model.once("modelDataLoaded", (model: IM2Model) => {
    const anims = model.getAnimations()
    for(const animId of anims) {
        const optionElement = document.createElement("option");
        optionElement.value = animId.toString();
        optionElement.text = animId.toString();
        animSelect.append(optionElement);
    }

    animSelect.onchange = () => {
        model.useAnimation(parseInt(animSelect.value, 10));
    }
})

// Use .showDebug to view information about FPS and the amount of batches submitted each .draw() call.
viewer.showDebug();

(window as any).viewer = viewer;
(window as any).model = model;
