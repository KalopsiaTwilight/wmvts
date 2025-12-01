precision mediump float;

varying vec3 v_normal;
varying vec4 v_color;
varying vec2 v_texCoord1;
varying vec2 v_texCoord2;
varying vec2 v_texCoord3;

uniform int u_blendMode;
uniform int u_pixelShader;
uniform bool u_unlit;
uniform vec4 u_ambientColor;
uniform vec4 u_lightColor;
uniform vec3 u_lightDir;
uniform sampler2D u_texture1;
uniform sampler2D u_texture2;
uniform sampler2D u_texture3;
uniform sampler2D u_texture4;
uniform vec4 u_textureWeights;
        
void main(void) {
    vec4 outputColor = vec4(1.0);
    vec3 specular = vec3(0.0);

    vec4 tex1 = texture2D(u_texture1, v_texCoord1.st);
    vec4 tex2 = texture2D(u_texture2, v_texCoord2.st);
    vec4 tex3 = texture2D(u_texture3, v_texCoord3.st);

    vec3 materialColor;
    float discardAlpha = 1.0;
    if ( u_pixelShader == 0 ) { 
        //Combiners_Opaque
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
    } else if ( u_pixelShader == 1 ) { 
        //Combiners_Mod
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 2 ) { 
        //Combiners_Opaque_Mod
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
        discardAlpha = tex2.a;
    } else if ( u_pixelShader == 3 ) { 
        //Combiners_Opaque_Mod2x
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
        discardAlpha = tex2.a * 2.0;
    } else if ( u_pixelShader == 4 ) { 
        //Combiners_Opaque_Mod2xNA
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
    } else if ( u_pixelShader == 5 ) { 
        //Combiners_Opaque_Opaque
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
    } else if ( u_pixelShader == 6 ) { 
        //Combiners_Mod_Mod
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
        discardAlpha = tex1.a * tex2.a;
    } else if ( u_pixelShader == 7 ) { 
        //Combiners_Mod_Mod2x
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
        discardAlpha = tex1.a * tex2.a * 2.0;
    } else if ( u_pixelShader == 8 ) { 
        //Combiners_Mod_Add
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a + tex2.a;
        specular = tex2.rgb;
    } else if ( u_pixelShader == 9 ) { 
        //Combiners_Mod_Mod2xNA
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb * 2.0;
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 10 ) { 
        //Combiners_Mod_AddNA
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a;
        specular = tex2.rgb;
    } else if ( u_pixelShader == 11 ) { 
        //Combiners_Mod_Opaque
        materialColor = v_color.rgb * 2.0 * tex1.rgb * tex2.rgb;
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 12 ) { 
        //Combiners_Opaque_Mod2xNA_Alpha
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a));
    } else if ( u_pixelShader == 13 ) { 
        //Combiners_Opaque_AddAlpha
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        specular = tex2.rgb * tex2.a;
    } else if ( u_pixelShader == 14 ) {
        //Combiners_Opaque_AddAlpha_Alpha
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        specular = tex2.rgb * tex2.a * (1.0 - tex1.a);
    } else if ( u_pixelShader == 15 ) {
        //Combiners_Opaque_Mod2xNA_Alpha_Add
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a));
        specular = tex3.rgb * tex3.a * u_textureWeights.b;
    } else if ( u_pixelShader == 16 ) {
        //Combiners_Mod_AddAlpha
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a;
        specular = tex2.rgb * tex2.a;
    } else if ( u_pixelShader == 17 ) {
        //Combiners_Mod_AddAlpha_Alpha
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a + tex2.a * (0.3 * tex2.r + 0.59 * tex2.g + 0.11 * tex2.b);
        specular = tex2.rgb * tex2.a * (1.0 - tex1.a);
    } else if ( u_pixelShader == 18 ) {
        //Combiners_Opaque_Alpha_Alpha
        materialColor = v_color.rgb * 2.0 * mix(mix(tex1.rgb, tex2.rgb, vec3(tex2.a)), tex1.rgb, vec3(tex1.a));
    } else if ( u_pixelShader == 19 ) { 
        //Combiners_Opaque_Mod2xNA_Alpha_3s
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex3.rgb, vec3(tex3.a));
    } else if ( u_pixelShader == 20 ) { 
        //Combiners_Opaque_AddAlpha_Wgt
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        specular = tex2.rgb * tex2.a * u_textureWeights.g;
    } else if ( u_pixelShader == 21 ) {
        //Combiners_Mod_Add_Alpha
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a + tex2.a;
        specular = tex2.rgb * (1.0 - tex1.a);
    } else if ( u_pixelShader == 22 ) { 
        //Combiners_Opaque_ModNA_Alpha
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb, tex1.rgb, vec3(tex1.a));
    } else if ( u_pixelShader == 23 ) { 
        //Combiners_Mod_AddAlpha_Wgt
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a;
        specular = tex2.rgb * tex2.a * u_textureWeights.g;
    } else if ( u_pixelShader == 24 ) { 
        //Combiners_Opaque_Mod_Add_Wgt
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb, tex2.rgb, vec3(tex2.a));
        specular = tex1.rgb * tex1.a * u_textureWeights.r;
    } else if ( u_pixelShader == 25 ) { 
        //Combiners_Opaque_Mod2xNA_Alpha_UnshAlpha
        float glowOpacity = clamp(tex3.a * u_textureWeights.b, 0.0, 1.0);
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * tex2.rgb * 2.0, tex1.rgb, vec3(tex1.a)) * (1.0 - glowOpacity);
        specular = tex3.rgb * glowOpacity;
    } else if ( u_pixelShader == 26 ) { 
        //Combiners_Mod_Dual_Crossfade
        vec4 crossFaded = mix(mix(tex1, texture2D(u_texture2, v_texCoord1), vec4(clamp(u_textureWeights.g, 0.0, 1.0))), texture2D(u_texture3, v_texCoord1), vec4(clamp(u_textureWeights.b, 0.0, 1.0)));
        materialColor = v_color.rgb * 2.0 * crossFaded.rgb;
        discardAlpha = crossFaded.a;
    } else if ( u_pixelShader == 27 ) { 
        //Combiners_Opaque_Mod2xNA_Alpha_Alpha
        materialColor = v_color.rgb * 2.0 * mix(mix(tex1.rgb * tex2.rgb * 2.0, tex3.rgb, vec3(tex3.a)), tex1.rgb, vec3(tex1.a));
    } else if ( u_pixelShader == 28 ) { 
        //Combiners_Mod_Masked_Dual_Crossfade
        vec4 crossFaded = mix(mix(tex1, texture2D(u_texture2, v_texCoord1), vec4(clamp(u_textureWeights.g, 0.0, 1.0))), texture2D(u_texture3, v_texCoord1), vec4(clamp(u_textureWeights.b, 0.0, 1.0)));
        materialColor = v_color.rgb * 2.0 * crossFaded.rgb;
        discardAlpha = crossFaded.a * texture2D(u_texture4, v_texCoord2).a;
    } else if ( u_pixelShader == 29 ) { 
        //Combiners_Opaque_Alpha
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb, tex2.rgb, vec3(tex2.a));
    } else if ( u_pixelShader == 30 ) {
         //Guild
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a)), tex3.rgb, vec3(tex3.a));
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 31 ) { 
        //Guild_NoBorder
        materialColor = v_color.rgb * 2.0 * tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a));
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 32 ) { 
        //Guild_Opaque
        materialColor = v_color.rgb * 2.0 * mix(tex1.rgb * mix(vec3(1), tex2.rgb, vec3(tex2.a)), tex3.rgb, vec3(tex3.a));
    } else if ( u_pixelShader == 33 ) { 
        //Combiners_Mod_Depth
        materialColor = v_color.rgb * 2.0 * tex1.rgb;
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 34 ) { 
        //Illum
        discardAlpha = tex1.a;
    } else if ( u_pixelShader == 35 ) { 
        //Combiners_Mod_Mod_Mod_Const
        materialColor = v_color.rgb * 2.0 * (tex1 * tex2 * tex3).rgb;
        discardAlpha = (tex1 * tex2 * tex3).a;
    }

    if (u_blendMode == 13) {
        outputColor.a = discardAlpha * v_color.a;
    } else if (u_blendMode == 1) {
        if (discardAlpha < (128.0 / 255.0))
            discard;
        outputColor.a = v_color.a;
    } else if (u_blendMode == 0) {
        outputColor.a = v_color.a;
    } else {
        outputColor.a = discardAlpha * v_color.a;
    }

    outputColor.rgb = materialColor;
    if (!u_unlit) {
        // Simple ambient + diffuse lighting
        // color = (ambient + diffuse) * objectColor 
        vec4 lightColor = u_ambientColor;
        float diffStrength = max(0.0, dot(v_normal, u_lightDir));
        lightColor += u_lightColor * diffStrength;
        lightColor = clamp(lightColor, vec4(0,0,0,0), vec4(1,1,1,1));
        outputColor.rgb *= lightColor.rgb;
    }
    outputColor += vec4(specular, 0.0);
    
    gl_FragColor = outputColor;
}