import { clsx } from './clsx.js'

/** Icon glyphs for move classes, with bilingual tooltips. */
const META = {
  brilliant: { sym: '!!', color: '#26c2a3', en: 'Brilliant', zh: '妙手' },
  great: { sym: '★', color: '#5bc8a8', en: 'Great', zh: '精彩' },
  best: { sym: '★', color: '#81b64c', en: 'Best', zh: '最佳' },
  bestAttempt: { sym: '≈', color: '#a8ce6a', en: 'Best Attempt', zh: '最佳嘗試' },
  excellent: { sym: '✓', color: '#95bb4a', en: 'Excellent', zh: '極佳' },
  good: { sym: '✓', color: '#96af8b', en: 'Good', zh: '良好' },
  book: { sym: '≡', color: '#8fa8c4', en: 'Book', zh: '譜著' },
  timeLoss: { sym: '⏱', color: '#c08bd6', en: 'Time Loss', zh: '時間損失' },
  missedWin: { sym: '↑?', color: '#d9a13b', en: 'Missed Win', zh: '錯過勝機' },
  missedDraw: { sym: '=?', color: '#c8a24a', en: 'Missed Draw', zh: '錯過和棋' },
  inaccuracy: { sym: '?!', color: '#f7c631', en: 'Inaccuracy', zh: '不精確' },
  mistake: { sym: '?', color: '#ff9f43', en: 'Mistake', zh: '失誤' },
  blunder: { sym: '??', color: '#fa412d', en: 'Blunder', zh: '敗著' }
}

export function classStyle(cls) {
  return META[cls] || META.good
}

export function classLabel(cls, lang = 'en') {
  const m = classStyle(cls)
  return lang === 'zh' ? m.zh : m.en
}

/** Best first, worst last — the order chess.com shows its summary grid in. */
export const CLASS_ORDER = [
  'brilliant', 'great', 'best', 'bestAttempt', 'excellent', 'good', 'book',
  'timeLoss', 'missedWin', 'missedDraw', 'inaccuracy', 'mistake', 'blunder'
]

export const CLASS_FILTERS = {
  all: 'all',
  problems: ['blunder', 'mistake', 'missedWin', 'missedDraw', 'timeLoss', 'inaccuracy'],
  missed: ['blunder', 'missedWin', 'missedDraw', 'timeLoss'],
  good: ['brilliant', 'great', 'best', 'bestAttempt']
}

export default function ClassIcon({ cls, size = 20, title }) {
  const m = classStyle(cls)
  return (
    <span
      className={clsx('class-icon', `cls-${cls}`)}
      style={{ background: m.color, width: size, height: size, fontSize: size * (m.sym.length > 1 ? 0.48 : 0.64) }}
      title={title || m.en}
      aria-label={m.en}
    >
      {m.sym}
    </span>
  )
}