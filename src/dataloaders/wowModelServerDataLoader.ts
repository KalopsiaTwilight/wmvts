
import { IDataLoader, IProgressReporter } from "@app/interfaces";
import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata, LiquidTypeMetadata, TextureVariationsMetadata } from "@app/metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "@app/modeldata";

import { parseCM2BoneFile, parseCM2File, parseCWMOFile } from "./fileFormats";

export class WoWModelServerDataProvider implements IDataLoader {
    rootPath: string;
    progress?: IProgressReporter;

    constructor(rootPath: string, progress?: IProgressReporter) {
        this.rootPath = rootPath;
        this.progress = progress;
    }

    async loadBoneFile(fileId: number): Promise<WoWBoneFileData|Error> {
        const url = `${this.rootPath}/modelviewer/bone/${fileId}.cbone`;

        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.arrayBuffer();
            return parseCM2BoneFile(data);
        } catch(err) {
            return err;
        }
    }

    async loadModelFile(fileId: number): Promise<WoWModelData|Error> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cm2`;
        try {
            const resp = await fetch(url);
            
            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.arrayBuffer();
            return parseCM2File(data);
        } catch(err) {
            return err;
        }
    }

    async loadWorldModelFile(fileId: number): Promise<WoWWorldModelData|Error> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cwmo`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.arrayBuffer();
            return parseCWMOFile(data);
        } catch(err) {
            return err;
        }
    }

    async loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/charactercustomization/${modelId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as CharacterCustomizationMetadata;
            return data;
        } catch(err) {
            return err;
        }
    }

    async loadCharacterMetadata(modelId: number): Promise<CharacterMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/character/${modelId}.json`;
        try { 
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as CharacterMetadata;
            return data;
        }
        catch {
            return null;
        }
    }

    async loadItemMetadata(displayId: number): Promise<ItemMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/item/${displayId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as ItemMetadata;
            
            return data;
        } catch {
            return null;
        }
    }

    
    async loadLiquidTypeMetadata(liquidId: number): Promise<LiquidTypeMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/liquidtype/${liquidId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as LiquidTypeMetadata;
            
            return data;
        } catch(err) {
            return err;
        }
    }

    loadTexture(fileId: number): Promise<string|Error> {
        return new Promise<string>((res, rej) => {
            const url = `${this.rootPath}/modelviewer/textures/${fileId}.webp`;
            const request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer"
            request.onload = () => {
                const blob = new Blob([request.response]);
                res(window.URL.createObjectURL(blob));
            }
            request.onprogress = (evt) => {
                if (this.progress) {
                    this.progress.update(fileId, Math.floor(evt.loaded / evt.total * 100))
                }
            };
            request.onloadstart = () => {
                if (this.progress) {
                    this.progress.update(fileId, 0);
                }
            }
            request.onerror = (evt) => {
                return new Error("Modelviewer Server returned responsecode: " + request.status);
            }
            request.send();
        });
    }

    async loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/itemvisual/${visualId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as ItemVisualMetadata;
            return data; 
        }
        catch(err) {
            return err;
        }
    }

    async loadTextureVariationsMetadata(fileId: number): Promise<TextureVariationsMetadata|Error> {
        const url = `${this.rootPath}/modelviewer/metadata/texturevariations/${fileId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return new Error("Modelviewer Server returned responsecode: " + resp.status);
            }

            const data = await resp.json() as TextureVariationsMetadata;
            return data; 
        }
        catch(err) {
            return err;
        }
    }

    useProgressReporter(progress?: IProgressReporter): void {
        this.progress = progress;
    }
}