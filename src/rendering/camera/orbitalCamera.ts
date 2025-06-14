import { Camera } from "./base";
import { RenderingEngine } from "../engine";
import { Float3, Float44 } from "../math";

export enum DragOperation {
    None,
    Rotation,
    Translation
}

export class OrbitalCamera extends Camera {
    containerWidth: number;
    containerHeight: number;

    currentDragOpartion: DragOperation;
    lastDragX: number;
    lastDragY: number;

    cameraMatrix: Float44;

    targetLocation: Float3;
    upDir: Float3;

    cameraTranslation: Float3;
    currentRadius: number;
    startingRadius: number;
    theta: number;
    phi: number;

    // Zoom in
    zoomFactor: number;
    minRadius: number;
    maxRadius: number;
    currentZoom: number;
    zoomDecay: number;

    constructor() {
        super();

        this.cameraMatrix = Float44.identity();
        this.currentDragOpartion = DragOperation.None;
        this.targetLocation = Float3.create(0, 0, 0);
        this.upDir = Float3.create(0, 0, 1);

        this.cameraTranslation = Float3.zero();
        this.theta = Math.PI / 2;
        this.phi = 1.5 * Math.PI;
        this.startingRadius = 500;
        
        this.currentRadius = this.startingRadius;
        this.minRadius = 200;
        this.maxRadius = 1000;
        this.zoomFactor = 20;
        this.currentZoom = 0;
        this.zoomDecay = 0.7;

        // Spherical to cartesian 
        this.position = Float3.fromSpherical(this.startingRadius, this.theta, this.phi);
        Float3.add(this.position, this.targetLocation);

        Float44.lookAt(this.position, this.targetLocation, this.upDir, this.cameraMatrix);
    }

    override initialize(engine: RenderingEngine) {
        super.initialize(engine);
        
        if (engine.containerElement) {
            engine.containerElement.addEventListener('contextmenu', (evt) => { evt.preventDefault(); return false; });
            engine.containerElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
            engine.containerElement.addEventListener('touchstart', this.handleTouchStart.bind(this));
            engine.containerElement.addEventListener('wheel', this.handleWheel.bind(this));
            
            const containerBounds = engine.containerElement.getBoundingClientRect();
            this.containerWidth = containerBounds.width;
            this.containerHeight = containerBounds.height;
        }
        if (document) {
            document.addEventListener('mouseup', this.handleDragRelease.bind(this));
            document.addEventListener('touchend', this.handleDragRelease.bind(this));
            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
            document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        }
    }

    override update(deltaTime: number): void {
        if (this.currentZoom != 0) {
            this.currentRadius = this.currentRadius + this.currentZoom * this.zoomFactor;
            this.currentRadius = Math.min(Math.max(this.minRadius, this.currentRadius), this.maxRadius);
            this.currentZoom *= this.zoomDecay;

            if (this.currentZoom < 0.0001) {
                this.currentZoom = 0;
            }

            Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position)
            Float3.add(this.position, this.targetLocation);
        }

        Float44.lookAt(this.position, this.targetLocation, this.upDir, this.cameraMatrix);
        Float44.invert(this.cameraMatrix, this.viewMatrix);
        Float44.translate(this.viewMatrix, this.cameraTranslation, this.viewMatrix);
    }

    handleMouseDown(eventArgs: MouseEvent) {
        if (eventArgs.button == 2 || eventArgs.ctrlKey) {
            this.currentDragOpartion = DragOperation.Translation
        } else {
            this.currentDragOpartion = DragOperation.Rotation
        }
        this.lastDragX = eventArgs.clientX;
        this.lastDragY = eventArgs.clientY;

        eventArgs.preventDefault();
    }

    handleTouchStart(eventArgs: TouchEvent) {
        this.currentDragOpartion = DragOperation.Rotation;
        this.lastDragX = eventArgs.touches[0].clientX;
        this.lastDragY = eventArgs.touches[0].clientY;

        eventArgs.preventDefault();
    }

    handleMouseMove(eventArgs: MouseEvent) {
        this.handleDrag(eventArgs.x, eventArgs.y);
    }

    handleTouchMove(eventArgs: TouchEvent) {
        this.handleDrag(eventArgs.touches[0].clientX, eventArgs.touches[0].clientY);
    }

    handleDrag(currentX: number, currentY: number) {
        if (this.currentDragOpartion === DragOperation.None) {
            return;
        }

        const xPct = (currentX - this.lastDragX) / this.containerWidth
        const yPct = (currentY - this.lastDragY) / this.containerHeight
        if (this.currentDragOpartion === DragOperation.Translation) {
            
            Float3.add(this.cameraTranslation, Float3.create(xPct * this.currentRadius, 0, -yPct * this.currentRadius), this.cameraTranslation);
        } else {
            const rotationScale = Math.PI;
            const deltaPhi = xPct * rotationScale;
            const deltaTheta = yPct *rotationScale;

            this.theta = Math.min(Math.max(this.theta - deltaTheta - deltaTheta, 0.01), Math.PI);
            this.phi -= deltaPhi;

            Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position);
            Float3.add(this.position, this.targetLocation);
        }

        this.lastDragX = currentX;
        this.lastDragY = currentY;
    }

    handleDragRelease() {
        this.currentDragOpartion = DragOperation.None;
    }

    handleWheel(eventArgs: WheelEvent) {
        this.currentZoom = eventArgs.deltaY < 0 ? -1 : 1;
        eventArgs.preventDefault();
    }

    setDistance(distance: number): void {
        this.startingRadius = distance;
        this.currentRadius = this.startingRadius;
        this.minRadius = 0.25 * distance;
        this.maxRadius = 2 * distance;
        this.zoomFactor = this.maxRadius / 50;

        Float3.fromSpherical(this.currentRadius, this.theta, this.phi, this.position);
        Float3.add(this.position, this.targetLocation);
    }

    getDistance(): number {
        return this.startingRadius;
    }
}