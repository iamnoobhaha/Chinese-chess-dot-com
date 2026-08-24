import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Board from '../components/Board.jsx'
import { useLang } from '../i18n.jsx'
import {
  START_FEN, RED, legalMoves, findLegalMove, sqToIccs, iccsToSq
} from '../engine/board.js'
import { annotatedReplay } from '../game/positionUtils.js'
import { ALL_LESSONS, STRATEGY_ARTICLES } from '../data/lessons.js'

const CATS = [
  { key: 'opening', titleKey: 'openingsCat' },
  { key: 'endgame', titleKey: 'endgamesCat' },
  { key: 'strategy', titleKey: 'strategyCat' }
]

export default function Learn() {
  const { cat, id } = useParams()
  const navigate = useNavigate()

  if (cat === 'strategy' && id) {
    const article = STRATEGY_ARTICLES.find(a => a.id === id)
    return <ArticleReader article={article} onBack={() => navigate('/learn/strategy')} />
  }
  if (cat && id) {
    const lesson = ALL_LESSONS.find(l => l.id === id)
    if (!lesson) return <LessonList activeCat={cat} />
    return <LessonPlayer lesson={lesson} onBack={() => navigate(`/learn/${lesson.cat}`)} />
  }

  return <LessonList activeCat={cat || 'opening'} />
}

function LessonList({ activeCat }) {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const lessons = ALL_LESSONS.filter(l => l.cat === activeCat)
  const articles = STRATEGY_ARTICLES

  return (
    <div className="page">
      <h1>{t('learn')}</h1>
      <div className="cat-tabs">
        {CATS.map(c => (
          <button key={c.key} className={`cat-tab ${activeCat === c.key ? 'active' : ''}`}
            onClick={() => navigate(`/learn/${c.key}`)}>
            {t(c.titleKey)}
          </button>
        ))}
      </div>

      {activeCat === 'strategy' ? (
        <div className="cards-grid">
          {articles.map(a => (
            <button key={a.id} className="card lesson-card" onClick={() => navigate(`/learn/strategy/${a.id}`)}>
              <span className="lesson-icon strategy">策</span>
              <strong>{lang === 'zh' ? a.titleZh : a.titleEn}</strong>
              <small>{a.readMin} {t('minutes')}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="cards-grid">
          {lessons.map(l => (
            <button key={l.id} className="card lesson-card" onClick={() => navigate(`/learn/${l.cat}/${l.id}`)}>
              <span className={`lesson-icon ${l.cat}`}>{l.icon}</span>
              <strong>{lang === 'zh' ? l.titleZh : l.titleEn}</strong>
              <small>{l.descZh && (lang === 'zh' ? '' : '')}{lang === 'zh' ? l.descZh : l.descEn}</small>
              <span className="muted">{l.moves.length} {t('movesLabel')} · {l.minutes} {t('minutes')}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ArticleReader({ article, onBack }) {
  const { t, lang } = useLang()
  if (!article) return null

  return (
    <div className="page article-page">
      <button className="btn ghost small" onClick={onBack}>← {t('backToList')}</button>
      <h1>{lang === 'zh' ? article.titleZh : article.titleEn}</h1>
      <article>
        {article.blocks.map((b, i) => {
          if (b.type === 'h') return <h3 key={i}>{lang === 'zh' ? b.zh : b.en}</h3>
          if (b.type === 'p') return <p key={i}>{lang === 'zh' ? b.zh : b.en}</p>
          if (b.type === 'list') return (
            <ul key={i}>
              {b.items.map((it, j) => <li key={j}>{lang === 'zh' ? it.zh : it.en}</li>)}
            </ul>
          )
          if (b.type === 'table') return (
            <table key={i} className="value-table">
              <tbody>
                {b.rows.map((row, j) => (
                  <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          )
          if (b.type === 'diagram') return (
            <figure key={i} className="diagram">
              <DiagramFen fen={b.fen} />
              <figcaption>{lang === 'zh' ? b.captionZh : b.captionEn}</figcaption>
            </figure>
          )
          return null
        })}
      </article>
    </div>
  )
}

function DiagramFen({ fen }) {
  const positions = useMemo(() => annotatedReplay(fen, []), [fen])
  return <Board bd={positions[0].bd} interactive={false} mini />
}

function LessonPlayer({ lesson, onBack }) {
  const { t, lang } = useLang()
  const [mode, setMode] = useState('demo')
  const [step, setStep] = useState(0)
  const [wrongSq, setWrongSq] = useState(-1)
  const [mistakes, setMistakes] = useState(0)
  const [hintArrow, setHintArrow] = useState(null)
  const [selected, setSelected] = useState(-1)
  const autoTimer = useRef(null)

  const movesSoFar = useMemo(() => lesson.moves.slice(0, step), [lesson.moves, step])
  const positions = useMemo(() => annotatedReplay(lesson.fen || START_FEN, movesSoFar), [lesson.fen, movesSoFar])
  const pos = positions[positions.length - 1]

  const done = step >= lesson.moves.length
  const userSide = lesson.userSide ?? RED
  const userToMove = !done && pos.turn === userSide

  const note = useMemo(() => {
    if (done) return null
    const candidates = lesson.notes.filter(n => n.ply === step - 1)
    if (candidates.length) return candidates[candidates.length - 1]
    const intro = lesson.notes.filter(n => n.ply === -1)
    if (intro.length) return intro[intro.length - 1]
    return null
  }, [lesson, step, done])

  useEffect(() => {
    setHintArrow(null)
    setWrongSq(-1)
  }, [step])

  useEffect(() => () => clearTimeout(autoTimer.current), [])

  useEffect(() => {
    if (mode !== 'practice' || done || userToMove) return
    autoTimer.current = setTimeout(() => setStep(s => s + 1), 650)
    return () => clearTimeout(autoTimer.current)
  }, [mode, done, userToMove, pos.turn])

  const tryMove = (from, to) => {
    const expectedIccs = lesson.moves[step]
    const mv = findLegalMove(pos.bd, pos.turn, from, to)
    if (!mv) return false
    const iccs = sqToIccs(from) + sqToIccs(to)
    if (iccs !== expectedIccs) {
      setWrongSq(to)
      setMistakes(m => m + 1)
      if (mistakes + 1 >= 2) {
        setHintArrow({
          from: iccsToSq(expectedIccs.slice(0, 2)),
          to: iccsToSq(expectedIccs.slice(2, 4)),
          color: '#f7c631'
        })
      }
      setTimeout(() => setWrongSq(-1), 600)
      setSelected(-1)
      return true
    }
    setSelected(-1)
    setHintArrow(null)
    setStep(s => s + 1)
    return true
  }

  const targets = new Set()
  if (mode === 'practice' && selected >= 0 && userToMove) {
    for (const mv of legalMoves(pos.bd, pos.turn)) {
      if ((mv >> 8) === selected) targets.add(mv & 255)
    }
  }

  const onBoardClick = sq => {
    if (mode === 'demo') return
    if (!userToMove || done) return
    if (selected >= 0 && selected !== sq) {
      const mv = findLegalMove(pos.bd, pos.turn, selected, sq)
      if (mv) { tryMove(selected, sq); return }
    }
    if (pos.bd[sq] && (pos.bd[sq] >> 3) === userSide) setSelected(sq)
    else setSelected(-1)
  }

  const resetPractice = () => {
    setMode('practice')
    setStep(0)
    setSelected(-1)
    setMistakes(0)
    setHintArrow(null)
  }

  return (
    <div className="page learn-player">
      <div className="board-col">
        <Board
          bd={pos.bd}
          orientation={RED}
          lastMove={pos.lastFrom >= 0 ? { from: pos.lastFrom, to: pos.lastTo } : null}
          checkSq={pos.checkSq}
          arrow={hintArrow && hintArrow.from >= 0 ? hintArrow : null}
          selected={selected}
          targets={targets}
          onSquare={onBoardClick}
          interactive={mode === 'practice'}
        />
        {wrongSq >= 0 && <div className="shake-note error">{t('practiceWrong')}</div>}
        {done && mode === 'practice' && (
          <div className="modal-overlay">
            <div className="modal card">
              <h2 className="win-text">{t('practiceDone')}</h2>
              <div className="modal-actions">
                <button className="btn" onClick={resetPractice}>{t('restart')}</button>
                <button className="btn primary" onClick={onBack}>{t('backToList')}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="side-col">
        <div className="panel">
          <button className="btn ghost small" onClick={onBack}>← {t('backToList')}</button>
          <h2 style={{ margin: '10px 0 4px' }}>{lang === 'zh' ? lesson.titleZh : lesson.titleEn}</h2>
        </div>

        <div className="panel">
          <div className="tabs">
            <button className={mode === 'demo' ? 'active' : ''} onClick={() => setMode('demo')}>{t('demoMode')}</button>
            <button className={mode === 'practice' ? 'active' : ''} onClick={resetPractice}>{t('practiceMode')}</button>
          </div>

          {note && (
            <p className="lesson-note">
              {lang === 'zh' ? note.zh : note.en}
            </p>
          )}
          {!note && !done && (
            <p className="lesson-note muted">
              {mode === 'practice' && userToMove ? t('practiceYourMove') : ''}
            </p>
          )}

          {done && mode === 'demo' && (
            <>
              <p className="lesson-note win-text">{t('practiceDone')}</p>
              <button className="btn primary" onClick={resetPractice}>{t('practiceMode')}</button>
            </>
          )}

          <div className="btn-row">
            <button className="btn small" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
              ◀ {t('prevStep')}
            </button>
            <span className="ply-label">{step}/{lesson.moves.length}</span>
            <button className="btn small" disabled={done} onClick={() => setStep(s => Math.min(lesson.moves.length, s + 1))}>
              {t('nextStep')} ▶
            </button>
          </div>

          {mode === 'practice' && !done && (
            <div className="progress-bar"><div style={{ width: (step / lesson.moves.length * 100) + '%' }} /></div>
          )}
        </div>
      </div>
    </div>
  )
}
