# 象棋大師 · Xiangqi Master

A Chinese Chess (Xiangqi) web application in the spirit of chess.com:

- **Play** against a built-in AI engine with 8 difficulty levels (beginner to maximum), hints, takebacks, resignation, draw claim by repetition, and full rule support (flying general, palace/river movement, stalemate = loss).
- **Online**: play other people in real time — Quick Match or private rooms with 4-letter codes. Runs between two tabs/windows of the same browser via BroadcastChannel (no server). Includes resign, draw offers, threefold-repetition claims, rematch with colors swapped, and disconnect detection (leaving the game counts as a loss for the player who left).
- **ELO rating**: every rated game (vs AI or online) updates your rating with standard Elo math (K-factor shrinks as you gain experience), rank tiers from Novice to Grandmaster, and win/loss/draw records shown on your profile.
- **Game Review**: chess.com-style analysis — every move classified (Brilliant / Best / Excellent / Good / Book / Inaccuracy / Mistake / Blunder), per-side accuracy scores, an interactive evaluation graph, engine best lines, best-move arrows and keyboard playback. Works for both AI and online games.
- **Learn**: interactive lessons for openings (Central Cannon, Screen Horses, Elephant Opening, Sideways Cannon, Five-Seven Cannon), endgame & tactics (Horse-Back Cannon mate, Double Cannons, Lying Horse, Two-Chariot relay, Knight fork) with demo + practice modes, plus middlegame strategy articles with diagrams.

The AI engine is written in pure JavaScript (negamax + alpha-beta, quiescence search, transposition table, iterative deepening) and runs entirely in your browser via a Web Worker. No server or internet connection needed after loading.

## Run

```bash
npm install
npm run dev      # development
npm run build    # production build -> dist/
npm run preview  # serve the production build
npm test         # engine + lesson content smoke tests
```

## Tech

React 18 + Vite + React Router (hash routing), no UI framework — plain CSS.

Games are saved in your browser's localStorage and can be analyzed any time from the **Game Review** page. Your rating profile is also stored in localStorage.

> Note: online play works between two tabs/windows of the same browser (BroadcastChannel). Both tabs share the browser's rating profile. To go truly internet-wide, swap the transport in `src/net/online.js` for a WebSocket/WebRTC backend — the UI and message protocol stay unchanged.
