export const CP_CLAMP = 1500

export function proxyCp(score) {
  if (score > CP_CLAMP) return CP_CLAMP
  if (score < -CP_CLAMP) return -CP_CLAMP
  return score
}

export function winPct(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}

export function formatEval(cp, mateIn) {
  if (mateIn) {
    return (mateIn > 0 ? '#' + mateIn : '-#' + Math.abs(mateIn))
  }
  const v = cp / 100
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

export function formatClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
