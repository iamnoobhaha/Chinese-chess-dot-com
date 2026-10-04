# 象棋大師 · Xiangqi Master

A complete Chinese Chess (Xiangqi) web app in the spirit of chess.com — play, learn,
review and drill, entirely in the browser.

## Features

### Play
- **8 engine levels** (Beginner → Maximum) running a pure-JavaScript negamax engine
  with alpha-beta, quiescence search, a transposition table, iterative deepening,
  move ordering and mate-score normalisation.
- Full rule support: flying general, palace/river movement, cannon screens,
  checkmate, **suffocation (困斃) is a loss**, threefold repetition, insufficient
  material and clock forfeits.
- **Coach mode** — the engine grades every move you play immediately
  (Great / Fine / Inaccuracy / Mistake / Blunder, and “you had mate in 1”).
- **Opening presets** (當頭炮, 仙人指路, 飛相局, 士角馬 …), click or drag to move,
  hints, takebacks, resign, draw claims, and optional time controls.
- **Online play** — Quick Match or a 4-letter private room between two tabs of the
  same browser via BroadcastChannel: clocks, resign, draw offers, rematch with
  colours swapped and disconnect detection.

### Game Review (chess.com-grade)
Pick any saved game and get a full report:

- **13 move classes** with chess.com’s vocabulary: Brilliant, Great, Best, Best
  Attempt, Excellent, Good, Book, Time Loss, Missed Win, Missed Draw, Inaccuracy,
  Mistake, Blunder.
- **Per-side accuracy** (chess.com’s win-percentage curve), average centipawn loss,
  and **accuracy per phase** (opening / middlegame / endgame).
- **A win / draw / loss model** that is what makes *Missed Win* and *Missed Draw*
  distinguishable from a plain inaccuracy.
- **Interactive evaluation graph** with a hover tooltip, a dashed “best play” line
  showing where the game diverged from optimal, mate markers and mistake markers.
- **MultiPV**: the engine’s move plus alternatives, all drawable on the board.
- **Plain-language diagnosis** for every weak move — “missed a forced mate”,
  “missed a free capture”, “let enemy heavy pieces into the palace”, …
- **Key moments**, lower-rated player’s best move, biggest evaluation swing,
  forced-move count and a win/draw/loss outcome bar.
- **Instant**: results stream in as they are computed, your own moves are analysed
  first, and finished analyses are cached in localStorage.

### Puzzle trainer
- 14 engine-verified curated puzzles (馬後炮, 重炮, 二鬼拍門, 困斃, 車梯, 馬叉 …).
- **Every review you run automatically becomes drills** — blunders, mistakes and
  missed wins are harvested from your own games.
- Glicko-style puzzle rating, streaks, hints after two wrong tries, and
  SM-2 spaced repetition so solved puzzles come back just before you forget them.

### Learn
- Opening lessons (中央炮, 屏風馬, 飛相局, 順炮, 列炮 …) and endgame/tactic lessons,
  each with a narrated **Demo** mode and a **Practice** mode.
- Middlegame strategy articles with board diagrams.
- Progress is tracked per lesson, and lessons you keep failing are flagged.

### Progress
Rating history, review-accuracy trend, a move-class profile that names your single
biggest weakness, recent reviews and puzzle-trainer statistics.

## Run

```bash
npm install
npm run dev      # development
npm run build    # production build -> dist/
npm run preview  # serve the production build
npm test         # engine, content, puzzle, review and i18n checks
```

## Tech

React 18 + Vite + React Router (hash routing), no UI framework — plain CSS.
The engine runs in a Web Worker, so the UI never blocks while it thinks.

`npm test` runs five suites:

| suite | what it protects |
| --- | --- |
| `smoke.test.mjs` | move generation, attack detection, search, rules, Elo |
| `verify-content.mjs` | every lesson line is legal and actually mates |
| `verify-puzzles.mjs` | every curated puzzle is legal and engine-optimal |
| `verify-review.mjs` | review classification, graph, summary, opening presets |
| `verify-i18n.mjs` | no `t()` call points at a missing translation |

Games, ratings, analysis cache and puzzle progress are stored in `localStorage`.

> Note: online play works between two tabs/windows of the same browser
> (BroadcastChannel). To go truly internet-wide, swap the transport in
> `src/net/online.js` for a WebSocket/WebRTC backend — the UI and the message
> protocol stay unchanged.