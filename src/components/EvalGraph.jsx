import { useRef } from 'react'

const MAXCP = 650

export default function EvalGraph({ data, current = 0, onSelect }) {
  const ref = useRef(null)
  const W = 100, H = 100
  const n = data.length
  if (n < 2) return <div className="eval-graph empty" />

  const xAt = i => (i / (n - 1)) * W
  const yAt = cp => {
    const c = Math.max(-MAXCP, Math.min(MAXCP, cp))
    return H / 2 - (c / MAXCP) * (H / 2 - 6)
  }

  const segs = []
  for (let i = 0; i < n - 1; i++) {
    const y0 = yAt(data[i]), y1 = yAt(data[i + 1])
    const avg = (data[i] + data[i + 1]) / 2
    segs.push(
      <path
        key={i}
        d={`M ${xAt(i)} ${y0} L ${xAt(i + 1)} ${y1} L ${xAt(i + 1)} ${H / 2} L ${xAt(i)} ${H / 2} Z`}
        fill={avg >= 0 ? 'rgba(224,85,85,0.75)' : 'rgba(230,230,230,0.8)'}
      />
    )
    segs.push(
      <line key={'l' + i} x1={xAt(i)} y1={y0} x2={xAt(i + 1)} y2={y1}
        stroke={avg >= 0 ? '#e05555' : '#efefef'} strokeWidth="1.6" />
    )
  }

  const click = e => {
    if (!onSelect || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const t = (e.clientX - rect.left) / rect.width
    onSelect(Math.max(0, Math.min(n - 1, Math.round(t * (n - 1)))))
  }

  return (
    <div className="eval-graph">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onClick={click}>
        <rect width={W} height={H} fill="#211f1d" />
        {segs}
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#000" strokeWidth="0.8" opacity="0.5" />
        <line x1={xAt(current)} y1="0" x2={xAt(current)} y2={H}
          stroke="#81b64c" strokeWidth="1.4" />
        <circle cx={xAt(current)} cy={yAt(data[current])} r="2.6" fill="#81b64c" stroke="#111" strokeWidth="0.7" />
      </svg>
    </div>
  )
}
