const KEY = 'xqm_lessons'

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!raw || typeof raw !== 'object') return { lessons: {}, articles: {} }
    return { lessons: raw.lessons || {}, articles: raw.articles || {} }
  } catch {
    return { lessons: {}, articles: {} }
  }
}

function write(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)) } catch {}
}

export function getLessonProgress() {
  return read()
}

/** @param {'start'|'wrong'|'done'} event */
export function recordLessonAttempt(lessonId, event) {
  const db = read()
  const entry = db.lessons[lessonId] || { attempts: 0, mistakes: 0, done: false, last: 0 }
  if (event === 'start') entry.last = Date.now()
  if (event === 'wrong') entry.mistakes++
  if (event === 'done') { entry.done = true; entry.last = Date.now() }
  entry.attempts = (entry.attempts || 0) + (event === 'start' ? 1 : 0)
  db.lessons[lessonId] = entry
  write(db)
  return db
}

export function articleRead(articleId) {
  const db = read()
  db.articles[articleId] = Date.now()
  write(db)
}

export function resetLessonProgress() {
  write({ lessons: {}, articles: {} })
}

/** Lessons the player keeps getting wrong — surfaced on the Progress page. */
export function weakLessons(limit = 5) {
  const db = read()
  return Object.entries(db.lessons)
    .filter(([, v]) => !v.done && (v.mistakes || 0) > 0)
    .sort((a, b) => (b[1].mistakes || 0) - (a[1].mistakes || 0))
    .slice(0, limit)
    .map(([id, v]) => ({ id, mistakes: v.mistakes || 0 }))
}