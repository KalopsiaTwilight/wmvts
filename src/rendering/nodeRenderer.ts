import { ErrorType, IDataLoader } from "@app/interfaces";
import { IBaseRendererOptions, IDataManager, IObjectIdentifier, IRenderer } from "./interfaces";
import { BaseRenderer } from "./baseRenderer";
import { IGraphics, ITextureOptions, RawImageData } from "./graphics";
import { FileIdentifier } from "@app/metadata";

const ImgProcessingErrorType: ErrorType = "imgProcessing";


export type GetImageDataFn = (imgBlob: Blob) => Promise<RawImageData>;

export interface INodeRendererOptions extends IBaseRendererOptions {
    getImageDataFn: GetImageDataFn
}

export class NodeRenderer extends BaseRenderer implements IRenderer {
    getImageDataFn: GetImageDataFn;

    constructor(options: INodeRendererOptions) {
        super(options);

        this.getImageDataFn = options.getImageDataFn;
    }


    protected now(): number {
        return Date.now();
    }

    protected async processTexture(fileId: FileIdentifier, imgBlob: Blob, opts?: ITextureOptions) {
        const imgData = await this.getImageDataFn(imgBlob);
        const texture = this.graphics.createTextureFromRawImgData(imgData, opts);
        texture.fileId = fileId;
        return texture;
    }
}