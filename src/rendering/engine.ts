import { Float3, Float4, Float44 } from "./math";
import { Camera } from "./camera";
import { RenderObject, IDisposable } from "./objects";
import { GxBlend, IGraphics, ITexture, ITextureOptions, RenderingBatchRequest } from "./graphics";
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
    lightColor1: Float4;
    lightColor2: Float4;
    lightColor3: Float4;
    lightDir1: Float3;
    lightDir2: Float3;
    lightDir3: Float3;

    textureCache: { [key: number]: ITexture }
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
        this.batchRequests = [];

        // TODO: Allow options to set this somewhere
        this.fov = 60;
        this.ambientColor = Float4.create(1/3, 1/3, 1/3, 1);
        this.lightColor1 = Float4.one()
        this.lightColor2 = Float4.create(1/3, 1/3 , 1/3, 1);
        this.lightColor3 = Float4.create(1/4, 1/4, 1/4, 1);
        this.lightDir1 = Float3.normalize([0, 1, 0]);
        this.lightDir2 = Float3.normalize([0, -1, 0]);
        this.lightDir3 = Float3.normalize([1, 1, 1]);
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
            "u_ambientColor": this.ambientColor, //TODO: SCENEUNIFORMS;
            "u_light1Color": this.lightColor1,
            "u_light2Color": this.lightColor2,
            "u_light3Color": this.lightColor3,
            "u_lightDir1": this.lightDir1,
            "u_lightDir2": this.lightDir2,
            "u_lightDir3": this.lightDir3,
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,
        });
        this.batchRequests.push(request);
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