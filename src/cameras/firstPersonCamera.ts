import { Float3, Float4, Float44 } from "@app/math"
import { IRenderer } from "@app/rendering";
import { CallbackFn, ICamera } from "@app/interfaces";
import { Disposable } from "@app/disposable";

enum MovementState {
    None = 0,
    Positive = 1,
    Negative = -1
}

export class FirstPersonCamera extends Disposable implements ICamera {
    resizeCallbackFn: CallbackFn<IRenderer>;
    resizeOnSceneExpand: boolean;

    position: Float3;
    rotation: Float3;
    
    viewMatrix: Float44;
    cameraMatrix: Float44;

    renderer: IRenderer;
    containerElement: HTMLElement;

    isDraggingMouse: boolean;
    xMovement: MovementState;
    yMovement: MovementState;
    zMovement: MovementState;
    movementSpeed: number;

    onMouseDown: (ev: MouseEvent) => void;
    onMouseMove: (ev: MouseEvent) => void;
    onMouseUp: (ev: MouseEvent) => void;
    onTouchStart: (ev: TouchEvent) => void;
    onTouchMove: (ev: TouchEvent) => void;
    onTouchEnd: (ev: TouchEvent) => void;
    onKeyDown: (ev: KeyboardEvent) => void;
    onKeyUp: (ev: KeyboardEvent) => void;

    constructor(containerElement: HTMLElement, resizeOnSceneExpand = true) {
        super();
        this.containerElement = containerElement;

        this.viewMatrix = Float44.identity();
        this.cameraMatrix = Float44.identity();
        this.position = Float3.create(0, 0, 0);
        this.rotation = Float3.create(0, 0, Math.PI);

        this.xMovement = MovementState.None;
        this.yMovement = MovementState.None;
        this.zMovement = MovementState.None;
        this.movementSpeed = 50;

        this.isDraggingMouse = false;
        this.resizeOnSceneExpand = resizeOnSceneExpand;
    }

    getViewMatrix(): Float44 {
        if (this.isDisposing) {
            return Float44.identity();
        }

        return this.viewMatrix;
    }

    attachToRenderer(renderer: IRenderer): void {
        if (this.isDisposing) {
            return;
        }

        this.renderer = renderer;

        this.onMouseDown = this.handleMouseDown.bind(this);
        this.onTouchStart = this.handleTouchStart.bind(this);
        
        this.containerElement.addEventListener('mousedown', this.onMouseDown);
        this.containerElement.addEventListener('touchstart', this.onTouchStart);
    
        if (document) {
            this.onMouseUp = this.handleDragRelease.bind(this);
            this.onTouchEnd = this.handleDragRelease.bind(this);
            this.onMouseMove = this.handleMouseMove.bind(this)
            this.onTouchMove = this.handleTouchMove.bind(this);
            this.onKeyUp = this.handleKeyDown.bind(this);
            this.onKeyDown = this.handleKeyUp.bind(this)
            document.addEventListener('keydown', this.onKeyUp)
            document.addEventListener('keyup', this.onKeyDown);
            document.addEventListener('mouseup', this.onMouseUp);
            document.addEventListener('touchend', this.onTouchEnd);
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('touchmove', this.onTouchMove);
            document.addEventListener('pointerlockchange', () => {

            })
        }

        if (this.resizeOnSceneExpand) {
            this.scaleToSceneBoundingBox();
            this.resizeCallbackFn = () => {
                this.scaleToSceneBoundingBox();
            };
            this.renderer.on("sceneBoundingBoxUpdate", this.resizeCallbackFn);
        }
    }

    update(deltaTime: number) {
        if (this.isDisposing) {
            return;
        }

        if (deltaTime > 100) {
            deltaTime = 100;
        }

        const rotation = Float4.quatFromEulers(this.rotation[0], this.rotation[1], this.rotation[2]);
        const rotMatrix = Float44.fromQuat(rotation);
        // Handle movement
        const movementDir = Float3.create(this.xMovement, this.yMovement, this.zMovement)
        // normalize to prevent speed gain from moving in multiple directions
        Float3.normalize(movementDir, movementDir);
        // Multiply speed * deltaTime 
        const speedVec = Float3.create(this.movementSpeed, this.movementSpeed, this.movementSpeed);
        const deltaTimeVec = Float3.create(deltaTime/1000, deltaTime/1000, deltaTime/1000);
        Float3.multiply(speedVec, deltaTimeVec, speedVec);
        Float3.multiply(speedVec, movementDir, movementDir);
        // Transform movement with camera rotation to make axis relative to camera
        Float44.transformPoint(movementDir, rotMatrix, movementDir);
        Float3.add(movementDir, this.position, this.position);

        Float44.identity(this.cameraMatrix);    
        Float44.rotateX(this.cameraMatrix, Math.PI/180*90, this.cameraMatrix);
        Float44.translate(this.cameraMatrix, this.position, this.cameraMatrix);
        Float44.multiply(this.cameraMatrix, rotMatrix, this.cameraMatrix);
        
        Float44.invert(this.cameraMatrix, this.viewMatrix);
    }

    setMovementSpeed(speed: number) {
        this.movementSpeed = speed;
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();
        
        this.renderer.off("sceneBoundingBoxUpdate", this.resizeCallbackFn);

        this.containerElement.removeEventListener('mousedown', this.onMouseDown);
        this.containerElement.removeEventListener('touchstart', this.onTouchStart);

        this.onMouseDown = null;
        this.onTouchStart = null;
        if (document) {
            document.removeEventListener('keydown', this.onKeyUp)
            document.removeEventListener('keyup', this.onKeyDown);
            document.removeEventListener('mouseup', this.onMouseUp);
            document.removeEventListener('touchend', this.onTouchEnd);
            document.removeEventListener('mousemove', this.onMouseMove);
            document.removeEventListener('touchmove', this.onTouchMove);

            this.onMouseUp = null;
            this.onTouchEnd = null;
            this.onMouseMove = null;
            this.onTouchMove = null;
            this.onKeyUp = null;
            this.onKeyDown = null;
        }

        this.position = null;
        this.rotation = null;
        this.viewMatrix = null;
        this.cameraMatrix = null;
        this.containerElement = null;
        this.renderer = null;
    }

    private scaleToSceneBoundingBox(): void {
        if (this.isDisposing) {
            return;
        }
        
        const sceneBB = this.renderer.getSceneBoundingBox();;
        Float3.copy(sceneBB.max, this.position);
        const lookDir = Float3.negate(this.position);
        const horizontalDistance = Math.sqrt(lookDir[0] *lookDir[0] + lookDir[2]*lookDir[2])
        this.rotation[1] = Math.atan2(lookDir[1], horizontalDistance)
        this.rotation[2] = Math.atan2(lookDir[0], lookDir[2])
    }
    
    private handleKeyDown(eventArgs: KeyboardEvent) {
        switch(eventArgs.key.toUpperCase()) {
            case 'W': {
                this.zMovement = MovementState.Negative;
                return false;
            }
            case 'S': {
                this.zMovement = MovementState.Positive;
                return false;
            }
            case 'A': {
                this.xMovement = MovementState.Negative;
                return false;
            }
            case 'D': {
                this.xMovement = MovementState.Positive;
                return false;
            }
            case 'Q': {
                this.yMovement = MovementState.Positive;
                return false;
            }
            case 'E': {
                this.yMovement = MovementState.Negative;
                return false;
            }
        }

        return true;
    }

    private handleKeyUp(eventArgs: KeyboardEvent) {
        switch(eventArgs.key.toUpperCase()) {
            case 'W':
            case 'S': {
                this.zMovement = MovementState.None;
                return false;
            }
            case 'A':
            case 'D': {
                this.xMovement = MovementState.None;
                return false;
            }
            case 'Q':
            case 'E': {
                this.yMovement = MovementState.None;
                return false;
            }
        }

        return true;
    }

    private handleMouseDown(eventArgs: MouseEvent) {
        if (eventArgs.button == 2) {
            return;
        }
        this.isDraggingMouse = true;

        eventArgs.preventDefault();

        if (document && !document.pointerLockElement) {
            this.containerElement.requestPointerLock()
        }
    }

    private handleTouchStart(eventArgs: TouchEvent) {
        eventArgs.preventDefault();
        if (document && !document.pointerLockElement) {
            this.containerElement.requestPointerLock()
        }
    }

    private handleMouseMove(eventArgs: MouseEvent) {
        if (!this.isDraggingMouse) {
            return;
        }

        this.handleDrag(eventArgs.movementX, eventArgs.movementY);
    }

    private handleTouchMove(eventArgs: TouchEvent) {
        this.handleDrag(eventArgs.touches[0].clientX, eventArgs.touches[0].clientY);
    }

    private handleDrag(xPct: number, yPct: number) {
        if (this.isDisposing) {
            return;
        }

        const rotationScale = Math.PI/180/4;
        const deltaX = xPct * rotationScale;
        const deltaY = yPct * rotationScale;

        this.rotation[1] += deltaX;
        this.rotation[2] += deltaY;
    }

    private handleDragRelease() {
        this.isDraggingMouse = false;

        if (document && document.pointerLockElement) {
            document.exitPointerLock();
        }
    }
}