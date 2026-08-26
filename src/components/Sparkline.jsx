export default function Sparkline({ points, width = 130, height = 30 }) {
  if (!points || points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const pts = points.map((v, i) =>
    `${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`
  ).join(' ')
  const lastY = height - 2 - ((points[points.length - 1] - min) / span) * (height - 4)
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx={width} cy={lastY} r="2.6" fill="var(--gold)" />
    </svg>
  )
}
