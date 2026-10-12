import { RED, BLACK, parseFen, legalMoves, iccsToSq } from '../engine/board.js'

const KEY = 'xqm_puzzles'

function writeDb(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {}
}

export function emptyProgress() {
  return {
    rating: 800,
    streak: 0,
    bestStreak: 0,
    solved: {},
    missed: {},
    seen: 0,
    correct: 0,
    lastIds: [],
    history: []
  }
}

export function getProgress() {
  const db = readDb()
  const base = emptyProgress()
  if (!db) return base
  return { ...base, ...db, solved: db.solved || {}, missed: db.missed || {}, lastIds: db.lastIds || [] }
}

// ---------------------------------------------------------------------------
// Curated puzzles. `fen` + `moves` describe the position; `solution` holds the
// acceptable first moves (ICCS). `lines` are the opponent replies that continue
// the combination. `rating` is the difficulty used for the trainer ladder.
// ---------------------------------------------------------------------------

/**
 * Curated puzzle set.
 *
 * Every `fen` / `side` / `solution` triple here is verified by
 * `tests/verify-puzzles.mjs`, which replays each position, checks that the
 * solutions are legal and asks the engine to confirm they are the best moves.
 * `rating` is the trainer ladder difficulty.
 */
const CURATED = [
  {
    id: 'p01',
    rating: 600,
    pattern: 'mateIn1',
    fen: '3aka3/9/4P4/9/4N4/9/9/3C5/9/4K4 w',
    side: 0,
    solution: ['e5d7', 'e5f7'],
    titleEn: 'Horse-back Cannon (馬後炮)',
    titleZh: '馬後炮',
    hintEn: 'The checking cannon has no screen. Step the horse in front of it.',
    hintZh: '將軍的炮沒有炮架——把馬跳到炮的前面當炮架。'
  },
  {
id: 'p02',
    rating: 650,
    pattern: 'mateIn1',
    fen: '3aka3/4C4/9/3N1N3/9/9/6C2/9/9/4K4 w',
    side: 0,
    solution: ['d6c8', 'd6f7', 'f6g8', 'f6d7'],
    titleEn: 'Cannon and horses seal the palace (炮馬封宮)',
    titleZh: '炮馬封宮',
    hintEn: 'The cannon alone cannot mate. Step a horse so that the cannon checks while the horses cover every flight square.',
    hintZh: '單炮無法成殺——跳馬讓炮將軍，再用馬守住所有退路。'
  },
  {
    id: 'p03',
    rating: 700,
    pattern: 'mateIn1',
    fen: '3ak4/9/4R4/9/9/9/9/4R4/9/4K4 w',
    side: 0,
    solution: ['e7e9'],
    titleEn: 'Two Chariots (雙車錯)',
    titleZh: '雙車錯',
    hintEn: 'One chariot is already on the general\u2019s file. Stack the other on top of it.',
    hintZh: '一隻車已在老將的直線上，把另一隻也疊上去。'
  },
  {
    id: 'p04',
    rating: 750,
    pattern: 'mateIn1',
    fen: '3aka3/4p4/8p/9/9/9/9/9/9/C2K5 w',
    side: 0,
    solution: ['a0a9'],
    titleEn: 'Smothered Palace (悶宮)',
    titleZh: '悶宮',
    hintEn: 'The king\u2019s own advisors lock the palace. Knock from the far corner.',
    hintZh: '敵將的士已把九宮鎖死——從最遠的角落敲過去。'
  },
  {
    id: 'p05',
    rating: 800,
    pattern: 'mateIn1',
    fen: '4k4/9/4N4/4C4/9/9/9/9/9/4K4 w',
    side: 0,
    solution: ['e6e9', 'e6e5', 'e6e4', 'e6e3', 'e6e2'],
    titleEn: 'Horse screens the cannon on the palace file',
    titleZh: '馬炮同線',
    hintEn: 'Put your horse between the cannon and the enemy general.',
    hintZh: '把馬放到炮與敵將之間——同一條線上就成殺。'
  },
  {
    id: 'p06',
    rating: 850,
    pattern: 'mateIn1',
    fen: '4k4/3P1P3/9/R8/9/9/9/9/9/3K6 w',
    side: 0,
    solution: ['a6e6', 'd8d9', 'd8e8', 'a6a9'],
    titleEn: 'Two Ghosts at the Door (二鬼拍門)',
    titleZh: '二鬼拍門',
    hintEn: 'The fourth and sixth pawns have done their job. Now knock on the back rank.',
    hintZh: '四六路雙兵已把九宮鎖死——只差底線上敲門。'
  },
  {
    id: 'p07',
    rating: 900,
    pattern: 'mateIn1',
    fen: '4k4/9/9/4P4/9/3R1R3/9/9/9/4K4 w',
    side: 0,
    solution: ['e6e7'],
    titleEn: 'Suffocation (困斃)',
    titleZh: '困斃',
    hintEn: 'Count the enemy general\u2019s legal moves — exactly one is left. Close it quietly, without check.',
    hintZh: '數一數敵將的著法——只剩一格。不用將軍，安靜地封住它。'
  },
  {
    id: 'p08',
    rating: 950,
    pattern: 'mateIn1',
    fen: '3nk4/4a4/6N2/4R4/9/R8/9/9/9/3K6 w',
    side: 0,
    solution: ['e6e8', 'g7e8', 'a4f4'],
    titleEn: 'Mate in one — the king has no flight',
    titleZh: '一步殺——老將已無退路',
    hintEn: 'The enemy horse blocks one flight square. Take the others.',
    hintZh: '敵馬已堵住一格退路，把剩下的退路全封死。'
  },
  {
    id: 'p09',
    rating: 1100,
    pattern: 'mateIn2',
    fen: '4k4/9/9/9/9/9/9/9/4C4/4K4 w',
    side: 0,
    solution: ['e1e2', 'e1e6', 'e1e5', 'e1e4', 'e1e3'],
    titleEn: 'Single cannon vs bare general',
    titleZh: '單炮勝Bare將',
    hintEn: 'A lone general has no escape squares at all. Walk the cannon up the file.',
    hintZh: '光杆老將毫無退路——把炮沿著中線一步步推上去。'
  },
  {
    id: 'p10',
    rating: 1200,
    pattern: 'mateIn2',
    fen: '4k4/9/9/9/9/9/9/3R5/3R5/4K4 w',
    side: 0,
    solution: ['d2e2', 'd1e1'],
    titleEn: 'Chariot ladder (車梯)',
    titleZh: '車梯殺',
    hintEn: 'Both chariots must share a file to squeeze the general.',
    hintZh: '兩隻車必須疊在同一條直線上才能把老將擠死。'
  },
  {
    id: 'p11',
    rating: 1250,
    pattern: 'mateIn2',
    fen: '3ak4/9/9/9/9/9/4C4/9/9/3AKAB2 w',
    side: 0,
    solution: ['e3e6', 'e3e2', 'e3e5', 'e3e4', 'e3e1'],
    titleEn: 'Cannon pins the palace centre',
    titleZh: '炮鎮九宮',
    hintEn: 'Occupy the middle file of the palace so the general can never step down.',
    hintZh: '佔住九宮中線，讓老將永遠下不來。'
  },
  {
    id: 'p12',
    rating: 1350,
    pattern: 'mateIn3',
    fen: '4k4/R8/2bP1Pb2/9/9/3R5/9/4P4/9/4K4 w',
    side: 0,
    solution: ['d4e4', 'd4b4', 'd4h4'],
    titleEn: 'Ladder through a barricade',
    titleZh: '車梯破 barricade',
    hintEn: 'The defenders have blocked the files — find the file that is still open.',
    hintZh: '防守方已封住多條直線——找出一條仍然通暢的。'
  },
  {
    id: 'p13',
    rating: 1150,
    pattern: 'fork',
    fen: '4k1r2/9/9/3N5/4p4/9/9/9/9/4K4 w',
    side: 0,
    solution: ['d6f7'],
    titleEn: 'Horse fork (馬叉)',
    titleZh: '馬叉',
    hintEn: 'Find the square where one horse strikes the king and a chariot at once.',
    hintZh: '找那個一隻馬同時攻擊老將和車的格子。'
  },
  {
    id: 'p14',
    rating: 1250,
    pattern: 'mateIn1',
    fen: '3aka3/9/4P4/9/6N2/9/5C3/9/9/4K4 w',
    side: 0,
    solution: ['g5f7'],
    titleEn: 'Screen the cannon from the horse line',
    titleZh: '馬後墊炮',
    hintEn: 'The cannon can only check if something stands in front of it.',
    hintZh: '炮要將軍，前面必須有東西墊著。'
  }
]

function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  return h.toString(36)
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const MINE_KEY = 'xqm_mypuzzles'
const MAX_MINED = 200

function readDb() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!raw || typeof raw !== 'object') return null
    return raw
  } catch {
    return null
  }
}

function save(p) {
  writeDb(p)
  return p
}

/** Puzzles harvested from the player's own reviewed games. */
export function readMined() {
  try {
    const raw = JSON.parse(localStorage.getItem(MINE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function minedCount() {
  return readMined().length
}

/**
 * Turn a finished review into puzzles, merging with whatever was harvested
 * before. Called by the review page so mistakes become drills automatically.
 */
export function harvestPuzzles(game, positions, review) {
  if (!game || !review || !positions) return 0
  const mined = readMined()
  const byId = new Map(mined.map(p => [p.id, p]))
  let added = 0

  for (const p of review.plies) {
    if (!['blunder', 'mistake', 'missedWin', 'missedDraw', 'inaccuracy'].includes(p.cls)) continue
    if (!p.bestIccs) continue
    const pos = positions[p.plyIndex]
    if (!pos) continue
    const fen = pos.fen
    const id = 'g' + hash(fen + '|' + p.bestIccs)
    if (byId.has(id)) continue
    const candidate = {
      id,
      source: 'game',
      rating: p.cls === 'blunder' ? 1500 : p.cls === 'mistake' ? 1150 : p.cls === 'missedWin' ? 1400 : 850,
      fen,
      side: pos.turn,
      solution: [p.bestIccs],
      lines: {},
      titleEn: `Move ${Math.floor(p.plyIndex / 2) + 1} — ${p.cls} vs ${game.oppName || 'AI'}`,
      titleZh: `第 ${Math.floor(p.plyIndex / 2) + 1} 手 — 對 ${game.oppName || 'AI'} 時的敗著`,
      hintEn: p.reason ? p.reason.en : 'The engine preferred a different move.',
      hintZh: p.reason ? p.reason.zh : '引擎認為有更好的著法。',
      fromGame: game.id,
      ts: game.ts || Date.now()
    }
    if (!validatePuzzle(candidate)) continue
    byId.set(id, candidate)
    added++
  }

  const merged = [...byId.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, MAX_MINED)
  try { localStorage.setItem(MINE_KEY, JSON.stringify(merged)) } catch {}
  return added
}

// ---------------------------------------------------------------------------
// Puzzle pool
// ---------------------------------------------------------------------------

/**
 * SM-2 flavoured spacing: a fresh puzzle is due immediately and each correct
 * answer pushes it further out (1, 2, 4, 8, 16 days).
 */
function nextDue(now, entry) {
  if (!entry) return 0
  const box = entry.box || 0
  const days = [0, 1, 2, 4, 8, 16][Math.min(5, box)]
  return (entry.last || 0) + days * 86400000
}

export function buildPuzzlePool(userProgress) {
  const solvedMap = (userProgress && userProgress.solved) || {}
  const missedMap = (userProgress && userProgress.missed) || {}
  const recent = new Set((userProgress && userProgress.lastIds) || [])
  const now = Date.now()
  const target = (userProgress && userProgress.rating) || 800

  return CURATED.map(p => {
    const solved = solvedMap[p.id]
    const missed = missedMap[p.id]
    return {
      ...p,
      source: 'curated',
      box: (solved && solved.box) || 0,
      missedCount: missed ? missed.count || 0 : 0,
      due: solved ? nextDue(now, solved) : 0,
      isNew: !solved && !missed
    }
  }).sort(byPriority(recent, target))
}

/** Unseen puzzles first, then whatever is due, then the rest � near your level. */
function byPriority(recent, target) {
  const now = Date.now()
  return (a, b) => {
    if (recent.has(a.id) !== recent.has(b.id)) return recent.has(a.id) ? 1 : -1
    const rank = p => (p.isNew ? 0 : p.due <= now ? 1 : 2)
    const d = rank(a) - rank(b)
    if (d) return d
    return Math.abs(a.rating - target) - Math.abs(b.rating - target)
  }
}

/** Curated + the player's own mined mistakes, ordered the same way. */
export function mergePools(curatedPool, gamePuzzles, progress) {
  const known = new Set(curatedPool.map(p => p.id))
  const now = Date.now()
  const extra = (gamePuzzles || [])
    .filter(p => !known.has(p.id))
    .map(p => {
      const solved = progress && progress.solved && progress.solved[p.id]
      const missed = progress && progress.missed && progress.missed[p.id]
      return {
        ...p,
        box: (solved && solved.box) || 0,
        isNew: !solved && !missed,
        due: solved ? nextDue(now, solved) : 0,
        missedCount: missed ? missed.count || 0 : 0
      }
    })
  const all = [...curatedPool, ...extra]
  const recent = new Set((progress && progress.lastIds) || [])
  return all.sort(byPriority(recent, (progress && progress.rating) || 800))
}

// ---------------------------------------------------------------------------
// Attempt grading (Glicko-lite, chess.com-like +/- on puzzles)
// ---------------------------------------------------------------------------

const K_PUZZLE = 26

export function gradeAttempt(progress, puzzle, solved) {
  const p = { ...progress, solved: { ...progress.solved }, missed: { ...progress.missed } }
  const prev = solved ? p.solved[puzzle.id] : p.missed[puzzle.id]

  const expected = 1 / (1 + Math.pow(10, (puzzle.rating - p.rating) / 400))
  const got = solved ? 1 : 0
  const delta = Math.round(K_PUZZLE * (got - expected))
  const streak = solved ? p.streak + 1 : 0

  if (solved) {
    const box = Math.min(5, ((prev && prev.box) || 0) + 1)
    p.solved[puzzle.id] = { box, last: Date.now(), times: ((prev && prev.times) || 0) + 1 }
  } else {
    p.missed[puzzle.id] = { count: ((prev && prev.count) || 0) + 1, last: Date.now() }
    if (prev) p.solved[puzzle.id] = { box: 0, last: 0, times: (prev.times || 0) + 1 }
  }

  const next = {
    ...p,
    rating: Math.max(100, p.rating + delta),
    streak,
    bestStreak: Math.max(p.bestStreak || 0, streak),
    seen: (p.seen || 0) + 1,
    correct: (p.correct || 0) + (solved ? 1 : 0),
    lastIds: [puzzle.id, ...(p.lastIds || []).filter(id => id !== puzzle.id)].slice(0, 6),
    history: [...(p.history || []), { ts: Date.now(), id: puzzle.id, ok: solved, rating: p.rating + delta }]
      .slice(-40)
  }
  return { progress: save(next), delta, streak }
}

// ---------------------------------------------------------------------------
// Position helpers for the trainer UI
// ---------------------------------------------------------------------------

/** After the player's correct move, which replies keep the puzzle alive? */
export function repliesFor(puzzle, playedIccs) {
  const replies = (puzzle.lines && puzzle.lines[playedIccs]) || []
  return replies
}

export function isSolution(puzzle, iccs) {
  return (puzzle.solution || []).includes(iccs)
}

/**
 * @param {string[]} lines a set of acceptable first moves (ICCS)
 * @returns {boolean} true when the stored puzzle is still legal
 */
export function validatePuzzle(puzzle) {
  if (!puzzle || typeof puzzle.fen !== 'string') return null
  let st
  try {
    st = parseFen(puzzle.fen)
  } catch {
    return null
  }
  if (st.turn !== puzzle.side) return null
  const solutions = puzzle.solution || []
  if (!solutions.length) return null
  for (const s of solutions) {
    const from = iccsToSq(s.slice(0, 2)), to = iccsToSq(s.slice(2, 4))
    if (from < 0 || from > 89 || to < 0 || to > 89) return null
    if (!legalMoves(st.bd, st.turn).some(m => (m >> 8) === from && (m & 255) === to)) return null
  }
  return puzzle
}

export { CURATED }
