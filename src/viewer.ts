import { IDataLoader, IProgressReporter } from "./iDataLoader";
import { RenderingEngine, OrbitalCamera, RenderObject, Camera, WebGlGraphics } from "./rendering";

export interface WoWModelViewerOptions {
    container: HTMLElement,
    dataLoader: IDataLoader,
    progressReporter?: IProgressReporter,
    scene?: {
        camera?: Camera;
        objects?: RenderObject[]
    }
}

export class WoWModelViewer {
    options: WoWModelViewerOptions;

    canvas: HTMLCanvasElement;
    renderEngine: RenderingEngine;

    containerWidth: number;
    containerHeight: number;
    
    constructor(options: WoWModelViewerOptions) {
        if (!options.container) {
            throw "container is a required argument for WoWModelViewer";
        }

        this.options = options;
        this.initialize();
    }

    private initialize() {
        this.containerWidth = this.options.container.getBoundingClientRect().width;
        this.containerHeight = this.options.container.getBoundingClientRect().height;

        this.canvas = document.createElement("canvas");
        this.options.container.append(this.canvas);


        let gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });

        const graphics = new WebGlGraphics(gl);
        this.renderEngine = new RenderingEngine(graphics, this.options.dataLoader, this.options.progressReporter, this.canvas);
        this.resize(this.containerWidth, this.containerHeight);

        this.renderEngine.sceneCamera = this.options.scene?.camera ?? new OrbitalCamera();
        if (this.options.scene && this.options.scene.objects) {
            for(const obj of this.options.scene.objects) {
                this.renderEngine.addSceneObject(obj, 0);
            }
        }
        this.renderEngine.start();
    }

    // TODO: Handle window resize events when not using fixed width/height
    resize(width: number, height: number) {
        if (this.renderEngine && this.renderEngine.width === width && this.renderEngine.height === height) {
            return;
        }

        this.renderEngine.width = width;
        this.renderEngine.height = height;
        this.canvas.setAttribute('width', width.toString());
        this.canvas.setAttribute('height', height.toString());
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";
    }
}