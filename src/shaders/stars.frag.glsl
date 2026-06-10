// 별 프래그먼트 셰이더 — 부드러운 원형 포인트 + 개별 위상으로 깜빡임
uniform float uTime;
uniform float uOpacity; // nightFactor 와 연동

varying float vPhase;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float circle = smoothstep(0.5, 0.12, d);
  float twinkle = 0.65 + 0.35 * sin(uTime * 1.6 + vPhase);
  float alpha = circle * twinkle * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), alpha);
}
