import { parseFen, legalMoves, iccsToSq, sqToIccs } from '../src/engine/board.js'
import { analyzePosition } from '../src/engine/search.js'
import { CURATED, validatePuzzle, isSolution } from '../src/game/puzzles.js'
import { buildPuzzlePool, mergePools, emptyProgress, gradeAttempt, getProgress } from '../src/game/puzzles.js'

let failures = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`PASS ${name} ${extra}`)
  else { console.log(`FAIL ${name} ${extra}`); failures++ }
}

// A tiny in-memory localStorage so the grading logic can be tested in node.
const store = new Map()
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
}

for (const p of CURATED) {
  const st = parseFen(p.fen)
  const legal = new Set(legalMoves(st.bd, st.turn).map(m => sqToIccs(m >> 8) + sqToIccs(m & 255)))

  const turnOk = st.turn === p.side
  const allLegal = p.solution.every(s => legal.has(s))
  const distinct = new Set(p.solution).size === p.solution.length

  // The engine must agree that at least one listed solution is best.
  const r = analyzePosition(p.fen, [], 10, 2500, { lines: 4 })
  const engineBest = r.bestFrom >= 0 ? sqToIccs(r.bestFrom) + sqToIccs(r.bestTo) : null
  const bestAmongLines = r.lines.some(l => p.solution.includes(l.iccs))
  const isMate = Math.abs(r.mateIn) === 1

  check(`puzzle ${p.id} data is consistent`, turnOk && allLegal && distinct && p.rating > 0,
    `side=${p.side} solutions=${p.solution.length} legal=${legal.size}`)
  check(`puzzle ${p.id} solution is engine-optimal`,
    bestAmongLines || (isMate && p.solution.includes(engineBest)),
    `best=${engineBest} mateIn=${r.mateIn} listed=${p.solution.join('/')}`)
}

// validatePuzzle accepts good data and rejects corrupt data
{
  const good = CURATED[0]
  check('validatePuzzle accepts valid data', validatePuzzle(good) != null)
  check('validatePuzzle rejects wrong side to move',
    validatePuzzle({ ...good, side: good.side ^ 1 }) == null)
  check('validatePuzzle rejects illegal solution',
    validatePuzzle({ ...good, solution: ['a0a1', 'b0b1'] }) == null)
  check('validatePuzzle rejects empty solutions',
    validatePuzzle({ ...good, solution: [] }) == null)
  check('validatePuzzle rejects garbage fen',
    validatePuzzle({ ...good, fen: 'not-a-fen' }) == null)
}

// pool ordering
{
  const pool = buildPuzzlePool(emptyProgress())
  check('pool contains every curated puzzle', pool.length === CURATED.length, `${pool.length}`)
  const solvedFirst = buildPuzzlePool({ ...emptyProgress(), solved: { [pool[0].id]: { box: 3, last: Date.now() } } })
  check('solved puzzles are not first in the queue', solvedFirst[0].id !== pool[0].id || pool.length === 1)
  const merged = mergePools(pool, [{ id: 'zz', fen: CURATED[0].fen, side: CURATED[0].side, solution: CURATED[0].solution, rating: 900 }], emptyProgress())
  check('mergePools adds game puzzles without duplicates', merged.length === pool.length + 1, `${merged.length}`)
}

// rating movement
{
  const p = CURATED[2] // rating 700
  const before = emptyProgress()
  const win = gradeAttempt(before, p, true)
  check('solving an easier puzzle raises the rating', win.progress.rating > before.rating,
    `${before.rating} -> ${win.progress.rating} (delta ${win.delta})`)
  check('solving increases the streak', win.progress.streak === 1 && win.progress.bestStreak === 1)
  const lose = gradeAttempt(win.progress, p, false)
  check('failing lowers the rating and resets the streak',
    lose.progress.rating < win.progress.rating && lose.progress.streak === 0,
    `${win.progress.rating} -> ${lose.progress.rating}`)
  check('a miss is remembered', !!lose.progress.missed[p.id])
  check('progress round-trips through storage', getProgress().rating === lose.progress.rating)
}

check('isSolution matches listed moves only', isSolution(CURATED[0], CURATED[0].solution[0]) && !isSolution(CURATED[0], 'a0a1'))

process.exit(failures ? 1 : 0)