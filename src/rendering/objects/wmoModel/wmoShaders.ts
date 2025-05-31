enum WMOPixelShader {
    Diffuse = 0,
    Specular = 1,
    Metal = 2,
    Env = 3,
    Opaque = 4,
    EnvMetal = 5,
    TwoLayerDiffuse = 6, //MapObjComposite
    TwoLayerEnvMetal = 7,
    TwoLayerTerrain = 8,
    DiffuseEmissive = 9,
    MaskedEnvMetal = 10,
    EnvMetalEmissive = 11,
    TwoLayerDiffuseOpaque = 12,
    TwoLayerDiffuseEmissive = 13,
    AdditiveMaskedEnvMetal = 14,
    TwoLayerDiffuseMod2x = 15,
    TwoLayerDiffuseMod2xNA = 16,
    TwoLayerDiffuseAlpha = 17,
    Lod = 18,
    Parallax = 19,
    UnkShader = 20,
    None = 21,
}

enum WMOVertexShader {
    DiffuseT1 = 0,
    DiffuseT1Refl = 1,
    DiffuseT1EnvT2 = 2,
    SpecularT1 = 3,
    DiffuseComp = 4,
    DiffuseCompRefl = 5,
    DiffuseCompTerrain = 6,
    DiffuseCompAlpha = 7,
    Parallax = 8,
    None = 9,
}

const WMOShaderTable: [WMOVertexShader, WMOPixelShader][] = [
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.Diffuse ],
    [ WMOVertexShader.SpecularT1,           WMOPixelShader.Specular ],
    [ WMOVertexShader.SpecularT1,           WMOPixelShader.Metal ],
    [ WMOVertexShader.DiffuseT1Refl,        WMOPixelShader.Env ],
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.Opaque ],
    [ WMOVertexShader.DiffuseT1Refl,        WMOPixelShader.EnvMetal ],
    [ WMOVertexShader.DiffuseComp,          WMOPixelShader.TwoLayerDiffuse ],
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.TwoLayerEnvMetal ],
    [ WMOVertexShader.DiffuseCompTerrain,   WMOPixelShader.TwoLayerTerrain ],
    [ WMOVertexShader.DiffuseComp,          WMOPixelShader.DiffuseEmissive ],
    [ WMOVertexShader.None,                 WMOPixelShader.None],
    [ WMOVertexShader.DiffuseT1EnvT2,       WMOPixelShader.MaskedEnvMetal],
    [ WMOVertexShader.DiffuseT1EnvT2,       WMOPixelShader.EnvMetalEmissive],
    [ WMOVertexShader.DiffuseComp,          WMOPixelShader.TwoLayerDiffuseOpaque ],
    [ WMOVertexShader.None,                 WMOPixelShader.None ],
    [ WMOVertexShader.DiffuseComp,          WMOPixelShader.TwoLayerDiffuseEmissive ],
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.Diffuse ],
    [ WMOVertexShader.DiffuseT1EnvT2,       WMOPixelShader.AdditiveMaskedEnvMetal ],
    [ WMOVertexShader.DiffuseCompAlpha,     WMOPixelShader.TwoLayerDiffuseMod2x ],
    [ WMOVertexShader.DiffuseComp,          WMOPixelShader.TwoLayerDiffuseMod2xNA ],
    [ WMOVertexShader.DiffuseCompAlpha,     WMOPixelShader.TwoLayerDiffuseAlpha ],
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.Lod ],
    [ WMOVertexShader.Parallax,             WMOPixelShader.Parallax ],
    [ WMOVertexShader.DiffuseT1,            WMOPixelShader.UnkShader ],
]

export const getWMOVertexShader = (shaderId: number) => {
    return WMOShaderTable[shaderId][0];
}

export const getWMOPixelShader = (shaderId: number) => {
    return WMOShaderTable[shaderId][1];
}
