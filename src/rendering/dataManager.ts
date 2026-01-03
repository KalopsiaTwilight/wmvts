import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";
import { ICache, IDataManager, IIoCContainer } from "./interfaces";
import { CharacterMetadata, FileIdentifier, ItemMetadata, ItemVisualMetadata, LiquidTypeMetadata, RecordIdentifier, SpellVisualKitMetadata, TextureVariationsMetadata } from "@app/metadata";
import { ErrorHandlerFn, ErrorType, IDataLoader, IProgressReporter } from "@app/interfaces";

const DataLoadingErrorType: ErrorType = "dataFetching";
const LoadDataOperationText: string = "Loading model data..."

export class DefaultDataManager implements IDataManager {
    cache: ICache;
    runningRequests: { [key: string]: Promise<unknown> }

    dataLoader: IDataLoader;
    progress?: IProgressReporter;
    errorHandler?: ErrorHandlerFn;

    constructor(container: IIoCContainer) {
        this.runningRequests = {};
        this.dataLoader = container.getDataLoader();
        this.progress = container.getProgressReporter();
        this.errorHandler = container.getErrorHandler();
        this.cache = container.getObjectFactory().createCache();
    }

    update(deltaTime: number): void {
        this.cache.update(deltaTime);
    }

    getM2ModelFile(fileId: FileIdentifier): Promise<WoWModelData | null> {
        const key = "M2-" + fileId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadModelFile(fileId))
    }

    getWMOModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData | null> {
        const key = "WMO-" + fileId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadWorldModelFile(fileId))
    }

    getLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata | null> {
        const key = "LIQUID-" + liquidId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadLiquidTypeMetadata(liquidId))
    }

    getCharacterMetadata(modelId: number): Promise<CharacterMetadata | null> {
        const key = "CHARACTER-" + modelId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadCharacterMetadata(modelId));
    }

    getItemMetadata(displayInfoId: number): Promise<ItemMetadata | null> {
        const key = "ITEM-" + displayInfoId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadItemMetadata(displayInfoId));
    }

    getTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata | null> {
        const key = "TEXTUREVAR-" + fileId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadTextureVariationsMetadata(fileId));
    }   
    
    getBoneFileData(fileId: FileIdentifier): Promise<WoWBoneFileData | null> {
        const key = "BONES-" + fileId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadBoneFile(fileId));
    }

    getTextureImageData(fileId: FileIdentifier): Promise<Blob | null> {
        const key = "IMG-" + fileId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadTexture(fileId));
    }

    getItemVisualMetadata(itemVisualId: RecordIdentifier): Promise<ItemVisualMetadata | null> {
        const key = "ITEMVISUAL-" + itemVisualId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadItemvisualMetadata(itemVisualId))
    }

    getSpellVisualKitMetadata(spellVisualKitId: RecordIdentifier): Promise<SpellVisualKitMetadata | null> {
        const key = "SPELLVISUALKIT-" + spellVisualKitId;
        return this.getDataFromLoaderOrCache(key, (dl) => dl.loadSpellVisualKitMetadata(spellVisualKitId))
    }
    
    private async getDataFromLoaderOrCache<T>(key: string, loadFn: (x: IDataLoader) => Promise<T|Error>): Promise<T|null> {
        if (this.runningRequests[key]) {
            const data = await this.runningRequests[key];
            if (data instanceof Error) {
                return null;  
            }
            return data as T;
        }

        if (this.cache.contains(key)) {
            return this.cache.get<T>(key);
        }

        this.progress?.setOperation(LoadDataOperationText);
        this.progress?.addFileToOperation(key);
        const req = loadFn(this.dataLoader);
        this.runningRequests[key] = req;
        const data = await req;
        delete this.runningRequests[key];
        this.progress?.removeFileFromOperation(key);

        if (data instanceof Error) {
            this.errorHandler?.(DataLoadingErrorType, key, data);
            return null;  
        }
        this.cache.store(key, data);
        return data;
    }
}