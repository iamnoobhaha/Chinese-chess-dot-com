import { useCallback, useEffect, useMemo, useState } from 'react'
import Board from '../components/Board.jsx'
import { useLang } from '../i18n.jsx'
import { sfx } from '../game/sounds.js'
import {
  parseFen, findLegalMove, sqToIccs, iccsToSq, legalTargetsFor
} from '../engine/board.js'
import {
  buildPuzzlePool, mergePools, getProgress, gradeAttempt,
  isSolution, validatePuzzle, emptyProgress, readMined
} from '../game/puzzles.js'

export default function Train() {
  const { t, lang } = useLang()
  const [progress, setProgress] = useState(() => getProgress())
  const [source, setSource] = useState('curated')
  const [puzzle, setPuzzle] = useState(null)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(-1)
  const [status, setStatus] = useState('idle') // idle | solved | failed
  const [showHint, setShowHint] = useState(false)
  const [lastDelta, setLastDelta] = useState(0)
  const [wrongMoves, setWrongMoves] = useState([])

  const pool = useMemo(() => {
    const base = buildPuzzlePool(progress)
    if (source === 'curated') return base
    return mergePools(base, readMined(), progress)
  }, [progress, source])

  const load = useCallback((list, i) => {
    const valid = list.map(validatePuzzle).filter(Boolean)
    if (!valid.length) return
    const p = valid[((i % valid.length) + valid.length) % valid.length]
    setPuzzle(p)
    setStatus('idle')
    setSelected(-1)
    setShowHint(false)
    setWrongMoves([])
    setLastDelta(0)
  }, [])

  useEffect(() => {
    if (!puzzle && pool.length) load(pool, 0)
  }, [pool, puzzle, load])

  const board = useMemo(() => {
    if (!puzzle) return null
    const st = parseFen(puzzle.fen)
    return st
  }, [puzzle])

  const targets = useMemo(() => {
    if (!board || selected < 0 || status !== 'idle') return new Set()
    return legalTargetsFor(board.bd, board.turn, selected)
  }, [board, selected, status])

  const finish = (solved, playedIccs) => {
    const { progress: np, delta } = gradeAttempt(progress, puzzle, solved)
    setProgress(np)
    setLastDelta(delta)
    setStatus(solved ? 'solved' : 'failed')
    if (solved) sfx.success(); else sfx.fail()
    if (!solved && playedIccs) setWrongMoves(w => [...w, playedIccs])
  }

  const tryMove = (from, to) => {
    if (!board || status !== 'idle') return
    const iccs = sqToIccs(from) + sqToIccs(to)
    const mv = findLegalMove(board.bd, board.turn, from, to)
    if (!mv) {
      setWrongMoves(w => [...w, iccs])
      sfx.reject()
      return
    }
    if (isSolution(puzzle, iccs)) {
      setSelected(-1)

      finish(true, iccs)
      return
    }
    setWrongMoves(w => [...w, iccs])
    setSelected(-1)
    sfx.move()
    // three wrong tries and the answer appears
    if (wrongMoves.length + 1 >= 2) setShowHint(true)
  }

  const next = () => {
    setIndex(i => i + 1)
    load(pool, index + 1)
  }

  const skip = () => {
    const { progress: np } = gradeAttempt(progress, puzzle, false)
    setProgress(np)
    setLastDelta(0)
    next()
  }

  const onSquare = sq => {
    if (!board || status !== 'idle') return
    if (selected >= 0 && selected !== sq) {
      const mv = findLegalMove(board.bd, board.turn, selected, sq)
      if (mv) { tryMove(selected, sq); return }
    }
    if (board.bd[sq] && (board.bd[sq] >> 3) === board.turn) setSelected(sq)
    else setSelected(-1)
  }

  const hintArrow = useMemo(() => {
    if (!puzzle || !showHint) return null
    const iccs = puzzle.solution[0]
    return {
      from: iccsToSq(iccs.slice(0, 2)),
      to: iccsToSq(iccs.slice(2, 4)),
      color: '#f7c631'
    }
  }, [puzzle, showHint])

  const accuracy = progress.seen ? Math.round((progress.correct / progress.seen) * 100) : 0
  const remaining = pool.filter(p => !progress.solved[p.id]).length

  if (!puzzle || !board) {
    return (
      <div className="page">
        <h1>{t('train')}</h1>
        <div className="card"><p className="muted">{t('trainLoading')}</p></div>
      </div>
    )
  }

  return (
    <div className="page train-page">
      <div className="board-col">
        <Board
          bd={board.bd}
          orientation={board.turn}
          selected={selected}
          targets={targets}
          arrow={hintArrow}
          interactive={status === 'idle'}
          onSquare={onSquare}
          onDrop={tryMove}
        />
        {status === 'solved' && (
          <div className="train-banner win-text">{t('trainSolved')} {lastDelta > 0 ? `+${lastDelta}` : ''}</div>
        )}
        {status === 'failed' && (
          <div className="train-banner lose-text">{t('trainTryAgain')}</div>
        )}
      </div>

      <div className="side-col">
        <div className="panel">
          <div className="tabs">
            {['curated', 'mine'].map(k => (
              <button key={k} className={source === k ? 'active' : ''} onClick={() => { setSource(k); setPuzzle(null); setIndex(0) }}>
                {k === 'curated' ? t('trainCurated') : t('trainMine')}
              </button>
            ))}
          </div>
          <div className="train-meta">
            <strong>{lang === 'zh' ? puzzle.titleZh : puzzle.titleEn}</strong>
            <small className="muted">
              {t('difficulty')} {puzzle.rating} · {puzzle.source === 'game' ? t('fromYourGame') : t('classic')}
            </small>
          </div>
        </div>

        <div className="panel stats-row">
          <div className="stat"><b>{progress.rating}</b><small className="muted">{t('puzzleRating')}</small></div>
          <div className="stat"><b>{progress.streak}</b><small className="muted">{t('streak')}</small></div>
          <div className="stat"><b>{accuracy}%</b><small className="muted">{t('accuracy')}</small></div>
          <div className="stat"><b>{remaining}</b><small className="muted">{t('unsolved')}</small></div>
        </div>

        <div className="panel">
          {status === 'idle' ? (
            <>
              <p className="lesson-note">{t('trainFindBest')}</p>
              <div className="btn-row">
                <button className="btn small ghost" onClick={() => setShowHint(true)}>{t('showHintBtn')}</button>
                <button className="btn small ghost" onClick={skip}>{t('skip')}</button>
              </div>
              {showHint && (
                <p className="lesson-note">{lang === 'zh' ? puzzle.hintZh : puzzle.hintEn}</p>
              )}
              {wrongMoves.length > 0 && (
                <p className="muted center-note">{t('tries')}: {wrongMoves.length}</p>
              )}
            </>
          ) : (
            <>
              <p className="lesson-note">
                {lang === 'zh' ? puzzle.hintZh : puzzle.hintEn}
              </p>
              <p className="muted">
                {t('solution')}: <code>{puzzle.solution[0]}</code>
              </p>
              <button className="btn primary big" onClick={next}>{t('nextPuzzle')}</button>
            </>
          )}
        </div>

        <div className="panel">
          <h4 className="panel-title">{t('trainStats')}</h4>
          <div className="progress-bar"><div style={{ width: (progress.seen ? progress.correct / progress.seen : 0) * 100 + '%' }} /></div>
          <small className="muted">
            {t('solved')} {progress.correct} / {progress.seen} · {t('bestStreak')} {progress.bestStreak}
          </small>
          <div className="btn-row">
            <button className="btn small ghost danger" onClick={() => {
              if (progress.seen > 0 && confirm(t('resetConfirm'))) setProgress(emptyProgress())
            }}>{t('resetProgress')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
