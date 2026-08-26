import { pieceChar } from '../game/notation.js'

export default function CapturedTray({ pieces }) {
  if (!pieces || !pieces.length) return null
  return (
    <div className="captured-tray">
      {pieces.map((p, i) => (
        <span key={i} className={`cap-pc ${colorClass(p)}`}>{pieceChar(p)}</span>
      ))}
    </div>
  )
}

function colorClass(p) {
  return (p >> 3) === 0 ? 'cap-red' : 'cap-black'
}
