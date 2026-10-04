import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import MoveList from '../components/MoveList.jsx'
import { useLang } from '../i18n.jsx'
import { engine } from '../engine/client.js'
import {
  START_FEN, RED, legalTargetsFor, findLegalMove,
  sqToIccs, gameStatus, repetitionKey
} from '../engine/board.js'
import { annotatedReplay, saveGame } from '../game/positionUtils.js'
import { getProfile, saveProfile } from '../game/profile.js'
import { AI_LEVEL_RATINGS, applyResult, ratingTier } from '../game/elo.js'
import { sfx } from '../game/sounds.js'
import { formatClock } from '../game/mathUtil.js'
import CapturedTray from '../components/CapturedTray.jsx'
import Sparkline from '../components/Sparkline.jsx'
import { OPENING_CHOICES } from '../game/openings.js'

const LEVELS = 8

/** Coach verdicts keyed by the engine's centipawn loss for the move just played. */
function coachVerdict(loss, mateMissed, bestIccs) {
  if (mateMissed) return { key: 'coachMissedMate', cls: 'blunder', tone: 'bad' }
  if (loss <= 20) return { key: 'coachGreat', cls: 'best', tone: 'good' }
  if (loss <= 90) return { key: 'coachOk', cls: 'good', tone: 'good' }
  if (loss <= 200) return { key: 'coachInaccuracy', cls: 'inaccuracy', tone: 'warn' }
  if (loss <= 450) return { key: 'coachMistake', cls: 'mistake', tone: 'bad' }
  return { key: 'coachBlunder', cls: 'blunder', tone: 'bad', bestIccs }
}

export default function Play() {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('setup')
  const [colorChoice, setColorChoice] = useState(RED)
  const [level, setLevel] = useState(3)
  const [humanColor, setHumanColor] = useState(RED)
  const [openingId, setOpeningId] = useState('free')
  const [timeChoice, setTimeChoice] = useState(0)
  const [coach, setCoach] = useState(false)

  const [moves, setMoves] = useState([])
  const [selected, setSelected] = useState(-1)
  const [thinking, setThinking] = useState(false)
  const [arrow, setArrow] = useState(null)
  const [flipView, setFlipView] = useState(false)
  const [result, setResult] = useState(null)
  const [verdict, setVerdict] = useState(null)
  const [checking, setChecking] = useState(false)
  const [clockView, setClockView] = useState(null)

  const busyRef = useRef(false)
  const movesRef = useRef([])
  const clockRef = useRef(null)
  const coachSeq = useRef(0)

  const opening = useMemo(
    () => OPENING_CHOICES.find(o => o.id === openingId) || OPENING_CHOICES[0],
    [openingId]
  )

  const positions = useMemo(() => annotatedReplay(START_FEN, moves), [moves])
  const currentPos = positions[positions.length - 1]
  const turn = currentPos.turn

  const botName = i => (lang === 'zh'
    ? ['初學者', '業餘棋手', '中級棋手', '高級棋手', '專家', '大師', '特級大師', '極限'][i]
    : ['Beginner', 'Casual', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Grandmaster', 'Maximum'][i])

  const repCount = useMemo(() => {
    const counts = new Map()
    for (const p of positions) {
      const k = p.key || repetitionKey(p.bd, p.turn)
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    return counts.get(currentPos.key || repetitionKey(currentPos.bd, currentPos.turn)) || 1
  }, [positions, currentPos])

  // ---------- clock ----------
  const clockRemaining = useCallback((c, color) =>
    c.ms[color] - (color === c.turn ? Date.now() - c.stamp : 0), [])

  // Stable identity matters: this function is a dependency of the engine-turn
  // effect below, and a new identity every render would spin the engine.
  const bumpClock = useCallback((moverColor) => {
    const c = clockRef.current
    if (!c) return true
    c.ms[moverColor] = Math.max(0, c.ms[moverColor] - (Date.now() - c.stamp))
    c.stamp = Date.now()
    c.started = true
    c.turn = moverColor ^ 1
    if (c.ms[moverColor] <= 0) {
      c.flagged = moverColor
      return false
    }
    setClockView({ ms: [clockRemaining(c, 0), clockRemaining(c, 1)], turn: c.turn })
    return true
  }, [clockRemaining])

  // ---------- game end ----------
  const finishGame = useCallback((winnerColor, reason) => {
    if (phase === 'over') return
    engine.cancel()
    busyRef.current = false
    const hc = humanColor
    const before = getProfile()
    const oppRating = AI_LEVEL_RATINGS[level - 1]
    const score = winnerColor === null ? 0.5 : (winnerColor === hc ? 1 : 0)
    const { delta, profile: updated } = applyResult(before, oppRating, score)
    saveProfile(updated)
    const rec = {
      id: Date.now() + '' + ((Math.random() * 1e6) | 0),
      ts: Date.now(),
      level,
      humanColor: hc,
      opening: opening.id,
      fen: START_FEN,
      result: winnerColor === null ? 'draw' : (winnerColor === hc ? 'win' : 'loss'),
      reason,
      moves: [...movesRef.current],
      oppRating,
      ratingDelta: delta,
      ratingAfter: updated.rating
    }
    saveGame(rec)
    setResult({ winner: winnerColor, reason, gameId: rec.id, delta })
    setPhase('over')
    if (winnerColor === null) sfx.draw()
    else if (winnerColor === hc) sfx.win()
    else sfx.lose()
  }, [humanColor, level, opening.id, phase])

  const detectEnd = useCallback((projected) => {
    const last = projected[projected.length - 1]
    if (last.capture) sfx.capture()
    else sfx.move()
    if (last.checkSq >= 0) sfx.check()
    const status = gameStatus(last.bd, last.turn, { repCount: last.repCount })
    if (!status.over) return false
    finishGame(status.winner, status.reason)
    return true
  }, [finishGame])

  // ---------- coach ----------
  const runCoach = useCallback((movesSoFar) => {
    if (!coach) return
    const seq = ++coachSeq.current
    setChecking(true)
    engine.check({ fen: START_FEN, moves: movesSoFar })
      .then(res => {
        if (seq !== coachSeq.current) return
        const v = coachVerdict(res.loss, res.mateMissed, res.bestIccs)
        setVerdict({ ...v, loss: res.loss, bestIccs: res.bestIccs })
      })
      .catch(() => {})
      .finally(() => { if (seq === coachSeq.current) setChecking(false) })
  }, [coach])

  // ---------- engine turn ----------
  useEffect(() => {
    if (phase !== 'playing') return
    if (turn === humanColor) return
    if (busyRef.current) return
    busyRef.current = true
    setThinking(true)
    engine.go({ fen: START_FEN, moves: movesRef.current, level })
      .then(res => {
        busyRef.current = false
        setThinking(false)
        if (!res.moveIccs) {
          const last = annotatedReplay(START_FEN, movesRef.current)[movesRef.current.length]
          const status = gameStatus(last.bd, last.turn, { repCount: last.repCount })
          finishGame(status.winner, status.reason)
          return
        }
        if (!bumpClock(turn)) {
          finishGame(turn ^ 1, 'timeout')
          return
        }
        const projected = annotatedReplay(START_FEN, [...movesRef.current, res.moveIccs])
        movesRef.current = [...movesRef.current, res.moveIccs]
        setMoves(movesRef.current)
        setArrow(null)
        setSelected(-1)
        detectEnd(projected)
      })
      .catch(err => {
        if (String(err.message) === 'cancelled') return
        console.error('engine.go failed:', err)
        busyRef.current = false
        setThinking(false)
      })
  }, [phase, turn, humanColor, level, bumpClock, detectEnd, finishGame])

  // A player who runs out of time during their own move loses on the spot.
  useEffect(() => {
    if (phase !== 'playing' || !clockRef.current) return
    const c = clockRef.current
    if (!c.started) return
    const iv = setInterval(() => {
      const cur = clockRef.current
      if (!cur) return
      setClockView({ ms: [clockRemaining(cur, 0), clockRemaining(cur, 1)], turn: cur.turn })
      if (clockRemaining(cur, cur.turn) <= 0) finishGame(cur.turn ^ 1, 'timeout')
    }, 250)
    void c
    return () => clearInterval(iv)
  }, [phase, turn, clockRemaining, finishGame])

  // ---------- player move ----------
  const commitMove = useCallback((from, to) => {
    const mv = findLegalMove(currentPos.bd, currentPos.turn, from, to)
    if (!mv) return false
    const iccs = sqToIccs(from) + sqToIccs(to)
    const projected = annotatedReplay(START_FEN, [...movesRef.current, iccs])
    movesRef.current = [...movesRef.current, iccs]
    setMoves(movesRef.current)
    setSelected(-1)
    setArrow(null)
    setVerdict(null)
    runCoach(movesRef.current)
    if (!bumpClock(currentPos.turn)) return true
    detectEnd(projected)
    return true
  }, [currentPos, runCoach, bumpClock, detectEnd])

  const onSquare = sq => {
    if (phase !== 'playing' || thinking) return
    if (turn !== humanColor) return
    const bd = currentPos.bd
    if (selected >= 0 && selected !== sq) {
      if (commitMove(selected, sq)) return
    }
    if (bd[sq] && (bd[sq] >> 3) === humanColor) setSelected(sq)
    else setSelected(-1)
  }

  const onDrop = (from, to) => {
    if (phase !== 'playing' || thinking || turn !== humanColor) return
    commitMove(from, to)
  }

  const targets = selected >= 0
    ? legalTargetsFor(currentPos.bd, currentPos.turn, selected)
    : new Set()

  const startNewGame = () => {
    engine.cancel()
    busyRef.current = false
    coachSeq.current++
    let hc = colorChoice
    if (hc === 2) hc = Math.random() < 0.5 ? RED : 1
    setHumanColor(hc)
    setFlipView(hc !== RED)
    setVerdict(null)
    setChecking(false)
    // Opening presets are Red moves, so they only apply when you play Red.
    const start = hc === RED ? opening.moves.slice() : []
    movesRef.current = start
    setMoves(start)
    setSelected(-1)
    setArrow(null)
    setResult(null)
    clockRef.current = timeChoice ? { ms: [timeChoice, timeChoice], turn: RED, stamp: Date.now(), started: false } : null
    setClockView(null)
    setPhase('playing')
  }

  const undo = () => {
    if (phase !== 'playing' || thinking || movesRef.current.length === 0) return
    const list = [...movesRef.current]
    list.pop()
    while (list.length > 0) {
      const pos = annotatedReplay(START_FEN, list)[list.length]
      if (pos.turn === humanColor) break
      list.pop()
    }
    movesRef.current = list
    setMoves(list)
    setSelected(-1)
    setArrow(null)
    setResult(null)
    setVerdict(null)
    if (clockRef.current) {
      clockRef.current.ms[humanColor] = timeChoice
      clockRef.current.stamp = Date.now()
    }
  }

  const resign = () => {
    if (phase !== 'playing') return
    finishGame(humanColor === RED ? 1 : 0, 'resign')
  }

  const claimDraw = () => {
    if (phase !== 'playing' || repCount < 3) return
    finishGame(null, 'repetition')
  }

  const showHint = () => {
    if (phase !== 'playing' || thinking || turn !== humanColor) return
    setChecking(true)
    engine.hint({ fen: START_FEN, moves: movesRef.current }).then(res => {
      setChecking(false)
      if (res.bestFrom >= 0) setArrow({ from: res.bestFrom, to: res.bestTo, color: '#38a3d1' })
    }).catch(() => setChecking(false))
  }

  const orientation = flipView ? 1 : 0
  const displayPlies = useMemo(() => positions.slice(1).map((p, j) => ({
    plyIndex: j,
    mover: p.move ? p.move.mover : 0,
    chinese: p.chinese || p.iccs,
    cls: null
  })), [positions])

  const statusText = () => {
    if (result) return ''
    if (thinking) return t('thinking')
    if (currentPos.checkSq >= 0 && turn === humanColor) return t('check') + ' ' + t('yourTurn')
    return turn === humanColor ? t('yourTurn') : t('thinking')
  }

  const clockChip = color => {
    if (!timeChoice || !clockView) return null
    const ms = clockView.ms[color]
    const low = ms < 30000
    return (
      <span className={`clock-chip ${clockView.turn === color && !result ? 'active' : ''} ${low ? 'low' : ''}`}>
        {formatClock(Math.max(0, ms))}
      </span>
    )
  }

  if (phase === 'setup') {
    const prof = getProfile()
    const tier = ratingTier(prof.rating)
    return (
      <div className="page setup-page">
        <div className="card setup-card">
          <div className="profile-strip">
            <span className="avatar-ol big">{(prof.name || '?').slice(0, 1)}</span>
            <div>
              <strong>{prof.name}</strong>
              <div className="rating-line">
                <span className="rating-big">{prof.rating}</span>
                <span className="tier-chip">{t(tier.key)}</span>
              </div>
              <small className="muted">{t('record')} {prof.wins}W / {prof.losses}L / {prof.draws}D</small>
              <Sparkline points={[...prof.history].reverse().map(h => h.rating)} />
            </div>
          </div>

          <h2>{t('chooseColor')}</h2>
          <div className="side-picker">
            {[['red', RED], ['random', 2], ['black', 1]].map(([key, val]) => (
              <button key={key} className={`side-btn ${colorChoice === val ? 'active' : ''}`} onClick={() => setColorChoice(val)}>
                <span className={`side-glyph ${key}`}>{key === 'red' ? '帥' : key === 'black' ? '將' : '?'}</span>
                <span>{t(key)}</span>
              </button>
            ))}
          </div>

          <h2>{t('difficulty')}</h2>
          <div className="lvl-grid">
            {Array.from({ length: LEVELS }, (_, i) => (
              <button key={i} className={`lvl-btn ${level === i + 1 ? 'active' : ''}`} onClick={() => setLevel(i + 1)}>
                <span className="lvl-num">{i + 1}</span>
                <span className="lvl-name">{botName(i)}</span>
              </button>
            ))}
          </div>

          <h2>{t('openingPick')}</h2>
          <div className="opening-row">
            {OPENING_CHOICES.map(o => (
              <button key={o.id} className={`chip ${openingId === o.id ? 'active' : ''}`}
                disabled={colorChoice === 1}
                onClick={() => setOpeningId(o.id)}>
                {lang === 'zh' ? o.zh : o.en}
              </button>
            ))}
          </div>
          {colorChoice === 1 && <p className="hint-line">{t('openingRedOnly')}</p>}

          <h2>{t('timeControl')}</h2>
          <div className="opening-row">
            {[[0, 'tcUnlimited'], [900000, 'tc15'], [600000, 'tc10'], [300000, 'tc5'], [180000, 'tc3']].map(([v, k]) => (
              <button key={k} className={`chip ${timeChoice === v ? 'active' : ''}`} onClick={() => setTimeChoice(v)}>
                {t(k)}
              </button>
            ))}
          </div>

          <label className="radio-row coach-row">
            <input type="checkbox" checked={coach} onChange={e => setCoach(e.target.checked)} />
            <span>{t('coachOn')}</span>
          </label>
          <p className="hint-line">{t('coachHint')}</p>

          <button className="btn primary big" onClick={startNewGame}>{t('startGame')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page play-page">
      <div className="board-col">
        <div className="panel opponent-bar">
          <span className="avatar ai-avatar">AI</span>
          <div>
            <strong>{botName(level - 1)}</strong>
            <small>Lv.{level}</small>
          </div>
          {clockChip(humanColor === RED ? 1 : 0)}
          <span className="status-chip">{statusText()}</span>
        </div>

        <Board
          bd={currentPos.bd}
          orientation={orientation}
          selected={selected}
          targets={targets}
          lastMove={currentPos.lastFrom >= 0 ? { from: currentPos.lastFrom, to: currentPos.lastTo } : null}
          checkSq={currentPos.checkSq}
          arrow={arrow}
          onSquare={onSquare}
          onDrop={onDrop}
          interactive={phase === 'playing' && !thinking && turn === humanColor}
          moveSeq={moves.length}
        />

        <div className="panel opponent-bar">
          <span className={`avatar-ol ${humanColor === RED ? 'red-side' : 'black-side'}`}>
            {(getProfile().name || '?').slice(0, 1)}
          </span>
          <div>
            <strong>{t('youLabel')}</strong>
            <small>{getProfile().rating} Elo</small>
          </div>
          {clockChip(humanColor)}
        </div>

        {verdict && (
          <div className={`coach-note tone-${verdict.tone}`}>
            <b>{t(verdict.key, verdict.bestIccs ? { move: verdict.bestIccs } : { n: 1 })}</b>
            {typeof verdict.loss === 'number' && <small className="muted"> · {verdict.loss} cp</small>}
          </div>
        )}
        {checking && !verdict && <div className="coach-note tone-neutral muted">{t('thinking')}</div>}

        {result && (
          <div className="modal-overlay">
            <div className="modal card">
              <h2 className={
                result.winner === null ? 'draw-text' : (result.winner === humanColor ? 'win-text' : 'lose-text')
              }>
                {result.winner === null ? t('drawResult') : result.winner === humanColor ? t('youWin') : t('youLose')}
              </h2>
              <p className="reason">{t('reason_' + result.reason)}</p>
              {typeof result.delta === 'number' && (
                <p className={`delta-line ${result.delta >= 0 ? 'delta-plus' : 'delta-minus'}`}>
                  {result.delta >= 0 ? '+' : ''}{result.delta} Elo
                </p>
              )}
              <div className="modal-actions">
                <button className="btn primary" onClick={startNewGame}>{t('newGame')}</button>
                <button className="btn" onClick={() => navigate(`/review?game=${result.gameId}`)}>{t('reviewThisGame')}</button>
                <button className="btn ghost" onClick={() => setPhase('setup')}>{t('close')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="side-col">
        <div className="panel cap-panel">
          {[[botName(level - 1), humanColor === RED ? currentPos.capturedByBlack : currentPos.capturedByRed],
            [t('youLabel'), humanColor === RED ? currentPos.capturedByRed : currentPos.capturedByBlack]]
            .map(([label, pcs], i) => (
              <div key={i} className="cap-row">
                <small className="muted">{label}</small>
                <CapturedTray pieces={pcs} />
              </div>
            ))}
        </div>

        <MoveList plies={displayPlies} current={moves.length} onSelect={() => {}} />

        <div className="btn-row">
          <button className="btn small" onClick={undo} disabled={phase !== 'playing' || thinking || !moves.length}>{t('undo')}</button>
          <button className="btn small" onClick={showHint} disabled={phase !== 'playing' || thinking || turn !== humanColor}>{t('hint')}</button>
          <button className="btn small" onClick={resign} disabled={phase !== 'playing'}>{t('resign')}</button>
          <button className="btn small" onClick={claimDraw} disabled={phase !== 'playing' || repCount < 3}>{t('drawClaim')}</button>
        </div>
        <div className="btn-row">
          <button className="btn small ghost" onClick={() => setFlipView(v => !v)}>{t('flipBoard')}</button>
          <button className="btn small primary" onClick={startNewGame}>{t('newGame')}</button>
        </div>
      </div>
    </div>
  )
}
