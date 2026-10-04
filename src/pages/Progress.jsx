import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sparkline from '../components/Sparkline.jsx'
import { useLang } from '../i18n.jsx'
import { getProfile } from '../game/profile.js'
import { ratingTier, AI_LEVEL_RATINGS } from '../game/elo.js'
import { getProgress, minedCount } from '../game/puzzles.js'
import { reviewStatsSummary, getReviewStats } from '../game/reviewStats.js'
import ClassIcon, { CLASS_ORDER, classLabel } from '../components/ClassIcon.jsx'

const WEAK_CLASSES = ['blunder', 'mistake', 'missedWin', 'missedDraw', 'timeLoss', 'inaccuracy']

/**
 * Progress: rating history, review accuracy trend, move-class profile and the
 * puzzle-trainer state — all read from localStorage, no engine needed.
 */
export default function Progress() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [, bump] = useState(0)

  useEffect(() => {
    const onFocus = () => bump(n => n + 1)
    window.addEventListener('storage', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  const prof = getProfile()
  const tier = ratingTier(prof.rating)
  const puzzles = getProgress()
  const stats = useMemo(() => reviewStatsSummary(), [])
  const recent = useMemo(() => getReviewStats().slice(0, 8), [])

  const classProfile = stats.counts
  const weakness = useMemo(() => {
    const totalBad = WEAK_CLASSES.reduce((s, c) => s + (classProfile[c] || 0), 0)
    if (!totalBad) return null
    const worst = WEAK_CLASSES.reduce((w, c) =>
      ((classProfile[c] || 0) > (classProfile[w] || 0) ? c : w), WEAK_CLASSES[0])
    return { cls: worst, count: classProfile[worst], total: totalBad }
  }, [classProfile])

  const totalMoves = Object.values(classProfile).reduce((a, b) => a + b, 0)
  const puzzleAcc = puzzles.seen ? Math.round((puzzles.correct / puzzles.seen) * 100) : 0

  return (
    <div className="page progress-page">
      <h1>{t('progress')}</h1>

      <div className="stat-cards">
        <div className="card stat-card">
          <span className="muted">{t('rating')}</span>
          <b className="rating-big">{prof.rating}</b>
          <span className="tier-chip">{t(tier.key)}</span>
          <Sparkline points={[...prof.history].reverse().map(h => h.rating)} />
          <small className="muted">{t('record')} {prof.wins}W / {prof.losses}L / {prof.draws}D · {t('peak')} {prof.peak}</small>
        </div>

        <div className="card stat-card">
          <span className="muted">{t('reviewAccuracy')}</span>
          <b className="rating-big">{stats.games ? stats.accuracy + '%' : '—'}</b>
          <Sparkline points={stats.history.map(h => h.accuracy)} />
          <small className="muted">
            {stats.games} {t('gamesReviewed')} · {t('averageCentipawnLoss')} {stats.acpl}
          </small>
        </div>

        <div className="card stat-card">
          <span className="muted">{t('puzzleRating')}</span>
          <b className="rating-big">{puzzles.rating}</b>
          <span className="tier-chip">{t('streak')} {puzzles.streak}</span>
          <Sparkline points={(puzzles.history || []).map(h => h.rating)} />
          <small className="muted">
            {puzzleAcc}% {t('accuracy')} · {minedCount()} {t('ownPuzzles')}
          </small>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">{t('moveProfile')}</h3>
        {!totalMoves ? (
          <p className="muted">
            {t('noReviewsYet')}
            <button className="btn small" onClick={() => navigate('/review')}>{t('goReview')}</button>
          </p>
        ) : (
          <>
            <div className="profile-bars">
              {CLASS_ORDER.map(cls => {
                const n = classProfile[cls] || 0
                return (
                  <div className={`profile-bar ${n ? '' : 'zero'}`} key={cls}>
                    <ClassIcon cls={cls} size={16} />
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: (n / totalMoves) * 100 + '%' }} />
                    </div>
                    <span>{n}</span>
                    <small className="muted">{classLabel(cls, lang)}</small>
                  </div>
                )
              })}
            </div>
            {weakness && (
              <p className="insight-callout">
                {lang === 'zh'
                  ? `最需要加強的是「${classLabel(weakness.cls, 'zh')}」，共 ${weakness.count} 次（共 ${weakness.total} 個問題著法）。到謎題訓練多練。`
                  : `Your biggest weakness is ${classLabel(weakness.cls, 'en')} (${weakness.count} of ${weakness.total} problem moves). Drill it in the Puzzle trainer.`}
              </p>
            )}
          </>
        )}
      </div>

      {recent.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">{t('recentReviews')}</h3>
          <table className="value-table">
            <tbody>
              {recent.map(e => (
                <tr key={e.ts + (e.gameId || '')}>
                  <td>{new Date(e.ts).toLocaleDateString()}</td>
                  <td className="muted">{e.opening || '—'}</td>
                  <td><b>{e.accuracy}%</b></td>
                  <td className="muted">{e.acpl} cp</td>
                  <td>
                    <span className={`res-badge ${e.result || 'draw'}`}>
                      {e.result === 'win' ? 'W' : e.result === 'loss' ? 'L' : 'D'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel">
        <h3 className="panel-title">{t('quickActions')}</h3>
        <div className="btn-row">
          <button className="btn small primary" onClick={() => navigate('/train')}>{t('train')}</button>
          <button className="btn small" onClick={() => navigate('/review')}>{t('review')}</button>
          <button className="btn small" onClick={() => navigate('/play')}>{t('play')}</button>
          <button className="btn small" onClick={() => navigate('/learn')}>{t('learn')}</button>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">{t('levelRatings')}</h3>
        <table className="value-table">
          <tbody>
            {AI_LEVEL_RATINGS.map((r, i) => (
              <tr key={i}>
                <td>Lv.{i + 1}</td>
                <td>{r}</td>
                <td className="muted">{prof.rating >= r ? t('beatable') : t('challenging')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}