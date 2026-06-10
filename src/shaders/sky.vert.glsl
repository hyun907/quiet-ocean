// 하늘 돔 정점 셰이더 — 방향 벡터만 넘기고, 항상 가장 먼 깊이에 그린다
varying vec3 vDir;

void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // NDC z = 1.0 → 다른 모든 것 뒤에 그려짐
}
