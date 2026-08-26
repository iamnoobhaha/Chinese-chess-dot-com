import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import MoveList from '../components/MoveList.jsx'
import { useLang } from '../i18n.jsx'
import {
  RED, START_FEN, legalMoves, legalTargetsFor,
  findLegalMove, sqToIccs, iccsToSq, sideInCheck, colorOf
} from '../engine/board.js'
import { annotatedReplay, saveGame } from '../game/positionUtils.js'
import { getProfile, renameProfile, saveProfile } from '../game/profile.js'
import { applyResult, ratingTier } from '../game/elo.js'
import { sfx } from '../game/sounds.js'
import { formatClock } from '../game/mathUtil.js'
import { OnlineClient, genRoomCode } from '../net/online.js'
import CapturedTray from '../components/CapturedTray.jsx'
import Sparkline from '../components/Sparkline.jsx'

export default function Online() {
  const { t } = useLang()
  const navigate = useNavigate()

  const [lobbyState, setLobbyState] = useState('idle')
  const [match, setMatch] = useState(null)
  const [moves, setMoves] = useState([])
  const [selected, setSelected] = useState(-1)
  const [result, setResult] = useState(null)
  const [flipView, setFlipView] = useState(false)
  const [repCount, setRepCount] = useState(0)
  const [drawState, setDrawState] = useState('none')
  const [rematchMine, setRematchMine] = useState(false)
  const [rematchTheirs, setRematchTheirs] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [myCode, setMyCode] = useState('')
  const [nameDraft, setNameDraft] = useState(null)
  const [events, setEvents] = useState([])
  const [timeChoice, setTimeChoice] = useState(0)
  const [clockView, setClockView] = useState(null)

  const clientRef = useRef(null)
  if (!clientRef.current) clientRef.current = new OnlineClient({})
  const client = clientRef.current

  const matchRef = useRef(null)
  const movesRef = useRef([])
  const finishedRef = useRef(false)
  const drawCbRef = useRef({})
  const clockRef = useRef(null)

  const positions = useMemo(() => annotatedReplay(START_FEN, moves), [moves])
  const currentPos = positions[positions.length - 1]
  const turn = currentPos.turn
  const myColor = match ? match.myColor : RED
  const prof = getProfile()

  const keyOf = pos => pos.fen.split(' ')[0]
  useEffect(() => {
    const seen = new Map()
    for (const p of positions) seen.set(keyOf(p), (seen.get(keyOf(p)) || 0) + 1)
    setRepCount(seen.get(keyOf(currentPos)) || 0)
  }, [positions])

  // game clock tick + flag fall
  useEffect(() => {
    if (!match || !match.timeMs) return
    const iv = setInterval(() => {
      const c = clockRef.current
      if (!c || finishedRef.current) return
      setClockView({ ms: [clockRemaining(c, 0), clockRemaining(c, 1)], turn: c.turn })
      if (clockRemaining(c, c.turn) <= 0) {
        const flagged = c.turn
        const winner = flagged === RED ? 1 : 0
        if (flagged === matchRef.current.myColor) client.sendFlag()
        finishOnline(winner, 'timeout')
      }
    }, 300)
    return () => clearInterval(iv)
  }, [match])

  // ---------- game end + rating ----------

  const finishOnline = (winnerColor, reason) => {
    if (finishedRef.current || !matchRef.current) return
    finishedRef.current = true
    const m = matchRef.current
    const before = getProfile()
    const score = winnerColor === null ? 0.5 : (winnerColor === m.myColor ? 1 : 0)
    const { delta, profile: np } = applyResult(before, m.opp.rating, score)
    saveProfile(np)
    if (score === 1) sfx.win()
    else if (score === 0) sfx.lose()
    else sfx.draw()
    const rec = {
      id: Date.now() + '' + ((Math.random() * 1e6) | 0),
      ts: Date.now(),
      mode: 'online',
      fen: START_FEN,
      humanColor: m.myColor,
      result: score === 1 ? 'win' : score === 0 ? 'loss' : 'draw',
      reason,
      moves: [...movesRef.current],
      oppName: m.opp.name,
      oppRating: m.opp.rating,
      ratingDelta: delta,
      ratingAfter: np.rating
    }
    saveGame(rec)
    setResult({ winner: winnerColor, reason, gameId: rec.id, delta, ratingAfter: np.rating })
  }

  const detectEnd = projPositions => {
    const last = projPositions[projPositions.length - 1]
    if (legalMoves(last.bd, last.turn).length > 0) return false
    const winner = last.turn === RED ? 1 : 0
    finishOnline(winner, sideInCheck(last.bd, last.turn) ? 'mate' : 'stalemate')
    return true
  }

  const resetClock = () => {
    const t = matchRef.current && matchRef.current.timeMs
    clockRef.current = t > 0 ? { ms: [t, t], turn: RED, stamp: Date.now() } : null
    setClockView(null)
  }

  const clockRemaining = (c, color) =>
    c.ms[color] - (color === c.turn ? Date.now() - c.stamp : 0)

  const applyMove = iccs => {
    const projected = annotatedReplay(START_FEN, [...movesRef.current, iccs])
    const last = projected[projected.length - 1]
    const mover = colorOf(last.move.piece)
    const c = clockRef.current
    if (c && !finishedRef.current) {
      c.ms[mover] = Math.max(0, c.ms[mover] - (Date.now() - c.stamp))
      c.stamp = Date.now()
      c.turn = mover ^ 1
      setClockView({ ms: [clockRemaining(c, 0), clockRemaining(c, 1)], turn: c.turn })
    }
    if (last.capture) sfx.capture()
    else sfx.move()
    if (last.checkSq >= 0) sfx.check()
    movesRef.current = [...movesRef.current, iccs]
    setMoves(movesRef.current)
    setSelected(-1)
    detectEnd(projected)
  }

  // ---------- client callbacks ----------

  useEffect(() => {
    Object.assign(drawCbRef.current, {
      onMatch: m => {
        matchRef.current = m
        finishedRef.current = false
        movesRef.current = []
        setMatch(m)
        setMoves([])
        setSelected(-1)
        setResult(null)
        setDrawState('none')
        setRematchMine(false)
        setRematchTheirs(false)
        setLobbyState('idle')
        setMyCode('')
        setFlipView(m.myColor !== RED)
        matchRef.current.timeMs = m.timeMs || 0
        resetClock()
      },
      onMove: iccs => {
        const m = matchRef.current
        if (!m || finishedRef.current) return
        if (iccs.length !== 4 || movesRef.current.length >= 500) return
        const cur = annotatedReplay(START_FEN, movesRef.current).pop()
        if (cur.turn === m.myColor) return
        const mv = findLegalMove(cur.bd, cur.turn, iccsToSq(iccs.slice(0, 2)), iccsToSq(iccs.slice(2)))
        if (!mv) return
        applyMove(sqToIccs(mv >> 8) + sqToIccs(mv & 255))
      },
      onOppResign: () => finishOnline(matchRef.current && matchRef.current.myColor, 'resign'),
      onOppFlag: () => finishOnline(matchRef.current ? (matchRef.current.myColor === RED ? 1 : 0) : RED, 'timeout'),
      onDrawOffer: () => { if (!finishedRef.current) setDrawState('received') },
      onDrawAccepted: () => finishOnline(null, 'agreement'),
      onDrawDeclined: () => setDrawState(s => (s === 'sent' ? 'none' : s)),
      onOppLeft: kind => finishOnline(matchRef.current && matchRef.current.myColor, kind === 'left' ? 'left' : 'disconnect'),
      onMatchFailed: () => setLobbyState('failed'),
      onJoinFailed: () => setLobbyState('failed'),
      onEvent: e => {
        setEvents(list => [{ ...e }, ...list].slice(0, 6))
      },
      onRematchStart: newColor => {
        matchRef.current = { ...matchRef.current, myColor: newColor }
        finishedRef.current = false
        movesRef.current = []
        setMatch({ ...matchRef.current })
        setMoves([])
        setSelected(-1)
        setResult(null)
        setDrawState('none')
        setRematchMine(false)
        setRematchTheirs(false)
        setFlipView(newColor !== RED)
        resetClock()
      }
    })
    client.h = drawCbRef.current
    client.connectLobby()
    return () => client.destroy()
  }, [])

  // ---------- local actions ----------

  const onSquare = sq => {
    if (!match || result || finishedRef.current) return
    if (turn !== myColor) return
    const bd = currentPos.bd
    if (selected >= 0 && selected !== sq) {
      const mv = findLegalMove(bd, myColor, selected, sq)
      if (mv) {
        client.sendMove(sqToIccs(selected) + sqToIccs(sq), movesRef.current.length)
        applyMove(sqToIccs(mv >> 8) + sqToIccs(mv & 255))
        return
      }
    }
    if (bd[sq] && (bd[sq] >> 3) === myColor) setSelected(sq)
    else setSelected(-1)
  }

  const resign = () => {
    if (!match || result) return
    client.sendResign()
    finishOnline(myColor === RED ? 1 : 0, 'resign')
  }

  const offerDraw = () => {
    if (!match || result || drawState === 'sent') return
    client.sendDrawOffer()
    setDrawState('sent')
  }

  const acceptDraw = () => {
    if (!match || result) return
    client.sendDrawAccept()
    finishOnline(null, 'agreement')
  }

  const declineDraw = () => {
    if (drawState !== 'received') return
    client.sendDrawDecline()
    setDrawState('none')
  }

  const claimRep = () => {
    if (!match || result || repCount < 3) return
    finishOnline(null, 'repetition')
  }

  const requestRematch = () => {
    if (rematchMine) return
    client.sendRematch()
    setRematchMine(true)
  }

  const backToLobby = () => {
    client.leaveRoom()
    matchRef.current = null
    finishedRef.current = false
    clockRef.current = null
    setClockView(null)
    setMatch(null)
    setResult(null)
    setMoves([])
    movesRef.current = []
    setLobbyState('idle')
    setMyCode('')
    setDrawState('none')
    setRematchMine(false)
    setRematchTheirs(false)
  }

  // ---------- lobby actions ----------

  const startSearch = () => { client.seek(getProfile(), { timeMs: timeChoice }); setLobbyState('searching') }
  const cancelSearch = () => { client.cancelSeek(); setLobbyState('idle') }
  const createRoom = () => {
    const code = genRoomCode()
    client.openRoom(code, getProfile(), { timeMs: timeChoice })
    setMyCode(code)
    setLobbyState('hosting')
  }
  const cancelHost = () => { client.closeRoom(); setLobbyState('idle'); setMyCode('') }
  const joinByCode = () => {
    const code = codeInput.trim().toUpperCase()
    if (code.length < 3) return
    client.joinRoom(code, getProfile())
    setLobbyState('joining')
  }
  const cancelJoin = () => { client.cancelJoin(); setLobbyState('idle') }

  const saveName = () => {
    renameProfile(nameDraft ?? '')
    setNameDraft(null)
  }

  const supported = client.supported()

  // ---------- shared render helpers ----------

  const orientation = flipView ? 1 : 0
  const targets = selected >= 0 && turn === myColor
    ? legalTargetsFor(currentPos.bd, turn, selected)
    : new Set()
  const displayPlies = positions.slice(1).map((p, j) => ({
    plyIndex: j,
    mover: p.move ? (p.move.piece >> 3) : 0,
    chinese: p.chinese || p.iccs,
    cls: null
  }))

  const tier = ratingTier(prof.rating)
  const record = `${prof.wins}W / ${prof.losses}L / ${prof.draws}D`

  const statusText = () => {
    if (result) return ''
    if (turn === myColor) return (currentPos.checkSq >= 0 ? t('check') + ' ' : '') + t('yourTurn')
    return t('oppTurn')
  }

  const reasonText = r => ({
    mate: t('byCheckmate'),
    stalemate: t('byStalemate'),
    resign: result && result.winner === myColor ? t('opponentResigned') : t('youResigned'),
    agreement: t('drawAgreed'),
    repetition: t('byRepetition'),
    disconnect: t('oppDisconnected'),
    left: t('oppLeftGame'),
    timeout: result && result.winner === myColor ? t('oppFlagged') : t('youFlagged')
  }[r] || '')

  const playerBar = (who, color) => {
    const clockMs = clockView ? clockView.ms[color] : (match.timeMs || null)
    const low = typeof clockMs === 'number' && clockMs < 30000
    return (
      <div className="panel opponent-bar">
        <span className={`avatar-ol ${color === RED ? 'red-side' : 'black-side'}`}>
          {(who.name || '?').slice(0, 1)}
        </span>
        <div>
          <strong>{who.name}{color === myColor ? ` (${t('youLabel')})` : ''}</strong>
          <small>{who.rating} Elo</small>
          <CapturedTray pieces={color === RED ? currentPos.capturedByRed : currentPos.capturedByBlack} />
        </div>
        {match.timeMs > 0 && (
          <span className={`clock-chip ${clockView && clockView.turn === color && !result ? 'active' : ''} ${low ? 'low' : ''}`}>
            {formatClock(typeof clockMs === 'number' ? Math.max(0, clockMs) : match.timeMs)}
          </span>
        )}
        {!match.timeMs && color !== myColor && <span className="status-chip">{statusText()}</span>}
      </div>
    )
  }

  // ---------- lobby ----------

  if (!match) {
    return (
      <div className="page">
        <h1>{t('online')}</h1>
        {!supported && <p className="warn-banner">{t('bcUnsupported')}</p>}
        <div className="lobby-grid">
          <div className="card profile-card">
            <span className="avatar-ol big">{(prof.name || '?').slice(0, 1)}</span>
            <div className="profile-main">
              {nameDraft === null ? (
                <strong className="profile-name">
                  {prof.name}
                  <button className="btn ghost small" onClick={() => setNameDraft(prof.name)}>{t('editName')}</button>
                </strong>
              ) : (
                <span className="name-edit">
                  <input value={nameDraft} maxLength={16} onChange={e => setNameDraft(e.target.value)} />
                  <button className="btn small primary" onClick={saveName}>{t('saveBtn')}</button>
                </span>
              )}
              <div className="rating-line">
                <span className="rating-big">{prof.rating}</span>
                <span className="tier-chip">{t(tier.key)}</span>
              </div>
              <small className="muted">{t('record')} {record} · {t('peak')} {prof.peak}</small>
              <Sparkline points={[...prof.history].reverse().map(h => h.rating)} />
            </div>
          </div>

          <div className="card lobby-card">
            {lobbyState === 'searching' ? (
              <>
                <div className="spin-row"><span className="spinner" />{t('searchingOpponent')}</div>
                <button className="btn ghost" onClick={cancelSearch}>{t('cancelSearch')}</button>
              </>
            ) : lobbyState === 'hosting' ? (
              <>
                <p className="muted">{t('shareCodeHint')}</p>
                <div className="room-code">{myCode}</div>
                <div className="spin-row"><span className="spinner" />{t('waitingForOpponent')}</div>
                <button className="btn ghost" onClick={cancelHost}>{t('cancelSearch')}</button>
              </>
            ) : lobbyState === 'joining' ? (
              <>
                <div className="spin-row"><span className="spinner" />{t('joiningRoom')}</div>
                <button className="btn ghost" onClick={cancelJoin}>{t('cancelSearch')}</button>
              </>
            ) : (
              <>
                <h2>{t('quickMatch')}</h2>
                <p className="muted hint-line">{t('quickMatchHint')}</p>
                <div className="tc-row">
                  <small className="muted">{t('timeControl')}</small>
                  <div className="tc-opts">
                    {[[0, 'tcUnlimited'], [900000, 'tc15'], [600000, 'tc10'], [300000, 'tc5']].map(([v, k]) => (
                      <button key={k} className={`btn small ${timeChoice === v ? 'primary' : ''}`} onClick={() => setTimeChoice(v)}>{t(k)}</button>
                    ))}
                  </div>
                </div>
                <button className="btn primary big" disabled={!supported} onClick={startSearch}>{t('quickMatch')}</button>
                <h2>{t('privateRoom')}</h2>
                <div className="room-row">
                  <input
                    className="code-input"
                    placeholder={t('roomCode')}
                    value={codeInput}
                    maxLength={6}
                    onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  />
                  <button className="btn" disabled={!supported || codeInput.trim().length < 3} onClick={joinByCode}>{t('joinBtn')}</button>
                </div>
                <button className="btn big" disabled={!supported} onClick={createRoom}>{t('createRoomBtn')}</button>
                {lobbyState === 'failed' && <p className="fail-msg">{t('matchFailed')}</p>}
              </>
            )}
            {events.length > 0 && (
              <div className="net-log">
                <div className="muted net-log-title">{t('activityLabel')}</div>
                {events.map((e, i) => (
                  <div key={`${e.t}-${i}`} className="net-log-row">
                    [{new Date(e.t).toLocaleTimeString([], { hour12: false })}] {e.kind}{e.detail ? ` ← ${e.detail}` : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ---------- in game / over ----------

  const opp = { name: match.opp.name, rating: match.opp.rating }
  const me = { name: prof.name, rating: prof.rating }

  return (
    <div className="page play-page">
      <div className="board-col">
        {playerBar(opp, myColor === RED ? 1 : 0)}
        <Board
          bd={currentPos.bd}
          orientation={orientation}
          selected={selected}
          targets={targets}
          lastMove={currentPos.lastFrom >= 0 ? { from: currentPos.lastFrom, to: currentPos.lastTo } : null}
          checkSq={currentPos.checkSq}
          arrow={null}
          onSquare={onSquare}
          interactive={!result && turn === myColor}
          moveSeq={moves.length}
        />
        {playerBar(me, myColor)}

        {result && (
          <div className="modal-overlay">
            <div className="modal card">
              <h2 className={
                result.winner === null ? 'draw-text' : (result.winner === myColor ? 'win-text' : 'lose-text')
              }>
                {result.winner === null ? t('drawResult') : result.winner === myColor ? t('youWin') : t('youLose')}
              </h2>
              <p className="reason">{reasonText(result.reason)}</p>
              <p className={`delta-line ${result.delta >= 0 ? 'delta-plus' : 'delta-minus'}`}>
                {result.delta >= 0 ? '+' : ''}{result.delta} Elo → {result.ratingAfter}
              </p>
              <div className="modal-actions">
                {!rematchMine && !rematchTheirs && (
                  <button className="btn primary" onClick={requestRematch}>{t('rematch')}</button>
                )}
                {rematchMine && !rematchTheirs && <p className="muted">{t('rematchPending')}</p>}
                {rematchTheirs && !rematchMine && (
                  <button className="btn primary" onClick={requestRematch}>{t('opponentWantsRematch')}</button>
                )}
                <button className="btn" onClick={() => navigate(`/review?game=${result.gameId}`)}>{t('reviewThisGame')}</button>
                <button className="btn ghost" onClick={backToLobby}>{t('leaveRoom')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="side-col">
        <MoveList plies={displayPlies} current={moves.length} onSelect={() => {}} />

        {drawState === 'received' && !result && (
          <div className="panel draw-prompt">
            <p>{t('opponentOffersDraw')}</p>
            <div className="btn-row">
              <button className="btn small primary" onClick={acceptDraw}>{t('accept')}</button>
              <button className="btn small" onClick={declineDraw}>{t('decline')}</button>
            </div>
          </div>
        )}

        <div className="btn-row">
          <button className="btn small" onClick={resign} disabled={!!result}>{t('resign')}</button>
          <button className="btn small" onClick={offerDraw} disabled={!!result || drawState === 'sent'}>{t('offerDraw')}</button>
          <button className="btn small" onClick={claimRep} disabled={!!result || repCount < 3}>{t('drawClaim')}</button>
        </div>
        <div className="btn-row">
          <button className="btn small ghost" onClick={() => setFlipView(v => !v)}>{t('flipBoard')}</button>
          <button className="btn small ghost" onClick={backToLobby}>{t('leaveRoom')}</button>
        </div>
        {drawState === 'sent' && !result && <p className="muted center-note">{t('drawOfferPending')}</p>}
      </div>
    </div>
  )
}
