import { useRef, useMemo } from 'react'
import { idx, colorOf, typeOf } from '../engine/board.js'
import { pieceChar } from '../game/notation.js'

const PAD = 45
const CELL = 57
const W = PAD * 2 + CELL * 8
const H = PAD * 2 + CELL * 9

const cx = c => PAD + c * CELL
const cy = r => PAD + r * CELL

const MARK_POINTS = [
  [2, 1], [2, 7], [7, 1], [7, 7],
  [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
  [6, 0], [6, 2], [6, 4], [6, 6], [6, 8]
]

function Ticks({ r, c }) {
  const g = 5, l = 13
  const parts = []
  const x = cx(c), y = cy(r)
  const dirs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  for (let i = 0; i < 4; i++) {
    const [dx, dy] = dirs[i]
    if (c === 0 && dx < 0) continue
    if (c === 8 && dx > 0) continue
    parts.push(
      <path
        key={i}
        d={`M ${x + dx * g} ${y + dy * g + dy * l} L ${x + dx * g} ${y + dy * g} L ${x + dx * g + dx * l} ${y + dy * g}`}
        fill="none"
        stroke="#7a5230"
        strokeWidth="1.4"
      />
    )
  }
  return <g>{parts}</g>
}

export default function Board({
  bd,
  orientation = 0,
  selected = -1,
  targets,
  lastMove,
  checkSq = -1,
  arrow,
  onSquare,
  interactive = true,
  mini = false,
  moveSeq = 0,
  className = ''
}) {
  const svgRef = useRef(null)
  const animRef = useRef(null)
  const prevAnimKey = useRef('')
  const flip = orientation === 1

  const dispR = useMemo(() => {
    const a = new Int8Array(10)
    for (let r = 0; r < 10; r++) a[r] = flip ? 9 - r : r
    return a
  }, [flip])
  const dispC = useMemo(() => {
    const a = new Int8Array(9)
    for (let c = 0; c < 9; c++) a[c] = flip ? 8 - c : c
    return a
  }, [flip])

  const handleClick = e => {
    if (!interactive || !onSquare) return
    const rect = svgRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const py = ((e.clientY - rect.top) / rect.height) * H
    const cd = Math.round((px - PAD) / CELL)
    const rd = Math.round((py - PAD) / CELL)
    if (rd < 0 || rd > 9 || cd < 0 || cd > 8) return
    onSquare(idx(dispR[rd], dispC[cd]))
  }

  function row(sq) { return (sq / 9) | 0 }
  function col(sq) { return sq % 9 }

  const lastFromPt = lastMove ? [cx(dispC[col(lastMove.from)]), cy(dispR[row(lastMove.from)])] : null
  const lastToPt = lastMove ? [cx(dispC[col(lastMove.to)]), cy(dispR[row(lastMove.to)])] : null

  // Sliding-piece animation: when the last move changes, the destination piece
  // renders as a "ghost" that glides in from its origin square.
  const animKey = lastMove ? `${lastMove.from}>${lastMove.to}:${moveSeq || 0}` : ''
  if (animKey !== prevAnimKey.current) {
    prevAnimKey.current = animKey
    animRef.current = lastMove && bd[lastMove.to]
      ? {
          key: animKey,
          toSq: lastMove.to,
          pc: bd[lastMove.to],
          x: lastToPt[0], y: lastToPt[1],
          dx: lastFromPt[0] - lastToPt[0],
          dy: lastFromPt[1] - lastToPt[1]
        }
      : null
  }
  const ghost = animRef.current

  const pieces = []
  for (let sq = 0; sq < 90; sq++) {
    const p = bd[sq]
    if (!p) continue
    if (ghost && sq === ghost.toSq) continue
    const r = row(sq), c = col(sq)
    const x = cx(dispC[c]), y = cy(dispR[r])
    const isRed = colorOf(p) === 0
    const isSel = selected === sq
    pieces.push(
      <g key={sq} transform={`translate(${x},${y})`} style={{ cursor: interactive ? 'pointer' : 'default' }}>
        {isSel && <circle r="30" fill="none" stroke="#81b64c" strokeWidth="3.5" />}
        <circle r="25" fill="url(#pieceGrad)" stroke={isRed ? '#c8874a' : '#8a6b46'} strokeWidth="1.6" filter="url(#dropShadow)" />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="29"
          fontWeight="700"
          fontFamily='"Noto Serif SC","Songti SC","STSong","SimSun","KaiTi",serif'
          fill={isRed ? '#c23122' : '#1d1b16'}
          style={{ userSelect: 'none' }}
          y="2"
        >
          {pieceChar(p)}
        </text>
      </g>
    )
  }

  let ghostEl = null
  if (ghost && bd[ghost.toSq] === ghost.pc) {
    const isRed = colorOf(ghost.pc) === 0
    ghostEl = (
      <g transform={`translate(${ghost.x},${ghost.y})`} pointerEvents="none">
        <g key={ghost.key} className="piece-anim" style={{ '--dx': `${ghost.dx}px`, '--dy': `${ghost.dy}px` }}>
          {selected === ghost.toSq && <circle r="30" fill="none" stroke="#81b64c" strokeWidth="3.5" />}
          <circle r="25" fill="url(#pieceGrad)" stroke={isRed ? '#c8874a' : '#8a6b46'} strokeWidth="1.6" filter="url(#dropShadow)" />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="29"
            fontWeight="700"
            fontFamily='"Noto Serif SC","Songti SC","STSong","SimSun","KaiTi",serif'
            fill={isRed ? '#c23122' : '#1d1b16'}
            style={{ userSelect: 'none' }}
            y="2"
          >
            {pieceChar(ghost.pc)}
          </text>
        </g>
      </g>
    )
  }

  let arrowEl = null
  if (arrow && arrow.from >= 0 && arrow.to >= 0) {
    const x1 = cx(dispC[col(arrow.from)]), y1 = cy(dispR[row(arrow.from)])
    const x2 = cx(dispC[col(arrow.to)]), y2 = cy(dispR[row(arrow.to)])
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const t1 = 26 / len, t2 = 30 / len
    arrowEl = (
      <line
        x1={x1 + (x2 - x1) * t1} y1={y1 + (y2 - y1) * t1}
        x2={x2 - (x2 - x1) * t2} y2={y2 - (y2 - y1) * t2}
        stroke={arrow.color || '#38a3d1'}
        strokeWidth="9"
        strokeLinecap="round"
        opacity="0.85"
        markerEnd="url(#arrowHead)"
        pointerEvents="none"
      />
    )
  }

  return (
    <div className={`board-wrap ${mini ? 'mini' : ''} ${className}`}>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} onClick={handleClick} style={{ display: 'block', width: '100%' }}>
        <defs>
          <radialGradient id="pieceGrad" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fff6e0" />
            <stop offset="70%" stopColor="#f3dfae" />
            <stop offset="100%" stopColor="#dcc084" />
          </radialGradient>
          <linearGradient id="boardGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efd6a7" />
            <stop offset="50%" stopColor="#e9cb92" />
            <stop offset="100%" stopColor="#e2bf82" />
          </linearGradient>
          <filter id="dropShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#000" floodOpacity="0.35" />
          </filter>
          <marker id="arrowHead" markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 z" fill={arrow && arrow.color ? arrow.color : '#38a3d1'} opacity="0.85" />
          </marker>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="10" fill="url(#boardGrad)" />
        <rect x={PAD - 12} y={PAD - 12} width={CELL * 8 + 24} height={CELL * 9 + 24} fill="none" stroke="#7a5230" strokeWidth="2.5" />

        {Array.from({ length: 10 }, (_, r) => (
          <line key={'h' + r} x1={cx(0)} y1={cy(r)} x2={cx(8)} y2={cy(r)} stroke="#7a5230" strokeWidth="1.4" />
        ))}
        {[0, 8].map(c => (
          <line key={'v' + c} x1={cx(c)} y1={cy(0)} x2={cx(c)} y2={cy(9)} stroke="#7a5230" strokeWidth="1.4" />
        ))}
        {Array.from({ length: 7 }, (_, i) => i + 1).map(c => (
          <g key={'vs' + c}>
            <line x1={cx(c)} y1={cy(0)} x2={cx(c)} y2={cy(4)} stroke="#7a5230" strokeWidth="1.4" />
            <line x1={cx(c)} y1={cy(5)} x2={cx(c)} y2={cy(9)} stroke="#7a5230" strokeWidth="1.4" />
          </g>
        ))}

        <line x1={cx(3)} y1={cy(0)} x2={cx(5)} y2={cy(2)} stroke="#7a5230" strokeWidth="1.2" />
        <line x1={cx(5)} y1={cy(0)} x2={cx(3)} y2={cy(2)} stroke="#7a5230" strokeWidth="1.2" />
        <line x1={cx(3)} y1={cy(7)} x2={cx(5)} y2={cy(9)} stroke="#7a5230" strokeWidth="1.2" />
        <line x1={cx(5)} y1={cy(7)} x2={cx(3)} y2={cy(9)} stroke="#7a5230" strokeWidth="1.2" />

        {MARK_POINTS.map(([r, c]) => <Ticks key={`t${r}-${c}`} r={r} c={c} />)}

        <text x={cx(1) + CELL * 0.55} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily='"Noto Serif SC","SimSun",serif' fontWeight="700">楚</text>
        <text x={cx(2) + CELL * 0.95} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily='"Noto Serif SC","SimSun",serif' fontWeight="700">河</text>
        <text x={cx(5) + CELL * 0.05} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily='"Noto Serif SC","SimSun",serif' fontWeight="700">漢</text>
        <text x={cx(6) + CELL * 0.45} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily='"Noto Serif SC","SimSun",serif' fontWeight="700">界</text>

        {lastMove && <>
          <circle cx={lastFromPt[0]} cy={lastFromPt[1]} r="14" fill="rgba(130,182,76,0.45)" />
          <circle cx={lastToPt[0]} cy={lastToPt[1]} r="29" fill="rgba(130,182,76,0.28)" />
        </>}

        {checkSq >= 0 && (
          <circle cx={cx(dispC[col(checkSq)])} cy={cy(dispR[row(checkSq)])} r="31"
            fill="rgba(250,65,45,0.45)" className="check-pulse" />
        )}

        {targets && [...targets].map(to => {
          const occupied = !!bd[to]
          const x = cx(dispC[col(to)]), y = cy(dispR[row(to)])
          return occupied
            ? <circle key={'tg' + to} cx={x} cy={y} r="27.5" fill="none" stroke="rgba(20,60,20,0.55)" strokeWidth="4" />
            : <circle key={'tg' + to} cx={x} cy={y} r="8" fill="rgba(20,50,15,0.45)" />
        })}

        {pieces}
        {ghostEl}
        {arrowEl}

        {!mini && Array.from({ length: 9 }, (_, c) => (
          <text key={'cl' + c} x={cx(c)} y={H - 16} fontSize="13" textAnchor="middle" fill="#7a5230" opacity="0.8">
            {'abcdefghi'[flip ? 8 - c : c]}
          </text>
        ))}
      </svg>
    </div>
  )
}
