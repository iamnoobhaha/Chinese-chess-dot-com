import { START_FEN, parseFen, legalMoves, sqToIccs, sideInCheck, replay } from '../src/engine/board.js'
import { annotatedReplay } from '../src/game/positionUtils.js'
import { analyzePosition } from '../src/engine/search.js'
import { buildReview, classifyLoss, CLASSES, NEUTRAL_CLASSES, materialOf, phaseOf, explainMove } from '../src/game/review.js'
import { LESSON_SEQUENCES } from '../src/data/lessons.js'
import { identifyOpening, OPENING_CHOICES } from '../src/game/openings.js'
import { repetitionCounts } from '../src/game/analysisCache.js'
import { winPct, outcomeProbs, accuracyFromDrop, shortEval, formatEval, formatClock } from '../src/game/mathUtil.js'

let failures = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`PASS ${name} ${extra}`)
  else { console.log(`FAIL ${name} ${extra}`); failures++ }
}

// A short realistic game: good opening, then a couple of clear mistakes.
const MOVES = ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'e3e4', 'e6e5', 'c3c4', 'a9a8']

const store = new Map()
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
}

const rep = repetitionCounts(START_FEN, MOVES)
check('repetition counts line up with the move list', rep.length === MOVES.length + 1, `${rep.length}`)

const positions = annotatedReplay(START_FEN, MOVES)
const results = []
for (let j = 0; j <= MOVES.length; j++) {
  results.push(analyzePosition(START_FEN, MOVES.slice(0, j), 7, 700, { repCount: rep[j] }))
}
const review = buildReview(START_FEN, positions, results, LESSON_SEQUENCES, { humanColor: 0, result: 'win', reason: 'resign' })

check('review covers every move', review.plies.length === MOVES.length, `${review.plies.length}`)
check('every move has a known class', review.plies.every(p => CLASSES.includes(p.cls)),
  review.plies.map(p => p.cls).join(','))
check('graph length matches plies', review.graph.length === MOVES.length + 1 &&
  review.graphBest.length === MOVES.length + 1 && review.graphMate.length === MOVES.length + 1)
check('graph is red-relative and bounded',
  review.graph.every(cp => Math.abs(cp) <= 1500))
check('accuracies are percentages', review.plies.every(p => p.accuracy >= 0 && p.accuracy <= 100))
check('acpl equals centipawn loss', review.plies.every(p => p.acpl === p.loss))
check('openings match the lesson book', review.plies[0].cls === 'book' && review.plies[1].cls === 'book',
  review.plies.slice(0, 2).map(p => p.cls).join(','))

// summary shape
{
  const red = review.summary.red
  const black = review.summary.black
  check('summary reports both sides', red.moves === 5 && black.moves === 5, `${red.moves}/${black.moves}`)
  check('accuracy in range', red.accuracy > 0 && red.accuracy <= 100 && black.accuracy <= 100,
    `${red.accuracy} / ${black.accuracy}`)
  check('per-phase accuracy present',
    red.phases.opening.moves > 0 && red.phases.opening.accuracy >= 0)
  check('final win probability is a percentage',
    red.finalWinPct >= 0 && red.finalWinPct <= 100, String(red.finalWinPct))
  check('weighted outcome sums to ~100', (() => {
    const o = red.weightedOutcome
    return Math.abs(o.win + o.draw + o.loss - 100) <= 2
  })(), JSON.stringify(red.weightedOutcome))
}

// report
check('report names the opening', !!review.report.opening.nameEn, review.report.opening.nameEn)
check('report finds a worst moment', review.report.worstPly != null)
check('key moments are ordered by ply',
  review.report.keyMoments.every((k, i, a) => i === 0 || a[i - 1].plyIndex <= k.plyIndex))
check('humanColor recorded', review.report.humanColor === 0)

// Partial analysis must not corrupt the report
{
  // two finished positions describe exactly one move
  const partial = buildReview(START_FEN, positions, [results[0], results[1], null, null, null], [])
  check('partial analysis truncates instead of inventing plies',
    partial.plies.length === 1, `${partial.plies.length}`)
  const none = buildReview(START_FEN, positions, [null, null], [])
  check('no analysis yields no plies', none.plies.length === 0)
}

// classification unit tests
check('a near-equal non-best move is a best attempt',
  classifyLoss(15, {}) === 'bestAttempt')
check('a tiny loss is not flagged as an attempt',
  classifyLoss(4, {}) === 'best')
check('the engine move is best', classifyLoss(0, { bestMatch: true }) === 'best')
check('a forced sacrifice is brilliant', classifyLoss(10, { forced: true, sacrifice: 'exchange' }) === 'brilliant')
check('book wins over an inaccuracy', classifyLoss(150, { book: true }) === 'book')
check('missed mate is a blunder', classifyLoss(700, { missedMate: true }) === 'blunder')
check('missed win is its own class', classifyLoss(400, { missedWin: true }) === 'missedWin')
check('a time-troubled blunder becomes time loss', classifyLoss(900, { timeTrouble: true }) === 'timeLoss')
check('thresholds escalate in order',
  classifyLoss(40, {}) === 'excellent' &&
  classifyLoss(100, {}) === 'good' &&
  classifyLoss(200, {}) === 'inaccuracy' &&
  classifyLoss(300, {}) === 'mistake' &&
  classifyLoss(500, {}) === 'blunder')

// probability model
check('equal position is mostly a draw', (() => {
  const p = outcomeProbs(0)
  return p.draw > 0.7 && p.win === p.loss
})())
check('a big advantage is mostly a win', (() => {
  const p = outcomeProbs(900)
  return p.win > 0.85 && p.loss < 0.1
})())
check('probabilities always sum to 1', [0, 100, -100, 1500, -1500, 99999].every(cp => {
  const p = outcomeProbs(cp)
  return Math.abs(p.win + p.draw + p.loss - 1) < 1e-6
}))
check('accuracy is 100 for no loss and drops with loss',
  accuracyFromDrop(0) > 99 && accuracyFromDrop(20) < accuracyFromDrop(5) && accuracyFromDrop(400) < 5)
check('winPct is 50 at zero', Math.abs(winPct(0) - 50) < 1e-9)

// opening identification
check('central cannon recognised', identifyOpening(['h2e2']).nameEn.includes('Central Cannon') ||
  identifyOpening(['h2e2']).nameEn.includes('Screen Horses'), identifyOpening(['h2e2']).nameEn)
check('unknown openings fall back', identifyOpening(['b2b6', 'e3e4', 'a0a1']).fallback === true,
  identifyOpening(['b2b6', 'e3e4', 'a0a1']).nameEn)
check('empty game is the start position', identifyOpening([]).nameZh.length > 0)
check('opening presets replay legally from the start position', OPENING_CHOICES.every(o => {
  const r = replay(START_FEN, o.moves)
  if (r.truncated) console.log('   bad preset ' + o.id + ': ' + o.moves.join(' '))
  return !r.truncated
}))
check('opening presets are single Red moves', OPENING_CHOICES.every(o => o.moves.length <= 1))

// helpers
check('material counting works', materialOf(parseFen(START_FEN).bd) > 3000)
check('phase detection splits opening and endgame',
  phaseOf(0, parseFen(START_FEN).bd) === 'opening' &&
  phaseOf(10, parseFen('4k4/9/9/9/9/9/9/9/9/4K4').bd) === 'endgame')
check('eval formatting handles mates and centipawns',
  formatEval(150, 0) === '+1.50' && formatEval(-80, 0) === '-0.80' &&
  formatEval(0, 3) === '#3' && formatEval(0, -2) === '-#2')
check('short eval is compact', shortEval(150, 0) === '+1.5' && shortEval(0, 1) === '#1')
check('clock formatting clamps negatives', formatClock(-10) === '0:00')

// neutral classes should never be counted as problems
check('neutral classes are the good ones',
  [...NEUTRAL_CLASSES].every(c => ['brilliant', 'great', 'best', 'bestAttempt', 'excellent', 'good', 'book'].includes(c)))

void sideInCheck
void replay
void explainMove

process.exit(failures ? 1 : 0)
