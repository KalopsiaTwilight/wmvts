import { IDataLoader, IProgressReporter } from "./iDataLoader";
import { RenderingEngine, OrbitalCamera, RenderObject, Camera, WebGlGraphics, M2Model, WMOModel, ErrorHandlerFn } from "./rendering";

export interface WoWModelViewerOptions {
    container: HTMLElement,
    dataLoader: IDataLoader,
    progressReporter?: IProgressReporter,
    onError?: ErrorHandlerFn,
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
        camera.initialize(this.renderEngine);
        camera.setDistance(this.renderEngine.sceneCamera.getDistance());
        this.renderEngine.sceneCamera = camera;
    }

    private initialize() {
        this.containerWidth = this.options.container.getBoundingClientRect().width;
        this.containerHeight = this.options.container.getBoundingClientRect().height;

        this.canvas = document.createElement("canvas");
        this.options.container.append(this.canvas);


        let gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });

        const graphics = new WebGlGraphics(gl);
        this.renderEngine = new RenderingEngine(graphics, this.options.dataLoader, 
            this.options.progressReporter, this.options.container, this.options.onError);
        this.resize(this.containerWidth, this.containerHeight);

        this.renderEngine.sceneCamera = this.options.scene?.camera ?? new OrbitalCamera();
        if (this.options.scene && this.options.scene.objects) {
            for(const obj of this.options.scene.objects) {
                this.renderEngine.addSceneObject(obj, 0);
            }
        }
        this.renderEngine.start();

        const resizeObserver = new ResizeObserver((entries) => {

            this.containerWidth = this.options.container.getBoundingClientRect().width;
            this.containerHeight = this.options.container.getBoundingClientRect().height;
            this.resize(this.containerWidth, this.containerHeight);
        })

        resizeObserver.observe(this.options.container);
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