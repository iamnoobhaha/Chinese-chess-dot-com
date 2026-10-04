import { Component } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useLang } from './i18n.jsx'
import { soundEnabled, setSoundEnabled } from './game/sounds.js'
import { engine } from './engine/client.js'
import Play from './pages/Play.jsx'
import Online from './pages/Online.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import Learn from './pages/Learn.jsx'
import Train from './pages/Train.jsx'
import Progress from './pages/Progress.jsx'

/** Keeps one broken page from taking the whole app down. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('App error:', error)
  }

  componentWillUnmount() {
    engine.cancel()
  }

  render() {
    if (this.state.error) {
      const { t } = this.props.i18n
      return (
        <div className="page">
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <h2>{t('somethingWrong')}</h2>
            <p className="muted" style={{ fontSize: 13 }}>{String(this.state.error.message || this.state.error)}</p>
            <button className="btn primary" onClick={() => window.location.reload()}>{t('reload')}</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const i18n = useLang()
  const { t, toggle, lang } = i18n
  const [sound, setSound] = useState(soundEnabled())

  const links = [
    ['/play', t('play')],
    ['/online', t('online')],
    ['/review', t('review')],
    ['/learn', t('learn')],
    ['/train', t('train')],
    ['/progress', t('progress')]
  ]

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/play" className="brand">
          <span className="brand-mark">帥</span>
          <span>{t('appName')}</span>
        </NavLink>
        <nav>
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>{label}</NavLink>
          ))}
        </nav>
        <button
          className="btn ghost small icon-btn"
          title={sound ? t('soundOff') : t('soundOn')}
          onClick={() => { setSoundEnabled(!sound); setSound(!sound) }}
        >
          {sound ? '🔊' : '🔇'}
        </button>
        <button className="btn ghost small lang-btn" onClick={toggle}>
          {lang === 'zh' ? 'English' : '中文'}
        </button>
      </header>
      <main>
        <ErrorBoundary i18n={i18n}>
          <Routes>
            <Route path="/" element={<Navigate to="/play" replace />} />
            <Route path="/play" element={<Play />} />
            <Route path="/online" element={<Online />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:cat" element={<Learn />} />
            <Route path="/learn/:cat/:id" element={<Learn />} />
            <Route path="/train" element={<Train />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="*" element={<Navigate to="/play" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}