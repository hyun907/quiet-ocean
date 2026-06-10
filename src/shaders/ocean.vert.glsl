// 바다 정점 셰이더
// 물리 시뮬레이션 대신 방향이 다른 사인파 여러 개를 합성해 수면을 변위시킨다.
// 각 파의 편미분을 함께 누적해 법선을 해석적으로 계산한다 (가볍고 안정적).

uniform float uTime;
uniform float uWaveIntensity; // 파도 세기 0 ~ 2 (UI 슬라이더)
uniform float uShoreZ;        // 해안선의 월드 z 좌표

varying vec3 vWorldPos;
varying vec3 vNormal;
varying float vWaveHeight;    // 거품(crest foam) 계산용 정규화 높이

// 방향성 사인파 하나를 높이(h)와 기울기(grad)에 누적한다
void accumWave(
  vec2 p, vec2 dir, float amp, float wavelength, float speed, float t,
  inout float h, inout vec2 grad
) {
  float k = 6.2831853 / wavelength;
  float phase = dot(dir, p) * k + t * speed;
  h += amp * sin(phase);
  grad += dir * (amp * k * cos(phase));
}

void main() {
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  vec2 p = worldPos.xz;
  float t = uTime;

  // 해안에 가까울수록 파고가 커지는 계수 (먼바다 0 → 물가 1)
  float shore = smoothstep(uShoreZ - 90.0, uShoreZ - 6.0, worldPos.z);

  float h = 0.0;
  vec2 grad = vec2(0.0);
  float amp = uWaveIntensity;

  // 잔잔한 너울 — 방향/파장/속도가 서로 다른 파를 겹쳐 자연스러운 움직임을 만든다
  accumWave(p, normalize(vec2( 0.0,  1.0 )), 0.42 * amp, 46.0, 0.85, t, h, grad);
  accumWave(p, normalize(vec2( 0.35, 0.9 )), 0.27 * amp, 27.0, 1.10, t, h, grad);
  accumWave(p, normalize(vec2(-0.5,  0.8 )), 0.16 * amp, 18.0, 1.35, t, h, grad);
  accumWave(p, normalize(vec2( 0.9,  0.25)), 0.08 * amp, 12.0, 1.60, t, h, grad);

  // 해안으로 밀려오며 부풀어 오르는 너울 (철썩이는 브레이커)
  float bphase = worldPos.z * 0.16 - t * 1.25;
  float breaker = sin(bphase) * 0.5 + 0.5;
  h += breaker * breaker * 0.75 * amp * shore;
  grad.y += cos(bphase) * 0.16 * 0.75 * amp * shore;

  vWaveHeight = h / max(amp, 0.001); // 세기와 무관한 상대 높이
  worldPos.y += h;

  // 높이맵의 기울기로부터 법선 계산
  vNormal = normalize(vec3(-grad.x, 1.0, -grad.y));
  vWorldPos = worldPos;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
