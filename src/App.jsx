import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useLang } from './i18n.jsx'
import Play from './pages/Play.jsx'
import Online from './pages/Online.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import Learn from './pages/Learn.jsx'

export default function App() {
  const { t, toggle, lang } = useLang()
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/play" className="brand">
          <span className="brand-mark">帥</span>
          <span>{t('appName')}</span>
        </NavLink>
        <nav>
          <NavLink to="/play" className={({ isActive }) => isActive ? 'active' : ''}>{t('play')}</NavLink>
          <NavLink to="/online" className={({ isActive }) => isActive ? 'active' : ''}>{t('online')}</NavLink>
          <NavLink to="/review" className={({ isActive }) => isActive ? 'active' : ''}>{t('review')}</NavLink>
          <NavLink to="/learn" className={({ isActive }) => isActive ? 'active' : ''}>{t('learn')}</NavLink>
        </nav>
        <button className="btn ghost small lang-btn" onClick={toggle}>
          {lang === 'zh' ? 'English' : '中文'}
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/play" replace />} />
          <Route path="/play" element={<Play />} />
          <Route path="/online" element={<Online />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/learn/:cat" element={<Learn />} />
          <Route path="/learn/:cat/:id" element={<Learn />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </main>
    </div>
  )
}
