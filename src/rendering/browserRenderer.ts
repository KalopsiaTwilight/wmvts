import {  Float44 } from "@app/math";
import { ErrorType, IDataLoader } from "@app/interfaces";

import { IBaseRendererOptions, IDataManager, IObjectIdentifier, IRenderer } from "./interfaces";
import { BaseRenderer } from "./baseRenderer";
import { IGraphics, ITexture, ITextureOptions } from "./graphics";
import { FileIdentifier } from "@app/metadata";

const ImgProcessingErrorType: ErrorType = "imgProcessing";

export interface IBrowserRendererOptions extends IBaseRendererOptions {
    container?: HTMLElement,
}

export class BrowserRenderer extends BaseRenderer implements IRenderer {
    lastTime: number;
    // Some stats
    framesDrawn: number;

    // FPS calculation over avg of x frames
    maxFpsCounterSize: number;
    fpsCounter: number[];

    // DOM References
    containerElement?: HTMLElement;
    debugContainer?: HTMLDivElement;
    fpsElement?: HTMLParagraphElement;
    batchesElement?: HTMLParagraphElement;

    constructor(options: IBrowserRendererOptions) {
        super(options);
        this.containerElement = options.container;

        this.framesDrawn = 0;
        this.maxFpsCounterSize = 100;
        this.fpsCounter = [];
    }

    dispose(): void {
        super.dispose();
    }

    override start() {
        super.start();
        const engine = this;
        engine.lastTime = this.now();
        const drawFrame = () => {
            if (engine.isDisposing) {
                return;
            }
            const now = engine.now();
            engine.once("afterDraw", () => {
                this.fpsCounter.push(1 / (this.lastDeltaTime / 1000));
                if (this.fpsCounter.length > this.maxFpsCounterSize) {
                    this.fpsCounter.splice(0, 1);
                }
                if (this.fpsElement) {
                    const avgFps = this.fpsCounter.reduce((acc, next) => acc + next, 0) / this.fpsCounter.length;
                    this.fpsElement.textContent = "FPS: " + Math.floor(avgFps);
                }
                this.framesDrawn++;
                if (this.batchesElement) {
                    this.batchesElement.textContent = "Batches: " + this.drawRequests.length;
                }
            })
            engine.draw(now - engine.lastTime);
            engine.lastTime = now;
            
            window.requestAnimationFrame(drawFrame)
        }
        drawFrame();
    }

    enableDebug() {
        this.setupDebugElements();
    }

    enableDebugPortals() {
        this.debugPortals = true;
    }

    disableDebug() {
        this.destroyDebugElements();
    }

    disableDebugPortals() {
        this.debugPortals = false;
    }

    now(): number {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    protected processTexture(fileId: FileIdentifier, imgData: Blob, opts?: ITextureOptions) {
        return new Promise<ITexture>((res, rej) => {
            const img = new Image();
            img.onload = () => {
                const texture = this.graphics.createTextureFromImg(img, opts);
                texture.fileId = fileId;
                res(texture);
            }
            img.onerror = (evt, src, line, col, err) => {
                this.errorHandler?.(ImgProcessingErrorType, "TEXTURE-" + fileId, err ? err : new Error("Unable to process image data for file: " + fileId));
                res(this.getUnknownTexture());
            }
            img.src = window.URL.createObjectURL(imgData);
        });
    }

    private setupDebugElements() {
        this.debugContainer = document.createElement("div");
        this.debugContainer.style.position = "absolute";
        this.debugContainer.style.left = "0";
        this.debugContainer.style.top = "0";
        this.debugContainer.style.padding = "1em";

        this.fpsElement = document.createElement("p");
        this.fpsElement.style.color = "white";
        this.fpsElement.style.margin = "0";
        this.debugContainer.append(this.fpsElement);

        this.batchesElement = document.createElement("p");
        this.batchesElement.style.color = "white";
        this.batchesElement.style.margin = "0";
        this.batchesElement.style.marginTop = "1.2em";
        this.debugContainer.append(this.batchesElement);

        this.containerElement.append(this.debugContainer);
    }

    private destroyDebugElements() {
        if (this.fpsElement) {
            this.fpsElement.remove()
            this.fpsElement = null;
        }
        if (this.batchesElement) {
            this.batchesElement.remove();
            this.batchesElement = null;
        }
        if (this.debugContainer) {
            this.debugContainer.remove()
            this.debugContainer = null;
        }
    }
}