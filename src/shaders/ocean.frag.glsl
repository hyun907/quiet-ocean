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
uniform sampler2D uNormalMap; // 절차 생성된 타일링 잔물결 노멀맵
uniform samplerCube uEnvMap;  // 하늘을 담은 환경 큐브맵 (실제 반사용)

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

  // 잔물결 — 타일링 노멀맵 두 장을 다른 배율/방향/속도로 스크롤해 합성
  // (밉맵·이방성 필터링이 알리아싱을 처리하므로 멀리서도 깨끗하다)
  vec2 uv1 = vWorldPos.xz * 0.055 + vec2(uTime * 0.013, uTime * 0.009);
  vec2 uv2 = vWorldPos.xz * 0.16 + vec2(-uTime * 0.020, uTime * 0.014);
  vec3 n1 = texture2D(uNormalMap, uv1).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(uNormalMap, uv2).xyz * 2.0 - 1.0;
  vec2 detail = n1.xy + n2.xy * 0.75;
  // 수평선 근처는 디테일을 줄여 차분하게
  float detailStrength = 0.5 * (1.0 - 0.7 * smoothstep(60.0, 520.0, distToCam));
  vec3 normal = normalize(vNormal + vec3(detail.x, 0.0, detail.y) * detailStrength);

  // 해안 근접도 (0 먼바다 → 1 물가)
  float shore = smoothstep(uShoreZ - 80.0, uShoreZ, vWorldPos.z);

  // 기본 수색: 깊은 색 → 얕은 색 + 파고에 따른 미묘한 밝기 변화
  vec3 base = mix(uDeepColor, uShallowColor, clamp(shore * 0.85 + vWaveHeight * 0.08 + 0.05, 0.0, 1.0));

  // Fresnel — 시선이 수면에 누울수록 하늘 반사가 강해진다
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 5.0);
  vec3 reflDir = reflect(-viewDir, normal);
  reflDir.y = abs(reflDir.y); // 수면 아래로 향한 반사는 위로 접어 하늘을 보게
  // 실제 하늘(태양 글로우·그라데이션·달)이 담긴 큐브맵을 샘플링
  vec3 skyRefl = textureCube(uEnvMap, reflDir).rgb;
  vec3 color = mix(base, skyRefl, clamp(0.06 + 0.9 * fresnel, 0.0, 1.0));

  // 태양/달 반사 — 좁은 하이라이트 + 수면에 길게 깔리는 넓은 글리터 경로
  // (넓은 글로우는 큐브맵 반사가 이미 담당하므로 약하게)
  float rdots = max(dot(reflDir, uSunDir), 0.0);
  float specNarrow = pow(rdots, 260.0) * 2.6;
  float specWide   = pow(rdots, 24.0) * 0.08;
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
