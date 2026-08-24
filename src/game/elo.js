export const AI_LEVEL_RATINGS = [800, 1000, 1200, 1400, 1650, 1850, 2050, 2300]

export function expectedScore(myRating, oppRating) {
  return 1 / (1 + Math.pow(10, (oppRating - myRating) / 400))
}

export function kFactor(gamesPlayed) {
  if (gamesPlayed < 15) return 40
  if (gamesPlayed < 40) return 24
  return 16
}

export function ratingDelta(myRating, oppRating, score, gamesPlayed) {
  const k = kFactor(gamesPlayed)
  return Math.round(k * (score - expectedScore(myRating, oppRating)))
}

const TIERS = [
  { min: 2100, key: 'tierGM' },
  { min: 1900, key: 'tierSenior' },
  { min: 1700, key: 'tierMaster' },
  { min: 1500, key: 'tierCandidate' },
  { min: 1300, key: 'tierClub' },
  { min: 1100, key: 'tierAmateur' },
  { min: -Infinity, key: 'tierNovice' }
]

export function ratingTier(rating) {
  for (const tier of TIERS) {
    if (rating >= tier.min) return { key: tier.key, next: null }
  }
}

export function applyResult(profile, oppRating, score) {
  const delta = ratingDelta(profile.rating, oppRating, score, profile.games)
  const rating = Math.max(100, profile.rating + delta)
  const wins = profile.wins + (score === 1 ? 1 : 0)
  const losses = profile.losses + (score === 0 ? 1 : 0)
  const draws = profile.draws + (score === 0.5 ? 1 : 0)
  const history = [{ ts: Date.now(), delta, rating }, ...profile.history].slice(0, 50)
  return {
    delta,
    profile: {
      ...profile,
      rating,
      peak: Math.max(profile.peak, rating),
      wins,
      losses,
      draws,
      games: profile.games + 1,
      history
    }
  }
}
