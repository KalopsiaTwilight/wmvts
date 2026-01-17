import { Float3 } from "@app/math";

import { IWorldPositionedObject } from "../interfaces";

export interface ILine<TParentEvent extends string = never> extends IWorldPositionedObject<TParentEvent> {
    addSegment(startPos: Float3, endPos: Float3): void;
}