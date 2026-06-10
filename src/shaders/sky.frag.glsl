// 하늘 돔 프래그먼트 셰이더
// 수평선→천정 그라데이션, 태양 디스크/글로우, 달(밤), 밴딩 방지 디더링

uniform vec3  uZenithColor;
uniform vec3  uHorizonColor;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  uMoonDir;
uniform float uNightFactor; // 0 낮 ~ 1 밤

varying vec3 vDir;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, 0.0, 1.0);

  // 수평선 → 천정 그라데이션
  vec3 color = mix(uHorizonColor, uZenithColor, pow(h, 0.72));

  // 수평선 아래쪽은 안개에 잠긴 듯 약간 어둡게
  color = mix(color, uHorizonColor * 0.92, smoothstep(0.0, -0.08, dir.y));

  // 태양 — 디스크 + 따뜻하게 번지는 산란 글로우
  float d = max(dot(dir, uSunDir), 0.0);
  float disc = smoothstep(0.99935, 0.99975, d);
  float glow = pow(d, 320.0) * 1.1 + pow(d, 24.0) * 0.22;
  color += uSunColor * (disc * 2.4 + glow) * (1.0 - uNightFactor * 0.9);

  // 달 — 차가운 디스크 + 은은한 글로우 (밤에만 보임)
  float m = max(dot(dir, uMoonDir), 0.0);
  float mdisc = smoothstep(0.99955, 0.99985, m);
  float mglow = pow(m, 160.0) * 0.4;
  color += vec3(0.82, 0.87, 1.0) * (mdisc * 1.5 + mglow) * uNightFactor;

  // 그라데이션 밴딩 방지용 미세 디더링
  color += (hash(dir.xy * vec2(1741.3, 911.7)) - 0.5) * 0.006;

  gl_FragColor = vec4(color, 1.0);
}
