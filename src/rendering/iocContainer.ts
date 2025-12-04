import { AleaPrngGenerator, IPseudoRandomNumberGenerator } from "@app/math";
import { IDataManager, IIoCContainer, IObjectFactory, IObjectIdentifier } from "./interfaces";
import { ITexturePickingStrategy, IModelPickingStrategy, defaultTexturePickingStrategy, defaultModelPickingStrategy } from "./strategies";
import { DefaultObjectFactory } from "./objectFactory";
import { ErrorHandlerFn, IDataLoader, IProgressReporter } from "@app/interfaces";
import { DefaultDataManager } from "./dataManager";
import { ObjectIdentifier } from "./objectIdentifier";


export type RngFactory = (seed?: number | string) => IPseudoRandomNumberGenerator;

export class DefaultIoCContainer implements IIoCContainer {

    // TODO: make this configurable?

    private rngFactory: RngFactory;
    private texturePickingStrategy: ITexturePickingStrategy
    private modelPickingStrategy: IModelPickingStrategy
    private objectFactory: IObjectFactory;
    private dataLoader?: IDataLoader;
    private progressReporter?: IProgressReporter;
    private errorHandler?: ErrorHandlerFn;
    private dataManager?: IDataManager;
    private objectIdentifier?: IObjectIdentifier;

    constructor() {
    }

    setRandomNumberGeneratorCtor(factoryFn: RngFactory) {
        this.rngFactory = factoryFn;
    }
    
    getRandomNumberGenerator(seed?: number | string): IPseudoRandomNumberGenerator {
        return this.rngFactory(seed ? seed : 0xb00b1e5);
    }

    setTexturePickingStrategy(strategy: ITexturePickingStrategy) {
        this.texturePickingStrategy = strategy;
    }

    getTexturePickingStrategy(): ITexturePickingStrategy {
        return this.texturePickingStrategy;
    }

    setModelPickingStrategy(strategy: IModelPickingStrategy)  {
        this.modelPickingStrategy = strategy;
    }

    getModelPickingStrategy(): IModelPickingStrategy {
        return this.modelPickingStrategy;
    }

    setObjectFactory(factory: IObjectFactory)  {
        this.objectFactory = factory;
    }

    getObjectFactory(): IObjectFactory {
        return this.objectFactory;
    }

    setDataLoader(loader: IDataLoader) {
        this.dataLoader = loader;
    }

    getDataLoader(): IDataLoader {
        return this.dataLoader;
    }

    setProgressReporter(reporter: IProgressReporter) {
        this.progressReporter = reporter;
    }

    getProgressReporter(): IProgressReporter {
        return this.progressReporter;
    }

    setErrorHandler(errorHandler: ErrorHandlerFn) {
        this.errorHandler = errorHandler;
    }

    getErrorHandler(): ErrorHandlerFn {
        return this.errorHandler;
    }

    setDataManager(dataManager:  IDataManager) {
        this.dataManager = dataManager;
    }
    
    getDataManager(): IDataManager {
        return this.dataManager;
    }

    setObjectIdentifier(identifier: IObjectIdentifier) {
        this.objectIdentifier = identifier;
    }

    getObjectIdentifier(): IObjectIdentifier {
        return this.objectIdentifier
    }

    createDefaults() {
        this.texturePickingStrategy = defaultTexturePickingStrategy;
        this.modelPickingStrategy = defaultModelPickingStrategy;
        this.objectFactory = new DefaultObjectFactory(this);
        this.dataManager = new DefaultDataManager(this);
        this.objectIdentifier = new ObjectIdentifier();
        this.rngFactory = (seed?: number | string) => new AleaPrngGenerator(seed);
    }
}