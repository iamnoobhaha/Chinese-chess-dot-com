import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Board from '../components/Board.jsx'
import MoveList from '../components/MoveList.jsx'
import EvalGraph from '../components/EvalGraph.jsx'
import ClassIcon, { CLASS_ORDER, CLASS_FILTERS, classStyle, classLabel } from '../components/ClassIcon.jsx'
import { useLang } from '../i18n.jsx'
import { engine } from '../engine/client.js'
import { START_FEN, RED } from '../engine/board.js'
import { loadGames, deleteGame, annotatedReplay, sanitizeGame } from '../game/positionUtils.js'
import { buildReview, NEUTRAL_CLASSES } from '../game/review.js'
import { shortEval } from '../game/mathUtil.js'
import { LESSON_SEQUENCES } from '../data/lessons.js'
import { readAnalysis, writeAnalysis, repetitionCounts } from '../game/analysisCache.js'
import { harvestPuzzles } from '../game/puzzles.js'
import { saveReviewStat } from '../game/reviewStats.js'

/**
 * Depth presets.
 *
 * Depth matters a lot here: below about 6 plies the evaluation is unstable
 * enough that a single opening move can be mis-scored by a couple of hundred
 * centipawns, which turns the whole report into fiction. Long games get a
 * shallower pass so the review still finishes in a reasonable time.
 */
function depthPlan(totalPly, mode) {
  const long = totalPly > 70 ? 1 : totalPly > 44 ? 2 : 0
  if (mode === 'instant') return { depth: 6 + long, cap: 500 }
  if (mode === 'fast') return { depth: 8 + long, cap: 700 }
  return { depth: 12 + long, cap: 1600 }
}

export default function ReviewPage() {
  const { t, lang } = useLang()
  const [params] = useSearchParams()
  const initialId = params.get('game')

  const [game, setGame] = useState(null)
  const [games, setGames] = useState(() => loadGames())
  const [mode, setMode] = useState('fast')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [partial, setPartial] = useState(null)
  const [viewIdx, setViewIdx] = useState(0)
  const [tab, setTab] = useState('overview')
  const [filter, setFilter] = useState('all')
  const [showBest, setShowBest] = useState(false)
const [showLines, setShowLines] = useState(false)
const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const autoRef = useRef(null)
  const savedRef = useRef(null)
  const [autoPlay, setAutoPlay] = useState(false)
  const [autoSpeed, setAutoSpeed] = useState(1100)

  useEffect(() => () => engine.cancel(), [])

  // ---- open a game from the query string -----------------------------------
  useEffect(() => {
    if (!initialId) return
    const found = loadGames().find(g => g.id === initialId)
    if (found) setGame(sanitizeGame(found))
  }, [initialId])

  const positions = useMemo(
    () => (game ? annotatedReplay(game.fen || START_FEN, game.moves) : []),
    [game]
  )

  const review = useMemo(() => {
    if (!game || !partial) return null
    const pos = positions
    // only use positions the engine has finished
    const usable = Math.min(pos.length, partial.length)
    if (usable < 2) return null
    return buildReview(
      game.fen || START_FEN,
      pos.slice(0, usable),
      partial.slice(0, usable),
      LESSON_SEQUENCES,
      {
        humanColor: typeof game.humanColor === 'number' ? game.humanColor : RED,
        result: game.result,
        reason: game.reason,
        name: game.oppName,
        oppName: game.mode === 'ai' ? t('aiOpponent', { n: game.level ?? '-' }) : game.oppName
      }
    )
  }, [game, partial, positions, t])

  const N = positions.length - 1

  // Every finished review becomes a set of drills in the Puzzle trainer and one
  // more row in the Progress history.
  useEffect(() => {
    if (!game || !review || status !== 'done') return
    const token = `${game.id}:${review.plies.length}`
    if (savedRef.current === token) return
    savedRef.current = token
    const added = harvestPuzzles(game, positions.slice(0, review.plies.length + 1), review)
    saveReviewStat(review, {
      gameId: game.id,
      mode: game.mode,
      level: game.level,
      result: game.result
    })
    if (added > 0 && !savedRef.warned) {
      savedRef.warned = true
      setToast(t('puzzlesAdded', { n: added }))
    }
  }, [game, review, status, positions, t])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2800)
    return () => clearTimeout(id)
  }, [toast])

  const startAnalysis = useCallback(async (overrideMode) => {
    if (!game) return
    const useMode = overrideMode || mode
    const plan = depthPlan(game.moves.length, useMode)
    const fen = game.fen || START_FEN
    setError('')

    const cached = readAnalysis(fen, game.moves, plan.depth)
    if (cached) {
      setPartial(cached.results)
      setProgress(100)
      setStatus('done')
      return
    }

    engine.cancel()
    setStatus('running')
    setProgress(0)
    setPartial(null)
    setViewIdx(0)

    const repCounts = repetitionCounts(fen, game.moves)
    try {
      const res = await engine.analyze(
        {
          fen,
          moves: game.moves,
          depth: plan.depth,
          moveTimeCap: plan.cap,
          humanColor: typeof game.humanColor === 'number' ? game.humanColor : RED,
          repCounts
        },
        (i, total) => setProgress(Math.round(((i + 1) / total) * 100)),
        arr => {
          const next = arr.filter(Boolean)
          if (next.length) {
            setPartial(arr)
            setStatus('running')
          }
        }
      )
      writeAnalysis(fen, game.moves, plan.depth, res.results, { mode: useMode })
      setPartial(res.results)
      setProgress(100)
      setStatus('done')
    } catch (err) {
      if (String(err.message) === 'cancelled') { setStatus('idle'); return }
      console.error('Game analysis failed:', err)
      setError(String(err.message || err))
      setStatus('idle')
    }
  }, [game, mode, t])

  const cancelAnalysis = () => {
    engine.cancel()
    setStatus('idle')
    setPartial(null)
    setProgress(0)
  }

  // ---- playback ------------------------------------------------------------
  useEffect(() => {
    if (!autoPlay || !review) return
    autoRef.current = setInterval(() => {
      setViewIdx(v => {
        if (v >= N) { setAutoPlay(false); return v }
        return v + 1
      })
    }, autoSpeed)
    return () => clearInterval(autoRef.current)
  }, [autoPlay, review, N, autoSpeed])

  const goPrevProblem = useCallback((dir) => {
    if (!review) return
    const problems = review.plies
      .filter(p => !NEUTRAL_CLASSES.has(p.cls))
      .map(p => p.plyIndex + 1)
    if (!problems.length) return
    const next = dir > 0
      ? problems.find(i => i > viewIdx)
      : problems.filter(i => i < viewIdx).pop()
    if (next == null) {
      setViewIdx(dir > 0 ? problems[0] : problems[problems.length - 1])
      return
    }
    setAutoPlay(false)
    setViewIdx(next)
  }, [review, viewIdx])

  useEffect(() => {
    const onKey = e => {
      if (!review) return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft') { e.preventDefault(); setAutoPlay(false); setViewIdx(v => Math.max(0, v - 1)) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setAutoPlay(false); setViewIdx(v => Math.min(N, v + 1)) }
      else if (e.key === 'Home') { setAutoPlay(false); setViewIdx(0) }
      else if (e.key === 'End') { setAutoPlay(false); setViewIdx(N) }
      else if (e.key === 'n' || e.key === 'N') goPrevProblem(1)
      else if (e.key === 'b' || e.key === 'B') goPrevProblem(-1)
      else if (e.key === ' ') { e.preventDefault(); setAutoPlay(a => !a) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [review, N, goPrevProblem])

  // ---- derived view data ---------------------------------------------------
  const pgn = useMemo(() => (game ? buildPgn(game, review) : ''), [game, review])

  // ---- game list -----------------------------------------------------------
  if (!game) {
    return <GameList games={games} t={t} onOpen={g => { setGame(g); setStatus('idle'); setPartial(null); setViewIdx(0) }} />
  }

  const pos = positions[Math.min(viewIdx, positions.length - 1)]
  const ply = review && viewIdx > 0 ? review.plies[viewIdx - 1] : null
  const sideName = c => (c === RED ? t('red') : t('black'))
  const boardOrientation = typeof game.humanColor === 'number' ? game.humanColor : RED

  // arrows: green = engine best, grey = alternatives, class colour = played move
  const arrows = []
  if (showBest && ply && ply.bestFrom >= 0) {
    arrows.push({ from: ply.bestFrom, to: ply.bestTo, color: '#26a69a', width: 10 })
  }
  if (showLines && ply) {
    for (const alt of ply.alternatives.slice(0, 2)) {
      arrows.push({ from: alt.from, to: alt.to, color: '#8a8580', width: 5, opacity: 0.6 })
    }
  }
  if (ply && !ply.bestMatch && ply.cls !== 'book') {
    arrows.push({ from: pos.lastFrom, to: pos.lastTo, color: classStyle(ply.cls).color, width: 6, opacity: 0.55 })
  }

  const markers = review
    ? review.plies.filter(p => p.acpl >= 200).map(p => ({
      index: p.plyIndex + 1,
      color: classStyle(p.cls).color
    }))
    : null

  const graphLabels = review
    ? review.plies.map(p => `${Math.floor(p.plyIndex / 2) + 1}${p.mover === RED ? '.' : '…'} ${p.chinese || ''}`)
    : null

  const copy = text => {
    try { navigator.clipboard.writeText(text) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="page review-page">
      <div className="board-col">
        <Board
          bd={pos.bd}
          orientation={boardOrientation}
          lastMove={pos.lastFrom >= 0 ? { from: pos.lastFrom, to: pos.lastTo } : null}
          checkSq={pos.checkSq}
          extraArrows={arrows}
          interactive={false}
          moveSeq={viewIdx}
        />
        {review ? (
          <EvalGraph
            data={review.graph}
            mate={review.graphMate}
            best={review.graphBest}
            current={viewIdx}
            markers={markers}
            labels={graphLabels}
            onSelect={i => { setAutoPlay(false); setViewIdx(i) }}
          />
        ) : (
          <div className="eval-graph empty" />
        )}
        <div className="playback">
          <button className="btn small" title={t('first')} onClick={() => { setAutoPlay(false); setViewIdx(0) }}>⏮</button>
          <button className="btn small" title={t('prevMove')} onClick={() => { setAutoPlay(false); setViewIdx(v => Math.max(0, v - 1)) }}>◀</button>
          <button className={`btn small ${autoPlay ? 'active' : ''}`} title={t('autoplay')} onClick={() => setAutoPlay(a => !a)}>▶</button>
          <button className="btn small" title={t('nextMove')} onClick={() => { setAutoPlay(false); setViewIdx(v => Math.min(N, v + 1)) }}>▶|</button>
          <button className="btn small" title={t('last')} onClick={() => { setAutoPlay(false); setViewIdx(N) }}>⏭</button>
          <button className="btn small ghost" title={t('nextProblem')} onClick={() => goPrevProblem(1)}>⚠</button>
          <button className="btn small ghost" title={t('prevProblem')} onClick={() => goPrevProblem(-1)}>↺</button>
          <span className="ply-label">{viewIdx} / {N}</span>
        </div>
        {review && (
          <div className="playback-speed">
            <input type="range" min="250" max="2500" step="50" value={autoSpeed}
              onChange={e => setAutoSpeed(+e.target.value)} />
            <span className="muted">{t('speed')} {(2500 / autoSpeed).toFixed(1)}x</span>
          </div>
        )}
      </div>

      <div className="side-col">
        {status !== 'done' && (
          <div className="panel analyze-panel">
            {status === 'running' ? (
              <>
                <div className="progress-bar"><div style={{ width: progress + '%' }} /></div>
                <p>{t('analyzing')} {progress}%{partial ? ` · ${partial.filter(Boolean).length}/${N + 1}` : ''}</p>
                {partial && <p className="hint-line">{t('partialHint')}</p>}
                <button className="btn small ghost" onClick={cancelAnalysis}>{t('cancelAnalysis')}</button>
              </>
            ) : (
              <>
                <h3 className="panel-title">{t('analysisDepth')}</h3>
                <label className="radio-row">
                  <input type="radio" checked={mode === 'instant'} onChange={() => setMode('instant')} />
                  {t('analyzeInstant')}
                </label>
                <label className="radio-row">
                  <input type="radio" checked={mode === 'fast'} onChange={() => setMode('fast')} />
                  {t('analyzeFast')}
                </label>
                <label className="radio-row">
                  <input type="radio" checked={mode === 'deep'} onChange={() => setMode('deep')} />
                  {t('analyzeDeep')}
                </label>
                <button className="btn primary" onClick={() => startAnalysis()}>{t('startAnalysis')}</button>
                {error && <p className="fail-msg">{error}</p>}
              </>
            )}
          </div>
        )}

        {review && (
          <>
            <div className="panel tabs-panel">
              <div className="tabs">
                {['overview', 'moves', 'insights'].map(k => (
                  <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{t(k + 'Tab')}</button>
                ))}
              </div>

              {tab === 'overview' && (
                <Overview review={review} game={game} t={t} lang={lang}
                  onJump={i => { setAutoPlay(false); setViewIdx(i) }} />
              )}

              {tab === 'moves' && (
                <>
                  <div className="filter-row">
                    {['all', 'problems', 'missed', 'good'].map(f => (
                      <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {t('filter' + f[0].toUpperCase() + f.slice(1))}
                      </button>
                    ))}
                  </div>
                  <MoveList
                    plies={review.plies}
                    current={viewIdx}
                    onSelect={i => { setAutoPlay(false); setViewIdx(i) }}
                    showIcons
                    showEval
                    graph={review.graph}
                    graphMate={review.graphMate}
                    filter={filter === 'all' ? null : CLASS_FILTERS[filter]}
                    emptyText={t('noMovesInFilter')}
                  />
                </>
              )}

              {tab === 'insights' && <Insights review={review} t={t} lang={lang} />}
            </div>

            <div className="panel engine-panel">
              {ply ? (
                <>
                  <div className="eval-line">
                    <ClassIcon cls={ply.cls} size={18} />
                    <strong style={{ color: classStyle(ply.cls).color }}>
                      {classLabel(ply.cls, lang)}
                    </strong>
                    <span className="muted">
                      {t('moveNumber')} {Math.floor(ply.plyIndex / 2) + 1}
                      {ply.mover === RED ? t('redShort') : t('blackShort')} · {t('lostCp')} {ply.acpl} · {t('accuracy')} {ply.accuracy}%
                    </span>
                  </div>
                  <div className="eval-pairs">
                    <span>{t('evalBefore')} <b>{shortEval(ply.evalRedBefore, ply.mateBefore)}</b></span>
                    <span>{t('evalAfter')} <b>{shortEval(ply.evalRedAfter, ply.mateAfter)}</b></span>
                    {ply.bestMatch
                      ? <span className="tag-best">{t('engineBestMove')}</span>
                      : ply.bestIccs && <span className="tag-best-alt">{t('bestWas')} {ply.bestIccs}</span>}
                  </div>
                  {ply.reason && (
                    <p className="review-reason">{lang === 'zh' ? ply.reason.zh : ply.reason.en}</p>
                  )}
                  <div className="pv-line">
                    <small className="muted">{t('bestLine')}: </small>
                    <code>{ply.pv.join(' ') || '—'}</code>
                  </div>
                  <div className="checkboxes">
                    <label className="radio-row">
                      <input type="checkbox" checked={showBest} onChange={e => setShowBest(e.target.checked)} />
                      {t('showBest')}
                    </label>
                    <label className="radio-row">
                      <input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} />
                      {t('showAlternatives')}
                    </label>
                  </div>
                </>
              ) : (
                <p className="muted">{t('reviewIntroHint')}</p>
              )}
            </div>
          </>
        )}

        <div className="panel row-actions">
          <button className="btn ghost small" onClick={() => { engine.cancel(); setGame(null); setPartial(null); setStatus('idle'); setGames(loadGames()) }}>
            ← {t('savedGames')}
          </button>
          <button className="btn ghost small" onClick={() => copy(game.moves.join(' '))}>
            {copied ? `✓ ${t('copied')}` : t('copyMoves')}
          </button>
          {pgn && (
            <button className="btn ghost small" onClick={() => copy(pgn)}>
              {copied ? `✓ ${t('copied')}` : t('copyPgn')}
            </button>
          )}
          {game && (
            <button className="btn ghost small danger" onClick={() => {
              deleteGame(game.id)
              setGames(loadGames())
              setGame(null)
              setPartial(null)
              setStatus('idle')
              setToast(t('gameDeleted'))
            }}>
              {t('deleteGame')}
            </button>
          )}
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function GameList({ games, t, onOpen }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('new')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = games
    if (q) {
      list = list.filter(g =>
        String(g.id).includes(q) ||
        String(g.oppName || '').toLowerCase().includes(q) ||
        g.moves.join(' ').toLowerCase().includes(q))
    }
    if (sort === 'long') list = [...list].sort((a, b) => b.moves.length - a.moves.length)
    return list
  }, [games, query, sort])

  return (
    <div className="page">
      <h1>{t('savedGames')}</h1>
      {games.length === 0 && <p className="muted">{t('noGames')}</p>}
      {games.length > 0 && (
        <div className="list-toolbar">
          <input className="code-input grow" placeholder={t('searchGames')} value={query} onChange={e => setQuery(e.target.value)} />
          <button className={`btn small ${sort === 'new' ? 'primary' : ''}`} onClick={() => setSort('new')}>{t('newest')}</button>
          <button className={`btn small ${sort === 'long' ? 'primary' : ''}`} onClick={() => setSort('long')}>{t('longest')}</button>
        </div>
      )}
      <div className="games-list">
        {shown.map(g => (
          <button key={g.id} className="game-row card" onClick={() => onOpen(g)}>
            <span className={`res-badge ${g.result}`}>
              {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
            </span>
            <span className="game-meta">
              <strong>{new Date(g.ts).toLocaleString()}</strong>
              <small>
                {g.mode === 'online'
                  ? `${t('onlineMode')} · ${g.oppName || '?'} (${g.oppRating || '?'})`
                  : `${t('aiMode')} Lv.${g.level ?? '-'}`}
                {' · '}{g.moves.length} {t('movesLabel')} · #{String(g.id).slice(-4)}
                {g.reason ? ` · ${t('reason_' + g.reason)}` : ''}
              </small>
            </span>
            {typeof g.ratingDelta === 'number' && (
              <span className={`delta-chip ${g.ratingDelta >= 0 ? 'delta-plus' : 'delta-minus'}`}>
                {g.ratingDelta >= 0 ? '+' : ''}{g.ratingDelta}
              </span>
            )}
          </button>
        ))}
        {games.length > 0 && shown.length === 0 && <p className="muted">{t('noMatch')}</p>}
      </div>
    </div>
  )
}

function Overview({ review, game, t, lang, onJump }) {
  const { summary, report } = review
  const mine = summary[report.humanColor === RED ? 'red' : 'black']
  const theirs = summary[report.humanColor === RED ? 'black' : 'red']
  const resultText = game.result === 'win' ? t('youWin') : game.result === 'loss' ? t('youLose') : t('drawResult')

  const Phase = ({ label, data }) => (
    <div className="phase-col">
      <span className="muted">{label}</span>
      <b className={data.accuracy >= 85 ? 'acc-good' : data.accuracy >= 70 ? 'acc-mid' : 'acc-bad'}>{data.accuracy}%</b>
      <small className="muted">{data.moves} {t('movesLabel')}</small>
    </div>
  )

  return (
    <div className="overview">
      <div className="report-head">
        <div>
          <div className="report-opening">
            {lang === 'zh' ? report.opening.nameZh : report.opening.nameEn}
          </div>
          <div className="report-result">
            <span className={`res-badge ${game.result}`}>{resultText}</span>
            {report.reason && <small className="muted"> {t('reason_' + report.reason)}</small>}
          </div>
        </div>
      </div>

      <div className="side-summary card">
        <h3>{t('yourAccuracy')}</h3>
        <div className={`acc-big ${mine.accuracy >= 85 ? 'acc-good' : mine.accuracy >= 70 ? 'acc-mid' : 'acc-bad'}`}>
          {mine.accuracy}<span>%</span>
        </div>
        <p className="muted">{t('averageCentipawnLoss')} {mine.acpl}</p>
        <div className="count-grid">
          {CLASS_ORDER.map(cls => mine.counts[cls] > 0 && (
            <span key={cls} className="count-chip" title={classLabel(cls, lang)}>
              <ClassIcon cls={cls} size={15} /> {mine.counts[cls]}
            </span>
          ))}
        </div>
      </div>

      <div className="phase-grid">
        <Phase label={t('phaseOpening')} data={mine.phases.opening} />
        <Phase label={t('phaseMiddlegame')} data={mine.phases.middlegame} />
        <Phase label={t('phaseEndgame')} data={mine.phases.endgame} />
      </div>

      <div className="report-stats">
        <Stat label={t('opponentAccuracy')} value={theirs.accuracy + '%'} />
        <Stat label={t('finalEvalForYou')} value={mine.finalWinPct + '%'} />
        <Stat label={t('blunders')} value={mine.blunders} />
        <Stat label={t('missedWins')} value={mine.missedWins} />
        <Stat label={t('brilliantMoves')} value={mine.counts.brilliant} />
        <Stat label={t('bookMoves')} value={mine.counts.book} />
      </div>

      {report.keyMoments.length > 0 && (
        <div className="key-moments">
          <h4>{t('keyMoments')}</h4>
          {report.keyMoments.map(k => {
            const p = review.plies[k.plyIndex]
            return (
              <button key={k.plyIndex} className="moment-row" onClick={() => onJump(k.plyIndex + 1)}>
                <ClassIcon cls={p.cls} size={15} />
                <span className="moment-move">{Math.floor(k.plyIndex / 2) + 1}{p.mover === RED ? '.' : '…'} {p.chinese}</span>
                <span className="muted">{lang === 'zh' ? (p.reason ? p.reason.zh : classLabel(p.cls, lang)) : (p.reason ? p.reason.en : classLabel(p.cls, lang))}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <small className="muted">{label}</small>
    </div>
  )
}

function Insights({ review, t, lang }) {
  const { report, summary } = review
  const lower = report.lowerRatedBest
  const swing = report.biggestSwing
  const rows = []

  if (lower) {
    rows.push({
      k: 'lowerRatedBest',
      en: `Best move by the lower-rated player: move ${Math.floor(lower.plyIndex / 2) + 1} ${lower.chinese} (${lower.cls}, ${lower.accuracy}% accuracy)`,
      zh: `較低評分方最佳的一手：第 ${Math.floor(lower.plyIndex / 2) + 1} 手 ${lower.chinese}（${classLabel(lower.cls, 'zh')}，準確度 ${lower.accuracy}%）`
    })
  }
  if (swing) {
    rows.push({
      k: 'biggestSwing',
      en: `Biggest evaluation swing: move ${Math.floor(swing.plyIndex / 2) + 1} changed the evaluation by ${Math.abs(swing.swing)} centipawns.`,
      zh: `最大評分變化：第 ${Math.floor(swing.plyIndex / 2) + 1} 手令局面的評估變動了 ${Math.abs(swing.swing)} 厘兵。`
    })
  }
  if (report.missedWins) {
    rows.push({
      k: 'missedWins',
      en: `${report.missedWins} winning position${report.missedWins > 1 ? 's were' : ' was'} let slip.`,
      zh: `有 ${report.missedWins} 個勝機沒有把握住。`
    })
  }
  if (report.missedMates) {
    rows.push({
      k: 'missedMates',
      en: `${report.missedMates} forced mate${report.missedMates > 1 ? 's were' : ' was'} missed.`,
      zh: `錯過了 ${report.missedMates} 次殺棋機會。`
    })
  }
  const forcedCount = review.plies.filter(p => p.forced || p.onlyMove).length
  if (forcedCount) {
    rows.push({
      k: 'forced',
      en: `${forcedCount} move${forcedCount > 1 ? 's were' : ' was'} forced — no real alternative existed.`,
      zh: `有 ${forcedCount} 手是必然著，別人根本沒有別的選擇。`
    })
  }

  return (
    <div className="insights">
      {rows.length === 0 && <p className="muted">{t('noInsights')}</p>}
      {rows.map(r => (
        <div key={r.k} className="insight-row">
          <span className="insight-dot" />
          <span>{lang === 'zh' ? r.zh : r.en}</span>
        </div>
      ))}
      <div className="outcome-bars">
        <h4>{t('gameOutcome')}</h4>
        {[RED, RED ^ 1].map(c => {
          const s = summary[c === RED ? 'red' : 'black']
          const o = s.weightedOutcome
          const name = c === RED ? t('red') : t('black')
          return (
            <div key={c} className="outcome-row">
              <span className="muted">{name}</span>
              <div className="outcome-bar">
                <i style={{ width: o.win + '%', background: '#81b64c' }} />
                <i style={{ width: o.draw + '%', background: '#8a8580' }} />
                <i style={{ width: o.loss + '%', background: '#fa412d' }} />
              </div>
              <small>{o.win}/{o.draw}/{o.loss}</small>
            </div>
          )
        })}
        <div className="legend">
          <span><i className="dot-win" />{t('win')}</span>
          <span><i className="dot-draw" />{t('draw')}</span>
          <span><i className="dot-loss" />{t('loss')}</span>
        </div>
      </div>
    </div>
  )
}

const RESULT_TOKEN = { win: '1-0', loss: '0-1', draw: '1/2-1/2' }

function buildPgn(game, review) {
  const oppLabel = game.mode === 'online'
    ? 'Opponent'
    : 'Xiangqi Master Lv.' + (game.level ?? '-')
  const header = [
    `[Event "${game.mode === 'online' ? 'Online' : 'Xiangqi Master vs AI'}"]`,
    '[Site "Xiangqi Master"]',
    `[Date "${new Date(game.ts || Date.now()).toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
    '[Round "-"]',
    `[White "${game.mode === 'online' ? (game.humanColor === 0 ? 'You' : oppLabel) : 'You'}"]`,
    `[Black "${game.mode === 'online' ? (game.humanColor === 0 ? oppLabel : 'You') : oppLabel}"]`,
    `[Result "${RESULT_TOKEN[game.result] || '1/2-1/2'}"]`,
    `[FEN "${game.fen || START_FEN}"]`
  ]
  const tokens = []
  const moves = game.moves || []
  for (let i = 0; i < moves.length; i += 2) {
    const n = i / 2 + 1
    tokens.push(`${n}. ${moves[i]}` + (moves[i + 1] ? ` ${moves[i + 1]}` : ''))
  }
  let body = tokens.join(' ') + ' ' + (RESULT_TOKEN[game.result] || '1/2-1/2')
  if (review) {
    const notes = review.plies
      .filter(p => p.reason || !p.bestMatch)
      .map(p => `{ ${p.iccs} ${classLabel(p.cls, 'en')} }`)
    if (notes.length) body += '\n' + notes.join(' ')
  }
  return header.join('\n') + '\n\n' + body + '\n'
}
