
import { TextureVariationsMetadata } from "@app/metadata";
import { WoWTextureType } from "@app/modeldata";
import { ITexture } from "@app/rendering/graphics";
import { IDataManager, IRenderer } from "@app/rendering/interfaces";

import { M2Model } from "../m2Model";

import { ITextureVariantModel, TextureVariantModelEvents } from "./interfaces";
import { IPseudoRandomNumberGenerator } from "@app/math";

export class TextureVariantModel<TParentEvent extends string = never> extends M2Model<TParentEvent | TextureVariantModelEvents> implements ITextureVariantModel{

    textureVariations: TextureVariationsMetadata;

    loadedTextures: ITexture[]

    constructor(dataManager: IDataManager, rng: IPseudoRandomNumberGenerator) {
        super(dataManager, rng);
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

            this.renderer.getTexture(this, data.textureIds[i]).then((texture) => {
                this.swapTexture(i, texture);
            })
        }
    }

    override attachToRenderer(engine: IRenderer): void {
        super.attachToRenderer(engine);

        if (!this.isLoaded) {
            this.once("modelDataLoaded", () => {
                this.dataManager.getTextureVariationsMetadata(this.fileId).then(this.onTextureVariationsLoaded.bind(this));
            })
        }
    }

    override get isLoaded(): boolean {
        return super.isLoaded && this.textureVariations != null;
    }

    protected override canExecuteCallbackNow(type: TextureVariantModelEvents): boolean {
        switch(type) {
            case "textureVariationsLoaded":
                return this.textureVariations != null;
            default: return super.canExecuteCallbackNow(type);
        }
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }
        
        super.dispose();
        this.textureVariations = null;
    }

    private onTextureVariationsLoaded(data: TextureVariationsMetadata | null) {
        if (this.isDisposing) {
            return;
        }

        this.textureVariations = data;

        this.processCallbacks("textureVariationsLoaded");
        
        for (const textureInfo of this.modelData.textures) {
            // Load first texture variation if any textures are undefined and have a usage type.
            if (textureInfo.type !== WoWTextureType.None && textureInfo.textureId === 0) {
                this.useTextureVariation(0);
            }
        }
    }
}