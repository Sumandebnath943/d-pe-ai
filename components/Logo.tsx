/**
 * D-PE.ai mark — a 3×3 node grid (the nine pillars) where five nodes flare into
 * four-point sparks that trace a north-east arrow: a two-barb arrowhead in the
 * top-right corner plus a diagonal shaft running down to the bottom-left. The
 * arrow takes the brand accent; the four remaining nodes stay quiet dots.
 *
 * With `twinkle`, the sparks pulse in sequence along the arrow (tail → shaft →
 * barbs → tip), like energy flowing toward the point.
 */
const STEP = [5, 12, 19] as const // grid coordinates on the 24×24 canvas

// Spark cells ([col,row]) mapped to their twinkle delay — ordered tail → tip.
const SPARKS: Record<string, number> = {
  '0,2': 0,    // shaft — bottom-left tail
  '1,1': 0.22, // shaft — centre
  '1,0': 0.44, // arrowhead barb (left of tip)
  '2,1': 0.44, // arrowhead barb (below tip)
  '2,0': 0.66, // tip — top-right corner
}

// Four-point sparkle centred at (cx,cy): outer points N/E/S/W at radius r, with
// control points pulled close to the centre (p) to pinch the spikes thin.
function spark(cx: number, cy: number, r: number, p = 0.18) {
  const k = r * p
  return [
    `M${cx},${cy - r}`,
    `Q${cx + k},${cy - k} ${cx + r},${cy}`,
    `Q${cx + k},${cy + k} ${cx},${cy + r}`,
    `Q${cx - k},${cy + k} ${cx - r},${cy}`,
    `Q${cx - k},${cy - k} ${cx},${cy - r}`,
    'Z',
  ].join(' ')
}

interface Props {
  size?: number | string
  /** Pulse the arrow sparks in sequence (used on the landing brand). */
  twinkle?: boolean
}

export default function Logo({ size = 22, twinkle = false }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ width: size, height: size, display: 'block', overflow: 'visible' }}
    >
      {STEP.map((y, row) =>
        STEP.map((x, col) => {
          const key = `${col}-${row}`
          const delay = SPARKS[`${col},${row}`]
          if (delay === undefined) {
            return <circle key={key} cx={x} cy={y} r="2" fill="currentColor" />
          }
          // The tip is a touch larger so the arrow reads point-first.
          const r = col === 2 && row === 0 ? 3.9 : 3.4
          return (
            <path
              key={key}
              className={twinkle ? 'logo-spark' : undefined}
              style={twinkle ? { animationDelay: `${delay}s` } : undefined}
              d={spark(x, y, r)}
              fill="var(--accent)"
            />
          )
        })
      )}
    </svg>
  )
}
