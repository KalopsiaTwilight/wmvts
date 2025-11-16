
import { TextureVariationsMetadata } from "@app/metadata";
import { WoWTextureType } from "@app/modeldata";
import { ICallbackManager } from "@app/utils";
import { ITexture } from "@app/rendering/graphics";
import { IRenderingEngine } from "@app/rendering/interfaces";

import { M2Model } from "../m2Model";

import { ITextureVariantModel, TextureVariantModelCallbackType } from "./interfaces";

export class TextureVariantModel extends M2Model implements ITextureVariantModel{
    textureVariations: TextureVariationsMetadata;
    override callbackMgr: ICallbackManager<TextureVariantModelCallbackType, TextureVariantModel>;

    loadedTextures: ITexture[]

    constructor(fileId: number) {
        super(fileId);
    }
    
    useTextureVariation(index: number) {
        const data = this.textureVariations.textureVariations[index];
        if (!data) {
            return;
        }

        for (let i = 0; i < data.textureIds.length; i++) {
            if (i >= this.modelData.textureCombos.length) {
                break;
            }

            this.engine.getTexture(data.textureIds[i]).then((texture) => {
                this.on("texturesLoaded", () => {
                    this.textureObjects[this.modelData.textureCombos[i]].swapFor(texture)
                })
            })
        }
    }

    override initialize(engine: IRenderingEngine): void {
        super.initialize(engine);

        this.on("modelDataLoaded", () => {
            this.engine.getTextureVariationsMetadata(this.fileId).then(this.onTextureVariationsLoaded.bind(this));
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
        super.dispose();
        this.textureVariations = null;
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