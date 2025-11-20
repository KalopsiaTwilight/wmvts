
import { FileIdentifier, TextureVariationsMetadata } from "@app/metadata";
import { WoWTextureType } from "@app/modeldata";
import { ICallbackManager } from "@app/utils";
import { ITexture } from "@app/rendering/graphics";
import { IIoCContainer, IRenderer } from "@app/rendering/interfaces";

import { M2Model } from "../m2Model";

import { ITextureVariantModel, TextureVariantModelCallbackType } from "./interfaces";

export class TextureVariantModel extends M2Model implements ITextureVariantModel{

    textureVariations: TextureVariationsMetadata;
    override callbackMgr: ICallbackManager<TextureVariantModelCallbackType, TextureVariantModel>;

    loadedTextures: ITexture[]

    constructor(fileId: FileIdentifier, iocContainer: IIoCContainer) {
        super(fileId, iocContainer);
    }
    
    useTextureVariation(index: number) {
        if (this.isDisposing) {
            return;
        }

        const data = this.textureVariations.textureVariations[index];
        if (!data) {
            return;
        }

        for (let i = 0; i < data.textureIds.length; i++) {
            if (i >= this.modelData.textureCombos.length) {
                break;
            }

            this.renderer.getTexture(data.textureIds[i]).then((texture) => {
                this.swapTexture(i, texture);
            })
        }
    }

    override attachToRenderer(engine: IRenderer): void {
        super.attachToRenderer(engine);

        this.on("modelDataLoaded", () => {
            this.dataManager.getTextureVariationsMetadata(this.fileId).then(this.onTextureVariationsLoaded.bind(this));
        })
    }

    override get isLoaded(): boolean {
        return super.isLoaded && this.textureVariations != null;
    }

    override canExecuteCallback(type: TextureVariantModelCallbackType): boolean {
        switch(type) {
            case "modelDataLoaded": 
            case "texturesLoadStart": 
            case "texturesLoaded":
                return super.canExecuteCallback(type);
            case "textureVariationsLoaded":
                return this.textureVariations != null;
            default: return false;
        }
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.textureVariations = null;
        this.callbackMgr = null;
    }

    private onTextureVariationsLoaded(data: TextureVariationsMetadata | null) {
        if (this.isDisposing) {
            return;
        }

        this.textureVariations = data;

        this.callbackMgr.processCallbacks("textureVariationsLoaded");
        
        for (const textureInfo of this.modelData.textures) {
            // Load first texture variation if any textures are undefined and have a usage type.
            if (textureInfo.type !== WoWTextureType.None && textureInfo.textureId === 0) {
                this.useTextureVariation(0);
            }
        }
    }
}