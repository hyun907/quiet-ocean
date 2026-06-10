// 바다 프래그먼트 셰이더
// 깊이에 따른 수색, Fresnel 하늘 반사, 태양/달 글리터, 은은한 반짝임,
// 해안 foam, 거리 안개를 한 번에 계산한다.

uniform float uTime;
uniform vec3  uSunDir;        // 태양(밤에는 달) 방향 — 정규화됨
uniform vec3  uSunColor;
uniform float uSunIntensity;
uniform vec3  uDeepColor;     // 깊은 바다 색
uniform vec3  uShallowColor;  // 얕은 바다 색
uniform vec3  uZenithColor;   // 하늘 천정 색 (반사용)
uniform vec3  uHorizonColor;  // 수평선 색 (반사용)
uniform vec3  uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uNightFactor;   // 0 낮 ~ 1 밤
uniform float uShoreZ;

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveHeight;

// ---- 가벼운 해시/밸류 노이즈 ----
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                 hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.13;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec3 toCam = cameraPosition - vWorldPos;
  float distToCam = length(toCam);
  vec3 viewDir = toCam / distToCam;

  // 작은 잔물결 — 노이즈로 법선을 미세하게 교란 (먼 거리에선 약화해 알리아싱 방지)
  float rippleAtten = 1.0 - smoothstep(40.0, 300.0, distToCam);
  vec2 rp = vWorldPos.xz * 0.55 + vec2(uTime * 0.35, uTime * 0.22);
  float r1 = noise(rp) - 0.5;
  float r2 = noise(rp.yx * 1.7 - uTime * 0.3) - 0.5;
  vec3 normal = normalize(vNormal + vec3(r1, 0.0, r2) * 0.22 * rippleAtten);

  // 해안 근접도 (0 먼바다 → 1 물가)
  float shore = smoothstep(uShoreZ - 80.0, uShoreZ, vWorldPos.z);

  // 기본 수색: 깊은 색 → 얕은 색 + 파고에 따른 미묘한 밝기 변화
  vec3 base = mix(uDeepColor, uShallowColor, clamp(shore * 0.85 + vWaveHeight * 0.08 + 0.05, 0.0, 1.0));

  // Fresnel — 시선이 수면에 누울수록 하늘 반사가 강해진다
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0);
  vec3 reflDir = reflect(-viewDir, normal);
  vec3 skyRefl = mix(uHorizonColor, uZenithColor, clamp(reflDir.y * 1.8, 0.0, 1.0));
  vec3 color = mix(base, skyRefl, clamp(0.06 + 0.9 * fresnel, 0.0, 1.0));

  // 태양/달 반사 — 좁은 하이라이트 + 수면에 길게 깔리는 넓은 글리터 경로
  float rdots = max(dot(reflDir, uSunDir), 0.0);
  float specNarrow = pow(rdots, 260.0) * 2.6;
  float specWide   = pow(rdots, 24.0) * 0.16;
  vec3 spec = uSunColor * (specNarrow + specWide) * uSunIntensity;

  // 은은한 반짝임 — 시간에 따라 점멸하는 미세 글린트
  float tw = noise(vWorldPos.xz * 6.0 + vec2(uTime * 2.0, -uTime * 1.3));
  float sparkle = smoothstep(0.93, 1.0, tw) * pow(rdots, 6.0) * 1.4 * uSunIntensity;

  // foam — ① 파봉(crest) ② 해안으로 밀려오는 브레이커 라인 ③ 물가 거품띠
  float foamTex = fbm(vWorldPos.xz * 0.9 - vec2(0.0, uTime * 0.6));
  // 먼바다에서는 아주 가끔, 물가에서는 자주 부서지도록
  float crest = smoothstep(0.72, 1.2, vWaveHeight) * (0.06 + 0.35 * shore);
  // 브레이커 거품: 해안 앞 구간에서, 밀려오는 파의 능선을 따라 좁은 띠로
  float shoreBand = smoothstep(uShoreZ - 55.0, uShoreZ - 5.0, vWorldPos.z);
  float bphase = sin(vWorldPos.z * 0.16 - uTime * 1.25) * 0.5 + 0.5;
  float band = smoothstep(0.74, 0.97, bphase) * shoreBand;
  float edge = smoothstep(uShoreZ - 5.0, uShoreZ + 3.0, vWorldPos.z + vWaveHeight * 2.0);
  float foam = clamp(crest + band * 0.85 + edge, 0.0, 1.0);
  foam *= smoothstep(0.34, 0.88, foamTex + foam * 0.3); // 노이즈로 거품을 패치 형태로 분해

  vec3 foamColor = mix(vec3(0.93, 0.96, 0.99), uHorizonColor, 0.25);
  foamColor *= 1.0 - 0.72 * uNightFactor; // 밤에는 거품도 어둡게
  color = mix(color, foamColor, foam * 0.85);
  color += (spec + sparkle * (1.0 - smoothstep(300.0, 600.0, distToCam))) * (1.0 - foam);

  // 거리 안개 — 수평선이 하늘로 부드럽게 녹아들도록
  float fog = smoothstep(uFogNear, uFogFar, distToCam);
  color = mix(color, uFogColor, fog);

  gl_FragColor = vec4(color, 1.0);
}
