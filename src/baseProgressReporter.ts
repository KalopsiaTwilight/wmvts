import { IProgressReporter } from ".";

export abstract class BaseProgressReporter implements IProgressReporter {
    isDisposing: boolean;

    private timeSinceLastUpdate: number;
    timeBetweenUpdates: number;
    private lastTime: number;

    currentOperation: string;
    show: boolean;
    progressPerFile: { [key: number]: number }

    container: HTMLElement;
    
    constructor(container: HTMLElement) {
        this.resetState();
        this.isDisposing = false;
        this.container = container;

        this.timeBetweenUpdates = 20;
        this.timeSinceLastUpdate = 0;
    }

    private now() {
        return window.performance && window.performance.now ? window.performance.now() : Date.now();
    }

    dispose() {
        this.isDisposing = true;
        this.progressPerFile = null;
    }

    draw(currentTime: number) {
        const deltaTime = (currentTime - this.lastTime);
        this.lastTime = currentTime;

        this.timeSinceLastUpdate += deltaTime;
        if(this.timeBetweenUpdates > this.timeSinceLastUpdate) {
            return;
        }
        this.timeSinceLastUpdate -= this.timeBetweenUpdates;

        this.drawProgressFrame();
    }

    calcTotalProgress() {
        let progress = 0;
        let nrFiles = 0;
        for(const file in this.progressPerFile) {
            progress += this.progressPerFile[file]
            nrFiles++;
        }
        progress = progress / nrFiles;
        return progress;
    }

    abstract drawProgressFrame(): void;

    update(fileId: number, progress: number): void {
        this.progressPerFile[fileId] = progress;
    }

    addFileIdToOperation(fileId: number): void {
        this.progressPerFile[fileId] = 0;
        this.startDrawing();
    }

    removeFileIdFromOperation(fileId: number): void {
        delete this.progressPerFile[fileId];
        if (Object.keys(this.progressPerFile).length === 0) {
            this.finishOperation();
        }
    }

    setOperation(name: string): void {
        if (this.currentOperation === '') {
            this.currentOperation = name;
        }
    }

    finishOperation(): void {
        this.resetState();
        this.hideElements();
    }

    private startDrawing(): void {
        if (this.show) {
            return;
        }
        this.show = true;
        this.lastTime = this.now();

        this.showElements();

        const me = this;
        const drawFrame = () => {
            if (this.isDisposing || !this.show) {
                return;
            }
            const now = me.now();
            me.draw(now);
            window.requestAnimationFrame(drawFrame)
        }
        drawFrame();
    }

    abstract showElements(): void;

    abstract hideElements(): void;

    private resetState(): void {
        this.show = false;
        this.currentOperation = '';
        this.progressPerFile = { }
    }
}