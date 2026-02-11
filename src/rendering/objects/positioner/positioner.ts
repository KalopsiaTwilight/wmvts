import { Float3, Float44 } from "@app/math";
import { PositionerData, PositionerStateData } from "@app/metadata";

export class Positioner {
    private data: PositionerData;
    private currentState: PositionerStateData;
    private life: number;

    transformMatrix: Float44;

    constructor(data: PositionerData) {
        this.data = data;
        this.currentState = data.states.find(x => x.id === data.firstStateId);
        this.life = data.startLife;
        this.transformMatrix = Float44.identity();
    }

    update(deltaTime: number): void {
        Float44.identity(this.transformMatrix);
        Float44.translate(this.transformMatrix, this.getPosition(), this.transformMatrix);
    }

    private getPosition() {
        const translation = Float3.zero();
        const entry = this.currentState.positionEntry;
        if (!entry) {
            return translation;
        }

        // TODO: This is complete guesswork
        switch(entry.srcValType) {
            case 1: translation[0] = entry.srcVal;
            case 2:  translation[1] = entry.srcVal;
            case 3:  translation[0] = -entry.srcVal/3;
        }
        //TODO: Handle SRC Types, Dest Types, Style etc.
        return translation;
    }
}