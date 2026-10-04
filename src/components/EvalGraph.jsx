import { useRef, useState } from 'react'
import { shortEval } from '../game/mathUtil.js'

const MAXCP = 600
const VB_W = 1000
const VB_H = 100

/**
 * chess.com-style evaluation graph.
 *
 * Shows the played line, an optional dashed "best play" line so you can see
 * where the game diverged from optimal play, markers on the biggest mistakes,
 * and a hover tooltip with the evaluation at that point.
 */
export default function EvalGraph({
  data,
  mate = null,
  best = null,
  current = 0,
  onSelect,
  markers = null,
  labels = null
}) {
  const ref = useRef(null)
  const [hover, setHover] = useState(-1)
  const n = (data && data.length) || 0
  if (n < 2) return <div className="eval-graph empty" />

  const xAt = i => (i / (n - 1)) * VB_W
  const yAt = cp => {
    const c = Math.max(-MAXCP, Math.min(MAXCP, cp || 0))
    return VB_H / 2 - (c / MAXCP) * (VB_H / 2 - 6)
  }

  const segs = []
  for (let i = 0; i < n - 1; i++) {
    const y0 = yAt(data[i]), y1 = yAt(data[i + 1])
    const avg = (data[i] + data[i + 1]) / 2
    segs.push(
      <path
        key={i}
        d={`M ${xAt(i)} ${y0} L ${xAt(i + 1)} ${y1} L ${xAt(i + 1)} ${VB_H / 2} L ${xAt(i)} ${VB_H / 2} Z`}
        fill={avg >= 0 ? 'rgba(224,85,85,0.72)' : 'rgba(232,230,226,0.82)'}
      />
    )
    segs.push(
      <line key={'l' + i} x1={xAt(i)} y1={y0} x2={xAt(i + 1)} y2={y1}
        stroke={avg >= 0 ? '#e05555' : '#f4f1ec'} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    )
  }

  let bestLine = null
  if (best && best.length === n) {
    const pts = []
    for (let i = 0; i < n; i++) {
      if (Math.abs((best[i] || 0) - (data[i] || 0)) < 25) continue
      pts.push(`${xAt(i).toFixed(1)},${yAt(best[i]).toFixed(1)}`)
    }
    if (pts.length > 1) {
      bestLine = (
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke="#ffd166"
          strokeWidth="1.6"
          strokeDasharray="5 4"
          opacity="0.85"
          vectorEffect="non-scaling-stroke"
        />
      )
    }
  }

  const markerEls = (markers || []).map((m, i) => (
    <g key={'m' + i} transform={`translate(${xAt(m.index)},${VB_H - 4})`}>
      <circle r="4.5" fill={m.color} stroke="#111" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </g>
  ))

  const mateEls = (mate || []).map((m, i) => {
    if (!m) return null
    const x = xAt(i)
    const red = m > 0
    return (
      <g key={'mt' + i} transform={`translate(${x},${red ? 10 : VB_H - 10})`}>
        <text textAnchor="middle" fontSize="13" fontWeight="700"
          fill={red ? '#ff6b6b' : '#e8e6e2'}>{red ? `#${m}` : `#${Math.abs(m)}`}</text>
      </g>
    )
  })

  const pick = e => {
    const rect = ref.current.getBoundingClientRect()
    const t = (e.clientX - rect.left) / rect.width
    const i = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))))
    setHover(i)
    return i
  }

  const click = e => {
    if (!onSelect) return
    onSelect(pick(e))
  }

  const hoverIdx = hover >= 0 ? hover : -1
  const hv = hoverIdx >= 0 ? shortEval(data[hoverIdx], (mate || [])[hoverIdx]) : ''
  const label = labels && labels[hoverIdx]

  return (
    <div className="eval-graph">
      <svg
        ref={ref}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        onClick={click}
        onMouseMove={pick}
        onMouseLeave={() => setHover(-1)}
      >
        <rect width={VB_W} height={VB_H} fill="#211f1d" />
        {segs}
        {bestLine}
        <line x1="0" y1={VB_H / 2} x2={VB_W} y2={VB_H / 2} stroke="#000" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
        {hoverIdx >= 0 && (
          <line x1={xAt(hoverIdx)} y1="0" x2={xAt(hoverIdx)} y2={VB_H} stroke="#8a8580" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
        {mateEls}
        {markerEls}
        <line x1={xAt(current)} y1="0" x2={xAt(current)} y2={VB_H}
          stroke="#81b64c" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
        <circle cx={xAt(current)} cy={yAt(data[current])} r="4" fill="#81b64c" stroke="#111" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {hoverIdx >= 0 && (
        <div className="eval-tip">
          <b>{hv}</b>
          {label ? <span>{label}</span> : null}
        </div>
      )}
    </div>
  )
}