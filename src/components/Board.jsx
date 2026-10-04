import { useRef, useMemo, useState, useId } from 'react'
import { idx, colorOf } from '../engine/board.js'
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

const PIECE_FONT = '"Noto Serif SC","Songti SC","STSong","SimSun","KaiTi",serif'

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

function Piece({ p, x, y, selected, ids, onPointerDown, draggable }) {
  const isRed = colorOf(p) === 0
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: draggable ? 'grab' : 'default' }}
      onPointerDown={onPointerDown}
    >
      {selected && <circle r="30" fill="none" stroke="#81b64c" strokeWidth="3.5" />}
      <circle r="25" fill={`url(#${ids.grad})`} stroke={isRed ? '#c8874a' : '#8a6b46'}
        strokeWidth="1.6" filter={`url(#${ids.shadow})`} />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="29"
        fontWeight="700"
        fontFamily={PIECE_FONT}
        fill={isRed ? '#c23122' : '#1d1b16'}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
        y="2"
      >
        {pieceChar(p)}
      </text>
    </g>
  )
}

/**
 * Xiangqi board.
 *
 * Supports click-to-move, click-drag, a single arrow (hint / best move) and any
 * number of extra arrows used by Game Review. All SVG ids are scoped per board
 * instance so several boards can live on one page (lesson diagrams do this).
 */
export default function Board({
  bd,
  orientation = 0,
  selected = -1,
  targets,
  lastMove,
  checkSq = -1,
  arrow,
  extraArrows = null,
  onSquare,
  onDrop,
  draggable = true,
  interactive = true,
  mini = false,
  moveSeq = 0,
  className = ''
}) {
  const svgRef = useRef(null)
  const animRef = useRef(null)
  const prevAnimKey = useRef('')
  const [drag, setDrag] = useState(null)

  const rawId = useId()
  const safe = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const ids = useMemo(() => ({
    grad: 'pg' + safe,
    board: 'pb' + safe,
    shadow: 'ps' + safe,
    head: 'pa' + safe
  }), [safe])

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

  const toLocal = e => {
    const rect = svgRef.current.getBoundingClientRect()
    return {
      px: ((e.clientX - rect.left) / rect.width) * W,
      py: ((e.clientY - rect.top) / rect.height) * H
    }
  }

  const toSq = e => {
    const { px, py } = toLocal(e)
    const cd = Math.round((px - PAD) / CELL)
    const rd = Math.round((py - PAD) / CELL)
    if (rd < 0 || rd > 9 || cd < 0 || cd > 8) return -1
    return idx(dispR[rd], dispC[cd])
  }

  const canDrag = interactive && !!onDrop && draggable

  const handleClick = e => {
    if (!interactive || !onSquare) return
    const sq = toSq(e)
    if (sq >= 0) onSquare(sq)
  }

  const row = sq => (sq / 9) | 0
  const col = sq => sq % 9

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
    if (drag && drag.from === sq) continue
    pieces.push(
      <Piece
        key={sq}
        p={p}
        x={cx(dispC[col(sq)])}
        y={cy(dispR[row(sq)])}
        ids={ids}
        selected={selected === sq}
        draggable={canDrag}
        onPointerDown={canDrag ? e => {
          e.preventDefault()
          const { px, py } = toLocal(e)
          setDrag({ from: sq, x: px, y: py })
        } : undefined}
      />
    )
  }

  let ghostEl = null
  if (ghost && bd[ghost.toSq] === ghost.pc) {
    ghostEl = (
      <g transform={`translate(${ghost.x},${ghost.y})`} pointerEvents="none">
        <g key={ghost.key} className="piece-anim" style={{ '--dx': `${ghost.dx}px`, '--dy': `${ghost.dy}px` }}>
          {selected === ghost.toSq && <circle r="30" fill="none" stroke="#81b64c" strokeWidth="3.5" />}
          <circle r="25" fill={`url(#${ids.grad})`} stroke={colorOf(ghost.pc) === 0 ? '#c8874a' : '#8a6b46'}
            strokeWidth="1.6" filter={`url(#${ids.shadow})`} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="29"
            fontWeight="700"
            fontFamily={PIECE_FONT}
            fill={colorOf(ghost.pc) === 0 ? '#c23122' : '#1d1b16'}
            style={{ userSelect: 'none' }}
            y="2"
          >
            {pieceChar(ghost.pc)}
          </text>
        </g>
      </g>
    )
  }

  const allArrows = [arrow, ...(extraArrows || [])].filter(a => a && a.from >= 0 && a.to >= 0)
  const arrowLines = allArrows.map((a, k) => {
    const x1 = cx(dispC[col(a.from)]), y1 = cy(dispR[row(a.from)])
    const x2 = cx(dispC[col(a.to)]), y2 = cy(dispR[row(a.to)])
    const len = Math.hypot(x2 - x1, y2 - y1) || 1
    const t1 = 26 / len, t2 = 30 / len
    return (
      <line
        key={'ar' + k}
        x1={x1 + (x2 - x1) * t1} y1={y1 + (y2 - y1) * t1}
        x2={x2 - (x2 - x1) * t2} y2={y2 - (y2 - y1) * t2}
        stroke={a.color || '#38a3d1'}
        strokeWidth={a.width || 9}
        strokeLinecap="round"
        opacity={a.opacity == null ? 0.85 : a.opacity}
        markerEnd={`url(#${ids.head}${k})`}
        pointerEvents="none"
      />
    )
  })
  const arrowMarkers = allArrows.map((a, k) => (
    <marker id={`${ids.head}${k}`} key={'mk' + k} markerWidth="4" markerHeight="4" refX="2.2" refY="2" orient="auto">
      <path d="M0,0 L4,2 L0,4 z" fill={a.color || '#38a3d1'} opacity="0.9" />
    </marker>
  ))

  const onPointerMove = e => {
    if (!drag) return
    const { px, py } = toLocal(e)
    setDrag(d => (d ? { ...d, x: px, y: py } : d))
  }

  const endDrag = e => {
    if (!drag) return
    const from = drag.from
    setDrag(null)
    const to = toSq(e)
    if (to < 0) return
    if (to !== from) onDrop(from, to)
    else if (onSquare) onSquare(to)
  }

  const dragEl = drag && bd[drag.from]
    ? <Piece key="drag" p={bd[drag.from]} x={drag.x} y={drag.y} ids={ids} selected={false} />
    : null

  return (
    <div className={`board-wrap ${mini ? 'mini' : ''} ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={() => setDrag(null)}
        style={{ display: 'block', width: '100%', touchAction: 'none' }}
      >
        <defs>
          <radialGradient id={ids.grad} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fff6e0" />
            <stop offset="70%" stopColor="#f3dfae" />
            <stop offset="100%" stopColor="#dcc084" />
          </radialGradient>
          <linearGradient id={ids.board} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#efd6a7" />
            <stop offset="50%" stopColor="#e9cb92" />
            <stop offset="100%" stopColor="#e2bf82" />
          </linearGradient>
          <filter id={ids.shadow} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#000" floodOpacity="0.35" />
          </filter>
          {arrowMarkers}
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="10" fill={`url(#${ids.board})`} />
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
          fontFamily={PIECE_FONT} fontWeight="700">楚</text>
        <text x={cx(2) + CELL * 0.95} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily={PIECE_FONT} fontWeight="700">河</text>
        <text x={cx(5) + CELL * 0.05} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily={PIECE_FONT} fontWeight="700">漢</text>
        <text x={cx(6) + CELL * 0.45} y={cy(4.5) - 8} fontSize="26" fill="#7a5230" opacity="0.75"
          fontFamily={PIECE_FONT} fontWeight="700">界</text>

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
        {arrowLines}
        {dragEl}

        {!mini && Array.from({ length: 9 }, (_, c) => (
          <text key={'cl' + c} x={cx(c)} y={H - 16} fontSize="13" textAnchor="middle" fill="#7a5230" opacity="0.8">
            {'abcdefghi'[flip ? 8 - c : c]}
          </text>
        ))}
      </svg>
    </div>
  )
}