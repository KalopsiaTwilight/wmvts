import { AABB, Float44 } from "./math";
import { 
    CharacterMetadata, ItemMetadata, ItemVisualMetadata, TextureVariationsMetadata, LiquidTypeMetadata, 
    FileIdentifier, RecordIdentifier 
} from "./metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./modeldata";
import { IRenderer } from "./rendering";

export type CallbackFn<T> = (obj: T) => void
export interface ICallbackable<TEvent extends string>
{
    /**
     * Sets up a callback that executes whenever the event fires for the first time and immediately fires if the event has already occured.
     * @param event The name of the event.
     * @param callback The callback function to execute.
     */
    once(event: TEvent, callback: CallbackFn<this>): void
    /**
     * Sets up a callback that executes whenever the event fires and immediately fires if the event has already occured.
     * @param event The name of the event.
     * @param callback The callback function to execute.
     */
    on(event: TEvent, callback: CallbackFn<this>): void
}

export type DisposableEvents = "disposed";
export interface IDisposable<TParentEvent extends string = never> extends ICallbackable<TParentEvent | DisposableEvents>  {
    isDisposing: boolean;
    dispose(): void;
}

export function isDisposable(obj: any): obj is IDisposable {
    return obj && typeof(obj.dispose) === 'function';
}

export type ErrorType = "dataFetching" | "dataProcessing" | "rendering";
export type ErrorHandlerFn = (type: ErrorType, objectId: string|null, error: Error) => void;
export interface IDataLoader {
    loadBoneFile(fileId: FileIdentifier): Promise<WoWBoneFileData|Error>
    loadTexture(fileId: FileIdentifier): Promise<string|Error> 
    loadItemvisualMetadata(visualId: RecordIdentifier): Promise<ItemVisualMetadata|Error>
    loadCharacterMetadata(modelId: RecordIdentifier): Promise<CharacterMetadata|Error>;
    loadItemMetadata(displayId: RecordIdentifier): Promise<ItemMetadata|Error>;
    loadLiquidTypeMetadata(liquidId: RecordIdentifier): Promise<LiquidTypeMetadata|Error>;
    loadTextureVariationsMetadata(fileId: FileIdentifier): Promise<TextureVariationsMetadata|Error>;
    loadModelFile(fileId: FileIdentifier): Promise<WoWModelData|Error>
    loadWorldModelFile(fileId: FileIdentifier): Promise<WoWWorldModelData|Error>
    useProgressReporter(progress?: IProgressReporter): void;
}

export interface IProgressReporter {
    update(fileId: number, progress: number): void;
    setOperation(name: string): void;
    addFileToOperation(file: FileIdentifier): void;
    removeFileFromOperation(file: FileIdentifier): void;
    finishOperation(): void;
}

export interface ICamera extends IDisposable {
    initialize(engine: IRenderer): void;
    scaleToBoundingBox(boundingBox: AABB): void;
    update(deltaTime: number): void;
    getViewMatrix(): Float44
}