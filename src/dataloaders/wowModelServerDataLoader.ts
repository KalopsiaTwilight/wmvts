import { parseCM2BoneFile, parseCM2File } from "./fileFormats";
import { parseCWMOFile } from "./fileFormats/cwmo";
import { IDataLoader, IProgressReporter } from "../iDataLoader";
import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "../metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "../modeldata";


export class WoWModelServerDataProvider implements IDataLoader {
    rootPath: string;
    progress?: IProgressReporter;

    constructor(rootPath: string, progress?: IProgressReporter) {
        this.rootPath = rootPath;
        this.progress = progress;
    }

    async loadBoneFile(fileId: number): Promise<WoWBoneFileData|null> {
        const url = `${this.rootPath}/modelviewer/bone/${fileId}.cbone`;

        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                return null;
            }

            const data = await resp.arrayBuffer();
            return parseCM2BoneFile(data);
        } catch {
            return null;
        }
    }

    async loadModelFile(fileId: number): Promise<WoWModelData|null> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cm2`;
        try {
            const resp = await fetch(url);
            
            if (!resp.ok) {
                return null;
            }

            const data = await resp.arrayBuffer();
            return parseCM2File(data);
        } catch {
            return null;
        }
    }

    async loadWorldModelFile(fileId: number): Promise<WoWWorldModelData|null> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cwmo`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return null;
            }

            const data = await resp.arrayBuffer();
            return parseCWMOFile(data);
        } catch {
            return null;
        }
    }

    async loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata|null> {
        const url = `${this.rootPath}/modelviewer/meta/charactercustomization/${modelId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return null;
            }

            const data = await resp.json() as CharacterCustomizationMetadata;
            return data;
        } catch {
            return null;
        }
    }

    async loadCharacterMetadata(modelId: number): Promise<CharacterMetadata|null> {
        const url = `${this.rootPath}/modelviewer/meta/character/${modelId}.json`;
        try { 
            const resp = await fetch(url);

            if (!resp.ok) {
                return null;
            }

            const data = await resp.json() as CharacterMetadata;
            return data;
        }
        catch {
            return null;
        }
    }

    async loadItemMetadata(displayId: number): Promise<ItemMetadata|null> {
        const url = `${this.rootPath}/modelviewer/meta/item/${displayId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return null;
            }

            const data = await resp.json() as ItemMetadata;
            
            return data;
        } catch {
            return null;
        }
    }

    loadTexture(fileId: number): Promise<string|null> {
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
                res(null);
            }
            request.send();
        });
    }

    async loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata|null> {
        const url = `${this.rootPath}/modelviewer/meta/itemvisual/${visualId}.json`;
        try {
            const resp = await fetch(url);

            if (!resp.ok) {
                return null;
            }

            const data = await resp.json() as ItemVisualMetadata;
            return data; 
        }
        catch {
            return null;
        }
    }

    useProgressReporter(progress?: IProgressReporter): void {
        this.progress = progress;
    }
}