import { M2Model, M2ModelCallbackType } from "../m2Model";
import { WorldPositionedObject } from "../worldPositionedObject";

import { ITexture, RenderingEngine } from "@app/rendering";
import { TextureVariationsMetadata } from "@app/metadata";
import { WoWTextureType } from "@app/modeldata";
import { CallbackFn, ICallbackManager, IImmediateCallbackable } from "@app/utils";

export type TextureVariantModelCallbackType  = "textureVariationsLoaded" | M2ModelCallbackType


export class TextureVariantModel extends M2Model implements IImmediateCallbackable<TextureVariantModelCallbackType> {
    textureVariations: TextureVariationsMetadata;
    override callbackMgr: ICallbackManager<TextureVariantModelCallbackType, TextureVariantModel>;

    loadedTextures: ITexture[]

    constructor(fileId: number) {
        super(fileId);
    }

    override initialize(engine: RenderingEngine): void {
        super.initialize(engine);

        this.on("modelDataLoaded", () => {
            this.engine.getTextureVariationsMetadata(this.fileId).then(this.onTextureVariationsLoaded.bind(this));
        })
    }

    override get isLoaded(): boolean {
        return super.isLoaded && this.textureVariations != null;
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


    
    override on(type: TextureVariantModelCallbackType, fn: CallbackFn<TextureVariantModel>, persistent = false): void {
        this.callbackMgr.addCallback(type, fn, persistent);
    }

    override canExecuteCallback(type: TextureVariantModelCallbackType): boolean {
        let dataNeeded: unknown;
        switch(type) {
            case "modelDataLoaded": 
            case "texturesLoadStart": 
            case "texturesLoaded":
                return super.canExecuteCallback(type); break;
            case "textureVariationsLoaded":
                dataNeeded = this.textureVariations;
            default: dataNeeded = null; break;
        }
        return dataNeeded != null;
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