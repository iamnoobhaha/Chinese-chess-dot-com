import { useEffect, useMemo, useRef } from 'react'
import ClassIcon from './ClassIcon.jsx'
import { shortEval } from '../game/mathUtil.js'

/**
 * Move list with per-move accuracy, evaluation change and class badges.
 *
 * `filter` lets the review page switch between the full game and only the moves
 * that were actually mistakes, which is how people prefer to study.
 */
export default function MoveList({
  plies,
  current,
  onSelect,
  showIcons = false,
  showEval = false,
  graph = null,
  graphMate = null,
  filter = 'all',
  highlight = null,
  emptyText = '—'
}) {
  const ref = useRef(null)
  const activeRef = useRef(null)

  const visible = useMemo(() => {
    if (!filter || filter === 'all') return plies
    return plies.filter(p => filter.includes(p.cls))
  }, [plies, filter])

  const jump = useRef(null)
  useEffect(() => {
    if (activeRef.current && ref.current) {
      const a = activeRef.current
      const c = ref.current
      if (a.offsetTop < c.scrollTop + 20 || a.offsetTop > c.scrollTop + c.clientHeight - 40) {
        c.scrollTop = a.offsetTop - c.clientHeight / 2
      }
    }
  }, [current])

  useEffect(() => { jump.current = null }, [highlight])

  const rows = []
  for (let i = 0; i < visible.length; i += 2) {
    rows.push({
      no: Math.floor(visible[i].plyIndex / 2) + 1,
      red: visible[i],
      black: visible[i + 1] || null
    })
  }

  const cell = (mv, side) => {
    if (!mv) return <span key={side} className="move-gap" />
    const isCurrent = mv.plyIndex + 1 === current
    const evalText = showEval && graph
      ? shortEval(graph[mv.plyIndex + 1], (graphMate || [])[mv.plyIndex + 1])
      : null
    return (
      <button
        key={side}
        ref={isCurrent ? activeRef : undefined}
        className={`move-cell ${isCurrent ? 'active' : ''} ${side === 'red' ? 'side-red' : 'side-black'}`}
        onClick={() => onSelect(mv.plyIndex + 1)}
        title={`${mv.chinese || mv.iccs}${showIcons && mv.cls ? ` — ${mv.cls}` : ''}`}
      >
        {showIcons && <ClassIcon cls={mv.cls} size={16} />}
        <span className="mv-text">{mv.chinese || mv.iccs}</span>
        {evalText && <span className="mv-eval">{evalText}</span>}
      </button>
    )
  }

  return (
    <div className={`move-list ${showIcons ? 'with-icons' : ''} ${showEval ? 'with-eval' : ''}`} ref={ref}>
      {rows.length === 0 && <div className="move-empty">{emptyText}</div>}
      {rows.map(row => (
        <div className="move-row" key={row.no}>
          <span className="move-no">{row.no}.</span>
          {cell(row.red, 'red')}
          {cell(row.black, 'black')}
        </div>
      ))}
    </div>
  )
}