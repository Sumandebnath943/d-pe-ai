/**
 * D-PE.ai mark — a 3×3 grid for the nine pillars, with the top-right node
 * flaring into a four-point AI spark. Dots inherit currentColor; the spark
 * takes the brand accent.
 */
export default function Logo({ size = 22 }: { size?: number }) {
  const dots: [number, number][] = [
    [5, 5], [12, 5],
    [5, 12], [12, 12], [19, 12],
    [5, 19], [12, 19], [19, 19],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="currentColor" />
      ))}
      <path
        d="M19 0.8 Q19.7 4.3 23.2 5 Q19.7 5.7 19 9.2 Q18.3 5.7 14.8 5 Q18.3 4.3 19 0.8 Z"
        fill="var(--accent)"
      />
    </svg>
  )
}
