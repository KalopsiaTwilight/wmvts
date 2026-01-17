precision mediump float;

uniform sampler2D u_texture;
varying vec2 v_texCoord;

void main() {
    if ( v_texCoord.y < - 1.0 || v_texCoord.y > 1.0 ) 
        discard; // discard endcaps

    vec4 diffuseColor = texture2D(u_texture, v_texCoord.st);
    gl_FragColor = diffuseColor;
}