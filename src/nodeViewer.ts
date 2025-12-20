import { WebGlGraphics, NodeRenderer, GetImageDataFn } from "./rendering";
import { Camera } from "./cameras";
import { BaseWoWModelViewer, IBaseWoWModelViewerOptions } from "./baseViewer";

export type GLGraphicsCreateFn = (width: number, height: number, options?: WebGLContextAttributes) => WebGLRenderingContext

export interface NodeWoWModelViewerOptions extends IBaseWoWModelViewerOptions {
    createGl: GLGraphicsCreateFn,
    getImgData: GetImageDataFn,
    width?: number,
    height?: number
}

export class NodeWoWModelViewer extends BaseWoWModelViewer {
    options: NodeWoWModelViewerOptions;
    gl: WebGLRenderingContext;

    canvas: HTMLCanvasElement;
    viewerContainer: HTMLDivElement;
    renderer: NodeRenderer;

    constructor(options: NodeWoWModelViewerOptions) {
        if (!options.createGl) {
            throw "createGL function is required for the Node WoW ModelViewer.";
        }

        if (!options.getImgData) {
            throw "getImgData function is required for the Node WoW ModelViewer.";
        }

        super(options);
    }

    
    protected initializeRenderer() {
        this.width = this.options.width ? this.options.width : 1024;
        this.height = this.options.height ? this.options.height : 1024;

        
        this.gl = this.options.createGl(this.width, this.height, { alpha: true, premultipliedAlpha: false });
        const graphics = new WebGlGraphics(this.gl);
        this.renderer = new NodeRenderer({
            graphics: graphics,
            dataLoader: this.iocContainer.getDataLoader(),
            dataManager: this.iocContainer.getDataManager(),
            objectIdentifier: this.iocContainer.getObjectIdentifier(),
            progress: this.options.progressReporter,
            getImageDataFn: this.options.getImgData,
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

    draw(deltaTime: number) {
        this.renderer.draw(deltaTime);
    }

    getPixels() {
        const pixels = new Uint8Array(this.width * this.height * 4); 
        this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        return pixels;
    }

    resize(width: number, height: number) {
        if (this.renderer && this.renderer.width === width && this.renderer.height === height) {
            return;
        }

        const headlessGlExt = this.gl.getExtension("STACKGL_resize_drawingbuffer")
        if (headlessGlExt) {
            headlessGlExt.resize(width, height);
        }

        this.width = width;
        this.height = height;
        this.renderer.resize(width, height);
    }
}