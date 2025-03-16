import { RenderingEngine, OrbitalCamera, RenderObject, Camera, WebGlGraphics } from "./rendering";

// TODO: Remove this
require("./webgl-debug.js");


export interface WoWModelViewerOptions {
    container: HTMLElement,
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

        // Uncomment for debug purposes

        // let webGlDebug = (window as any).WebGLDebugUtils;
        // function logGLCall(functionName: string, args: any[]) {   
        //     const maxLog = 100;
        //     (window as any).debugGLCalls = (window as any).debugGLCalls || 0;

        //     if ((window as any).debugGLCalls < maxLog) {
        //         console.log("gl." + functionName + "(" + webGlDebug.glFunctionArgsToString(functionName, args) + ")");  
        //         (window as any).debugGLCalls++;
        //     }
        //  } 
        // gl = webGlDebug.makeDebugContext(gl, undefined, logGLCall);

        const graphics = new WebGlGraphics(gl);
        this.renderEngine = new RenderingEngine(graphics);
        this.renderEngine.containerElement = this.canvas;
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