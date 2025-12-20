import { FileIdentifier, RecordIdentifier } from "@app/metadata";
import { ICache, IIoCContainer, IObjectFactory } from "./interfaces";
import { CharacterModel, ItemModel, M2Model, TextureVariantModel, WMOModel } from "./objects";
import { SimpleCache } from "./simpleCache";
import { ItemVisualModel } from "./objects/itemVisual";

export class DefaultObjectFactory implements IObjectFactory {
    private iocContainer: IIoCContainer;

    constructor(container: IIoCContainer) {
        this.iocContainer = container;
    }

    createM2Model(fileId: FileIdentifier) {
        const model = new M2Model(this.iocContainer.getDataManager(), this.iocContainer.getRandomNumberGenerator());
        model.loadFileId(fileId);
        return model;
    }

    createWMOModel(fileId: FileIdentifier) {
        const model = new WMOModel(this.iocContainer.getDataManager(), this.iocContainer.getObjectFactory());
        model.loadFileId(fileId);
        return model;
    }

    createItemModel(displayId: RecordIdentifier) {
        const model = new ItemModel(this.iocContainer.getDataManager(), this.iocContainer.getObjectFactory(), 
            this.iocContainer.getTexturePickingStrategy(), this.iocContainer.getModelPickingStrategy());
        model.loadDisplayInfoId(displayId);
        return model;
    }

    createCharacterModel(modelId: RecordIdentifier) {
        const model = new CharacterModel(this.iocContainer.getDataManager(), this.iocContainer.getRandomNumberGenerator(),
            this.iocContainer.getObjectFactory(), this.iocContainer.getTexturePickingStrategy());
        model.loadModelId(modelId);
        return model;
    }

    createTextureVariantModel(id: FileIdentifier) {
        const model = new TextureVariantModel(this.iocContainer.getDataManager(), this.iocContainer.getRandomNumberGenerator());
        model.loadFileId(id);
        return model;
    }

    createItemVisual(id: RecordIdentifier) {
        const model = new ItemVisualModel(this.iocContainer.getDataManager(), this.iocContainer.getObjectFactory());
        model.loadItemVisualId(id);
        return model;
    }

    createCache(): ICache {
        return new SimpleCache();
    }
}