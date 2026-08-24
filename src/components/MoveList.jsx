import { useEffect, useRef } from 'react'
import ClassIcon from './ClassIcon.jsx'

export default function MoveList({ plies, current, onSelect, showIcons = false }) {
  const ref = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    if (activeRef.current && ref.current) {
      const a = activeRef.current
      const c = ref.current
      if (a.offsetTop < c.scrollTop + 20 || a.offsetTop > c.scrollTop + c.clientHeight - 40) {
        c.scrollTop = a.offsetTop - c.clientHeight / 2
      }
    }
  }, [current])

  const rows = []
  for (let i = 0; i < plies.length; i += 2) {
    rows.push({
      no: i / 2 + 1,
      red: plies[i],
      black: plies[i + 1] || null
    })
  }

  return (
    <div className={`move-list ${showIcons ? 'with-icons' : ''}`} ref={ref}>
      {rows.map(row => (
        <div className="move-row" key={row.no}>
          <span className="move-no">{row.no}.</span>
          {[['red', row.red], ['black', row.black]].map(([side, mv]) =>
            mv ? (
              <button
                key={side}
                ref={mv.plyIndex + 1 === current || (current === 0 && false) ? activeRef : undefined}
                className={`move-cell ${mv.plyIndex + 1 === current ? 'active' : ''}`}
                onClick={() => onSelect(mv.plyIndex + 1)}
              >
                {showIcons && <ClassIcon cls={mv.cls} size={16} />}
                <span>{mv.chinese}</span>
              </button>
            ) : (
              <span key={side} />
            )
          )}
        </div>
      ))}
      {rows.length === 0 && <div className="move-empty">—</div>}
    </div>
  )
}
