/**
 * Heavy WebGL scenes (full-screen particle fields) are only worth running on a
 * real GPU. Software rasterizers (SwiftShader, llvmpipe — common in VMs and
 * headless browsers) render them at seconds-per-frame and stall the page, so
 * callers detect them here and fall back to their static/CSS variants.
 */
export function hasHardwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null
    if (!gl) return false
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}
