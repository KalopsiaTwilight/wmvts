import { IDataLoader, IProgressReporter } from "./iDataLoader";
import { RenderingEngine, OrbitalCamera, RenderObject, Camera, WebGlGraphics, M2Model, WMOModel, ErrorHandlerFn } from "./rendering";

export type CanvasCreationFunction = () => HTMLCanvasElement;

export interface WoWModelViewerOptions {
    dataLoader: IDataLoader,
    progressReporter?: IProgressReporter,
    canvas: {
        container?: HTMLElement,
        height?: number;
        width?: number;
        resizeToContainer?: boolean,
        createCanvas?: CanvasCreationFunction
    }
    onError?: ErrorHandlerFn,
    scene?: {
        camera?: Camera;
        objects?: RenderObject[]
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
        if (!options.dataLoader) {
            throw "dataLoader is a required argument for WoWModelViewer";
        }
        if (!document && !options.canvas.createCanvas) {
            throw "canvas.createCanvas is a required argument for WoWModelViewer when running outside of a browser context";
        }
        if (!options.canvas.container && !options.canvas.createCanvas) {
            throw "canvas.container is a required argument for WoWModelViewer when not providing a canvas via canvas.createCanvas";
        }

        this.options = options;
        this.initialize();
    }

    addM2Model(fileId: number) {
        this.addSceneObject(new M2Model(fileId));
    }

    addWMOModel(fileId: number) {
        this.addSceneObject(new WMOModel(fileId))
    }

    addSceneObject(object: RenderObject) {
        this.renderEngine.addSceneObject(object, 0);
    }

    removeModelByFileId(fileId: number) {
        const model = this.renderEngine.sceneObjects.find(x => x.fileId === fileId);
        if (model) {
            this.removeSceneObject(model);
        }
    }

    removeSceneObject(object: RenderObject) {
        this.renderEngine.removeSceneObject(object);
    }

    useCamera(camera: Camera) {
        this.renderEngine.switchCamera(camera);
    }

    showFps() {
        this.renderEngine.showFps();
    }

    hideFps() {
        this.renderEngine.hideFps();
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
                this.viewerContainer.style.position = "relative";
                this.viewerContainer.style.width = "100%";
                this.viewerContainer.style.height = "100%";
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
        
        let gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
        const graphics = new WebGlGraphics(gl);
        this.renderEngine = new RenderingEngine(graphics, this.options.dataLoader, 
            this.options.progressReporter, this.viewerContainer, this.options.onError);
        this.resize(this.width, this.height);
        this.renderEngine.sceneCamera = this.options.scene?.camera ?? new OrbitalCamera();
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