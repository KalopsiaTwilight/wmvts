import { Float3, Float4, Float44 } from "./math";
import { Camera } from "./camera";
import { RenderObject, IDisposable } from "./objects";
import { GxBlend, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest } from "./graphics";
import { IProgressReporter, IDataLoader, WoWModelData, WoWWorldModelData } from "..";

const UNKNOWN_TEXTURE_ID = -123;
export class RenderingEngine implements IDisposable {
    containerElement?: HTMLElement;
    graphics: IGraphics;
    dataLoader: IDataLoader;
    progress?: IProgressReporter;

    isDisposing: boolean;
    lastTime: number;

    sceneCamera: Camera;
    sceneObjects: RenderObject[];

    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;

    fov: number;
    width: number;
    height: number;
    clearColor: Float4;
    ambientColor: Float4;
    lightColor: Float4;
    lightDir: Float3;

    textureCache: { [key: number]: ITexture }
    shaderCache: { [key: string]: IShaderProgram }
    batchRequests: RenderingBatchRequest[];

    constructor(graphics: IGraphics, dataLoader: IDataLoader, progress?: IProgressReporter, container?: HTMLElement) {
        this.graphics = graphics;
        this.containerElement = container;
        this.dataLoader = dataLoader;
        this.dataLoader.useProgressReporter(progress);
        this.progress = progress;

        this.sceneObjects = [];

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.clearColor = Float4.create(0.1, 0.1, 0.1, 1);

        this.textureCache = { };
        this.shaderCache = { };
        this.batchRequests = [];

        // TODO: Allow options to set this somewhere
        this.fov = 60;
        this.ambientColor = Float4.create(1/3, 1/3, 1/3, 1);
        this.lightColor = Float4.one()
        this.lightDir = Float3.normalize([0, 0, 1]);
    }

    dispose(): void {
        this.viewMatrix = null;
        this.invViewMatrix = null;
        this.sceneCamera.dispose();
        for(const object of this.sceneObjects) {
            object.dispose();
        }
    }

    now() {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    draw(currentTime: number) {
        const deltaTime = (currentTime - this.lastTime);
        this.lastTime = currentTime;

        this.graphics.startFrame(this.width, this.height);
        this.graphics.clearFrame(this.clearColor);
        
        this.sceneCamera.update(deltaTime);
        Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
        Float44.invert(this.viewMatrix, this.invViewMatrix);
        for(const obj of this.sceneObjects) {
            obj.update(deltaTime);
        }
        for(const obj of this.sceneObjects) {
            obj.draw();
        }

        // Sort batches in draw order.
        const requests = this.batchRequests
            .sort((r1, r2) => {
            const layer1 = r1.blendMode > GxBlend.GxBlend_Opaque ?
                r1.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2  : 0
            const layer2 = r2.blendMode > GxBlend.GxBlend_Opaque ?
                r2.blendMode == GxBlend.GxBlend_AlphaKey ? 1 : 2  : 0

            const layerDiff = layer1 - layer2;
            if (layerDiff != 0) {
                return layerDiff;
            }
            return r1.priority - r2.priority;
        });
        for(const batch of requests) {
            batch.submit(this.graphics);
        }
        this.batchRequests = [];
    }

    start() {
        this.lastTime = this.now();

        this.sceneCamera.initialize(this);
        Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
        Float44.invert(this.viewMatrix, this.invViewMatrix);

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
        const engine = this;
        const drawFrame = () => {
            if (engine.isDisposing) {
                return;
            }
            const now = engine.now();
            engine.draw(now);
            window.requestAnimationFrame(drawFrame)
        }
        drawFrame();
    }

    resize(width: number, height: number) {
        this.height = height;
        this.width = width;

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
    }

    addSceneObject(object: RenderObject, priority: number) {
        object.initialize(this);
        this.sceneObjects.push(object);
    }

    removeSceneObject(object: RenderObject) {
        this.sceneObjects = this.sceneObjects.filter((x) => x != object);
        object.dispose();
    }

    getTexture(fileId: number, opts?: ITextureOptions): Promise<ITexture> {
        return new Promise<ITexture>((res, rej) => {
            if(this.textureCache[fileId]) {
                res(this.textureCache[fileId]);
            }
            
            this.progress?.setOperation('Loading textures...');
            this.progress?.addFileIdToOperation(fileId);
            this.dataLoader.loadTexture(fileId).then((imgData) => {
                this.progress?.removeFileIdFromOperation(fileId);
                const img = new Image();
                img.onload = () => {
                    res(this.graphics.createTextureFromImg(img, opts));
                }
                img.onerror = (err) => {
                    rej(err)
                }
                img.src = imgData;
            });
        });
    }

    getUnknownTexture(): ITexture {
        if (this.textureCache[UNKNOWN_TEXTURE_ID]) {
            return this.textureCache[UNKNOWN_TEXTURE_ID];
        }

        this.textureCache[UNKNOWN_TEXTURE_ID] = this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
        return this.textureCache[UNKNOWN_TEXTURE_ID];
    }

    submitBatchRequest(request: RenderingBatchRequest) {
        request.useUniforms({
            "u_ambientColor": this.ambientColor,
            "u_lightColor": this.lightColor,
            "u_lightDir": this.lightDir,
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,
        });
        this.batchRequests.push(request);
    }

    getShaderProgram(key: string, vertexShader: string, fragmentShader: string): IShaderProgram {
        if (this.shaderCache[key]) {
            return this.shaderCache[key];
        }

        const program = this.graphics.createShaderProgram(vertexShader, fragmentShader);
        this.shaderCache[key] = program;
        return program;
    }

    async getM2ModelFile(fileId: number): Promise<WoWModelData> {
        this.progress?.setOperation('Loading model data...');
        const data = await this.dataLoader.loadModelFile(fileId);
        this.progress?.finishOperation();
        return data;
    }

    async getWMOModelFile(fileId: number): Promise<WoWWorldModelData> {
        this.progress?.setOperation('Loading model data...');
        const data = await this.dataLoader.loadWorldModelFile(fileId);
        this.progress?.finishOperation();
        return data;
    }
}