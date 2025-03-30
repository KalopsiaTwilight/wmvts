// See https://wowdev.wiki/M2/.skin#Texture_units
// Logic based off Deamon87's WebWowViewerCpp

enum M2PixelShader {
    Combiners_Opaque = 0,
    Combiners_Mod = 1,
    Combiners_Opaque_Mod = 2,
    Combiners_Opaque_Mod2x = 3,
    Combiners_Opaque_Mod2xNA = 4,
    Combiners_Opaque_Opaque = 5,
    Combiners_Mod_Mod = 6,
    Combiners_Mod_Mod2x = 7,
    Combiners_Mod_Add = 8,
    Combiners_Mod_Mod2xNA = 9,
    Combiners_Mod_AddNA = 10,
    Combiners_Mod_Opaque = 11,
    Combiners_Opaque_Mod2xNA_Alpha = 12,
    Combiners_Opaque_AddAlpha = 13,
    Combiners_Opaque_AddAlpha_Alpha = 14,
    Combiners_Opaque_Mod2xNA_Alpha_Add = 15,
    Combiners_Mod_AddAlpha = 16,
    Combiners_Mod_AddAlpha_Alpha = 17,
    Combiners_Opaque_Alpha_Alpha = 18,
    Combiners_Opaque_Mod2xNA_Alpha_3s = 19,
    Combiners_Opaque_AddAlpha_Wgt = 20,
    Combiners_Mod_Add_Alpha = 21,
    Combiners_Opaque_ModNA_Alpha = 22,
    Combiners_Mod_AddAlpha_Wgt = 23,
    Combiners_Opaque_Mod_Add_Wgt = 24,
    Combiners_Opaque_Mod2xNA_Alpha_UnshAlpha = 25,
    Combiners_Mod_Dual_Crossfade = 26,
    Combiners_Opaque_Mod2xNA_Alpha_Alpha = 27,
    Combiners_Mod_Masked_Dual_Crossfade = 28,
    Combiners_Opaque_Alpha = 29,
    Guild = 30,
    Guild_NoBorder = 31,
    Guild_Opaque = 32,
    Combiners_Mod_Depth = 33,
    Illum = 34,
    Combiners_Mod_Mod_Mod_Const = 35,
    NewUnkCombiner = 36
};

enum M2VertexShader {
    Diffuse_T1 = 0,
    Diffuse_Env = 1,
    Diffuse_T1_T2 = 2,
    Diffuse_T1_Env = 3,
    Diffuse_Env_T1 = 4,
    Diffuse_Env_Env = 5,
    Diffuse_T1_Env_T1 = 6,
    Diffuse_T1_T1 = 7,
    Diffuse_T1_T1_T1 = 8,
    Diffuse_EdgeFade_T1 = 9,
    Diffuse_T2 = 10,
    Diffuse_T1_Env_T2 = 11,
    Diffuse_EdgeFade_T1_T2 = 12,
    Diffuse_EdgeFade_Env = 13,
    Diffuse_T1_T2_T1 = 14,
    Diffuse_T1_T2_T3 = 15,
    Color_T1_T2_T3 = 16,
    BW_Diffuse_T1 = 17,
    BW_Diffuse_T1_T2 = 18,
};

const M2ShaderTable: [M2PixelShader, M2VertexShader][] = [
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha,              M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_AddAlpha,                   M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_AddAlpha_Alpha,             M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_Add,          M2VertexShader.Diffuse_T1_Env_T1 ],
    [ M2PixelShader.Combiners_Mod_AddAlpha,                      M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_AddAlpha,                   M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Mod_AddAlpha,                      M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Mod_AddAlpha_Alpha,                M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_Alpha_Alpha,                M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_3s,           M2VertexShader.Diffuse_T1_Env_T1 ],
    [ M2PixelShader.Combiners_Opaque_AddAlpha_Wgt,               M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Mod_Add_Alpha,                     M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_ModNA_Alpha,                M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Mod_AddAlpha_Wgt,                  M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Mod_AddAlpha_Wgt,                  M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Opaque_AddAlpha_Wgt,               M2VertexShader.Diffuse_T1_T2 ],
    [ M2PixelShader.Combiners_Opaque_Mod_Add_Wgt,                M2VertexShader.Diffuse_T1_Env ],
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_UnshAlpha,    M2VertexShader.Diffuse_T1_Env_T1 ],
    [ M2PixelShader.Combiners_Mod_Dual_Crossfade,                M2VertexShader.Diffuse_T1 ],
    [ M2PixelShader.Combiners_Mod_Depth,                         M2VertexShader.Diffuse_EdgeFade_T1 ],
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_Alpha,        M2VertexShader.Diffuse_T1_Env_T2 ],
    [ M2PixelShader.Combiners_Mod_Mod,                           M2VertexShader.Diffuse_EdgeFade_T1_T2 ],
    [ M2PixelShader.Combiners_Mod_Masked_Dual_Crossfade,         M2VertexShader.Diffuse_T1_T2 ],
    [ M2PixelShader.Combiners_Opaque_Alpha,                      M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Opaque_Mod2xNA_Alpha_UnshAlpha,    M2VertexShader.Diffuse_T1_Env_T2 ],
    [ M2PixelShader.Combiners_Mod_Depth,                         M2VertexShader.Diffuse_EdgeFade_Env ],
    [ M2PixelShader.Guild,                                       M2VertexShader.Diffuse_T1_T2_T1 ],
    [ M2PixelShader.Guild_NoBorder,                              M2VertexShader.Diffuse_T1_T2 ],
    [ M2PixelShader.Guild_Opaque,                                M2VertexShader.Diffuse_T1_T2_T1 ],
    [ M2PixelShader.Illum,                                       M2VertexShader.Diffuse_T1_T1 ],
    [ M2PixelShader.Combiners_Mod_Mod_Mod_Const,                 M2VertexShader.Diffuse_T1_T2_T3 ],
    [ M2PixelShader.Combiners_Mod_Mod_Mod_Const,                 M2VertexShader.Color_T1_T2_T3 ],
    [ M2PixelShader.Combiners_Opaque,                            M2VertexShader.Diffuse_T1 ],
    [ M2PixelShader.Combiners_Mod_Mod2x,                         M2VertexShader.Diffuse_EdgeFade_T1_T2 ],
    [ M2PixelShader.Combiners_Mod,                               M2VertexShader.Diffuse_EdgeFade_T1 ],
    [ M2PixelShader.NewUnkCombiner,                              M2VertexShader.Diffuse_EdgeFade_T1_T2 ],
]

export const getShaderTableEntry = (shaderId: number) => {
    const actualShaderId = shaderId & 0x7FFF;
    if (actualShaderId >= M2ShaderTable.length) {
        throw "Wrong shaderId for vertex shader"
    }
    return M2ShaderTable[actualShaderId];
}

export const getVertexShaderId = (shaderId: number, textureCount: number) => {
    if (shaderId & 0x8000)
    {
        getShaderTableEntry(shaderId)[1];
    }
    if (textureCount == 1)
    {
        if (shaderId & 0x80)
        {
            return M2VertexShader.Diffuse_Env;
        }
        else
        {
            return shaderId & 0x4000 ? M2VertexShader.Diffuse_T2 : M2VertexShader.Diffuse_T1;
        }
    }
    if (shaderId & 0x80)
    {
        return shaderId & 0x8 ? M2VertexShader.Diffuse_Env_Env : M2VertexShader.Diffuse_Env_T1;
    }
    return shaderId & 0x8 ? M2VertexShader.Diffuse_T1_Env : shaderId & 0x4000 ? M2VertexShader.Diffuse_T1_T2 : M2VertexShader.Diffuse_T1_T1;
}

export const getPixelShaderId = (shaderId: number, textureCount: number) => {
    if (shaderId & 0x8000) {
        return getShaderTableEntry(shaderId)[0];
    }
    if (textureCount === 1) {
        if (shaderId & 0x70) {
            return M2PixelShader.Combiners_Mod;
        }
        return M2PixelShader.Combiners_Opaque;
    }
    else {
        if (shaderId & 0x70) {
            switch (shaderId & 7) {
                case 0: return M2PixelShader.Combiners_Mod_Opaque;
                case 3: return M2PixelShader.Combiners_Mod_Add; 
                case 4: return M2PixelShader.Combiners_Mod_Mod2x;
                case 6: return M2PixelShader.Combiners_Mod_Mod2xNA;
                case 7: return M2PixelShader.Combiners_Mod_AddNA;
                default: return M2PixelShader.Combiners_Mod_Mod;
            }
        } else {
            switch (shaderId & 7) {
                case 0: return M2PixelShader.Combiners_Opaque_Opaque;
                case 3: 
                case 7: return M2PixelShader.Combiners_Opaque_AddAlpha; 
                case 4: return  M2PixelShader.Combiners_Opaque_Mod2x;
                case 6: return M2PixelShader.Combiners_Opaque_Mod2xNA;
                default: return  M2PixelShader.Combiners_Opaque_Mod;
            }
        }
    }
}
