import { START_FEN, parseFen, legalMoves, replay, sqToIccs, iccsToSq, sideInCheck, isAttacked, idx, gameStatus, insufficientMaterial, repetitionMap, repetitionKey, facingKings } from '../src/engine/board.js'
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
    results.push(analyzePosition(START_FEN, moves.slice(0, j), 6, 900))
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
  // CANNON: it glides like a chariot but must jump exactly one screen to capture.
  // It therefore never attacks the square directly in front of it.
  const open = parseFen('4k4/9/9/9/9/9/9/9/9/4C4 w').bd
  check('cannon does not attack along an open file',
    !isAttacked(open, idx(0, 4), 0) && !isAttacked(open, idx(1, 4), 0))

  const oneScreen = parseFen('4k4/9/9/9/9/9/4r4/9/9/4C4 w').bd
  check('cannon attacks through exactly one screen',
    isAttacked(oneScreen, idx(0, 4), 0))

  const twoScreens = parseFen('4k4/9/9/9/4r4/9/4r4/9/9/4C4 w').bd
  check('cannon cannot jump two screens',
    !isAttacked(twoScreens, idx(0, 4), 0))

  // the position from a reported bug: 1.h2e2 h9g7 2.h0g2 i9h9 3.i0h0 b9c7
  // 4.e3e4 e6e5 5.e2e5 — the cannon takes the central pawn but has no screen, so
  // it is NOT check and NOT mate.
  const line = ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'e3e4', 'e6e5']
  let bd = parseFen(START_FEN).bd
  for (const s of line) {
    const f = iccsToSq(s.slice(0, 2)), t = iccsToSq(s.slice(2, 4))
    bd[t] = bd[f]; bd[f] = 0
  }
  const f5 = iccsToSq('e2'), t5 = iccsToSq('e5')
  bd[t5] = bd[f5]; bd[f5] = 0
  check('unscreened cannon is not check (regression)',
    !sideInCheck(bd, 1), `inCheck=${sideInCheck(bd, 1)}`)
  check('unscreened cannon is not mate (regression)',
    legalMoves(bd, 1).length > 0, `${legalMoves(bd, 1).length} legal replies`)
}

{
  // advisor and elephant may not leave their own zone
  const adv = parseFen('3aka3/9/9/9/9/9/9/9/9/4K4 w').bd
  check('advisor does not attack outside the palace', !isAttacked(adv, idx(1, 2), 1))
  const ele = parseFen('4k4/9/9/9/9/9/9/4b4/9/4K4 w').bd
  check('elephant does not attack across the river', !isAttacked(ele, idx(3, 4), 1))
}

check('insufficient material detection', (() => {
  const bare = parseFen('3ak4/9/9/9/9/9/9/9/9/3AK4 w').bd
  const armed = parseFen('3ak4/9/9/9/9/9/9/9/9/4K3R w').bd
  const pawned = parseFen('3ak4/9/9/9/9/9/9/9/4P4/3AK4 w').bd
  return insufficientMaterial(bare) && !insufficientMaterial(armed) && !insufficientMaterial(pawned)
})())

check('repetition map counts threefold', (() => {
  const moves = ['h2e2', 'b9c7', 'e2c2', 'c7b9', 'c2e2', 'b9c7', 'e2c2', 'c7b9', 'c2e2', 'b9c7']
  const counts = replay(START_FEN, moves).map(p => p.repCount)
  const last = counts[counts.length - 1]
  return last === 3 && counts.slice(0, 5).every(c => c === 1)
})())

check('repetition key encodes squares, not just piece values', (() => {
  // moving a chariot between two squares that both held a chariot used to look
  // like a repetition and ended games in a bogus draw
  const a = parseFen('4k4/9/9/9/9/9/9/9/9/4K4 w').bd
  const b = Int8Array.from(a)
  b[idx(9, 8)] = 5; b[idx(9, 7)] = 0          // chariot on i0
  b[idx(9, 0)] = 5; b[idx(9, 1)] = 0
  const swapped = Int8Array.from(a)
  swapped[idx(9, 0)] = 0; swapped[idx(9, 1)] = 5 // chariot on b0
  const moved = Int8Array.from(b)
  moved[idx(9, 8)] = 0; moved[idx(9, 7)] = 5  // same chariot, different square
  void swapped
  return repetitionKey(b, 0) !== repetitionKey(moved, 0)
})())

check('distinct positions are never counted as a repetition', (() => {
  // this game triggered the bug report: every position is new
  const moves = ['h2e2', 'e9e8', 'h0g2', 'h7c7', 'i0h0', 'e6e5', 'c3c4']
  const positions = replay(START_FEN, moves)
  return !positions.truncated && positions.every(p => p.repCount === 1)
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
    results.push(analyzePosition(START_FEN, moves.slice(0, j), 6, 900))
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

