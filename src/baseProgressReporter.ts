import { IProgressReporter } from ".";

export abstract class BaseProgressReporter implements IProgressReporter {
    isDisposing: boolean;

    currentOperation: string;
    finishLoadingAfterMs: number;
    show: boolean;
    progressPerFile: { [key: number]: number }

    filesProcessed: number;
    totalFiles: number;

    container: HTMLElement;
    
    constructor(container: HTMLElement) {
        this.resetState();
        this.isDisposing = false;
        this.container = container;
        this.finishLoadingAfterMs = 100;
    }

    dispose() {
        this.isDisposing = true;
        this.progressPerFile = null;
    }

    calcTotalProgress() {
        let progress = 0;
        for(const file in this.progressPerFile) {
            progress += this.progressPerFile[file]
        }
        progress = progress / this.totalFiles;
        return progress;
    }

    update(fileId: number, progress: number): void {
        this.progressPerFile[fileId] = progress;
    }

    onUpdateCount() {
        
    }

    addFileIdToOperation(fileId: number): void {
        this.totalFiles++;
        this.onUpdateCount();
        this.progressPerFile[fileId] = 0;
        this.startDrawing();
    }

    removeFileIdFromOperation(fileId: number): void {
        if (typeof(this.progressPerFile[fileId]) !== 'undefined') {
            delete this.progressPerFile[fileId];
            this.filesProcessed++
        }
        this.onUpdateCount();
        if (Object.keys(this.progressPerFile).length === 0) {
            setTimeout(this.checkFinish.bind(this), this.finishLoadingAfterMs)
        }
    }

    checkFinish() {
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
        this.showElements();
    }

    abstract showElements(): void;

    abstract hideElements(): void;

    private resetState(): void {
        this.show = false;
        this.currentOperation = '';
        this.progressPerFile = { }
        this.filesProcessed = 0;
        this.totalFiles = 0;
    }
}