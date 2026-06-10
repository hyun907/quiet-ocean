// 포스트프로세싱 체인
// RenderPass → (데스크톱) UnrealBloom → 비네트 → OutputPass(ACES 톤매핑 + sRGB)
// 모바일에서는 bloom 을 생략해 성능을 확보한다.
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// 비네트 — 화면 가장자리를 은은하게 어둡게 해 시선을 중앙(수평선)으로 모은다
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uStrength: { value: 0.45 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - uStrength * smoothstep(0.38, 0.92, d);
      gl_FragColor = color;
    }
  `,
}

export function createComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  isMobile: boolean,
): EffectComposer {
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))

  if (!isMobile) {
    // 태양 글리터/노을 하이라이트만 살짝 번지도록 임계값을 높게 잡는다
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.32, // strength — 과하지 않게
      0.7,  // radius
      0.82, // threshold — 밝은 부분만
    )
    composer.addPass(bloom)
  }

  composer.addPass(new ShaderPass(VignetteShader))
  composer.addPass(new OutputPass()) // 렌더러 설정(ACES)대로 톤매핑 + sRGB 변환

  return composer
}
