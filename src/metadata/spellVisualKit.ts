export interface SpellVisualKitData
{
    effects: SpellVisualKitEffectData[];
};

export interface SpellVisualKitEffectData
{
    effectType: number;
    proceduralEffectType: number;
    value?: number[];
    offset?: number[];
    offsetVariation?: number[];
    attachmentId: number;
    yaw: number;
    pitch: number;
    roll: number;
    scale: number;
    animID: number;
    positionerId: number;
    colors0: number[];
    colors1: number[];
    colors2: number[];
    alpha: number[];
    edgeColor: number[];
    gradientFlags: number;
}