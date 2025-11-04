precision mediump float;
                
varying vec2 v_texCoord;

uniform sampler2D u_specularTexture;

void main() {
    vec4 specular = texture2D( u_specularTexture, v_texCoord.xy );
    gl_FragColor = vec4(specular.rgb, 1.0);
}