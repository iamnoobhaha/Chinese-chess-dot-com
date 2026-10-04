const KEY = 'xqm_reviewstats'
const MAX = 60

/**
 * Compact, durable record of every completed review.
 *
 * The full engine output is cached separately (and can be evicted), so the
 * Progress page reads these small summaries instead of re-deriving anything.
 */
function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter(e => e && typeof e.accuracy === 'number') : []
  } catch {
    return []
  }
}

function writeAll(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))) } catch {}
}

/** @param {object} review result of buildReview() */
export function saveReviewStat(review, meta = {}) {
  if (!review || !review.summary) return null
  const entry = {
    ts: Date.now(),
    gameId: meta.gameId || null,
    mode: meta.mode || 'ai',
    level: meta.level ?? null,
    result: meta.result || null,
    opening: review.report.opening ? review.report.opening.nameEn : '',
    accuracy: review.summary.red.accuracy,
    acpl: review.summary.red.acpl,
    counts: review.summary.red.counts,
    theirs: review.summary.black.accuracy,
    plies: review.plies.length,
    keyMoments: review.report.keyMoments.map(k => ({ ply: k.plyIndex, cls: k.cls, swing: k.swing }))
  }
  const all = readAll().filter(e => e.gameId !== entry.gameId)
  all.unshift(entry)
  writeAll(all)
  return entry
}

export function getReviewStats() {
  return readAll()
}

/** Rolling aggregate used by the Progress page. */
export function reviewStatsSummary() {
  const all = readAll()
  if (!all.length) {
    return { games: 0, accuracy: 0, acpl: 0, counts: {}, history: [] }
  }
  const counts = {}
  let acc = 0
  let acpl = 0
  for (const e of all) {
    acc += e.accuracy
    acpl += e.acpl || 0
    for (const k of Object.keys(e.counts || {})) counts[k] = (counts[k] || 0) + e.counts[k]
  }
  return {
    games: all.length,
    accuracy: Math.round((acc / all.length) * 10) / 10,
    acpl: Math.round(acpl / all.length),
    counts,
    history: [...all].reverse().map(e => ({ ts: e.ts, accuracy: e.accuracy }))
  }
}

export function clearReviewStats() {
  try { localStorage.removeItem(KEY) } catch {}
}