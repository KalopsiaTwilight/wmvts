import { AleaPrngGenerator, IPseudoRandomNumberGenerator } from "@app/math";
import { IDataManager, IIoCContainer, IObjectFactory } from "./interfaces";
import { ITexturePickingStrategy, IModelPickingStrategy, defaultTexturePickingStrategy, defaultModelPickingStrategy } from "./strategies";
import { DefaultObjectFactory } from "./objectFactory";
import { ErrorHandlerFn, IDataLoader, IProgressReporter } from "@app/interfaces";
import { DefaultDataManager } from "./dataManager";


export class DefaultIoCContainer implements IIoCContainer {

    // TODO: make this configurable?
    private texturePickingStrategy: ITexturePickingStrategy
    private modelPickingStrategy: IModelPickingStrategy
    private objectFactory: IObjectFactory;
    private dataLoader: IDataLoader;
    private progressReporter?: IProgressReporter;
    private errorHandler?: ErrorHandlerFn;
    private dataManager?: IDataManager;

    constructor(dataLoader: IDataLoader, errorHandler?: ErrorHandlerFn, progressReporter?: IProgressReporter) {
        this.texturePickingStrategy = defaultTexturePickingStrategy;
        this.modelPickingStrategy = defaultModelPickingStrategy;
        this.dataLoader = dataLoader;
        this.progressReporter = progressReporter;
        this.errorHandler = errorHandler;
        // TODO: Make these configurable;
        this.objectFactory = new DefaultObjectFactory(this);
        this.dataManager = new DefaultDataManager(this);
    }
    
    getRandomNumberGenerator(seed?: number | string): IPseudoRandomNumberGenerator {
        return new AleaPrngGenerator(seed ? seed : 0xb00b1e5);
    }

    getTexturePickingStrategy(): ITexturePickingStrategy {
        return this.texturePickingStrategy;
    }

    getModelPickingStrategy(): IModelPickingStrategy {
        return this.modelPickingStrategy;
    }

    getObjectFactory(): IObjectFactory {
        return this.objectFactory;
    }

    getDataLoader(): IDataLoader {
        return this.dataLoader;
    }

    getProgressReporter(): IProgressReporter {
        return this.progressReporter;
    }

    getErrorHandler(): ErrorHandlerFn {
        return this.errorHandler;
    }
    
    getDataManager(): IDataManager {
        return this.dataManager;
    }
}