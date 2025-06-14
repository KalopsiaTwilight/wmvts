import { BaseProgressReporter } from "./baseProgressReporter";

export interface SimpleProgressReporterOptions {
    onSetupElements: (x: SimpleProgressReporter) => void;
}

export class SimpleProgressReporter extends BaseProgressReporter {
    private addXPerUpdate: number;
    private indeterminateProgressBarWidth: number;

    options?: SimpleProgressReporterOptions;

    progressContainer: HTMLDivElement;
    progressBackground: HTMLDivElement;
    progressBar: HTMLDivElement;
    textContainer: HTMLParagraphElement;
    
    constructor(container: HTMLElement, options?: SimpleProgressReporterOptions) {
        super(container);

        this.options = options;

        this.timeBetweenUpdates = 20;
        this.addXPerUpdate = 5;
        this.indeterminateProgressBarWidth = 24;

        this.setupElements();
    }

    drawProgressFrame() {
        let currentX = parseInt(this.progressBar.style.left, 10);

        const absMaxX = this.progressBackground.clientWidth;
        const shrinkX = absMaxX - this.indeterminateProgressBarWidth;
        currentX += this.addXPerUpdate;
        if (currentX > absMaxX) {
            currentX = this.addXPerUpdate;
            this.progressBar.style.width = "0px";
        } else if (currentX > shrinkX) {
            this.progressBar.style.width = this.indeterminateProgressBarWidth - (currentX - shrinkX) + "px";
        }

        if (currentX == this.addXPerUpdate && this.progressBar.clientWidth < this.indeterminateProgressBarWidth) {
            this.progressBar.style.width = this.progressBar.clientWidth + currentX + "px"
            currentX = 0;
        }
        this.progressBar.style.left = currentX + "px";
    }

    setupElements(): void {
        this.container.style.position = "relative";

        const barHeight = 24;
        this.progressContainer = document.createElement("div");
        this.progressContainer.style.display = "none";
        this.progressContainer.style.position = "absolute"
        this.progressContainer.style.bottom = "1em";
        this.progressContainer.style.right = "0";
        this.progressContainer.style.left = "0";
        this.progressContainer.style.width = "100%";
        this.container.appendChild(this.progressContainer);

        this.textContainer = document.createElement("p");
        this.textContainer.style.position = "relative"
        this.textContainer.style.margin = "0"
        this.textContainer.style.color = "white";
        this.textContainer.style.textAlign = "center";
        this.textContainer.style.marginBottom = "1em";
        this.progressContainer.appendChild(this.textContainer);
        
        this.progressBackground = document.createElement("div");
        this.progressBackground.style.position = "relative"
        this.progressBackground.style.marginInline = "auto";
        this.progressBackground.style.width = "50%";
        this.progressBackground.style.height = barHeight + "px"
        this.progressBackground.style.background = "#aaa";
        this.progressContainer.appendChild(this.progressBackground);

        this.progressBar = document.createElement("div");
        this.progressBar.style.position = "absolute"
        this.progressBar.style.background = "#333";
        this.progressBar.style.left = "0";
        this.progressBar.style.width = "0";
        this.progressBar.style.height = "24px";
        this.progressBar.style.height = barHeight + "px";
        this.progressBackground.appendChild(this.progressBar);

        this.options?.onSetupElements(this);
    }
    
    showElements(): void {
        this.progressContainer.style.display = "block";
        this.textContainer.textContent = this.currentOperation;
    }

    hideElements(): void {
        this.progressContainer.style.display = "none";
        this.textContainer.textContent = '';
    }
}