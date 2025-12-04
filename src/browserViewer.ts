import { WebGlGraphics, BrowserRenderer } from "./rendering";
import { Camera, FirstPersonCamera, OrbitalCamera } from "./cameras";
import { BaseWoWModelViewer, IBaseWoWModelViewerOptions } from "./baseViewer";

export type CanvasCreationFunction = () => HTMLCanvasElement;

export interface BrowserWoWModelViewerOptions extends IBaseWoWModelViewerOptions {
    canvas: {
        container?: HTMLElement,
        height?: number;
        width?: number;
        resizeToContainer?: boolean,
        createCanvas?: CanvasCreationFunction
    }
}

export class BrowserWoWModelViewer extends BaseWoWModelViewer {
    options: BrowserWoWModelViewerOptions;

    canvas: HTMLCanvasElement;
    viewerContainer: HTMLDivElement;
    renderer: BrowserRenderer;

    constructor(options: BrowserWoWModelViewerOptions) {
        if (!document && !options?.canvas?.createCanvas) {
            throw "canvas.createCanvas is a required argument for WoWModelViewer when running outside of a browser context";
        }
        if (!options?.canvas?.container && !options?.canvas?.createCanvas) {
            throw "canvas.container is a required argument for WoWModelViewer when not providing a canvas via canvas.createCanvas";
        }

        super(options);
    }

    protected initializeRenderer() {
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
        this.renderer = new BrowserRenderer({
            graphics: graphics,
            dataLoader: this.iocContainer.getDataLoader(),
            dataManager: this.iocContainer.getDataManager(),
            objectIdentifier: this.iocContainer.getObjectIdentifier(),
            progress: this.options.progressReporter,
            container: this.viewerContainer,
            errorHandler: this.options.onError,
            ambientColor: this.options.scene?.ambientColor,
            cacheTtl: this.options.misc?.cacheTtl,
            cameraFov: this.options.scene?.cameraFov,
            clearColor: this.options.scene?.backgroundColor,
            lightColor: this.options.scene?.lightColor,
            lightDirection: this.options.scene?.lightDirection
        });
        this.resize(this.width, this.height);
        this.renderer.sceneCamera = this.options.scene?.camera ?? new Camera();
        if (this.options.scene && this.options.scene.objects) {
            for(const obj of this.options.scene.objects) {
                this.renderer.addSceneObject(obj);
            }
        }
        this.renderer.start();
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

    useFirstPersonCamera(resizeOnSceneExpand = true): FirstPersonCamera {
        const camera = new FirstPersonCamera(this.viewerContainer, resizeOnSceneExpand);
        this.renderer.switchCamera(camera);
        return camera;
    }
    
    useOrbitalCamera(resizeOnSceneExpand = true): OrbitalCamera {
        const camera = new OrbitalCamera(this.viewerContainer, resizeOnSceneExpand);
        this.renderer.switchCamera(camera);
        return camera;
    }

    resize(width: number, height: number) {
        if (this.renderer && this.renderer.width === width && this.renderer.height === height) {
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.renderer.resize(width, height);
    }
}