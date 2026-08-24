import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Board from '../components/Board.jsx'
import MoveList from '../components/MoveList.jsx'
import EvalGraph from '../components/EvalGraph.jsx'
import ClassIcon, { classStyle } from '../components/ClassIcon.jsx'
import { useLang } from '../i18n.jsx'
import { engine } from '../engine/client.js'
import { RED } from '../engine/board.js'
import { loadGames, annotatedReplay } from '../game/positionUtils.js'
import { buildReview } from '../game/review.js'
import { formatEval } from '../game/mathUtil.js'
import { LESSON_SEQUENCES } from '../data/lessons.js'

const CLASS_ORDER = ['brilliant', 'best', 'excellent', 'good', 'book', 'inaccuracy', 'mistake', 'blunder']

export default function ReviewPage() {
  const { t, lang } = useLang()
  const [params] = useSearchParams()
  const initialId = params.get('game')

  const games = useMemo(() => loadGames(), [])
  const [game, setGame] = useState(() => games.find(g => g.id === initialId) || null)

  const [depthMode, setDepthMode] = useState('fast')
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [reviewData, setReviewData] = useState(null)
  const [viewIdx, setViewIdx] = useState(0)
  const [tab, setTab] = useState('moves')
  const [showBest, setShowBest] = useState(false)
  const autoRef = useRef(null)
  const [autoPlay, setAutoPlay] = useState(false)

  const positions = useMemo(
    () => (game ? annotatedReplay(game.fen || START_FEN_DEFAULT, game.moves) : null),
    [game]
  )

  useEffect(() => () => engine.cancel(), [])

  const startAnalysis = async () => {
    if (!game) return
    setStatus('running')
    setProgress(0)
    setReviewData(null)
    setViewIdx(0)
    try {
      const res = await engine.analyze(
        { fen: game.fen || START_FEN_DEFAULT, moves: game.moves, depth: depthMode === 'fast' ? 4 : 6, moveTimeCap: depthMode === 'fast' ? 1000 : 3000 },
        (i, total) => setProgress(Math.round(((i + 1) / total) * 100))
      )
      const data = buildReview(game.fen || START_FEN_DEFAULT, annotatedReplay(game.fen || START_FEN_DEFAULT, game.moves), res.results, LESSON_SEQUENCES)
      setReviewData(data)
      setStatus('done')
    } catch (err) {
      console.error('Game analysis failed:', err)
      setStatus('idle')
    }
  }

  const cancelAnalysis = () => {
    engine.cancel()
    setStatus('idle')
  }

  const N = positions ? positions.length - 1 : 0

  useEffect(() => {
    if (!autoPlay || !reviewData) return
    autoRef.current = setInterval(() => {
      setViewIdx(v => {
        if (v >= N) { setAutoPlay(false); return v }
        return v + 1
      })
    }, 1100)
    return () => clearInterval(autoRef.current)
  }, [autoPlay, reviewData, N])

  useEffect(() => {
    const onKey = e => {
      if (!reviewData) return
      if (e.key === 'ArrowLeft') setViewIdx(v => Math.max(0, v - 1))
      else if (e.key === 'ArrowRight') setViewIdx(v => Math.min(N, v + 1))
      else if (e.key === 'Home') setViewIdx(0)
      else if (e.key === 'End') setViewIdx(N)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reviewData, N])

  if (!game) {
    return (
      <div className="page">
        <h1>{t('savedGames')}</h1>
        {games.length === 0 && <p className="muted">{t('noGames')}</p>}
        <div className="games-list">
          {games.map(g => (
            <button key={g.id} className="game-row card" onClick={() => { setGame(g); setStatus('idle'); setReviewData(null); setViewIdx(0) }}>
              <span className={`res-badge ${g.result}`}>
                {g.result === 'win' ? 'W' : g.result === 'loss' ? 'L' : 'D'}
              </span>
              <span className="game-meta">
                <strong>{new Date(g.ts).toLocaleString()}</strong>
                <small>
                  {g.mode === 'online'
                    ? `${t('onlineMode')} · ${g.oppName || '?'} (${g.oppRating || '?'})`
                    : `${t('aiMode')} Lv.${g.level ?? '-'}`}
                  {' · '}{g.moves.length} {t('movesLabel')} · #{g.id.slice(-4)}
                </small>
              </span>
              {typeof g.ratingDelta === 'number' && (
                <span className={`delta-chip ${g.ratingDelta >= 0 ? 'delta-plus' : 'delta-minus'}`}>
                  {g.ratingDelta >= 0 ? '+' : ''}{g.ratingDelta}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const pos = positions[viewIdx]
  const ply = viewIdx > 0 && reviewData ? reviewData.plies[viewIdx - 1] : null

  const arrow = showBest && ply && ply.bestFrom >= 0
    ? { from: ply.bestFrom, to: ply.bestTo, color: '#26a69a' }
    : null

  const sideName = c => (c === RED ? t('red') : t('black'))
  const boardOrientation = typeof game.humanColor === 'number' ? game.humanColor : RED

  return (
    <div className="page review-page">
      <div className="board-col">
        <Board
          bd={pos.bd}
          orientation={boardOrientation}
          lastMove={pos.lastFrom >= 0 ? { from: pos.lastFrom, to: pos.lastTo } : null}
          checkSq={pos.checkSq}
          arrow={arrow}
          interactive={false}
        />
        <EvalGraph
          data={reviewData ? reviewData.graph : [0]}
          current={viewIdx}
          onSelect={i => { setAutoPlay(false); setViewIdx(i) }}
        />
        <div className="playback">
          <button className="btn small" onClick={() => { setAutoPlay(false); setViewIdx(0) }}>⏮</button>
          <button className="btn small" onClick={() => { setAutoPlay(false); setViewIdx(v => Math.max(0, v - 1)) }}>◀</button>
          <button className={`btn small ${autoPlay ? 'active' : ''}`} onClick={() => setAutoPlay(a => !a)}>▶</button>
          <button className="btn small" onClick={() => { setAutoPlay(false); setViewIdx(v => Math.min(N, v + 1)) }}>▶|</button>
          <button className="btn small" onClick={() => { setAutoPlay(false); setViewIdx(N) }}>⏭</button>
          <span className="ply-label">{viewIdx} / {N}</span>
        </div>
      </div>

      <div className="side-col">
        {!reviewData && (
          <div className="panel analyze-panel">
            {status === 'running' ? (
              <>
                <div className="progress-bar"><div style={{ width: progress + '%' }} /></div>
                <p>{t('analyzing')} {progress}%</p>
                <button className="btn small ghost" onClick={cancelAnalysis}>{t('cancelAnalysis')}</button>
              </>
            ) : (
              <>
                <label className="radio-row">
                  <input type="radio" checked={depthMode === 'fast'} onChange={() => setDepthMode('fast')} />
                  {t('analyzeFast')}
                </label>
                <label className="radio-row">
                  <input type="radio" checked={depthMode === 'deep'} onChange={() => setDepthMode('deep')} />
                  {t('analyzeDeep')}
                </label>
                <button className="btn primary" onClick={startAnalysis}>{t('startAnalysis')}</button>
              </>
            )}
          </div>
        )}

        {reviewData && (
          <>
            <div className="panel tabs-panel">
              <div className="tabs">
                <button className={tab === 'moves' ? 'active' : ''} onClick={() => setTab('moves')}>{t('movesTab')}</button>
                <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>{t('summaryTab')}</button>
              </div>

              {tab === 'summary' && (
                <div className="summary">
                  {[['red', RED], ['black', RED ^ 1]].map(([key, color]) => {
                    const s = reviewData.summary[key]
                    return (
                      <div key={key} className="side-summary card">
                        <h3>{sideName(color)}</h3>
                        <div className="acc-big">{s.accuracy}<span>%</span></div>
                        <p className="muted">{t('accuracy')}</p>
                        <div className="count-grid">
                          {CLASS_ORDER.map(cls =>
                            s.counts[cls] > 0 && (
                              <span key={cls} className="count-chip" title={t(cls)}>
                                <ClassIcon cls={cls} size={16} /> {s.counts[cls]}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {tab === 'moves' && (
                <MoveList plies={reviewData.plies} current={viewIdx} onSelect={i => { setAutoPlay(false); setViewIdx(i) }} showIcons />
              )}
            </div>

            <div className="panel engine-panel">
              {ply ? (
                <>
                  <div className="eval-line">
                    <ClassIcon cls={ply.cls} size={18} />
                    <strong style={{ color: classStyle(ply.cls).color }}>
                      {t(clsKey(ply.cls))}
                    </strong>
                    <span className="muted">{ply.loss} {t('lostCp')} · {t('accuracy')} {ply.accuracy}%</span>
                  </div>
                  <div className="pv-line">
                    <small className="muted">{t('bestLine')}: </small>
                    <code>{ply.pv.join(' ')}</code>
                  </div>
                  <label className="radio-row">
                    <input type="checkbox" checked={showBest} onChange={e => setShowBest(e.target.checked)} />
                    {t('showBest')}
                  </label>
                </>
              ) : (
                <p className="muted">{t('analysisDone')} — {t('startAnalysis')}</p>
              )}
            </div>
          </>
        )}

        <div className="panel">
          <button className="btn ghost small" onClick={() => { engine.cancel(); setGame(null); setReviewData(null); setStatus('idle') }}>
            ← {t('savedGames')}
          </button>
        </div>
      </div>
    </div>
  )
}

function clsKey(cls) {
  const map = {
    brilliant: 'brilliant',
    best: 'bestMove',
    excellent: 'excellent',
    good: 'good',
    book: 'book',
    inaccuracy: 'inaccuracy',
    mistake: 'mistake',
    blunder: 'blunder'
  }
  return map[cls]
}

const START_FEN_DEFAULT = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'
