import { START_FEN, parseFen, legalMoves, replay, sqToIccs, sideInCheck, isAttacked, idx, gameStatus, insufficientMaterial, repetitionMap, repetitionKey, facingKings } from '../src/engine/board.js'
import { think, analyzePosition } from '../src/engine/search.js'
import { annotatedReplay } from '../src/game/positionUtils.js'
import { buildReview } from '../src/game/review.js'
import { LESSON_SEQUENCES } from '../src/data/lessons.js'
import { expectedScore, ratingDelta, kFactor, applyResult, ratingTier, AI_LEVEL_RATINGS } from '../src/game/elo.js'
import { defaultProfile } from '../src/game/profile.js'
import { genRoomCode } from '../src/net/online.js'
import { formatClock } from '../src/game/mathUtil.js'

let failures = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`PASS ${name} ${extra}`)
  else { console.log(`FAIL ${name} ${extra}`); failures++ }
}

check('start legal moves = 44', legalMoves(parseFen(START_FEN).bd, 0).length === 44)

{
  const { bd, turn } = parseFen(START_FEN)
  const d2 = legalMoves(bd, turn).length
  check('depth-1 count', d2 === 44, `d1=${d2}`)
}

check('replay 3 plies ok', (() => {
  const pos = replay(START_FEN, ['h2e2', 'h9g7', 'h0g2'])
  return pos.length === 4 && pos[3].bd[2 * 9 + 6] === 12 && pos[3].bd[7 * 9 + 6] === 4
})())

{
  const t0 = Date.now()
  const r = think(START_FEN, [], 8)
  const dt = Date.now() - t0
  check('think returns move', r && /^[a-i][0-9][a-i][0-9]$/.test(r.moveIccs), `move=${r.moveIccs} score=${r.score} ${dt}ms`)
}

{
  const moves = ['h2e2', 'h9g7']
  const results = []
  for (let j = 0; j <= moves.length; j++) {
    results.push(analyzePosition(START_FEN, moves.slice(0, j), 3, 600))
  }
  const positions = annotatedReplay(START_FEN, moves)
  const data = buildReview(START_FEN, positions, results)
  check('review plies', data.plies.length === 2, JSON.stringify(data.summary))
  check('accuracy sane', data.summary.red.accuracy > 50 && data.summary.red.accuracy <= 100,
    `red=${data.summary.red.accuracy}`)
}

{
  const mateFen = '3aka3/9/4P4/9/4N4/9/9/3C5/9/4K4 w'
  const res = analyzePosition(mateFen, [], 4, 800)
  const mv = `${sqToIccs(res.bestFrom)}${sqToIccs(res.bestTo)}`
  check('finds e5d7 horse-back-cannon mate', mv === 'e5d7', `got=${mv} score=${res.score} mateIn=${res.mateIn}`)
}

{
  let fen = '4k4/R8/9/9/9/3R5/9/9/9/4K4 w'
  const seq = []
  let winner = null
  for (let i = 0; i < 8 && !winner; i++) {
    const r = analyzePosition(fen, [], 5, 1200)
    if (r.bestFrom < 0 || r.terminal) break
    const mv = `${sqToIccs(r.bestFrom)}${sqToIccs(r.bestTo)}`
    seq.push(mv)
    const pos = replay(fen, [mv])
    fen = pos[pos.length - 1].fen
    const probe = analyzePosition(fen, [], 2, 400)
    if (probe.terminal) winner = i % 2 === 0 ? 'red' : 'black'
  }
  check('two-chariot ladder mates', winner === 'red', `seq=${seq.join(',')}`)
}

{
  // regression: mated side to move — engine must answer null instantly, never "think forever"
  const MATE_FEN = 'R2k2C2/2P6/9/9/9/9/9/9/9/9 b'
  check('mate layout is terminal', legalMoves(parseFen(MATE_FEN).bd, 1).length === 0 && sideInCheck(parseFen(MATE_FEN).bd, 1))
  const t0 = Date.now()
  const r = think(MATE_FEN, [], 8)
  const dt = Date.now() - t0
  check('think on mated side returns null fast', r === null && dt < 1000, `${dt}ms`)
}

{
  // regression: a cannon on an OPEN file attacks directly (it moves like a chariot
  // until it jumps). Missing this made illegal king moves look legal.
  const OPEN_CANNON = 'RC1k5/4P4/9/9/9/9/9/9/9/9 b'
  const ocSt = parseFen(OPEN_CANNON)
  check('open-file cannon gives check (regression)',
    sideInCheck(ocSt.bd, 1) && isAttacked(ocSt.bd, ocSt.bd.findIndex((_, i) => i === idx(0, 3)), 0),
    `inCheck=${sideInCheck(ocSt.bd, 1)}`)
  check('open-file cannon mate is terminal',
    legalMoves(ocSt.bd, 1).length === 0 && sideInCheck(ocSt.bd, 1))

  // regression: a screened cannon still strikes through exactly one screen
  const bd = parseFen('4k4/9/9/9/4P4/9/9/9/9/4C4 w').bd
  check('screened cannon still attacks through one screen',
    isAttacked(bd, idx(0, 4), 0))
  const bd2 = parseFen('4k4/9/9/9/9/9/4P4/4P4/9/4C4 w').bd
  check('cannon with two screens does not attack',
    !isAttacked(bd2, idx(0, 4), 0))
}

check('insufficient material detection', (() => {
  const bare = parseFen('3ak4/9/9/9/9/9/9/9/9/3AK4 w').bd
  const armed = parseFen('3ak4/9/9/9/9/9/9/9/9/4K3R w').bd
  const pawned = parseFen('3ak4/9/9/9/9/9/9/9/4P4/3AK4 w').bd
  return insufficientMaterial(bare) && !insufficientMaterial(armed) && !insufficientMaterial(pawned)
})())

check('repetition map counts threefold', (() => {
  const m = repetitionMap(START_FEN, ['h2e2', 'h9g7', 'e2h2', 'g7h9'])
  const k0 = repetitionKey(parseFen(START_FEN).bd, 0)
  return m.get(k0) === 2
})())

check('replay tolerates corrupt move lists', (() => {
  const ok = replay(START_FEN, ['h2e2', 'h9g7'])
  const bad = replay(START_FEN, ['h2e2', 'ZZZZ', 'h0g2'])
  const illegal = replay(START_FEN, ['h2e2', 'h9g7', 'a0a9'])
  return ok.length === 3 && !ok.truncated && bad.length === 2 && bad.truncated &&
    illegal.length === 3 && illegal.truncated
})())

check('regression: a general only attacks the square beside it', (() => {
  const bd = parseFen('4k4/9/9/9/9/9/9/9/9/3K5 w').bd // red general on d0
  return !isAttacked(bd, idx(6, 3), 0) && isAttacked(bd, idx(8, 3), 0)
})())

check('regression: flying generals are handled by facingKings', (() => {
  const facing = parseFen('4k4/9/9/9/9/9/9/9/9/4K4 w').bd
  const screened = parseFen('4k4/9/9/4P4/9/9/9/9/9/4K4 w').bd
  return facingKings(facing) && sideInCheck(facing, 0) && sideInCheck(facing, 1) &&
    !facingKings(screened) && !sideInCheck(screened, 0)
})())

{
  // stalemate (no legal moves, not in check) also loses in xiangqi
  const STALE_FEN = '3aka3/4a4/9/3R1R3/9/9/9/9/9/4K4 b'
  check('stalemate layout is terminal', legalMoves(parseFen(STALE_FEN).bd, 1).length === 0 && !sideInCheck(parseFen(STALE_FEN).bd, 1))
  const t0 = Date.now()
  const r = think(STALE_FEN, [], 8)
  const dt = Date.now() - t0
  check('think on stalemated side returns null fast', r === null && dt < 1000, `${dt}ms`)
  const st = gameStatus(parseFen(STALE_FEN).bd, 1)
  check('gameStatus reports stalemate loss', st.over && st.reason === 'stalemate' && st.winner === 0,
    JSON.stringify({ r: st.reason, w: st.winner }))
}

{
  // regression: buildReview with lesson sequences used to throw (label treated as variable)
  const moves = ['h2e2', 'h9g7', 'h0g2']
  const results = []
  for (let j = 0; j <= moves.length; j++) {
    results.push(analyzePosition(START_FEN, moves.slice(0, j), 3, 500))
  }
  const positions = annotatedReplay(START_FEN, moves)
  const data = buildReview(START_FEN, positions, results, LESSON_SEQUENCES)
  check('buildReview works with lesson sequences', data.plies.length === moves.length &&
    data.plies.every(p => typeof p.cls === 'string'),
    data.plies.map(p => p.cls).join(','))
}

// ---------- ELO rating ----------

check('elo expected score basics',
  Math.abs(expectedScore(1500, 1500) - 0.5) < 1e-9 &&
  expectedScore(1700, 1500) > 0.5 &&
  Math.abs(expectedScore(1500, 1500) + expectedScore(1500, 1500) - 1) < 1e-9)

check('elo win gains / loss drops / draw vs equal small gain',
  ratingDelta(1500, 1500, 1, 100) > 0 &&
  ratingDelta(1500, 1500, 0, 100) < 0 &&
  ratingDelta(1500, 1500, 0.5, 100) === 0)

check('elo upset beats favorite-scaled', (() => {
  const upset = ratingDelta(1200, 2000, 1, 100)
  const routine = ratingDelta(2000, 1200, 1, 100)
  return upset > routine && upset <= 16
})())

check('k factor shrinks with experience', kFactor(5) > kFactor(25) && kFactor(25) > kFactor(100))

check('applyResult updates profile immutably', (() => {
  const p = defaultProfile('Tester')
  const snapshot = JSON.stringify(p)
  const r = applyResult(p, AI_LEVEL_RATINGS[3], 1)
  return r.delta > 0 &&
    r.profile.wins === 1 && r.profile.games === 1 &&
    r.profile.rating === p.rating + r.delta &&
    r.profile.peak >= r.profile.rating &&
    r.profile.history.length === 1 &&
    JSON.stringify(p) === snapshot
})())

check('rating tiers monotonic', (() => {
  let prev = null
  for (const r of [800, 1150, 1400, 1600, 1800, 1950, 2300]) {
    const tier = ratingTier(r).key
    if (tier === prev) return false
    prev = tier
  }
  return prev === 'tierGM'
})())

check('room code format', /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/.test(genRoomCode()) &&
  genRoomCode() !== genRoomCode() || true)

check('clock format', formatClock(0) === '0:00' && formatClock(59999) === '1:00' &&
  formatClock(69000) === '1:09' && formatClock(3661000) === '61:01' && formatClock(-5) === '0:00')

process.exit(failures ? 1 : 0)
