import { parseFen, findLegalMove, replay, sideInCheck, legalMoves } from '../src/engine/board.js'
import { ALL_LESSONS, STRATEGY_ARTICLES } from '../src/data/lessons.js'

let failures = 0
const fail = msg => { console.log('FAIL ' + msg); failures++ }

function verifyLine(name, fen, moves) {
  const st = parseFen(fen)
  let bd = st.bd
  let turn = st.turn
  for (let i = 0; i < moves.length; i++) {
    const s = moves[i]
    const from = s.charCodeAt(0) - 97 + (9 - (s.charCodeAt(1) - 48)) * 9
    const to = s.charCodeAt(2) - 97 + (9 - (s.charCodeAt(3) - 48)) * 9
    const mv = findLegalMove(bd, turn, from, to)
    if (!mv) { fail(`${name}: move ${i} ${s} ILLEGAL`); return false }
    const capIdx = to
    bd[capIdx] = bd[from]
    bd[from] = 0
    turn ^= 1
    void capIdx
  }
  return { bd, turn }
}

for (const l of ALL_LESSONS) {
  const ok = verifyLine(`lesson ${l.id}`, l.fen, l.moves)
  if (!ok) continue

  const lastColorMovesRed = l.moves.length % 2 === 1 ? 0 : 1
  if (l.cat === 'endgame' && !['e4', 'e5', 'e8'].includes(l.id)) {
    const pos = replay(l.fen, l.moves)
    const finalPos = pos[pos.length - 1]
    const nLegal = legalMoves(finalPos.bd, finalPos.turn).length
    const inChk = sideInCheck(finalPos.bd, finalPos.turn)
    if (!(nLegal === 0 && inChk && finalPos.turn !== lastColorMovesRed + 0)) {
      console.log(`note ${l.id}: terminal=${nLegal === 0} chk=${inChk} mover=${lastColorMovesRed}`)
      if (!(nLegal === 0 && inChk)) fail(`lesson ${l.id}: solution is not checkmate`)
    } else console.log(`PASS lesson ${l.id} solution mates`)
  }
  if (l.cat === 'endgame' && l.id === 'e4') {
    const pos = replay(l.fen, l.moves)
    const finalPos = pos[pos.length - 1]
    const nLegal = legalMoves(finalPos.bd, finalPos.turn).length
    const inChk = sideInCheck(finalPos.bd, finalPos.turn)
    if (nLegal === 0 && inChk) console.log('PASS lesson e4 ladder mates')
    else fail(`lesson e4 not mate: legal=${nLegal} chk=${inChk}`)
  }
  if (l.cat === 'endgame' && l.id === 'e8') {
    // suffocation win: side to move has NO legal moves and is NOT in check
    const pos = replay(l.fen, l.moves)
    const finalPos = pos[pos.length - 1]
    const nLegal = legalMoves(finalPos.bd, finalPos.turn).length
    const inChk = sideInCheck(finalPos.bd, finalPos.turn)
    if (nLegal === 0 && !inChk) console.log('PASS lesson e8 suffocation (stalemate loss)')
    else fail(`lesson e8 not stalemate: legal=${nLegal} chk=${inChk}`)
  }
  if (l.cat === 'endgame' && l.moves.length === 1 && !['e5', 'e8'].includes(l.id)) {
    // guard: one-move mate puzzles — the intended shot must really mate (multiple mates are OK)
    const st = parseFen(l.fen)
    const mates = []
    for (const mv of legalMoves(st.bd, st.turn)) {
      const from = mv >> 8, to = mv & 255
      const cap = st.bd[to]
      st.bd[to] = st.bd[from]
      st.bd[from] = 0
      const done = legalMoves(st.bd, st.turn ^ 1).length === 0 && sideInCheck(st.bd, st.turn ^ 1)
      st.bd[from] = st.bd[to]
      st.bd[to] = cap
      if (done) mates.push(sqName(from) + sqName(to))
    }
    if (mates.length >= 1 && mates.includes(l.moves[0])) console.log(`PASS lesson ${l.id} solution mates (${mates.length} mating move(s))`)
    else fail(`lesson ${l.id}: intended ${l.moves[0]} not among mating moves [${mates.join(',')}]`)
  }
}

function sqName(q) {
  return String.fromCharCode(97 + q % 9) + String.fromCharCode(48 + 9 - ((q / 9) | 0))
}

{
  const e5 = ALL_LESSONS.find(x => x.id === 'e5')
  const pos = replay(e5.fen, e5.moves)
  const p = pos[pos.length - 1]
  const knightSq = p.lastTo
  const r = (knightSq / 9) | 0, c = knightSq % 9
  const deltas = [[-2, -1], [-2, 1], [2, -1], [2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2]]
  const targets = deltas
    .map(([dr, dc]) => [r + dr, c + dc])
    .filter(([rr, cc]) => rr >= 0 && rr < 10 && cc >= 0 && cc < 9)
    .map(([rr, cc]) => rr * 9 + cc)
  let kingSq = -1, rookSq = -1
  for (let i = 0; i < 90; i++) {
    if (p.bd[i] === 9) kingSq = i
    if (p.bd[i] === 13) rookSq = i
  }
  const hitsKing = targets.includes(kingSq)
  const hitsRook = targets.includes(rookSq)
  if (hitsKing && hitsRook) console.log('PASS lesson e5 fork hits king+rook')
  else fail(`lesson e5 fork broken: king=${hitsKing} rook=${hitsRook}`)
}

for (const a of STRATEGY_ARTICLES) {
  for (const b of a.blocks) {
    if (b.type === 'diagram' && b.solutionMoves) verifyLine(`diagram ${a.id}`, b.fen, b.solutionMoves)
  }
}

process.exit(failures ? 1 : 0)
