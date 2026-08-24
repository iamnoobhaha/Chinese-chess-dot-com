const KEY = 'xqm_profile'

export function defaultProfile(name) {
  return {
    name: name || 'Player',
    rating: 1500,
    peak: 1500,
    wins: 0,
    losses: 0,
    draws: 0,
    games: 0,
    history: []
  }
}

function loadRaw() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null')
  } catch {
    return null
  }
}

export function getProfile() {
  const raw = loadRaw()
  if (!raw || typeof raw.rating !== 'number') return defaultProfile()
  return { ...defaultProfile(raw.name), ...raw }
}

export function saveProfile(p) {
  localStorage.setItem(KEY, JSON.stringify(p))
}

export function renameProfile(name) {
  const p = getProfile()
  const trimmed = (name || '').trim().slice(0, 16)
  if (trimmed) p.name = trimmed
  saveProfile(p)
  return p
}
