
precision mediump float;
precision mediump int;
uniform sampler2D u_texture;

varying vec4 v_color;
varying vec2 v_texCoord1;

void main() {
    vec4 tex = texture2D(u_texture, v_texCoord1).rgba;
    gl_FragColor = vec4((v_color.rgb*tex.rgb), tex.a * v_color.a);
}