 public static utils = `
vec3 calcLight(
  vec3 diffuseColor,
  vec3 normal,
  vec4 interiorAmbientColor,
  vec4 interiorDirectColor,
  float interiorExteriorBlend,
  bool applyInteriorLight,
  bool applyExteriorLight,
  vec3 accumLight,
  vec3 precomputedLight,
  vec3 specular,
  vec3 emissive,
  float shadow) {
    vec3 lDiffuse = vec3(0.0);
    vec3 localDiffuse = accumLight;
    vec3 currentColor = vec3(0.0);
    vec3 normalizedN = normalize(normal);

    if (applyExteriorLight) {
        float nDotL = saturate(dot(normalizedN, -exteriorDirectColorDir.xyz));
        currentColor = exteriorAmbientColor.rgb + precomputedLight;
        vec3 skyColor = currentColor * 1.1f;
        vec3 groundColor = currentColor * 0.7f;
        lDiffuse = (exteriorDirectColor.xyz * nDotL) * (1.0 - shadow);
        currentColor = mix(groundColor, skyColor, nDotL * 0.5 + 0.5); // wrapped lighting
    }

    if (applyInteriorLight) {
        float nDotL = saturate(dot(normalizedN, -interiorSunDir.xyz));
        vec3 lDiffuseInterior = interiorDirectColor.xyz * nDotL;
        vec3 interiorAmbient = interiorAmbientColor.xyz + precomputedLight;

        if (applyExteriorLight) {
            lDiffuse = mix(lDiffuseInterior, lDiffuse, interiorExteriorBlend);
            currentColor = mix(interiorAmbient, currentColor, interiorExteriorBlend);
        } else {
            lDiffuse = lDiffuseInterior;
            currentColor = interiorAmbient;
        }
    }

    vec3 gammaDiffTerm = diffuseColor * (currentColor + lDiffuse);
    vec3 linearDiffTerm = (diffuseColor * diffuseColor) * localDiffuse;

    specular *= (1.0 - shadow);

    return sqrt(gammaDiffTerm*gammaDiffTerm + linearDiffTerm) + specular + emissive;
}

vec3 calcFog(vec3 inColor, vec3 worldPosition, bool isAdditive) {
    float dist = distance(u_CameraPos.xyz, worldPosition);
    float t = saturate(invlerp(fogParams.x, fogParams.y, dist)) * skyFogColor.a;
    if (isAdditive) {
        return mix(inColor, vec3(0.0), t);
    } else {
        return mix(inColor, skyFogColor.rgb, t);
    }
}

vec2 envmapTexCoord(const vec3 viewSpacePos, const vec3 viewSpaceNormal) {
    vec3 refl = reflect(-normalize(viewSpacePos), normalize(viewSpaceNormal));
    refl.z += 1.0;
    refl = normalize(refl);
    return refl.xy * 0.5 + vec2(0.5);
}
  `;

 public static commonDeclarations = `
precision mediump float;

${GfxShaderLibrary.MatrixLibrary}

layout(std140) uniform ub_SceneParams {
    Mat4x4 u_Projection;
    Mat3x4 u_View;
    vec4 u_CameraPos;

    // lighting
    vec4 interiorSunDir;
    vec4 exteriorDirectColorDir;
    vec4 exteriorDirectColor;
    vec4 exteriorAmbientColor;
    vec4 skyTopColor;
    vec4 skyMiddleColor;
    vec4 skyBand1Color;
    vec4 skyBand2Color;
    vec4 skyFogColor;
    vec4 skySmogColor;
    vec4 sunColor;
    vec4 cloudSunColor;
    vec4 cloudEmissiveColor;
    vec4 cloudLayer1AmbientColor;
    vec4 cloudLayer2AmbientColor;
    vec4 oceanCloseColor;
    vec4 oceanFarColor;
    vec4 riverCloseColor;
    vec4 riverFarColor;
    vec4 shadowOpacity;
    vec4 fogParams; // fogStart, fogEnd
    vec4 waterAlphas; // riverShallow, riverDeep, oceanShallow, oceanDeep
    vec4 glow; // glow, highlightSky, _, _
};

${GfxShaderLibrary.saturate}
${GfxShaderLibrary.invlerp}
${BaseProgram.utils}