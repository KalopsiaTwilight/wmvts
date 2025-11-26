import { FileIdentifier, RecordIdentifier } from "@app/metadata";
import { ICache, IIoCContainer, IObjectFactory } from "./interfaces";
import { CharacterModel, ItemModel, M2Model, TextureVariantModel, WMOModel } from "./objects";
import { SimpleCache } from "./simpleCache";

export class DefaultObjectFactory implements IObjectFactory {
    private iocContainer: IIoCContainer;

    constructor(container: IIoCContainer) {
        this.iocContainer = container;
    }

    createM2Model(fileId: FileIdentifier) {
        const model = new M2Model(this.iocContainer);
        model.loadFileId(fileId);
        return model;
    }

    createWMOModel(fileId: FileIdentifier) {
        const model = new WMOModel(this.iocContainer);
        model.loadFileId(fileId);
        return model;
    }

    createItemModel(displayId: RecordIdentifier) {
        const model = new ItemModel(this.iocContainer);
        model.loadDisplayInfoId(displayId);
        return model;
    }

    createCharacterModel(modelId: RecordIdentifier) {
        const model = new CharacterModel(this.iocContainer);
        model.loadModelId(modelId);
        return model;
    }

    createTextureVariantModel(id: FileIdentifier) {
        const model = new TextureVariantModel(this.iocContainer);
        model.loadFileId(id);
        return model;
    }

    createCache(): ICache {
        return new SimpleCache();
    }
}