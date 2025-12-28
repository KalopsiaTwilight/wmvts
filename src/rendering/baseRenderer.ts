import { AABB, Float3, Float4, Float44, Frustrum } from "@app/math";
import { FileIdentifier } from "@app/metadata";
import { IProgressReporter, IDataLoader, ErrorHandlerFn, ErrorType, IDisposable, ICamera } from "@app/interfaces";
import { Disposable } from "@app/disposable";

import { IRenderObject, isWorldPositionedObject } from "./objects";
import {
    DrawingBatchRequest, IAttribLocations, IDataBuffers, IGraphics, IShaderProgram, ITexture, ITextureOptions, RenderingBatchRequest,
    RenderMaterial
} from "./graphics";
import { WebGlCache } from "./webglCache";
import { IBaseRendererOptions, IDataManager, IObjectIdentifier, IRenderer, RendererEvents } from "./interfaces";

const RenderingErrorType: ErrorType = "rendering"

export abstract class BaseRenderer<TParentEvent extends string = never> extends Disposable<TParentEvent | RendererEvents> implements IRenderer<TParentEvent> {
    // Options / Configurables
    graphics: IGraphics;
    dataLoader: IDataLoader;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;
    sceneCamera: ICamera;

    // Rendering settings
    fov: number;
    width: number;
    height: number;
    clearColor: Float4;
    doodadRenderDistance: number;
    debugPortals: boolean;

    // Light Settings
    sunDir: Float3;
    exteriorAmbientColor: Float4;
    exteriorDirectColor: Float4;
    exteriorDirectColorDir: Float3;

    interiorSunDir: Float3;
    personalInteriorSunDir: Float4;
    interiorAmbientColor: Float4;
    interiorDirectColor: Float4;
    interiorDirectColorDir: Float3;

    // Water settings
    oceanCloseColor: Float4;
    oceanFarColor: Float4;
    riverCloseColor: Float4;
    riverFarColor: Float4;
    waterAlphas: Float4;

    // Working data
    isDisposing: boolean;
    lastDeltaTime: number;
    timeElapsed: number;

    // Camera data
    projectionMatrix: Float44;
    viewMatrix: Float44;
    invViewMatrix: Float44;
    projViewMatrix: Float44;
    cameraFrustrum: Frustrum;
    cameraPosition: Float3;

    graphicsCache: WebGlCache;
    textureRequests: { [key: string]: Promise<ITexture> }

    // Drawing data
    drawRequests: DrawingBatchRequest[];
    otherGraphicsRequests: RenderingBatchRequest[];
    sceneObjects: IRenderObject[];
    sceneBoundingBox: AABB;

    // IoC
    dataManager: IDataManager;
    objectIdentifier: IObjectIdentifier;

    constructor(options: IBaseRendererOptions) {
        super();
        this.graphics = options.graphics;
        this.dataLoader = options.dataLoader;
        this.progress = options.progress;
        this.dataManager = options.dataManager;
        this.objectIdentifier = options.objectIdentifier;
        this.dataLoader.useProgressReporter(options.progress);
        this.errorHandler = options.errorHandler;

        this.sceneObjects = [];
        this.sceneBoundingBox = AABB.zero();

        this.viewMatrix = Float44.identity();
        this.invViewMatrix = Float44.identity();
        this.projectionMatrix = Float44.identity();
        this.projViewMatrix = Float44.identity();
        this.cameraFrustrum = Frustrum.zero();
        this.cameraPosition = Float3.zero();

        const cacheTtl = options.cacheTtl ? options.cacheTtl : 1000 * 60 * 15;
        this.graphicsCache = new WebGlCache(cacheTtl);

        this.textureRequests = {};
        this.drawRequests = [];
        this.otherGraphicsRequests = [];

        this.clearColor = options.clearColor ? options.clearColor : Float4.create(0.1, 0.1, 0.1, 1);
        this.fov = options.cameraFov ? options.cameraFov : 60;

        // default lighting settings
        this.sunDir = options.sunDir ? options.sunDir : Float3.create(-0.30822, -0.30822, -0.9);
        this.exteriorAmbientColor = options.exteriorAmbientColor ? options.exteriorAmbientColor : Float4.create(127/255, 149/255, 170/255, 1); // #7F95AA  // #36586C for night
        this.exteriorDirectColor = options.exteriorDirectColor ? options.exteriorDirectColor : Float4.create(106/255, 86/255, 66/255, 1); // #6A5642 // #244664 for night
        this.exteriorDirectColorDir = Float3.normalize(this.sunDir);

        this.interiorSunDir = options.interiorSunDir ? options.interiorSunDir : Float3.create(-0.30822, -0.30822, -0.9);
        this.personalInteriorSunDir = Float4.zero();
        this.interiorAmbientColor = Float4.zero();
        this.interiorDirectColor = Float4.zero();
        this.interiorDirectColorDir = Float3.normalize(this.interiorSunDir);

        this.oceanCloseColor = options.oceanCloseColor ? options.oceanCloseColor : Float4.create(17 / 255, 75 / 255, 89 / 255, 1); // #114B59
        this.oceanFarColor = options.oceanFarColor ? options.oceanFarColor : Float4.create(0, 29 / 255, 41 / 255, 1); // #001D29
        this.riverCloseColor = options.riverCloseColor ? options.riverCloseColor : Float4.create(41 / 255, 76 / 255, 81 / 255, 1); // #294C51
        this.riverFarColor = options.riverFarColor ? options.riverFarColor : Float4.create(26 / 255, 46 / 255, 51 / 255, 1), // #1A2E33
            this.waterAlphas = options.waterAlphas ? options.waterAlphas : Float4.create(0.3, 0.8, 0.5, 1)

        // Set opts to defaults
        this.debugPortals = false;
        this.doodadRenderDistance = 300;

        // Set up working data
        this.lastDeltaTime = 0;
        this.timeElapsed = 0;
    }

    dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        this.graphics = null;
        this.dataLoader = null;
        this.progress = null;
        this.errorHandler = null;
        this.sceneCamera = null;

        // Light settings
        this.sunDir = null;
        this.exteriorAmbientColor = null;
        this.exteriorDirectColor = null;
        this.exteriorDirectColorDir = null;

        this.interiorSunDir = null;
        this.personalInteriorSunDir = null;
        this.interiorAmbientColor = null;
        this.interiorDirectColor = null;
        this.exteriorDirectColorDir = null;
        
        // Water settings
        this.oceanCloseColor = null;
        this.oceanFarColor = null;
        this.riverCloseColor = null;
        this.riverFarColor = null;
        this.waterAlphas = null;

        // Camera data
        this.projectionMatrix = null;
        this.viewMatrix = null;
        this.invViewMatrix = null;
        this.projViewMatrix = null;
        this.cameraFrustrum = null;
        this.cameraPosition = null;

        this.graphicsCache.dispose();
        this.graphicsCache = null;
        this.textureRequests = null;

        // Drawing data
        this.drawRequests = null;
        this.otherGraphicsRequests = null;
        for(let i = 0; i < this.sceneObjects.length; i++) {
            this.sceneObjects[i].dispose();
        }
        this.sceneObjects = null;
        this.sceneBoundingBox = null;

        this.dataManager = null;
        this.objectIdentifier = null;
    }

    draw(deltaTime: number) {
        try {
            this.processCallbacks("beforeUpdate");
            // Update camera
            this.sceneCamera.update(deltaTime);
            Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
            Float44.invert(this.viewMatrix, this.invViewMatrix);
            Float44.multiply(this.projectionMatrix, this.viewMatrix, this.projViewMatrix);
            Frustrum.fromViewMatrix(this.projViewMatrix, this.cameraFrustrum);
            Float44.getTranslation(this.invViewMatrix, this.cameraPosition);

            // Update objects
            this.dataManager.update(deltaTime);
            this.graphicsCache.update(deltaTime);
            for (const obj of this.sceneObjects) {
                obj.update(deltaTime);
            }
            this.processCallbacks("afterUpdate")

            this.processCallbacks("beforeDraw");

            // Do non drawing graphics work
            this.otherGraphicsRequests.sort((a, b) => a.compareTo(b));
            for (const batch of this.otherGraphicsRequests) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();
            this.otherGraphicsRequests = [];

            // Draw all scene objects
            for (const obj of this.sceneObjects) {
                obj.draw();
            }

            // Draw new frame
            this.drawRequests.sort((r1, r2) => r1.compareTo(r2))
            this.graphics.clearFrame(this.clearColor);
            this.graphics.startFrame(this.width, this.height);
            for (const batch of this.drawRequests) {
                batch.submit(this.graphics);
            }
            this.graphics.endFrame();

            this.processCallbacks("afterDraw");

            this.drawRequests = [];
            this.lastDeltaTime = deltaTime;
            this.timeElapsed += deltaTime;
        }
        catch (err) {
            this.errorHandler?.(RenderingErrorType, null, err);
        }
    }

    start() {
        this.timeElapsed = 0;
        this.lastDeltaTime = 1;

        this.sceneCamera.attachToRenderer(this);
        Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
        Float44.invert(this.viewMatrix, this.invViewMatrix);

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
    }

    resize(width: number, height: number) {
        this.height = height;
        this.width = width;

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
    }

    switchCamera(newCamera: ICamera) {
        newCamera.attachToRenderer(this);
        if (this.sceneCamera) {
            this.sceneCamera.dispose();
        }
        this.sceneCamera = newCamera;
    }

    addSceneObject(object: IRenderObject) {
        object.attachToRenderer(this);
        object.once("disposed", () => {
            this.sceneObjects = this.sceneObjects.filter(x => !x.isDisposing);
        })
        if (isWorldPositionedObject(object)) {
            object.once("loaded", (obj) => {
                this.sceneBoundingBox = AABB.merge(this.sceneBoundingBox, obj.worldBoundingBox);
                this.processCallbacks("sceneBoundingBoxUpdate");
            })
        }
        this.sceneObjects.push(object);
    }

    removeSceneObject(object: IRenderObject) {
        this.sceneObjects = this.sceneObjects.filter((x) => x != object);
        object.dispose();
        this.recalculateSceneBounds();
    }

    private recalculateSceneBounds() {
        this.sceneBoundingBox = AABB.zero();
        for (const obj of this.sceneObjects) {
            if (isWorldPositionedObject(obj)) {
                this.sceneBoundingBox = AABB.merge(this.sceneBoundingBox, obj.worldBoundingBox)
            }
        }
        this.processCallbacks("sceneBoundingBoxUpdate");
    }

    submitDrawRequest(request: DrawingBatchRequest) {
        this.drawRequests.push(request);
    }

    submitOtherGraphicsRequest(request: RenderingBatchRequest) {
        this.otherGraphicsRequests.push(request);
    }

    getSolidColorTexture(color: Float4) {
        return this.graphics.createSolidColorTexture(color);
    }

    getUnknownTexture(): ITexture {
        return this.graphics.createSolidColorTexture(Float4.create(0, 1, 0, 1));
    }

    async getTexture(requester: IDisposable, fileId: FileIdentifier, opts?: ITextureOptions): Promise<ITexture | null> {
        const id = this.objectIdentifier.createIdentifier(requester);
        const key = "TEXTURE-" + fileId;

        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(key, id);
        })
        // Try to resolve from cache
        if (this.graphicsCache.contains(key)) {
            this.graphicsCache.addOwner(key, id);
            return this.graphicsCache.get(key);
        }

        if (this.textureRequests[key]) {
            const data = await this.textureRequests[key];
            if (this.graphicsCache.contains(key)) {
                this.graphicsCache.addOwner(key, id);
            }
            return data;
        }

        const promise = this.dataManager.getTextureImageData(fileId).then(async (data) => {
            if (!data) {
                return null;
            }
            const texture = await this.processTexture(fileId, data, opts);
            return texture;
        });
        this.textureRequests[key] = promise;

        const texture = await promise;
        if (texture) {
            this.graphicsCache.store(key, texture);
            this.graphicsCache.addOwner(key, id);
        }
        delete this.textureRequests[key];
        return texture;
    }

    protected abstract processTexture(fileId: FileIdentifier, imgData: Blob, opts?: ITextureOptions): Promise<ITexture>;

    getShaderProgram(requester: IDisposable, key: string, vertexShader: string, fragmentShader: string, attribLocations?: IAttribLocations): IShaderProgram {
        const id = this.objectIdentifier.createIdentifier(requester);
        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(cacheKey, id);
        })

        const cacheKey = "PROGRAM-" + key;
        if (this.graphicsCache.contains(cacheKey)) {
            this.graphicsCache.addOwner(cacheKey, id);
            return this.graphicsCache.get(cacheKey);
        }

        const program = this.graphics.createShaderProgram(vertexShader, fragmentShader, attribLocations);
        this.graphicsCache.store(cacheKey, program);
        this.graphicsCache.addOwner(cacheKey, id);
        return program;
    }

    getDataBuffers(requester: IDisposable, key: string, createFn: (graphics: IGraphics) => IDataBuffers): IDataBuffers {
        const id = this.objectIdentifier.createIdentifier(requester);

        requester.once("disposed", () => {
            this.graphicsCache.removeOwner(cacheKey, id);
        })

        const cacheKey = "DATABUFFER-" + key;
        if (this.graphicsCache.contains(cacheKey)) {
            this.graphicsCache.addOwner(cacheKey, id);
            return this.graphicsCache.get(cacheKey);
        }

        const dataBuffers = createFn(this.graphics);
        this.graphicsCache.store(cacheKey, dataBuffers);
        this.graphicsCache.addOwner(cacheKey, id);
        return dataBuffers;
    }

    getBaseMaterial() {
        const material = new RenderMaterial();
        material.useUniforms({
            "u_viewMatrix": this.viewMatrix,
            "u_projectionMatrix": this.projectionMatrix,

            // TODO: Implement interior lighting
            "u_applyInteriorLighting": false,
            "u_interiorAmbientColor": this.interiorAmbientColor,
            "u_interiorDirectColor": this.interiorDirectColor,
            "u_interiorDirectColorDir": this.interiorDirectColorDir,
            "u_personalInteriorSunDir": this.personalInteriorSunDir,

            "u_exteriorAmbientColor": this.exteriorAmbientColor,
            "u_exteriorDirectColor": this.exteriorDirectColor,
            "u_exteriorDirectColorDir": this.exteriorDirectColorDir,

            "u_oceanCloseColor": this.oceanCloseColor,
            "u_oceanFarColor": this.oceanFarColor,
            "u_riverCloseColor": this.riverCloseColor,
            "u_riverFarColor": this.riverFarColor,
            "u_waterAlphas": this.waterAlphas,
        });

        return material;
    }

    getLightingUniforms() {
        return `
uniform bool u_applyInteriorLighting;
uniform vec4 u_interiorAmbientColor;
uniform vec4 u_interiorDirectColor;
uniform vec3 u_interiorDirectColorDir;
uniform vec4 u_personalInteriorSunDir;

uniform vec4 u_exteriorAmbientColor; 
uniform vec4 u_exteriorDirectColor;
uniform vec3 u_exteriorDirectColorDir;     
`;
    }

    getLightingFunction() {
        return `
vec3 calcAmbientLight(vec3 ambient, vec3 precomputedLight, float normalDotLight) {
    vec3 lightColor = vec3(0.0, 0.0, 0.0);
    vec3 ambientLight = ambient.rgb + precomputedLight;
    vec3 skyColor = ambientLight * 1.1;
    vec3 groundColor = ambientLight * 0.7;
    lightColor = mix(groundColor, skyColor, 0.5 + 0.5 * normalDotLight);
    return lightColor;
}

vec3 light(
    bool applyLight,
    vec3 materialColor,
    vec3 vNormal,
    vec3 preComputedLight,
    vec3 specular,
    vec3 emissive
) {
    vec3 result = materialColor;
    if (applyLight) {
        vec3 lightColor = vec3(0.0, 0.0, 0.0);
        vec3 diffuseLight = vec3(0.0, 0.0, 0.0);
        vec3 normal = normalize(vNormal);

        if (u_applyInteriorLighting) {
            vec3 interiorSunDir = mix(u_interiorDirectColorDir, u_personalInteriorSunDir.xyz,u_personalInteriorSunDir.w);
            float normalDotLight = clamp(dot(normal, interiorSunDir), 0.0, 1.0);

            lightColor = calcAmbientLight(
                u_interiorAmbientColor.rgb,
                preComputedLight,
                normalDotLight
            );
            diffuseLight = u_interiorDirectColor.xyz * normalDotLight;
        }
        else {
            float normalDotLight = clamp(dot(normal, normalize(-u_exteriorDirectColorDir)), 0.0, 1.0);

            lightColor = calcAmbientLight(
                u_exteriorAmbientColor.rgb,
                preComputedLight,
                normalDotLight
            );
            diffuseLight = u_exteriorDirectColor.xyz * normalDotLight;
        }

        vec3 gammaDiffuseTerm = materialColor * (lightColor + diffuseLight);
        vec3 emmisiveTerm = emissive;
        result = gammaDiffuseTerm + emmisiveTerm;
    }

    return result + specular;
}        
`;
    }

    getSceneBoundingBox() {
        return this.sceneBoundingBox;
    }
}