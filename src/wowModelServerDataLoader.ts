import { parseCM2BoneFile, parseCM2File } from "./fileFormats";
import { parseCWMOFile } from "./fileFormats/cwmo";
import { IDataLoader, IProgressReporter } from "./iDataLoader";
import { CharacterCustomizationMetadata, CharacterMetadata, ItemMetadata, ItemVisualMetadata } from "./metadata";
import { WoWBoneFileData, WoWModelData, WoWWorldModelData } from "./wowData";


export class WoWModelServerDataProvider implements IDataLoader {
    rootPath: string;
    progress?: IProgressReporter;

    constructor(rootPath: string, progress?: IProgressReporter) {
        this.rootPath = rootPath;
        this.progress = progress;
    }

    async loadBoneFile(fileId: number): Promise<WoWBoneFileData> {
        const url = `${this.rootPath}/modelviewer/bone/${fileId}.cbone`;
        const resp = await fetch(url);
        const data = await resp.arrayBuffer();
        return parseCM2BoneFile(data);
    }

    async loadModelFile(fileId: number): Promise<WoWModelData> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cm2`;
        const resp = await fetch(url);
        const data = await resp.arrayBuffer();

        return parseCM2File(data);
    }

    async loadWorldModelFile(fileId: number): Promise<WoWWorldModelData> {
        const url = `${this.rootPath}/modelviewer/models/${fileId}.cwmo`;
        const resp = await fetch(url);
        const data = await resp.arrayBuffer();

        return parseCWMOFile(data);
    }

    async loadCharacterCustomizationMetadata(modelId: number): Promise<CharacterCustomizationMetadata> {
        const url = `${this.rootPath}/modelviewer/meta/charactercustomization/${modelId}.json`;
        const resp = await fetch(url);
        const data = await resp.json() as CharacterCustomizationMetadata;
        return data;
    }

    async loadCharacterMetadata(modelId: number): Promise<CharacterMetadata> {
        const url = `${this.rootPath}/modelviewer/meta/character/${modelId}.json`;
        const resp = await fetch(url);
        const data = await resp.json() as CharacterMetadata;
        return data;
    }

    async loadItemMetadata(displayId: number): Promise<ItemMetadata> {
        const url = `${this.rootPath}/modelviewer/meta/item/${displayId}.json`;
        const resp = await fetch(url);
        const data = await resp.json() as ItemMetadata;
        return data;
    }

    loadTexture(fileId: number): Promise<string> {
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
            }
            request.send();
        });
    }

    async loadItemvisualMetadata(visualId: number): Promise<ItemVisualMetadata> {
        const url = `${this.rootPath}/modelviewer/meta/itemvisual/${visualId}.json`;
        const resp = await fetch(url);
        const data = await resp.json() as ItemVisualMetadata;
        return data;
    }
}