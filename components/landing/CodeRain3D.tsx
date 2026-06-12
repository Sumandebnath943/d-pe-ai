"use client"
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { hasHardwareWebGL } from './glSupport'

export type CodeRainHandle = {
  /** Ramp the rain into overdrive (used when the user runs `init d-pe`). */
  surge: () => void
}

const GLYPHS = 'アカサタナハマヤラワコシツネホ0123456789{}<>$#@*/=+;:&%'.split('').slice(0, 32)
const COLS = 8
const ROWS = 4

/** White glyphs on transparent — tinted phosphor-green in the shader. */
function buildAtlas(): THREE.Texture {
  const cell = 64
  const canvas = document.createElement('canvas')
  canvas.width = cell * COLS
  canvas.height = cell * ROWS
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.font = `bold ${cell * 0.72}px monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  GLYPHS.forEach((g, i) => {
    const x = (i % COLS) * cell + cell / 2
    const y = Math.floor(i / COLS) * cell + cell / 2
    ctx.fillText(g, x, y)
  })
  const tex = new THREE.CanvasTexture(canvas)
  tex.flipY = false // rows indexed from the canvas top in the shader
  // Mipmaps let the fragment shader bias toward blurrier levels for the
  // depth-of-field effect (the canvas is power-of-two, so this is safe).
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

const VERT = /* glsl */ `
attribute float aSpeed;
attribute float aSeed;
attribute float aSize;
uniform float uTime;
uniform float uSurge;
varying float vSeed;
varying float vDepth;
varying float vBlur;

void main() {
  vec3 p = position;
  float fall = uTime * aSpeed * (1.0 + uSurge * 3.5);
  p.y = mod(p.y - fall + 40.0, 80.0) - 40.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vSeed = aSeed;
  vDepth = clamp((-mv.z - 6.0) / 58.0, 0.0, 1.0);
  // Depth of field: focus sits a touch behind the glass terminal; the circle
  // of confusion grows with distance from that plane. Out-of-focus sprites
  // get bigger (bokeh dilates) while the fragment shader dims and softens them.
  vBlur = clamp(abs(-mv.z - 34.0) / 24.0, 0.0, 1.0);
  gl_PointSize = aSize * (430.0 / -mv.z) * (1.0 + vBlur * 1.6);
}
`

const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform float uTime;
uniform float uSurge;
varying float vSeed;
varying float vDepth;
varying float vBlur;

void main() {
  // Glyphs mutate as they fall — each sprite cycles the atlas at its own rate.
  float swap = floor(uTime * (0.6 + fract(vSeed * 13.7) * 2.4) + vSeed * 32.0);
  float idx = mod(swap, 32.0);
  vec2 cell = vec2(mod(idx, 8.0), floor(idx / 8.0));
  vec2 uv = (gl_PointCoord + cell) / vec2(8.0, 4.0);
  // Mip bias melts the glyph edges as it leaves the focal plane…
  float a = texture2D(uAtlas, uv, vBlur * 2.5).a;
  // …and past half-blur the glyph dissolves into a soft bokeh disc.
  float d = length(gl_PointCoord - 0.5);
  float disc = smoothstep(0.5, 0.12, d);
  a = mix(a, disc * 0.5, smoothstep(0.35, 1.0, vBlur));

  float tw = 0.65 + 0.35 * sin(uTime * (1.5 + fract(vSeed * 7.0) * 3.0) + vSeed * 40.0);
  // Strong near/far separation is what sells the depth: foreground glyphs
  // glow hot, background ones recede into a dim haze.
  float bright = mix(1.45, 0.3, vDepth) * tw * (1.0 + uSurge * 1.4);
  vec3 nearCol = vec3(0.494, 0.906, 0.529); // #7ee787
  vec3 farCol  = vec3(0.2, 0.56, 0.27);
  vec3 col = mix(nearCol, farCol, vDepth) * bright;
  // The occasional white-hot leader glyph.
  if (fract(vSeed * 91.0) > 0.91) col = mix(col, vec3(0.9, 1.0, 0.92), 0.8);

  // Out-of-focus light spreads thin: dim with blur so bokeh stays gentle.
  gl_FragColor = vec4(col, a * mix(1.0, 0.42, vDepth) * (1.0 - vBlur * 0.45));
}
`

/**
 * Full-viewport 3D code rain behind the landing console: glyph sprites falling
 * through a deep volume with mouse parallax. Static gradient fallback when
 * WebGL is software-only or the user prefers reduced motion.
 */
const CodeRain3D = forwardRef<CodeRainHandle>(function CodeRain3D(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surgeRef = useRef<{ value: number }>({ value: 0 })
  const uniformsRef = useRef<Record<string, THREE.IUniform> | null>(null)

  useImperativeHandle(ref, () => ({
    surge() {
      const u = uniformsRef.current
      if (!u) return
      gsap.to(u.uSurge, { value: 1, duration: 0.9, ease: 'power2.in' })
    },
  }), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!hasHardwareWebGL()) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' })
    } catch {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120)
    camera.position.set(0, 0, 28)

    const isMobile = window.matchMedia('(max-width: 768px)').matches
    const COUNT = isMobile ? 550 : 1600

    const pos = new Float32Array(COUNT * 3)
    const speed = new Float32Array(COUNT)
    const seed = new Float32Array(COUNT)
    const size = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const z = 12 - Math.random() * 58 // a few glyphs pass right by the camera
      pos[i * 3] = (Math.random() - 0.5) * 72
      pos[i * 3 + 1] = (Math.random() - 0.5) * 80
      pos[i * 3 + 2] = z
      // Depth-correlated fall speed — near glyphs streak past while the far
      // field crawls. This motion parallax is what makes the volume read as 3D.
      const nearness = (z + 46) / 58 // 0 far → 1 near
      speed[i] = 1.6 + nearness * 6.5 + Math.random() * 1.2
      seed[i] = Math.random()
      size[i] = 0.7 + Math.random() * 0.9
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))

    const atlas = buildAtlas()
    const uniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uSurge: { value: 0 },
      uAtlas: { value: atlas },
    }
    uniformsRef.current = uniforms
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    scene.add(new THREE.Points(geo, mat))

    const mouse = new THREE.Vector2(0, 0)
    const target = new THREE.Vector2(0, 0)
    const onMouse = (e: MouseEvent) => {
      target.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMouse, { passive: true })

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false)
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const clock = new THREE.Clock()
    let raf = 0
    const tick = () => {
      uniforms.uTime.value = clock.getElapsedTime()
      mouse.lerp(target, 0.04)
      camera.position.x = mouse.x * 2.6
      camera.position.y = -mouse.y * 1.8
      camera.lookAt(0, 0, -12)
      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', resize)
      gsap.killTweensOf(uniforms.uSurge)
      geo.dispose()
      mat.dispose()
      atlas.dispose()
      renderer.dispose()
      uniformsRef.current = null
    }
  }, [])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* Phosphor haze + fallback ambience for no-WebGL environments. */}
      <div style={{
        position: 'absolute', inset: 0,
        background:
          'radial-gradient(ellipse 75% 60% at 50% 38%, rgba(63,185,80,0.07), transparent 65%),' +
          'radial-gradient(ellipse 100% 50% at 50% 105%, rgba(63,185,80,0.05), transparent 60%)',
      }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
})

export default CodeRain3D
