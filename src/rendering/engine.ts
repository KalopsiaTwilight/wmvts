import { Float3, Float4, Float44 } from "./math";
import { Camera } from "./camera";
import { RenderObject, IDisposable } from "./objects";
import { IGraphics, ITexture } from "./graphics";
import { IDataLoader } from "@app/iDataLoader";


const UNKNOWN_TEXTURE_ID = -123;
export class RenderingEngine implements IDisposable {
    containerElement?: HTMLElement;
    graphics: IGraphics;
    dataLoader: IDataLoader;

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

    constructor(graphics: IGraphics, dataLoader: IDataLoader, container?: HTMLElement) {
        this.graphics = graphics;
        this.containerElement = container;
        this.dataLoader = dataLoader;

        this.sceneObjects = [];

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.clearColor = Float4.create(0.1, 0.1, 0.1, 1);

        this.textureCache = { };

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
            obj.draw(false);
            obj.draw(true);
        }
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

    addSceneObject(object: RenderObject, priority: number) {
        object.initialize(this);
        this.sceneObjects.push(object);
    }

    getTexture(fileId: number): Promise<ITexture> {
        return new Promise<ITexture>((res, rej) => {
            if(this.textureCache[fileId]) {
                res(this.textureCache[fileId]);
            }
            
            this.dataLoader.loadTexture(fileId).then((imgData) => {
                const img = new Image();
                img.onload = () => {
                    res(this.graphics.createTextureFromImg(img));
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
}