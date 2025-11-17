import { IDataLoader, IProgressReporter,  RequestFrameFunction, ErrorHandlerFn  } from "./interfaces";
import { RenderingEngine, IRenderObject, WebGlGraphics, M2Model, WMOModel } from "./rendering";
import { Camera } from "./cameras";
import { Float4, Float3 } from "./math";
import { FileIdentifier } from "./metadata";

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
        createCanvas?: CanvasCreationFunction,
        requestFrame?: RequestFrameFunction,
    },
    scene?: {
        cameraFov?: number;
        lightDirection?: Float3;
        lightColor?: Float4;
        ambientColor?: Float4;
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
    renderEngine: RenderingEngine;

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

    addM2Model(fileId: FileIdentifier) {
        const model = new M2Model(fileId);
        this.addSceneObject(model);
        return model;
    }

    addWMOModel(fileId: FileIdentifier) {
        const model = new WMOModel(fileId);
        this.addSceneObject(model);
        return model;
    }

    addSceneObject(object: IRenderObject) {
        this.renderEngine.addSceneObject(object, 0);
    }

    removeSceneObject(object: IRenderObject) {
        this.renderEngine.removeSceneObject(object);
    }

    useCamera(camera: Camera) {
        this.renderEngine.switchCamera(camera);
    }

    useCameraFov(newFov: number) {
        this.renderEngine.fov = newFov;
        this.renderEngine.resize(this.width, this.height);
    }

    useLightDirection(newLightDir: Float3) {
        Float3.copy(Float3.normalize(newLightDir), this.renderEngine.lightDir);
    }

    useLightColor(lightColor: Float4) {
        Float4.copy(lightColor, this.renderEngine.lightColor);
    }
    
    useAmbientColor(ambientColor: Float4) {
        Float4.copy(ambientColor, this.renderEngine.ambientColor);
    }

    useClearColor(color: Float4) {
        Float4.copy(color, this.renderEngine.clearColor);
    }

    showDebug() {
        this.renderEngine.enableDebug();
    }

    hideDebug() {
        this.renderEngine.disableDebug();
    }

    enableDebugPortals() {
        this.renderEngine.enableDebugPortals();
    }

    disableDebugPortals() {
        this.renderEngine.disableDebugPortals();
    }

    setDoodadRenderDistance(value: number) {
        this.renderEngine.doodadRenderDistance = value;
    }
    
    private initialize() {
        if (this.options.canvas.createCanvas) {
            this.canvas = this.options.canvas.createCanvas();
        } else {
            this.canvas = document.createElement("canvas");
        }
        
        if (document) {
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
        }

        if (this.options.canvas.width) {
            this.width = this.options.canvas.width;
        }
        if (this.options.canvas.height) {
            this.height = this.options.canvas.height;
        }
        
        const requestFrameFn = this.options.canvas.requestFrame ? 
            this.options.canvas.requestFrame : window.requestAnimationFrame.bind(window);
        let gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        const graphics = new WebGlGraphics(gl);
        this.renderEngine = new RenderingEngine(graphics, this.options.dataLoader, requestFrameFn, {
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
        this.renderEngine.sceneCamera = this.options.scene?.camera ?? new Camera();
        if (this.options.scene && this.options.scene.objects) {
            for(const obj of this.options.scene.objects) {
                this.renderEngine.addSceneObject(obj, 0);
            }
        }
        this.renderEngine.start();
    }

    private resize(width: number, height: number) {
        if (this.renderEngine && this.renderEngine.width === width && this.renderEngine.height === height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.renderEngine.resize(width, height);
    }
}