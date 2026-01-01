import { IDataLoader, IProgressReporter, ErrorHandlerFn, ICamera  } from "./interfaces";
import { 
    IRenderObject, IWMOModel, IM2Model, ICharacterModel, IItemModel, 
    ITextureVariantModel, IObjectFactory, IDataManager, IObjectIdentifier, 
    IRenderer 
} from "./rendering";
import { Camera, RotatingCamera } from "./cameras";
import { Float4, Float3, AABB } from "./math";
import { FileIdentifier, RecordIdentifier } from "./metadata";
import { DefaultIoCContainer, RngFactory } from "./rendering/iocContainer";
import { IModelPickingStrategy, ITexturePickingStrategy } from "./rendering/strategies";


export interface IBaseWoWModelViewerOptions {
    dataLoader: IDataLoader,
    progressReporter?: IProgressReporter,
    onError?: ErrorHandlerFn,
    scene?: {
        backgroundColor?: Float4,
        cameraFov?: number;
        sunDirection?: Float3;
        interiorSunDirection?: Float3;
        exteriorAmbientColor?: Float4;
        exteriorDirectColor?: Float4;
        oceanCloseColor?: Float4;
        oceanFarColor?: Float4;
        riverCloseColor?: Float4;
        riverFarColor?: Float4;
        waterAlphas?: Float4;
        camera?: Camera;
        objects?: IRenderObject[];
        disableLighting?: boolean;
    },
    ioc?: {
        rngFactory?: RngFactory;
        texturePickingStrategy?: ITexturePickingStrategy;
        modelPickingStrategy?: IModelPickingStrategy
        objectFactory?: IObjectFactory;
        dataManager?: IDataManager;
        objectIdentifier?: IObjectIdentifier;
    }
    misc?: {
        cacheTtl?: number
    }
}

export abstract class BaseWoWModelViewer {
    options: IBaseWoWModelViewerOptions;

    renderer: IRenderer;

    width: number;
    height: number;

    iocContainer: DefaultIoCContainer;
    objectFactory: IObjectFactory;
    
    constructor(options: IBaseWoWModelViewerOptions) {
        if (!options?.dataLoader) {
            throw "dataLoader is a required argument for WoWModelViewer";
        }
        this.options = options;
        this.iocContainer = new DefaultIoCContainer();
        this.setupIOC();
        this.objectFactory = this.iocContainer.getObjectFactory();
        this.initializeRenderer();
    }

    getSceneBoundingBox(): AABB {
        return this.renderer.getSceneBoundingBox();
    }

    getCameraFov(): number {
        return this.renderer.fov;
    }

    addM2Model(fileId: FileIdentifier): IM2Model {
        const model = this.objectFactory.createM2Model(fileId);
        this.addSceneObject(model);
        return model;
    }

    addWMOModel(fileId: FileIdentifier): IWMOModel {
        const model = this.objectFactory.createWMOModel(fileId);
        this.addSceneObject(model);
        return model;
    }

    addCharacterModel(modelId: RecordIdentifier): ICharacterModel {
        const model = this.objectFactory.createCharacterModel(modelId);
        this.addSceneObject(model);
        return model;
    }

    addItemModel(modelId: RecordIdentifier): IItemModel {
        const model = this.objectFactory.createItemModel(modelId);
        this.addSceneObject(model);
        return model;
    }

    addTextureVariantModel(fileId: FileIdentifier): ITextureVariantModel {
        const model = this.objectFactory.createTextureVariantModel(fileId);
        this.addSceneObject(model);
        return model;
    }

    addSceneObject(object: IRenderObject) {
        this.renderer.addSceneObject(object);
    }

    removeSceneObject(object: IRenderObject, dispose = true) {
        this.renderer.removeSceneObject(object, dispose);
    }

    useStaticCamera(resizeOnSceneExpand = true): Camera {
        const camera = new Camera(resizeOnSceneExpand);
        this.renderer.switchCamera(camera);
        return camera;
    }

    useRotatingCamera(resizeOnSceneExpand = true): RotatingCamera {
        const camera = new RotatingCamera(resizeOnSceneExpand);
        this.renderer.switchCamera(camera);
        return camera;
    }

    useCamera(camera: ICamera) {
        this.renderer.switchCamera(camera);
    }

    useCameraFov(newFov: number) {
        this.renderer.fov = newFov;
        this.renderer.resize(this.width, this.height);
    }

    useClearColor(color: Float4) {
        Float4.copy(color, this.renderer.clearColor);
    }

    useSunDirection(dir: Float3) {
        Float3.copy(dir, this.renderer.sunDir);
        Float3.normalize(dir, this.renderer.exteriorDirectColorDir);
    }

    useExteriorAmbientColor(color: Float4) {
        Float4.copy(color, this.renderer.exteriorAmbientColor);
    }

    useExteriorDirectColor(color: Float4) {
        Float4.copy(color, this.renderer.exteriorDirectColor);
    }

    useInteriorSunDirection(dir: Float3) {
        Float3.copy(dir, this.renderer.interiorSunDir);
        Float3.normalize(dir, this.renderer.interiorDirectColorDir);
    }

    useOceanCloseColor(color: Float4) {
        Float4.copy(color, this.renderer.oceanCloseColor);
    }

    useOceanFarColor(color: Float4) {
        Float4.copy(color, this.renderer.oceanFarColor);
    }

    useRiverCloseColor(color: Float4) {
        Float4.copy(color, this.renderer.riverCloseColor);
    }
    
    useRiverFarColor(color: Float4) {
        Float4.copy(color, this.renderer.riverFarColor);
    }
    
    useWaterAlphas(color: Float4) {
        Float4.copy(color, this.renderer.waterAlphas);
    }

    setDoodadRenderDistance(value: number) {
        this.renderer.doodadRenderDistance = value;
    }
    
    protected abstract initializeRenderer(): void;

    abstract resize(width: number, height: number): void;

    private setupIOC() {
        this.iocContainer.setDataLoader(this.options.dataLoader);
        this.iocContainer.setErrorHandler(this.options.onError);
        this.iocContainer.setProgressReporter(this.options.progressReporter);
        this.iocContainer.createDefaults();
        if (!this.options.ioc) {
            return;
        }
        const iocOpts = this.options.ioc;
        if (iocOpts.dataManager) {
            this.iocContainer.setDataManager(iocOpts.dataManager);
        }
        if (iocOpts.modelPickingStrategy) {
            this.iocContainer.setModelPickingStrategy(iocOpts.modelPickingStrategy);
        }
        if (iocOpts.objectFactory) {
            this.iocContainer.setObjectFactory(iocOpts.objectFactory);
        }
        if (iocOpts.objectIdentifier) {
            this.iocContainer.setObjectIdentifier(iocOpts.objectIdentifier);
        }
        if (iocOpts.rngFactory) {
            this.iocContainer.setRandomNumberGeneratorCtor(iocOpts.rngFactory);
        }
        if (iocOpts.texturePickingStrategy) {
            this.iocContainer.setTexturePickingStrategy(iocOpts.texturePickingStrategy);
        }
    }
}