const STYLES = {
  brilliant: { sym: '!!', color: '#26c2a3' },
  best: { sym: '★', color: '#81b64c' },
  excellent: { sym: '✓', color: '#95bb4a' },
  good: { sym: '✓', color: '#96af8b' },
  book: { sym: '≡', color: '#8fa8c4' },
  inaccuracy: { sym: '?!', color: '#f7c631' },
  mistake: { sym: '?', color: '#ff9f43' },
  blunder: { sym: '??', color: '#fa412d' }
}

export function classStyle(cls) {
  return STYLES[cls] || STYLES.good
}

export default function ClassIcon({ cls, size = 20 }) {
  const s = classStyle(cls)
  return (
    <span
      className="class-icon"
      style={{
        background: s.color,
        width: size,
        height: size,
        fontSize: size * (s.sym.length > 1 ? 0.52 : 0.68)
      }}
      title={cls}
    >
      {s.sym}
    </span>
  )
}
