// 바다 정점 셰이더 — Gerstner 파
// 사인파와 달리 정점을 수평으로도 밀어내므로 마루는 뾰족하게 모이고
// 골은 평평하게 펴진다 (실제 파도의 비대칭 형태).
// 각 파의 편미분을 누적해 법선을 해석적으로 계산한다.

uniform float uTime;
uniform float uWaveIntensity; // 파도 세기 0 ~ 2 (UI 슬라이더)
uniform float uShoreZ;        // 해안선의 월드 z 좌표

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveHeight;    // 거품(crest foam) 계산용 정규화 높이

// Gerstner 파 하나를 변위(disp)와 법선 기울기(nGrad)에 누적
// steep(Q): 마루를 뾰족하게 만드는 정도. Σ(Q·k·A) < 1 이어야 면이 뒤집히지 않는다.
void gerstnerWave(
  vec2 p, vec2 dir, float amp, float wavelength, float speed, float steep, float t,
  inout vec3 disp, inout vec3 nGrad
) {
  float k = 6.2831853 / wavelength;
  float phase = dot(dir, p) * k + t * speed;
  float s = sin(phase);
  float c = cos(phase);
  disp.x += dir.x * steep * amp * c; // 수평 변위 — 마루 쪽으로 정점이 모인다
  disp.z += dir.y * steep * amp * c;
  disp.y += amp * s;
  nGrad.x += dir.x * k * amp * c;
  nGrad.z += dir.y * k * amp * c;
  nGrad.y += steep * k * amp * s;
}

void main() {
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 p = worldPos.xz;
  float t = uTime;

  // 해안에 가까울수록 파고가 커지는 계수 (먼바다 0 → 물가 1)
  float shore = smoothstep(uShoreZ - 90.0, uShoreZ - 6.0, worldPos.z);

  vec3 disp = vec3(0.0);
  vec3 nGrad = vec3(0.0);
  float amp = uWaveIntensity;

  // 잔잔한 너울 — 방향/파장/속도/뾰족함이 서로 다른 Gerstner 파 6개
  gerstnerWave(p, normalize(vec2( 0.0,  1.0 )), 0.40 * amp, 46.0, 0.85, 0.35, t, disp, nGrad);
  gerstnerWave(p, normalize(vec2( 0.35, 0.9 )), 0.26 * amp, 27.0, 1.10, 0.40, t, disp, nGrad);
  gerstnerWave(p, normalize(vec2(-0.5,  0.8 )), 0.16 * amp, 18.0, 1.35, 0.45, t, disp, nGrad);
  gerstnerWave(p, normalize(vec2( 0.9,  0.25)), 0.08 * amp, 12.0, 1.60, 0.50, t, disp, nGrad);
  gerstnerWave(p, normalize(vec2(-0.7,  0.6 )), 0.05 * amp,  8.0, 1.90, 0.50, t, disp, nGrad);
  gerstnerWave(p, normalize(vec2( 0.2, -0.97)), 0.04 * amp,  7.0, 2.20, 0.40, t, disp, nGrad);

  // 해안으로 밀려오며 부풀어 오르는 너울 (철썩이는 브레이커)
  float bph = worldPos.z * 0.16 - t * 1.25;
  float br = sin(bph) * 0.5 + 0.5;
  disp.y += br * br * 0.75 * amp * shore;
  disp.z += cos(bph) * 0.35 * amp * shore; // 마루가 해안 쪽으로 쏠리는 느낌
  nGrad.z += cos(bph) * 0.16 * 0.75 * amp * shore;

  vWaveHeight = disp.y / max(amp, 0.001); // 세기와 무관한 상대 높이
  worldPos += disp;

  // Gerstner 법선: N = normalize(-Σ∂x, 1-ΣQkA·sin, -Σ∂z)
  vNormal = normalize(vec3(-nGrad.x, 1.0 - nGrad.y, -nGrad.z));
  vWorldPos = worldPos;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
