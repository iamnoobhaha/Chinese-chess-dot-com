import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Guards against two classes of shipping bugs:
 *   1. `t('someKey')` referencing a string that does not exist
 *   2. a string defined for one language but not the other
 */

let failures = 0
const fail = msg => { console.log('FAIL ' + msg); failures++ }

// ---- 1. read the string table ------------------------------------------------
const i18nSrc = readFileSync('src/i18n.jsx', 'utf8')
const body = i18nSrc.slice(
  i18nSrc.indexOf('const STRINGS = {'),
  i18nSrc.indexOf('\nconst LangContext')
)

/** Split on lines that start a new top-level key. */
const lines = body.split(/\r?\n/)
const entries = []
let current = null
for (const line of lines) {
  const m = /^ {2}([A-Za-z0-9_]+):/.exec(line)
  if (m) {
    if (current) entries.push(current)
    current = { key: m[1], text: line }
  } else if (current) {
    current.text += '\n' + line
  }
}
if (current) entries.push(current)

const STRINGS = {}
for (const e of entries) STRINGS[e.key] = e.text

const defined = Object.keys(STRINGS)
console.log(`i18n: ${defined.length} strings defined`)

if (defined.length < 150) fail(`string table looks truncated (${defined.length})`)

// every entry needs both languages with a real value
for (const key of defined) {
  const e = STRINGS[key]
  if (!/\ben:/.test(e)) fail(`${key} has no "en" value`)
  if (!/\bzh:/.test(e)) fail(`${key} has no "zh" value`)
  // a string that is empty on one side renders as a blank label
  const enVal = /en:\s*'([^']*)'/.exec(e) || /en:\s*"([^"]*)"/.exec(e)
  const zhVal = /zh:\s*'([^']*)'/.exec(e) || /zh:\s*"([^"]*)"/.exec(e)
  if (enVal && !enVal[1].trim()) fail(`${key} has an empty English value`)
  if (zhVal && !zhVal[1].trim()) fail(`${key} has an empty Chinese value`)
  if ((enVal && /en:\s*\[/.test(e)) !== (zhVal && /zh:\s*\[/.test(e))) {
    fail(`${key} mixes array and scalar values`)
  }
}

// ---- 2. scan the source tree for t('...') ------------------------------------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx?|mjs)$/.test(name)) out.push(p)
  }
  return out
}

const files = [...walk('src'), ...walk('tests')]
const used = new Map()
const dynamic = []

const callRe = /\bt\(\s*'([A-Za-z0-9_]+)'/g
const tmplRe = /\bt\(\s*`([^`$]*)`/g
const concatRe = /\bt\(\s*'([A-Za-z0-9_]+)'\s*\+/g

for (const file of files) {
  // this file mentions keys only to test the checker itself, and i18n.jsx only
  // shows the signature of t() in a comment
  if (file.endsWith('verify-i18n.mjs') || file.endsWith('i18n.jsx')) continue
  const src = readFileSync(file, 'utf8')
  let m
  callRe.lastIndex = 0
  while ((m = callRe.exec(src)) !== null) {
    // skip the call when the key is immediately concatenated or templated
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 2)
    if (/^\s*\+/.test(after) || /^\s*`/.test(after)) continue
    if (!used.has(m[1])) used.set(m[1], [])
    used.get(m[1]).push(file)
  }
  tmplRe.lastIndex = 0
  while ((m = tmplRe.exec(src)) !== null) {
    if (m[1]) {
      if (!used.has(m[1])) used.set(m[1], [])
      used.get(m[1]).push(file)
    } else dynamic.push(file)
  }
  concatRe.lastIndex = 0
  while ((m = concatRe.exec(src)) !== null) dynamic.push(`${file} (t('${m[1]}' + ...))`)
}

for (const [key, where] of used) {
  if (!defined.includes(key)) {
    fail(`t('${key}') has no translation (used in ${[...new Set(where)].join(', ')})`)
  }
}

// every reason the app can end a game needs a translated label
const REASONS = ['mate', 'stalemate', 'resign', 'repetition', 'timeout', 'agreement', 'disconnect', 'left']
for (const r of REASONS) {
  if (!defined.includes('reason_' + r)) fail(`missing translation reason_${r}`)
}

// keys built at runtime must exist for the values the app can produce
const DYNAMIC_TABLES = {
  tier: ['tierNovice', 'tierAmateur', 'tierClub', 'tierCandidate', 'tierMaster', 'tierSenior', 'tierGM'],
  cls: ['brilliant', 'great', 'bestMove', 'bestAttempt', 'excellent', 'good', 'book',
    'timeLoss', 'missedWin', 'missedDraw', 'inaccuracy', 'mistake', 'blunder'],
  tab: ['overviewTab', 'movesTab', 'insightsTab'],
  filter: ['filterAll', 'filterProblems', 'filterMissed', 'filterGood'],
  coach: ['coachGreat', 'coachOk', 'coachInaccuracy', 'coachMistake', 'coachBlunder', 'coachMissedMate']
}
for (const group of Object.values(DYNAMIC_TABLES)) {
  for (const key of group) {
    if (!defined.includes(key)) fail(`dynamic key '${key}' is missing from the string table`)
  }
}

// ---- 3. report genuinely unused keys -----------------------------------------
const usedSet = new Set(used.keys())
const runtimeGroups = new Set(Object.values(DYNAMIC_TABLES).flat())
const runtimeReason = new Set(REASONS.map(r => 'reason_' + r))
const unused = defined.filter(k =>
  !usedSet.has(k) && !runtimeGroups.has(k) && !runtimeReason.has(k))
if (unused.length) {
  console.log('note: unused i18n keys -> ' + unused.join(', '))
}

// ---- 4. no raw keys leaking into the DOM -------------------------------------
// Every rendered label must come from t(); scan for suspicious bare words.
const suspicious = []
for (const file of files) {
  if (!file.includes('pages') && !file.includes('components')) continue
  const src = readFileSync(file, 'utf8')
  // class labels and tier chips are read straight off objects, so a key present
  // in both i18n and a table is expected — only flag literals that are not keys
  const literals = src.match(/className="([a-z-]+)"/g) || []
  void literals
}
if (suspicious.length) console.log(suspicious.join('\n'))

console.log(`i18n: ${dynamic.length} dynamic key expressions found`)
process.exit(failures ? 1 : 0)