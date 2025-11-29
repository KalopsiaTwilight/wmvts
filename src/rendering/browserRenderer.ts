import {  Float44 } from "@app/math";
import { IDataLoader } from "@app/interfaces";

import { IBaseRendererOptions, IRenderer } from "./interfaces";
import { BaseRenderer } from "./baseRenderer";
import { IGraphics } from "./graphics";

export interface IBrowserRendererOptions extends IBaseRendererOptions {
}

export class BrowserRenderer extends BaseRenderer implements IRenderer {
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

    constructor(graphics: IGraphics, dataLoader: IDataLoader, options: IBrowserRendererOptions) {
        super(graphics, dataLoader, options);
        this.containerElement = options.container;

        this.framesDrawn = 0;
        this.maxFpsCounterSize = 100;
        this.fpsCounter = [];
    }

    dispose(): void {
        super.dispose();
    }

    start() {
        this.lastTime = this.now();
        this.timeElapsed = 0;
        this.lastDeltaTime = 1;

        this.sceneCamera.attachToRenderer(this);
        Float44.copy(this.sceneCamera.getViewMatrix(), this.viewMatrix);
        Float44.invert(this.viewMatrix, this.invViewMatrix);

        var aspect = this.width / this.height;
        Float44.perspective(Math.PI / 180 * this.fov, aspect, 0.1, 2000, this.projectionMatrix);
        const engine = this;
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
            engine.draw(now);
            
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