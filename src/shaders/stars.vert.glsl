// 별 정점 셰이더 — 크기/깜빡임 위상을 프래그먼트로 전달
attribute float aSize;
attribute float aPhase;

uniform float uPixelRatio;

varying float vPhase;

void main() {
  vPhase = aPhase;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
}
