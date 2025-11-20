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
        const model = new M2Model(fileId, this.iocContainer);
        return model;
    }

    createWMOModel(fileId: FileIdentifier) {
        const model = new WMOModel(fileId, this.iocContainer);
        return model;
    }

    createItemModel(displayId: RecordIdentifier) {
        const model = new ItemModel(displayId, this.iocContainer);
        return model;
    }

    createCharacterModel(modelId: RecordIdentifier) {
        const model = new CharacterModel(modelId, this.iocContainer);
        return model;
    }

    createTextureVariantModel(id: FileIdentifier) {
        const model = new TextureVariantModel(id, this.iocContainer);
        return model;
    }

    createCache(): ICache {
        return new SimpleCache();
    }
}