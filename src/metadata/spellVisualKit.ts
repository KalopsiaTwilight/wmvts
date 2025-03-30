export interface SpellVisualKitData
{
    Effects: SpellVisualKitEffectData[];
};

export interface SpellVisualKitEffectData
{
    EffectType: number;
    ProceduralEffectType: number;
    Value?: number[];
    Offset?: number[];
    OffsetVariation?: number[];
    AttachmentId: number;
    Yaw: number;
    Pitch: number;
    Roll: number;
    Scale: number;
    AnimID: number;
    PositionerId: number;
    Colors0: number[];
    Colors1: number[];
    Colors2: number[];
    Alpha: number[];
    EdgeColor: number[];
    GradientFlags: number;
}