import { BaseProgressReporter } from "./baseProgressReporter";

export interface SimpleProgressReporterOptions {
    onSetupElements: (x: SimpleProgressReporter) => void;
}

export class SimpleProgressReporter extends BaseProgressReporter {
    options?: SimpleProgressReporterOptions;

    progressContainer: HTMLDivElement;
    textContainer: HTMLParagraphElement;
    
    constructor(container: HTMLElement, options?: SimpleProgressReporterOptions) {
        super(container);

        this.options = options;
        this.setupElements();
    }


    override onUpdateCount() {
        this.textContainer.textContent = this.currentOperation + ` (${this.filesProcessed} / ${this.totalFiles})`;
    }

    setupElements(): void {
        this.container.style.position = "relative";

        const styleElem = document.createElement('style');
        styleElem.textContent = `.simpleProgress {
  padding: 0 5px 8px 0;
  background: repeating-linear-gradient(90deg,currentColor 0 8%,#0000 0 10%) 200% 100%/200% 3px no-repeat;
  animation: l3 2s steps(6) infinite;
}
@keyframes l3 {to{background-position: 80% 100%}}`

        document.head.appendChild(styleElem);

        this.progressContainer = document.createElement("div");
        this.progressContainer.className = "simpleProgress"
        this.progressContainer.style.display = "none";
        this.progressContainer.style.position = "absolute"
        this.progressContainer.style.bottom = "1em";
        this.progressContainer.style.right = "0";
        this.progressContainer.style.left = "25%";
        this.progressContainer.style.width = "50%";
        this.progressContainer.style.zIndex = "1";
        this.progressContainer.style.color = "#FFF";

        this.container.appendChild(this.progressContainer);
        this.textContainer = document.createElement("p");
        this.textContainer.style.position = "relative"
        this.textContainer.style.margin = "0"
        this.textContainer.style.color = "white";
        this.textContainer.style.textAlign = "center";
        this.textContainer.style.marginBottom = "1em";
        this.progressContainer.appendChild(this.textContainer);

        this.options?.onSetupElements(this);
    }
    
    showElements(): void {
        this.progressContainer.style.display = "block";
        this.onUpdateCount();
    }

    hideElements(): void {
        this.progressContainer.style.display = "none";
        this.textContainer.textContent = '';
    }
}