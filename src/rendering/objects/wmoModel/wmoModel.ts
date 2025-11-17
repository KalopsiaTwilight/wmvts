import { AABB, Axis, BspTree, Float2, Float3, Float4, Float44, Frustrum, Plane } from "@app/math";
import { BinaryWriter } from "@app/utils";
import { 
    WoWWorldModelBspNode, WoWWorldModelData, WowWorldModelGroupFlags, 
    WoWWorldModelMaterialMaterialFlags, WoWWorldModelPortalRef 
} from "@app/modeldata";
import { FileIdentifier } from "@app/metadata";

import {
    BufferDataType, ColorMask, DrawingBatchRequest, GxBlend, IDataBuffers, IShaderProgram, 
    ITexture, M2BlendModeToEGxBlend, RenderMaterial
} from "@app/rendering/graphics";
import { IRenderingEngine } from "@app/rendering/interfaces"

import { WorldPositionedObject } from "../worldPositionedObject";
import { M2Model } from "../m2Model";

import { getWMOPixelShader, getWMOVertexShader } from "./wmoShaders";
import fragmentShaderProgramText from "./wmoModel.frag";
import vertexShaderProgramText from "./wmoModel.vert";
import portalFragmentShaderProgramText from "./wmoPortal.frag";
import portalVertexShaderProgramText from "./wmoPortal.vert";
import { WMOLiquid } from "./wmoLiquid";
import { IWMOModel } from "./interfaces";

export interface PortalMapData {
    index: number;
    negGroup: number;
    posGroup: number;
    boundingBox: AABB;
    vertices: Float3[];
    plane: Plane;
}

export enum WMOOwnerTypes {
    WMOGroup,
    WMOLiquid,
    WMOPortal
}

const BATCH_IDENTIFIER = "WMO";
const PORTAL_BATCH_IDENTIFIER = "WMO-PORTAL";

export class WMOModel extends WorldPositionedObject implements IWMOModel {
    isModelDataLoaded: boolean;
    isTexturesLoaded: boolean;

    fileId: FileIdentifier;
    modelData: WoWWorldModelData;
    doodadSetId: number;
    loadedTextures: { [key: number]: ITexture }
    // Used to cull / load doodads based on group
    groupDoodads: { [key: number]: M2Model[] }
    groupLiquids: { [key: number]: WMOLiquid[] }
    groupMaterials: { [key: number]: RenderMaterial }
    
    activeGroups: number[];
    activeDoodads: M2Model[];
    lodGroupMap: number[];

    shaderProgram: IShaderProgram;
    groupDatabuffers: IDataBuffers[]

    portalsByGroup: { [key: number]: WoWWorldModelPortalRef[] }
    groupViews: { [key: number]: Frustrum[] }

    portalShader: IShaderProgram;
    portalDataBuffers: IDataBuffers;
    portalCount: number;
    portalData: PortalMapData[];
    portalMaterial: RenderMaterial;

    localCamera: Float3;
    localCameraFrustrum: Frustrum;
    transposeInvModelMatrix: Float44;

    constructor(fileId: FileIdentifier) {
        super();
        this.isModelDataLoaded = false;
        this.isTexturesLoaded = false;
        this.fileId = fileId;

        this.doodadSetId = 0; //TODO: Investigate what this means.
        this.lodGroupMap = [];

        this.loadedTextures = {};
        this.groupDoodads = {};
        this.portalsByGroup = {};
        this.groupLiquids = {};
        this.groupMaterials = {};
        this.activeGroups = [];
        this.activeDoodads = [];

        this.transposeInvModelMatrix = Float44.identity();
        this.localCamera = Float3.zero();
        this.localCameraFrustrum = Frustrum.zero();
    }

    override initialize(engine: IRenderingEngine): void {
        super.initialize(engine);
        this.shaderProgram = this.engine.getShaderProgram("WMO", vertexShaderProgramText, fragmentShaderProgramText);
        this.portalShader = this.engine.getShaderProgram("WMOPortal", portalVertexShaderProgramText, portalFragmentShaderProgramText);

        this.engine.getWMOModelFile(this.fileId).then(this.onModelLoaded.bind(this))
    }

    update(deltaTime: number): void {
        super.update(deltaTime);
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        Float44.transformDirection3(this.engine.cameraPosition, this.invWorldModelMatrix, this.localCamera);
        Frustrum.copy(this.engine.cameraFrustrum, this.localCameraFrustrum);
        Frustrum.transformSelf(this.localCameraFrustrum, this.invWorldModelMatrix);

        this.findVisibleGroupsAndDoodads();
        this.setLODGroupsForVisibleGroups();

        // Update objects per group
        for (let i = 0; i < this.activeDoodads.length; i++) {
            this.activeDoodads[i].update(deltaTime);
        }

        for(const group of this.activeGroups) {
            for(const liquid of this.groupLiquids[group]) {
                liquid.update(deltaTime);
            }
        }
    }

    draw(): void {
        if (!this.isLoaded || this.isDisposing) {
            return;
        }

        for (let i = 0; i < this.activeGroups.length; i++) {
            const groupDataIndex = this.activeGroups[i];
            this.drawGroup(groupDataIndex)
            
            for(const liquid of this.groupLiquids[groupDataIndex]) {
                liquid.draw();
            }
        }

        for(let i = 0; i < this.activeDoodads.length; i++) {
            this.activeDoodads[i].draw();
        }

        if (this.engine.debugPortals) {
            this.drawPortals();
        }
    }

    override dispose(): void {
        if (this.isDisposing) {
            return;
        }

        super.dispose();

        this.modelData = null;
        this.loadedTextures = null;
        for (const group in this.groupDoodads) {
            for (const model of this.groupDoodads[group]) {
                model.dispose();
            }
        }
        this.groupDoodads = null;
        for(const group in this.groupLiquids) {
            for(const liquid of this.groupLiquids[group]) {
                liquid.dispose();
            }
        }
        this.groupLiquids = null;
        this.groupMaterials = null;

        this.activeGroups = null;
        this.activeDoodads = null;
        this.lodGroupMap = null;

        this.shaderProgram = null;
        this.groupDatabuffers = null;

        this.portalsByGroup = null;
        this.groupViews = null;

        this.portalShader = null;
        if (this.portalDataBuffers) {
            this.portalDataBuffers.dispose();
        }
        this.portalDataBuffers = null;
        this.portalData = null;
        this.portalMaterial = null;

        this.localCamera = null;
        this.localCameraFrustrum = null;
        this.transposeInvModelMatrix = null;
    }

    get isLoaded() {
        return this.isModelDataLoaded && this.isTexturesLoaded && this.children.every((x) => x.isLoaded);
    }

    private onModelLoaded(data: WoWWorldModelData) {
        this.modelData = data;

        if (this.modelData == null) {
            this.dispose();
            return;
        }
        if (this.isDisposing) {
            return;
        }

        this.setBoundingBox(this.modelData.boundingBox);

        this.setupPortals();
        // TODO: This would be unneccesary with a data format closer to how WMOs are actually stored.
        this.makeLodMap();
        this.loadTextures();
        this.loadDoodads();
        this.loadLiquids();

        this.setupDataBuffers();
        // TODO: Only do this on debug
        this.setupPortalGraphics();

        this.isModelDataLoaded = true;
    }

    private loadDoodads() {
        // TODO: Check if model references should be shared amongst LOD groups
        const refs = this.getDoodadSetRefs();
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const group = this.modelData.groups[i];
            this.groupDoodads[i] = [];
            const groupRefs = group.doodadReferences;
            for (let ref of groupRefs) {
                if (refs.indexOf(ref) !== -1) {
                    const doodadDef = this.modelData.doodadDefs[ref];
                    const modelId = this.modelData.doodadIds[doodadDef.nameOffset];
                    if (modelId === 0) {
                        continue;
                    }

                    const doodadModel = new M2Model(modelId);
                    this.addChild(doodadModel);
                    const scale = Float3.create(doodadDef.scale, doodadDef.scale, doodadDef.scale);
                    doodadModel.setModelMatrix(doodadDef.position, doodadDef.rotation, scale);
                    this.groupDoodads[i].push(doodadModel);
                }
            }
        }
    }

    private loadTextures() {
        const loadingPromises: Promise<void>[] = []
        this.loadedTextures[0] = this.engine.getUnknownTexture();
        for (let i = 0; i < this.modelData.groups.length; i++) {
            const group = this.modelData.groups[i];
            for (let j = 0; j < group.batches.length; j++) {
                const batch = group.batches[j];
                const material = this.modelData.materials[batch.materialId];
                for (const fileId of [material.texture1, material.texture2, material.texture3]) {
                    if (fileId !== 0) {
                        const clampS = (material.flags & WoWWorldModelMaterialMaterialFlags.ClampS) > 0;
                        const clampT = (material.flags & WoWWorldModelMaterialMaterialFlags.ClampT) > 0;
                        const texturePromise = this.engine.getTexture(fileId, {
                            clampS, clampT
                        }).then((texture) => {
                            if (!this.isDisposing) {
                                this.loadedTextures[fileId] = texture
                            }
                        })
                        loadingPromises.push(texturePromise)
                    }
                }
            }
        }
        Promise.all(loadingPromises).then(() => {
            this.setupMaterials();
            this.isTexturesLoaded = true;
        })
    }

    private loadLiquids() {
        for(let i = 0; i < this.modelData.groups.length; i++) {
            this.groupLiquids[i] = [];
            const groupData = this.modelData.groups[i];
            for(const liquidData of groupData.liquidData) {
                const liquidWmo = new WMOLiquid(liquidData, groupData, this.modelData.flags);
                liquidWmo.parent = this;
                liquidWmo.updateModelMatrixFromParent();
                liquidWmo.initialize(this.engine);
                this.children.push(liquidWmo);
                this.groupLiquids[i].push(liquidWmo);
            }
        }
    }

    private getDoodadSetRefs() {
        let defaultSet = this.modelData.doodadSets[0];
        if (this.doodadSetId > this.modelData.doodadSets.length) {
            this.doodadSetId = 0;
        }
        let refs = Array.from({ length: defaultSet.count }, (x, i) => i + defaultSet.startIndex);
        if (this.doodadSetId != 0) {
            const set = this.modelData.doodadSets[this.doodadSetId];
            refs.concat(Array.from({ length: set.count }, (x, i) => i + set.startIndex));
        }
        return refs;
    }

    private makeLodMap() {
        this.activeGroups = Array(this.modelData.groupInfo.length);
        this.lodGroupMap = Array(3 * this.modelData.groupInfo.length);
        const totalGroups = this.modelData.groupInfo.length;

        const skipGroups = [];
        for (let i = 0; i < this.lodGroupMap.length; i++) {
            if (i < totalGroups) {
                const groupInfo = this.modelData.groupInfo[i % totalGroups];
                if (!(groupInfo.flags & WowWorldModelGroupFlags.Lod)) {
                    skipGroups.push(i + totalGroups);
                    skipGroups.push(i + totalGroups + totalGroups);
                }
                this.lodGroupMap[i] = i % totalGroups;
                continue;
            }

            if (skipGroups.indexOf(i) > -1) {
                this.lodGroupMap[i] = i % totalGroups;
                continue;
            }

            const skipGroupsPassed = skipGroups.filter(x => x < i).length;
            this.lodGroupMap[i] = i - skipGroupsPassed;
        }
    }

    private setupPortals() {
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            this.portalsByGroup[i] = [];
        }

        this.portalData = Array(this.modelData.portals.length);

        for (let i = 0; i < this.modelData.portals.length; i++) {
            const portalData = this.modelData.portals[i];
            let portalVertices = this.modelData.portalVertices.slice(portalData.startVertex, portalData.startVertex + portalData.vertexCount)

            // Sort vertices around planar polygon
            const majorAxis = Plane.majorAxis(portalData.plane);
            const centroid = Float3.zero();
            for (let i = 0; i < portalVertices.length; i++) {
                Float3.add(portalVertices[i], centroid, centroid);
            }
            Float3.scale(centroid, 1 / portalVertices.length, centroid);
            const centroid2d = Float3.projectToVec2(centroid, majorAxis);
            portalVertices = portalVertices.sort((a, b) => {
                const a2d = Float2.subtract(centroid2d, Float3.projectToVec2(a, majorAxis));
                const b2d = Float2.subtract(centroid2d, Float3.projectToVec2(b, majorAxis));
                return Math.atan2(a2d[1], a2d[0]) - Math.atan2(b2d[1], b2d[0]);
            })

            const boundingBox = AABB.fromVertices(portalVertices, 0);

            this.portalData[i] = {
                index: i,
                negGroup: i,
                posGroup: i,
                boundingBox,
                plane: portalData.plane,
                vertices: portalVertices
            }
        }

        for (const portalRef of this.modelData.portalRefs) {
            if (portalRef.side > 0) {
                this.portalData[portalRef.portalIndex].posGroup = portalRef.groupIndex
            } else {
                this.portalData[portalRef.portalIndex].negGroup = portalRef.groupIndex;
            }
        }

        for (let i = 0; i < this.modelData.groups.length; i++) {
            const groupData = this.modelData.groups[i];
            const skip = groupData.portalsOffset;
            const take = groupData.portalCount;
            this.portalsByGroup[i] = []

            for (let j = skip; j < skip + take; j++) {
                this.portalsByGroup[i].push(this.modelData.portalRefs[j]);
            }
        }
    }

    // TODO: Move culling outside of WMO
    private findVisibleGroupsAndDoodads() {
        this.activeGroups = [];
        this.activeDoodads = [];
        this.groupViews = { };
        const groupIndexCameraIsIn = this.findGroupIndexForPoint(this.localCamera);

        const exteriorsInCameraFrustrum = []
        // Check exteriors in camera view and add groups that should always be drawn
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const groupData = this.modelData.groupInfo[i];
            if (groupData.flags & WowWorldModelGroupFlags.AlwaysDraw) {
                this.activeGroups.push(i);
                continue;
            }
            else if (groupData.flags & WowWorldModelGroupFlags.Exterior) {
                if (AABB.visibleInFrustrum(groupData.boundingBox, this.localCameraFrustrum)) {
                    exteriorsInCameraFrustrum.push(i);
                }
            }
        }

        let traversalGroups: number[] = []
        let currentlyInside = false;
        // Not inside any group, i.e. out of bounds
        if (groupIndexCameraIsIn < 0) {
            // Traverse exteriors
            traversalGroups = exteriorsInCameraFrustrum;
        } else {
            const cameraGroup = this.modelData.groupInfo[groupIndexCameraIsIn];
            currentlyInside = (cameraGroup.flags & WowWorldModelGroupFlags.Interior) > 0;
            traversalGroups = [groupIndexCameraIsIn];
            if (!currentlyInside) {
                traversalGroups = traversalGroups.concat(exteriorsInCameraFrustrum);
            }
        }

        const visibleGroups: Set<number> = new Set();
        const visitedGroups: Set<number> = new Set();
        let exteriorViews: Frustrum[] = [];
        for (const group of traversalGroups) {
            this.traversePortals(group, this.localCameraFrustrum, visibleGroups, visitedGroups, exteriorViews, 0);
        }

        // Add exteriors if visible from inside with their views
        if (currentlyInside && exteriorViews.length > 0) {
            for (const group of exteriorsInCameraFrustrum) {
                if (this.activeGroups.indexOf(group) === -1) {
                    this.activeGroups.push(group);
                }
                this.groupViews[group] = exteriorViews;
            }
        }
        this.activeGroups = this.activeGroups.concat([...visibleGroups]);

        // Test for visible doodads to update/draw
        for(const group of this.activeGroups) {
            const groupData = this.modelData.groupInfo[group];
            
            for(let i = 0; i < this.groupDoodads[group].length; i++) {
                const doodad = this.groupDoodads[group][i];
                // TODO: This should probably be handled elsewhere. Perhaps an on("dispose")?
                if (doodad.isDisposing) {
                    this.groupDoodads[group].splice(i, 1);
                    i--;
                    continue;
                }
                
                const distance = AABB.distanceToPointIgnoreAxis(doodad.worldBoundingBox, this.localCamera, Axis.Z);
                if (distance > this.engine.doodadRenderDistance) {
                    continue;
                }

                if (groupData.flags & WowWorldModelGroupFlags.AlwaysDraw) {
                    this.activeDoodads.push(doodad);
                    continue;
                }

                for (const view of this.groupViews[group]) {
                    if (AABB.visibleInFrustrum(doodad.worldBoundingBox, view)) {
                        this.activeDoodads.push(doodad);
                        break;
                    }
                }
            }
        }
    }

    private setLODGroupsForVisibleGroups() {
        for (let i = 0; i < this.activeGroups.length; i++) {
            const groupIndex = this.activeGroups[i];
            const groupData = this.modelData.groupInfo[groupIndex];

            if (!(groupData.flags & WowWorldModelGroupFlags.Lod)) {
                this.activeGroups[i] = groupIndex;
                continue;
            }

            const distance = AABB.distanceToPoint(groupData.boundingBox, this.localCamera);
            let lod = 0;
            if (distance > 800) {
                lod = 2;
            } else if (distance > 500) {
                lod = 1;
            }
            this.activeGroups[i] = this.lodGroupMap[lod * this.modelData.groupInfo.length + groupIndex];
        }
    }

    private findGroupIndexForPoint(point: Float3) {
        let currentGroup = -1;
        let currentBB = null;
        let minDist = Number.MAX_VALUE;
        for (let i = 0; i < this.modelData.groupInfo.length; i++) {
            const group = this.modelData.groupInfo[i];
            if (group.flags & WowWorldModelGroupFlags.Unreachable || group.flags & WowWorldModelGroupFlags.AntiPortal || group.flags & WowWorldModelGroupFlags.Unknown_0x400000) {
                continue;
            }

            if (group.flags & WowWorldModelGroupFlags.Exterior) {
                if (!AABB.containsPointIgnoreMaxZ(group.boundingBox, point)) {
                    continue;
                }
            } else {
                if (!AABB.containsPoint(group.boundingBox, point)) {
                    continue;
                }
            }

            // If we can't find out node by partitioning space, rely on boundinboxes
            if (currentGroup === -1) {
                currentGroup = i;
                currentBB = group.boundingBox;
            } else {
                if (minDist === Number.MAX_VALUE && AABB.containsBoundingBox(currentBB, group.boundingBox)) {
                    currentGroup = i;
                    currentBB = group.boundingBox;
                }
            }

            const groupData = this.modelData.groups[i];
            const nodes: WoWWorldModelBspNode[] = [];

            const tree: BspTree = {
                faceIndices: groupData.bspIndices,
                nodes: groupData.bspNodes,
                vertexIndices: groupData.indices,
                vertices: groupData.vertices
            }
            BspTree.findNodesForPoint(tree, point, nodes, 0);
            const triangleResult = BspTree.pickClosestTriangle_NegZ(tree, point, nodes);
            if (triangleResult) {
                if (triangleResult.distance < minDist) {
                    minDist = triangleResult.distance;
                    currentGroup = i;
                }
            }
        }
        return currentGroup;
    }

    private traversePortals(groupIndex: number, viewFrustrum: Frustrum, visibleSet: Set<number>, visitedSet: Set<number>, exteriorViews: Frustrum[], depth: number) {
        if (depth > 8) {
            return;
        }

        // Skip traversed group
        if (visitedSet.has(groupIndex)) {
            return;
        }

        // Add this view frustrum to view frustrums for this group for culling
        this.groupViews[groupIndex] = this.groupViews[groupIndex] ? this.groupViews[groupIndex] : [];
        this.groupViews[groupIndex].push(viewFrustrum);

        visibleSet.add(groupIndex);
        visitedSet.add(groupIndex);

        const portalRefs = this.portalsByGroup[groupIndex];
        for (const portalRef of portalRefs) {
            const portal = this.portalData[portalRef.portalIndex];

            let isInsidePortal = AABB.containsPoint(portal.boundingBox, this.localCamera);
            if (Plane.sideFacingPoint(portal.plane, this.localCamera) !== portalRef.side && !isInsidePortal) {
                continue;
            }

            // Skip portals that are not visible in the view frustrum
            if (!AABB.visibleInFrustrum(portal.boundingBox, viewFrustrum) && !isInsidePortal) {
                continue;
            }

            const portalView = Frustrum.copy(viewFrustrum);
            for (let i = 0; i < portal.vertices.length; i++) {
                const vertexA = portal.vertices[i];
                const vertexB = portal.vertices[(i + 1) % portal.vertices.length];
                const testPoint = portal.vertices[(i - 1 + portal.vertices.length) % portal.vertices.length];

                const plane = Plane.fromEyeAndVertices(this.localCamera, vertexA, vertexB)
                if (Plane.distanceToPoint(plane, testPoint) < 0) {
                    Float4.scale(plane, -1, plane);
                }
                portalView.push(plane);
            }

            const thisGroup = this.modelData.groupInfo[groupIndex]
            const otherGroup = this.modelData.groupInfo[portalRef.groupIndex];
            if (thisGroup.flags & WowWorldModelGroupFlags.Interior && otherGroup.flags & WowWorldModelGroupFlags.Exterior) {
                exteriorViews.push(portalView);
            }

            // Traverse portals for new clipped frustrum
            this.traversePortals(portalRef.groupIndex, portalView, visibleSet, new Set(), exteriorViews, depth + 1);
        }
    }

    private drawGroup(i: number) {
        const groupData = this.modelData.groups[i];
        for (let j = 0; j < groupData.batches.length; j++) {
            const batchData = groupData.batches[j];
            
            const batchRequest = new DrawingBatchRequest(BATCH_IDENTIFIER, this.fileId, batchData.materialId);
            batchRequest.useMaterial(this.groupMaterials[batchData.materialId])
                .useDataBuffers(this.groupDatabuffers[i])
                .drawIndexedTriangles(batchData.startIndex * 2, batchData.indexCount);
            this.engine.submitDrawRequest(batchRequest);
        }
    }

    private drawPortals() {
        for (let i = 0; i < this.modelData.portals.length; i++) {
            const portalData = this.modelData.portals[i];
            if (!AABB.visibleInFrustrum(this.portalData[i].boundingBox, this.engine.cameraFrustrum)) {
                continue;
            }

            const batchRequest = new DrawingBatchRequest(PORTAL_BATCH_IDENTIFIER, this.fileId, i);
            batchRequest.useMaterial(this.portalMaterial)
                .useDataBuffers(this.portalDataBuffers)
                .drawIndexedTriangles(portalData.startVertex * 1.5 * 2, portalData.vertexCount * 1.5);
            this.engine.submitDrawRequest(batchRequest);
        }
    }

    private setupDataBuffers() {
        this.groupDatabuffers = new Array(this.modelData.groups.length);
        for (let i = 0; i < this.modelData.groups.length; i++) {
            this.groupDatabuffers[i] = this.engine.getDataBuffers("WMO-" + this.fileId + "-" + i, (graphics) => {
                const group = this.modelData.groups[i];

                const numColors = group.vertexColors.length / group.vertices.length;
                if (numColors != Math.floor(numColors)) {
                    throw new Error("Unexpected situation. Number of Vertex Colors is not cleanly divisible by number of vertices.")
                }

                const numUv = group.uvList.length / group.vertices.length;
                if (numUv != Math.floor(numUv)) {
                    throw new Error("Unexpected situation. Number of UV coordinates is not cleanly divisible by number of vertices.");
                }

                const vertexDataSize = 56;
                const vertexDataBuffer = graphics.createVertexDataBuffer([
                    { index: this.shaderProgram.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 0 },
                    { index: this.shaderProgram.getAttribLocation('a_normal'), size: 3, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 12 },
                    { index: this.shaderProgram.getAttribLocation('a_color1'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: vertexDataSize, offset: 24 },
                    { index: this.shaderProgram.getAttribLocation('a_color2'), size: 4, type: BufferDataType.UInt8, normalized: false, stride: vertexDataSize, offset: 28 },
                    { index: this.shaderProgram.getAttribLocation('a_texCoord1'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 32 },
                    { index: this.shaderProgram.getAttribLocation('a_texCoord2'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 40 },
                    { index: this.shaderProgram.getAttribLocation('a_texCoord3'), size: 2, type: BufferDataType.Float, normalized: false, stride: vertexDataSize, offset: 48 },
                ], true);

                const numVertices = group.vertices.length;
                const bufferSize = vertexDataSize * numVertices;
                const buffer = new Uint8Array(bufferSize);
                const writer = new BinaryWriter(buffer.buffer);

                // TODO: Use seperate programs for various parameters so less data can be written
                for (let j = 0; j < group.vertices.length; j++) {
                    writer.writeFloatLE(group.vertices[j][0]);
                    writer.writeFloatLE(group.vertices[j][1]);
                    writer.writeFloatLE(group.vertices[j][2]);
                    writer.writeFloatLE(group.normals[j][0]);
                    writer.writeFloatLE(group.normals[j][1]);
                    writer.writeFloatLE(group.normals[j][2]);
                    writer.writeUInt8(numColors > 0 ? group.vertexColors[j][0] : 0);
                    writer.writeUInt8(numColors > 0 ? group.vertexColors[j][1] : 0);
                    writer.writeUInt8(numColors > 0 ? group.vertexColors[j][2] : 0);
                    writer.writeUInt8(numColors > 0 ? group.vertexColors[j][3] : 255);
                    writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][0] : 0);
                    writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][1] : 0);
                    writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][2] : 0);
                    writer.writeUInt8(numColors > 1 ? group.vertexColors[j + group.vertices.length][3] : 255);
                    writer.writeFloatLE(numUv > 0 ? group.uvList[j][0] : 0);
                    writer.writeFloatLE(numUv > 0 ? group.uvList[j][1] : 0);
                    writer.writeFloatLE(numUv > 1 ? group.uvList[j + group.vertices.length][0] : 0);
                    writer.writeFloatLE(numUv > 1 ? group.uvList[j + group.vertices.length][1] : 0);
                    writer.writeFloatLE(numUv > 2 ? group.uvList[j + 2 * group.vertices.length][0] : 0);
                    writer.writeFloatLE(numUv > 2 ? group.uvList[j + 2 * group.vertices.length][1] : 0);
                }
                vertexDataBuffer.setData(buffer);

                const vertexIndexBuffer = graphics.createVertexIndexBuffer(true);
                vertexIndexBuffer.setData(new Uint16Array(group.indices));

                return graphics.createDataBuffers(vertexIndexBuffer, vertexDataBuffer);
            });
        }
    }
    
    private setupPortalGraphics() {
        const portalVB = this.engine.graphics.createVertexDataBuffer([
            { index: this.portalShader.getAttribLocation('a_position'), size: 3, type: BufferDataType.Float, normalized: false, stride: 12, offset: 0 },
        ], true);
        const buffer = new Uint8Array(this.modelData.portalVertices.length * 12);
        const writer = new BinaryWriter(buffer.buffer);
        for (let i = 0; i < this.modelData.portalVertices.length; i++) {
            writer.writeFloatLE(this.modelData.portalVertices[i][0]);
            writer.writeFloatLE(this.modelData.portalVertices[i][1]);
            writer.writeFloatLE(this.modelData.portalVertices[i][2]);
        }
        portalVB.setData(buffer);

        const portalIB = this.engine.graphics.createVertexIndexBuffer(true);
        const portalBuffer = [];
        for (let i = 0; i < this.modelData.portals.length; i++) {
            const portalData = this.modelData.portals[i];
            if (portalData.vertexCount - 2 <= 0) {
                continue;
            }
            for (let j = 0; j < portalData.vertexCount - 2; j++) {
                portalBuffer.push(portalData.startVertex + 0)
                portalBuffer.push(portalData.startVertex + j + 1)
                portalBuffer.push(portalData.startVertex + j + 2)
            }
        }
        portalIB.setData(new Uint16Array(portalBuffer));

        this.portalDataBuffers = this.engine.graphics.createDataBuffers(portalVB, portalIB);
    }

    private setupMaterials() {
        if (this.isDisposing) {
            return;
        }
        
        for (let i = 0; i < this.modelData.materials.length; i++) {
            const material = this.modelData.materials[i];
            const blendMode = M2BlendModeToEGxBlend(material.blendMode);
            const vs = getWMOVertexShader(material.shader);
            const ps = getWMOPixelShader(material.shader);
            const unlit = (material.flags & WoWWorldModelMaterialMaterialFlags.Unlit) ? true : false
            const doubleSided = (material.flags & WoWWorldModelMaterialMaterialFlags.Unculled) != 0;

            const renderMaterial = this.engine.getBaseMaterial();
            renderMaterial.useCounterClockWiseFrontFaces(true);
            renderMaterial.useBackFaceCulling(!doubleSided);
            renderMaterial.useBlendMode(blendMode)
            renderMaterial.useDepthTest(true);
            renderMaterial.useDepthWrite(true);
            renderMaterial.useColorMask(ColorMask.Alpha | ColorMask.Red | ColorMask.Blue | ColorMask.Green);
            renderMaterial.useShaderProgram(this.shaderProgram);
            renderMaterial.useUniforms({
                "u_modelMatrix": this.worldModelMatrix,
                "u_cameraPos": this.engine.cameraPosition,
                "u_pixelShader": ps,
                "u_vertexShader": vs,
                "u_blendMode": material.blendMode,
                "u_unlit": unlit,
                "u_texture1": this.loadedTextures[material.texture1],
                "u_texture2": this.loadedTextures[material.texture2],
                "u_texture3": this.loadedTextures[material.texture3]
            });
            this.groupMaterials[i] = renderMaterial;
        }

        // Portal material
        const renderMaterial = this.engine.getBaseMaterial();
        renderMaterial.useCounterClockWiseFrontFaces(false);
        renderMaterial.useBackFaceCulling(false);
        renderMaterial.useBlendMode(GxBlend.GxBlend_Alpha)
        renderMaterial.useDepthTest(false);
        renderMaterial.useDepthWrite(false);
        renderMaterial.useColorMask(ColorMask.Alpha | ColorMask.Red | ColorMask.Blue | ColorMask.Green);
        renderMaterial.useShaderProgram(this.portalShader);
        renderMaterial.useUniforms({
            "u_modelMatrix": this.worldModelMatrix,
            "u_color": Float4.create(0.8, 0.1, 0.1, 0.25)
        });
        this.portalMaterial = renderMaterial;
    }

    override setModelMatrix(position: Float3 | null, rotation: Float4 | null, scale: Float3 | null): void {
        super.setModelMatrix(position, rotation, scale);

        Float44.tranpose(this.invWorldModelMatrix, this.transposeInvModelMatrix);
    }
}