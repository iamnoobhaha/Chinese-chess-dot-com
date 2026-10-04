export const CP_CLAMP = 1500

/** Clamp a raw engine score into the range charts and graphs can display. */
export function proxyCp(score) {
  if (score > CP_CLAMP) return CP_CLAMP
  if (score < -CP_CLAMP) return -CP_CLAMP
  return score
}

/** Legacy 0..100 win-probability curve used for the accuracy formula. */
export function winPct(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

/**
 * Win / draw / loss expectation for a centipawn score.
 *
 * A flat score is mostly a draw in xiangqi; the draw share shrinks as one side
 * pulls ahead. This is what lets Game Review tell a "missed win" apart from a
 * plain inaccuracy.
 */
export function outcomeProbs(cp) {
  const c = Math.max(-2500, Math.min(2500, cp || 0))
  const share = 0.5 + 0.5 * Math.tanh(c / 300)
  const decisive = Math.min(1, Math.abs(c) / 700)
  const draw = Math.max(0.03, 0.9 * (1 - decisive))
  const rest = 1 - draw
  return c >= 0
    ? { win: rest * share, draw, loss: rest * (1 - share) }
    : { win: rest * (1 - share), draw, loss: rest * share }
}

/** Chess.com's centipawn-loss -> accuracy curve. */
export function accuracyFromDrop(dropPct) {
  const drop = Math.max(0, dropPct)
  return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * drop) - 3.1669))
}

/** Per-move accuracy. `phase` is accepted for future weighting; the curve is
 *  chess.com's so that numbers stay comparable with the real thing. */
export function moveAccuracy(winBefore, winAfter, phase) {
  void phase
  const drop = Math.max(0, winBefore - winAfter)
  return accuracyFromDrop(drop)
}

export function formatEval(cp, mateIn) {
  if (mateIn) {
    return mateIn > 0 ? '#' + mateIn : '-#' + Math.abs(mateIn)
  }
  const v = cp / 100
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

/** Short eval label for tight spaces: "+1.2" or "#3". */
export function shortEval(cp, mateIn) {
  if (mateIn) return (mateIn > 0 ? '#' : '-#') + Math.abs(mateIn)
  const v = Math.round(cp / 10) / 10
  return (v > 0 ? '+' : '') + v.toFixed(1)
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Rating-style band for a raw centipawn advantage. */
export function evalBand(cp) {
  const a = Math.abs(cp)
  if (a >= 900) return 'decisive'
  if (a >= 400) return 'big'
  if (a >= 150) return 'clear'
  if (a >= 50) return 'slight'
  return 'equal'
}