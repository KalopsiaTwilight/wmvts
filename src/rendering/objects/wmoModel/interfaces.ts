import { IWorldPositionedObject } from "../interfaces";

export type WMOModelEvents =  "modelDataLoaded" | "texturesLoaded"

export interface IWMOModel<TParentEvent extends string = WMOModelEvents> extends IWorldPositionedObject<TParentEvent | WMOModelEvents> {

}