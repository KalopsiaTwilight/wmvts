precision mediump float;
                
varying vec2 v_texCoord;

uniform sampler2D u_emissiveTexture;

void main() {
    vec4 emissive = texture2D( u_emissiveTexture, v_texCoord.xy );
    gl_FragColor = vec4(emissive.rgb, emissive.a);
}