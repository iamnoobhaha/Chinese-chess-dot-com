import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import MoveList from '../components/MoveList.jsx'
import { useLang } from '../i18n.jsx'
import { engine } from '../engine/client.js'
import {
  START_FEN, RED, legalMoves, legalTargetsFor,
  findLegalMove, sqToIccs, sideInCheck
} from '../engine/board.js'
import { annotatedReplay, saveGame } from '../game/positionUtils.js'
import { getProfile, saveProfile } from '../game/profile.js'
import { AI_LEVEL_RATINGS, applyResult, ratingTier } from '../game/elo.js'

const LEVELS = 8

export default function Play() {
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('setup')
  const [colorChoice, setColorChoice] = useState(RED)
  const [level, setLevel] = useState(3)
  const [humanColor, setHumanColor] = useState(RED)

  const [moves, setMoves] = useState([])
  const [selected, setSelected] = useState(-1)
  const [thinking, setThinking] = useState(false)
  const [arrow, setArrow] = useState(null)
  const [flipView, setFlipView] = useState(false)
  const [result, setResult] = useState(null)
  const [repCount, setRepCount] = useState(0)

  const busyRef = useRef(false)
  const movesRef = useRef([])

  const positions = useMemo(() => annotatedReplay(START_FEN, moves), [moves])
  const currentPos = positions[positions.length - 1]
  const turn = currentPos.turn

  const botName = i => (lang === 'zh'
    ? ['初學者', '業餘棋手', '中級棋手', '高級棋手', '專家', '大師', '特級大師', '極限'][i]
    : ['Beginner', 'Casual', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Grandmaster', 'Maximum'][i])

  const keyOf = pos => pos.fen.split(' ')[0]

  useEffect(() => {
    const seen = new Map()
    for (const p of positions) {
      const k = keyOf(p)
      seen.set(k, (seen.get(k) || 0) + 1)
    }
    setRepCount(seen.get(keyOf(currentPos)) || 0)
  }, [positions])

  const finishGame = (winnerColor, reason) => {
    const before = getProfile()
    const oppRating = AI_LEVEL_RATINGS[level - 1]
    const score = winnerColor === null ? 0.5 : (winnerColor === humanColor ? 1 : 0)
    const { delta, profile: updated } = applyResult(before, oppRating, score)
    saveProfile(updated)
    const rec = {
      id: Date.now() + '' + ((Math.random() * 1e6) | 0),
      ts: Date.now(),
      mode: 'ai',
      level,
      humanColor,
      fen: START_FEN,
      result: winnerColor === null ? 'draw' : (winnerColor === humanColor ? 'win' : 'loss'),
      reason,
      moves: [...movesRef.current],
      oppRating,
      ratingDelta: delta,
      ratingAfter: updated.rating
    }
    saveGame(rec)
    setResult({ winner: winnerColor, reason, gameId: rec.id, delta })
    setPhase('over')
  }

  const detectEnd = projPositions => {
    const last = projPositions[projPositions.length - 1]
    if (legalMoves(last.bd, last.turn).length > 0) return false
    const mated = sideInCheck(last.bd, last.turn)
    const winner = last.turn === RED ? 1 : 0
    finishGame(winner, mated ? 'mate' : 'stalemate')
    return true
  }

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
          finishGame(humanColor, sideInCheck(last.bd, last.turn) ? 'mate' : 'stalemate')
          return
        }
        const projected = annotatedReplay(START_FEN, [...movesRef.current, res.moveIccs])
        movesRef.current = [...movesRef.current, res.moveIccs]
        setMoves(movesRef.current)
        setArrow(null)
        setSelected(-1)
        detectEnd(projected)
      })
      .catch(() => { busyRef.current = false; setThinking(false) })
  }, [phase, turn, humanColor, level])

  const onSquare = sq => {
    if (phase !== 'playing' || thinking) return
    if (turn !== humanColor) return
    const bd = currentPos.bd
    if (selected >= 0 && selected !== sq) {
      const mv = findLegalMove(bd, humanColor, selected, sq)
      if (mv) {
        const iccs = sqToIccs(selected) + sqToIccs(sq)
        const projected = annotatedReplay(START_FEN, [...movesRef.current, iccs])
        movesRef.current = [...movesRef.current, iccs]
        setMoves(movesRef.current)
        setSelected(-1)
        setArrow(null)
        detectEnd(projected)
        return
      }
    }
    if (bd[sq] && (bd[sq] >> 3) === humanColor) {
      setSelected(sq)
    } else {
      setSelected(-1)
    }
  }

  const targets = selected >= 0 ? legalTargetsFor(currentPos.bd, currentPos.turn, selected) : new Set()

  const startNewGame = () => {
    engine.cancel()
    busyRef.current = false
    let hc = colorChoice
    if (hc === 2) hc = Math.random() < 0.5 ? RED : 1
    setHumanColor(hc)
    setFlipView(hc !== RED)
    movesRef.current = []
    setMoves([])
    setSelected(-1)
    setArrow(null)
    setResult(null)
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
  }

  const resign = () => {
    if (phase !== 'playing') return
    engine.cancel()
    busyRef.current = false
    finishGame(humanColor === RED ? 1 : 0, 'resign')
  }

  const claimDraw = () => {
    if (phase !== 'playing' || repCount < 3) return
    engine.cancel()
    busyRef.current = false
    finishGame(null, 'repetition')
  }

  const showHint = () => {
    if (phase !== 'playing' || thinking || turn !== humanColor) return
    engine.hint({ fen: START_FEN, moves: movesRef.current }).then(res => {
      if (res.bestFrom >= 0) setArrow({ from: res.bestFrom, to: res.bestTo, color: '#38a3d1' })
    }).catch(() => {})
  }

  const orientation = flipView ? 1 : 0
  const displayPlies = positions.slice(1).map((p, j) => ({
    plyIndex: j,
    mover: p.move ? (p.move.piece >> 3) : 0,
    chinese: p.chinese || p.iccs,
    cls: null
  }))

  const statusText = () => {
    if (result) return ''
    if (thinking) return t('thinking')
    if (currentPos.checkSq >= 0 && turn === humanColor) return t('check') + ' ' + t('yourTurn')
    return turn === humanColor ? t('yourTurn') : t('thinking')
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
          <button className="btn primary big" onClick={startNewGame}>{t('startGame')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page play-page">
      <div className="board-col">
        <Board
          bd={currentPos.bd}
          orientation={orientation}
          selected={selected}
          targets={targets}
          lastMove={currentPos.lastFrom >= 0 ? { from: currentPos.lastFrom, to: currentPos.lastTo } : null}
          checkSq={currentPos.checkSq}
          arrow={arrow}
          onSquare={onSquare}
          interactive={phase === 'playing' && !thinking && turn === humanColor}
        />
        {result && (
          <div className="modal-overlay">
            <div className="modal card">
              <h2 className={
                result.winner === null ? 'draw-text' : (result.winner === humanColor ? 'win-text' : 'lose-text')
              }>
                {result.winner === null ? t('drawResult') : result.winner === humanColor ? t('youWin') : t('youLose')}
              </h2>
              <p className="reason">
                {result.reason === 'mate' ? t('byCheckmate')
                  : result.reason === 'stalemate' ? t('byStalemate')
                  : result.reason === 'resign' ? t('youResigned')
                  : t('byRepetition')}
              </p>
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
        <div className="panel opponent-bar">
          <span className="avatar ai-avatar">AI</span>
          <div>
            <strong>{botName(level - 1)}</strong>
            <small>Lv.{level}</small>
          </div>
          <span className="status-chip">{statusText()}</span>
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
