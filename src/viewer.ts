import { IDataLoader, IProgressReporter, ErrorHandlerFn  } from "./interfaces";
import { IRenderObject, WebGlGraphics, IWMOModel, IM2Model, ICharacterModel, IItemModel, ITextureVariantModel, BrowserRenderer } from "./rendering";
import { Camera, FirstPersonCamera, OrbitalCamera, RotatingCamera } from "./cameras";
import { Float4, Float3 } from "./math";
import { FileIdentifier, RecordIdentifier } from "./metadata";

export type CanvasCreationFunction = () => HTMLCanvasElement;

export interface WoWModelViewerOptions {
    dataLoader: IDataLoader,
    progressReporter?: IProgressReporter,
    onError?: ErrorHandlerFn,
    canvas: {
        container?: HTMLElement,
        height?: number;
        width?: number;
        clearColor?: Float4,
        resizeToContainer?: boolean,
        createCanvas?: CanvasCreationFunction
    },
    scene?: {
        cameraFov?: number;
        lightDirection?: Float3;
        lightColor?: Float4;
        ambientColor?: Float4;
        oceanCloseColor?: Float4;
        oceanFarColor?: Float4;
        riverCloseColor?: Float4;
        riverFarColor?: Float4;
        waterAlphas?: Float4;
        camera?: Camera;
        objects?: IRenderObject[];
        disableLighting?: boolean;
    }
    misc?: {
        cacheTtl?: number
    }
}

export class WoWModelViewer {
    options: WoWModelViewerOptions;

    canvas: HTMLCanvasElement;
    viewerContainer: HTMLDivElement;
    renderer: BrowserRenderer;

    width: number;
    height: number;
    
    constructor(options: WoWModelViewerOptions) {
        if (!options?.dataLoader) {
            throw "dataLoader is a required argument for WoWModelViewer";
        }
        if (!document && !options?.canvas?.createCanvas) {
            throw "canvas.createCanvas is a required argument for WoWModelViewer when running outside of a browser context";
        }
        if (!options?.canvas?.container && !options?.canvas?.createCanvas) {
            throw "canvas.container is a required argument for WoWModelViewer when not providing a canvas via canvas.createCanvas";
        }

        this.options = options;
        this.initialize();
    }

    addM2Model(fileId: FileIdentifier): IM2Model {
        const model = this.renderer.objectFactory.createM2Model(fileId);
        this.addSceneObject(model);
        return model;
    }

    addWMOModel(fileId: FileIdentifier): IWMOModel {
        const model = this.renderer.objectFactory.createWMOModel(fileId);
        this.addSceneObject(model);
        return model;
    }

    addCharacterModel(modelId: RecordIdentifier): ICharacterModel {
        const model = this.renderer.objectFactory.createCharacterModel(modelId);
        this.addSceneObject(model);
        return model;
    }

    addItemModel(modelId: RecordIdentifier): IItemModel {
        const model = this.renderer.objectFactory.createItemModel(modelId);
        this.addSceneObject(model);
        return model;
    }

    addTextureVariantModel(fileId: FileIdentifier): ITextureVariantModel {
        const model = this.renderer.objectFactory.createTextureVariantModel(fileId);
        this.addSceneObject(model);
        return model;
    }

    addSceneObject(object: IRenderObject) {
        this.renderer.addSceneObject(object, 0);
    }

    removeSceneObject(object: IRenderObject) {
        this.renderer.removeSceneObject(object);
    }

    useFirstPersonCamera() {
        this.renderer.switchCamera(new FirstPersonCamera(this.viewerContainer));
    }

    useOrbitalCamera() {
        this.renderer.switchCamera(new OrbitalCamera(this.viewerContainer));
    }

    useRotatingCamera() {
        this.renderer.switchCamera(new RotatingCamera());
    }

    useCamera(camera: Camera) {
        this.renderer.switchCamera(camera);
    }

    useCameraFov(newFov: number) {
        this.renderer.fov = newFov;
        this.renderer.resize(this.width, this.height);
    }

    useLightDirection(newLightDir: Float3) {
        Float3.copy(Float3.normalize(newLightDir), this.renderer.lightDir);
    }

    useLightColor(lightColor: Float4) {
        Float4.copy(lightColor, this.renderer.lightColor);
    }
    
    useAmbientColor(ambientColor: Float4) {
        Float4.copy(ambientColor, this.renderer.ambientColor);
    }

    useClearColor(color: Float4) {
        Float4.copy(color, this.renderer.clearColor);
    }

    useOceanCloseColor(color: Float4) {
        Float4.copy(color, this.renderer.oceanCloseColor);
    }

    useOceanFarColor(color: Float4) {
        Float4.copy(color, this.renderer.oceanFarColor);
    }

    useRiverCloseColor(color: Float4) {
        Float4.copy(color, this.renderer.riverCloseColor);
    }
    
    useRiverFarColor(color: Float4) {
        Float4.copy(color, this.renderer.riverFarColor);
    }
    
    useWaterAlphas(color: Float4) {
        Float4.copy(color, this.renderer.waterAlphas);
    }

    showDebug() {
        this.renderer.enableDebug();
    }

    hideDebug() {
        this.renderer.disableDebug();
    }

    enableDebugPortals() {
        this.renderer.enableDebugPortals();
    }

    disableDebugPortals() {
        this.renderer.disableDebugPortals();
    }

    setDoodadRenderDistance(value: number) {
        this.renderer.doodadRenderDistance = value;
    }
    
    private initialize() {
        if (this.options.canvas.createCanvas) {
            this.canvas = this.options.canvas.createCanvas();
        } else {
            this.canvas = document.createElement("canvas");
        }
        
        const containerElem = this.options.canvas.container ? 
        this.options.canvas.container : this.canvas.parentElement;
        
        if (containerElem) {
            this.width = containerElem.getBoundingClientRect().width;
            this.height = containerElem.getBoundingClientRect().height;

            this.viewerContainer = document.createElement("div");
            this.viewerContainer.className = "wmvts-container";
            this.viewerContainer.style.lineHeight = "0";
            this.viewerContainer.style.position = "relative";
            containerElem.append(this.viewerContainer)
            this.viewerContainer.append(this.canvas);
            
        
            if (this.options.canvas.resizeToContainer) {
                const resizeObserver = new ResizeObserver(() => {
                    this.width = this.viewerContainer.getBoundingClientRect().width;
                    this.height = this.viewerContainer.getBoundingClientRect().height;
                    this.resize(this.width, this.height);
                })
                resizeObserver.observe(this.viewerContainer);
            }
        }

        if (this.options.canvas.width) {
            this.width = this.options.canvas.width;
        }
        if (this.options.canvas.height) {
            this.height = this.options.canvas.height;
        }
        
        let gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        const graphics = new WebGlGraphics(gl);
        this.renderer = new BrowserRenderer(graphics, this.options.dataLoader, {
            progress: this.options.progressReporter,
            container: this.viewerContainer,
            errorHandler: this.options.onError,
            ambientColor: this.options.scene?.ambientColor,
            cacheTtl: this.options.misc?.cacheTtl,
            cameraFov: this.options.scene?.cameraFov,
            clearColor: this.options.canvas?.clearColor,
            lightColor: this.options.scene?.lightColor,
            lightDirection: this.options.scene?.lightDirection
        });
        this.resize(this.width, this.height);
        this.renderer.sceneCamera = this.options.scene?.camera ?? new Camera();
        if (this.options.scene && this.options.scene.objects) {
            for(const obj of this.options.scene.objects) {
                this.renderer.addSceneObject(obj, 0);
            }
        }
        this.renderer.start();
    }

    private resize(width: number, height: number) {
        if (this.renderer && this.renderer.width === width && this.renderer.height === height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.resize(width, height);
    }
}