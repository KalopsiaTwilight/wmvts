import { FileIdentifier } from "@app/metadata";
import { IWorldPositionedObject } from "../interfaces";

export type WMOModelEvents =  "modelDataLoaded" | "texturesLoaded"

export interface IWMOModel<TParentEvent extends string = never> extends IWorldPositionedObject<TParentEvent | WMOModelEvents> {
    loadFileId(fileId: FileIdentifier): void; 
}