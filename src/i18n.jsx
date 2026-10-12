import { createContext, useContext, useState, useCallback } from 'react'

const STRINGS = {
  appName: { en: 'Xiangqi Master', zh: '象棋大師' },
  play: { en: 'Play', zh: '對弈' },
  review: { en: 'Game Review', zh: '復盤分析' },
  learn: { en: 'Learn', zh: '學習中心' },
  train: { en: 'Puzzles', zh: '謎題訓練' },
  progress: { en: 'Progress', zh: '學習歷程' },
  language: { en: '中文', zh: 'English' },

  chooseColor: { en: 'Choose your side', zh: '選擇執方' },
  red: { en: 'Red', zh: '紅方' },
  black: { en: 'Black', zh: '黑方' },
  redShort: { en: 'Red', zh: '紅' },
  blackShort: { en: 'Black', zh: '黑' },
  random: { en: 'Random', zh: '隨機' },
  difficulty: { en: 'Difficulty', zh: '難度' },
  startGame: { en: 'Start Game', zh: '開始對局' },
  botNames: {
    en: ['Beginner', 'Casual', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Grandmaster', 'Maximum'],
    zh: ['初學者', '業餘棋手', '中級棋手', '高級棋手', '專家', '大師', '特級大師', '極限']
  },
  aiOpponent: { en: 'AI Lv.{n}', zh: '電腦 Lv.{n}' },

  online: { en: 'Online', zh: '在線對戰' },
  oppTurn: { en: "Opponent's turn", zh: '等待對手…' },
  youLabel: { en: 'You', zh: '你' },
  opponentResigned: { en: 'Opponent resigned', zh: '對手認輸了' },
  drawAgreed: { en: 'Draw agreed', zh: '協議和棋' },
  oppDisconnected: { en: 'Opponent disconnected — you win', zh: '對手斷線，判你獲勝' },
  oppLeftGame: { en: 'Opponent left the game — you win', zh: '對手離開，判你獲勝' },
  bcUnsupported: {
    en: 'This browser does not support BroadcastChannel. Online play works between two tabs/windows of the same browser.',
    zh: '此瀏覽器不支援 BroadcastChannel。在線對戰可在同一瀏覽器的兩個分頁／視窗之間進行。'
  },
  quickMatch: { en: 'Quick Match', zh: '快速匹配' },
  timeControl: { en: 'Time control', zh: '時間控制' },
  tcUnlimited: { en: '∞', zh: '∞' },
  tc15: { en: '15 min', zh: '15分鐘' },
  tc10: { en: '10 min', zh: '10分鐘' },
  tc5: { en: '5 min', zh: '5分鐘' },
  tc3: { en: '3 min', zh: '3分鐘' },
  byTimeout: { en: 'time expired', zh: '超時' },
  youFlagged: { en: 'Your clock ran out', zh: '你的時間用完了' },
  oppFlagged: { en: "Opponent's clock ran out", zh: '對手超時判負' },
  soundOn: { en: 'Sound on', zh: '開啟音效' },
  soundOff: { en: 'Sound off', zh: '關閉音效' },
  copyMoves: { en: 'Copy moves', zh: '複製著法' },
  copyPgn: { en: 'Copy PGN', zh: '複製 PGN' },
  copied: { en: 'Copied!', zh: '已複製！' },
  quickMatchHint: {
    en: 'Open this page in two tabs/windows of the same browser, then click Quick Match in either tab.',
    zh: '在同一瀏覽器的兩個分頁／視窗中開啟本頁面，任意一方點擊「快速匹配」即可配對。'
  },
  activityLabel: { en: 'Connection activity', zh: '連線動態' },
  searchingOpponent: { en: 'Searching for opponent…', zh: '正在尋找對手…' },
  cancelSearch: { en: 'Cancel', zh: '取消' },
  privateRoom: { en: 'Private Room', zh: '私人房間' },
  roomCode: { en: 'Room code', zh: '房間代碼' },
  joinBtn: { en: 'Join', zh: '加入房間' },
  createRoomBtn: { en: 'Create Room', zh: '創建房間' },
  shareCodeHint: {
    en: 'Share this code with your friend (open this app in another tab):',
    zh: '把此代碼告訴朋友（在另一個分頁開啟本程式）：'
  },
  waitingForOpponent: { en: 'Waiting for opponent…', zh: '等待對手加入…' },
  joiningRoom: { en: 'Joining room…', zh: '正在加入房間…' },
  matchFailed: { en: 'Matchmaking failed — please try again.', zh: '匹配失敗——請重試。' },
  offerDraw: { en: 'Offer Draw', zh: '提議和棋' },
  drawOfferPending: { en: 'Draw offer sent — waiting for reply', zh: '已提出和棋——等待回應' },
  opponentOffersDraw: { en: 'Opponent offers a draw', zh: '對手提議和棋' },
  accept: { en: 'Accept', zh: '接受' },
  decline: { en: 'Decline', zh: '拒絕' },
  rematch: { en: 'Rematch', zh: '再來一局' },
  rematchPending: { en: 'Rematch requested — waiting for opponent…', zh: '已請求再來一局——等待對手…' },
  opponentWantsRematch: { en: 'Accept rematch?', zh: '接受再來一局？' },
  leaveRoom: { en: 'Leave', zh: '離開' },
  editName: { en: 'Rename', zh: '改名' },
  saveBtn: { en: 'Save', zh: '保存' },
  record: { en: 'Record:', zh: '戰績：' },
  peak: { en: 'Peak', zh: '最高' },
  eloChange: { en: 'Rating change', zh: '積分變化' },
  aiMode: { en: 'vs AI', zh: '人機對弈' },
  onlineMode: { en: 'Online', zh: '在線對戰' },
  tierNovice: { en: 'Novice', zh: '初學者' },
  tierAmateur: { en: 'Amateur', zh: '業餘棋手' },
  tierClub: { en: 'Club Player', zh: '俱樂部棋手' },
  tierCandidate: { en: 'Candidate Master', zh: '候選大師' },
  tierMaster: { en: 'Master', zh: '大師' },
  tierSenior: { en: 'Senior Master', zh: '資深大師' },
  tierGM: { en: 'Grandmaster', zh: '特級大師' },

  yourTurn: { en: 'Your turn', zh: '輪到你了' },
  thinking: { en: 'Thinking…', zh: '思考中…' },
  check: { en: 'Check!', zh: '將軍！' },
  undo: { en: 'Undo', zh: '悔棋' },
  hint: { en: 'Hint', zh: '提示' },
  resign: { en: 'Resign', zh: '認輸' },
  newGame: { en: 'New Game', zh: '新對局' },
  flipBoard: { en: 'Flip', zh: '翻轉' },
  drawClaim: { en: 'Claim Draw', zh: '求和' },
  movesLabel: { en: 'moves', zh: '著法' },

  youWin: { en: 'You Win!', zh: '你贏了！' },
  youLose: { en: 'You Lose', zh: '你輸了' },
  drawResult: { en: 'Draw', zh: '和棋' },
  byCheckmate: { en: 'by checkmate', zh: '絕殺' },
  byStalemate: { en: 'no legal moves', zh: '困斃無子可動' },
  byResignation: { en: 'by resignation', zh: '對方認輸' },
  youResigned: { en: 'you resigned', zh: '你認輸了' },
  byRepetition: { en: 'threefold repetition', zh: '三次重複局面' },
  reviewThisGame: { en: 'Game Review', zh: '復盤這局棋' },
  close: { en: 'Close', zh: '關閉' },
  reason_mate: { en: 'by checkmate', zh: '絕殺' },
  reason_stalemate: { en: 'by suffocation', zh: '困斃判負' },
  reason_resign: { en: 'by resignation', zh: '認輸' },
  reason_repetition: { en: 'threefold repetition', zh: '三次重複局面' },
  reason_timeout: { en: 'on time', zh: '超時判負' },
  reason_agreement: { en: 'by agreement', zh: '協議和棋' },
  reason_disconnect: { en: 'disconnect', zh: '對手斷線' },
  reason_left: { en: 'opponent left', zh: '對手離開' },

  openingPick: { en: 'Starting setup', zh: '起手布局' },
  openingRedOnly: {
    en: 'Opening presets are Red moves, so they only apply when you play Red.',
    zh: '起手布局是紅方的著法，只有你執紅時才會自動走出。'
  },
openingFree: { en: 'Free choice', zh: '自由選擇' },
  coachMode: { en: 'Coach', zh: '教練模式' },
  coachOn: { en: 'Check my moves', zh: '每步覆盤' },
  coachHint: {
    en: 'After each of your moves the engine grades it instantly (small time cost).',
    zh: '你每走一步，引擎會立即評分（略佔時間）。'
  },
  coachGreat: { en: 'Great move', zh: '好棋' },
  coachOk: { en: 'Fine move', zh: '可以' },
  coachInaccuracy: { en: 'Inaccuracy', zh: '不精確' },
  coachMistake: { en: 'Mistake', zh: '失誤' },
  coachBlunder: { en: 'Blunder — best was {move}', zh: '敗著——應走 {move}' },
  coachMissedMate: { en: 'You had mate in {n}!', zh: '你可以 {n} 步殺棋！' },

  savedGames: { en: 'Saved Games', zh: '已保存對局' },
  noGames: { en: 'No games yet — play a game first!', zh: '還沒有對局——先去下一局吧！' },
  searchGames: { en: 'Search opponent or move…', zh: '搜尋對手或著法…' },
  newest: { en: 'Newest', zh: '最新' },
  longest: { en: 'Longest', zh: '最長' },
  noMatch: { en: 'No games match your search.', zh: '沒有符合的對局。' },
  deleteGame: { en: 'Delete', zh: '刪除' },
  gameDeleted: { en: 'Game deleted', zh: '已刪除對局' },
  analyzeFast: { en: 'Standard (depth 8)', zh: '標準（8層）' },
  analyzeDeep: { en: 'Deep (depth 12)', zh: '深度（12層）' },
  analyzeInstant: { en: 'Quick (depth 6)', zh: '快速（6層）' },
  analysisDepth: { en: 'Engine strength', zh: '引擎強度' },
  startAnalysis: { en: 'Analyze Game', zh: '開始分析' },
  analyzing: { en: 'Analyzing…', zh: '分析中…' },
  cancelAnalysis: { en: 'Cancel', zh: '取消' },
  partialHint: {
    en: 'Results appear as they are computed — you can already browse them.',
    zh: '結果會邊算邊顯示——現在就可以開始瀏覽。'
  },
  accuracy: { en: 'Accuracy', zh: '準確度' },
  reviewIntroHint: { en: 'Pick a move to see the engine verdict.', zh: '選擇一步棋查看引擎評語。' },
  overviewTab: { en: 'Report', zh: '總評' },
  movesTab: { en: 'Moves', zh: '著法' },
  insightsTab: { en: 'Insights', zh: '洞見' },
  filterAll: { en: 'All', zh: '全部' },
  filterProblems: { en: 'Problems', zh: '問題著' },
  filterMissed: { en: 'Missed', zh: '錯失' },
  filterGood: { en: 'Best moves', zh: '好棋' },
  noMovesInFilter: { en: 'No moves in this filter', zh: '此篩選沒有著法' },
  bestLine: { en: 'Engine line', zh: '引擎變化' },
  showBest: { en: 'Show best move', zh: '顯示最佳著法' },
  showAlternatives: { en: 'Show alternatives', zh: '顯示候選著法' },
  engineBestMove: { en: "Engine's move", zh: '引擎著法' },
  bestWas: { en: 'Best was', zh: '最佳著法為' },
  moveNumber: { en: 'Move', zh: '第' },
  evalBefore: { en: 'Before', zh: '之前' },
  evalAfter: { en: 'After', zh: '之後' },
  lostCp: { en: 'cp lost', zh: '厘兵損失' },
  yourAccuracy: { en: 'Your accuracy', zh: '你的準確度' },
  averageCentipawnLoss: { en: 'Avg loss', zh: '平均損失' },
  opponentAccuracy: { en: 'Opponent accuracy', zh: '對手準確度' },
  finalEvalForYou: { en: 'Final win chance', zh: '最終勝率' },
  blunders: { en: 'Blunders', zh: '敗著' },
  missedWins: { en: 'Missed wins', zh: '錯過勝機' },
  brilliantMoves: { en: 'Brilliant', zh: '妙手' },
  bookMoves: { en: 'Book moves', zh: '譜著' },
  keyMoments: { en: 'Key moments', zh: '關鍵時刻' },
  phaseOpening: { en: 'Opening', zh: '開局' },
  phaseMiddlegame: { en: 'Middlegame', zh: '中局' },
  phaseEndgame: { en: 'Endgame', zh: '殘局' },
  gameOutcome: { en: 'Game outcome', zh: '對局結果' },
  noInsights: { en: 'Nothing notable in this game.', zh: '本局沒有特別值得注意的地方。' },
  win: { en: 'Win', zh: '勝' },
  draw: { en: 'Draw', zh: '和' },
  loss: { en: 'Loss', zh: '負' },
  first: { en: 'First move', zh: '第一步' },
  last: { en: 'Last move', zh: '最後一步' },
  prevMove: { en: 'Previous move', zh: '上一手' },
  nextMove: { en: 'Next move', zh: '下一手' },
  autoplay: { en: 'Auto play', zh: '自動播放' },
  nextProblem: { en: 'Next mistake (N)', zh: '下一個問題 (N)' },
  prevProblem: { en: 'Previous mistake (B)', zh: '上一個問題 (B)' },
  speed: { en: 'Speed', zh: '速度' },
  puzzlesAdded: {
    en: '{n} new puzzle{n} added to your trainer',
    zh: '已把 {n} 個新題目加入謎題訓練'
  },

  // ---- puzzle trainer ----
  trainCurated: { en: 'Classic puzzles', zh: '經典題目' },
  trainMine: { en: 'From my games', zh: '我的棋局' },
  fromYourGame: { en: 'from your game', zh: '來自你的棋局' },
  classic: { en: 'classic', zh: '經典' },
  puzzleRating: { en: 'Puzzle rating', zh: '謎題積分' },
  streak: { en: 'Streak', zh: '連勝' },
  unsolved: { en: 'Unsolved', zh: '未解' },
  trainFindBest: { en: 'Find the best move for the side to move.', zh: '找出輪到你方的最佳著法。' },
  skip: { en: 'Skip', zh: '略過' },
  tries: { en: 'Wrong tries', zh: '錯誤次數' },
  solution: { en: 'Solution', zh: '答案' },
  nextPuzzle: { en: 'Next puzzle', zh: '下一題' },
  trainStats: { en: 'Your stats', zh: '你的統計' },
  solved: { en: 'Solved', zh: '已解' },
  bestStreak: { en: 'Best streak', zh: '最佳連勝' },
  resetProgress: { en: 'Reset trainer', zh: '重置訓練' },
  resetConfirm: { en: 'Reset all puzzle progress?', zh: '確定要重置所有謎題進度？' },
  trainSolved: { en: 'Solved!', zh: '答對了！' },
  trainTryAgain: { en: 'That was not the best move.', zh: '這不是最佳著法。' },
  trainLoading: { en: 'Preparing puzzles…', zh: '正在準備題目…' },

  // ---- progress ----
  rating: { en: 'Rating', zh: '積分' },
  reviewAccuracy: { en: 'Review accuracy', zh: '復盤準確度' },
  gamesReviewed: { en: 'games reviewed', zh: '局已復盤' },
  moveProfile: { en: 'Move profile', zh: '著法分布' },
  noReviewsYet: { en: 'Review a game to build your profile.', zh: '先復盤一局棋來建立你的檔案。' },
  goReview: { en: 'Go to review', zh: '前往復盤' },
  quickActions: { en: 'Quick actions', zh: '快速操作' },
  levelRatings: { en: 'Engine level ratings', zh: '引擎等級積分' },
  beatable: { en: 'you should win', zh: '你應可勝出' },
  challenging: { en: 'a real test', zh: '有一定難度' },
  recentReviews: { en: 'Recent reviews', zh: '最近復盤' },
  ownPuzzles: { en: 'own puzzles', zh: '自有題目' },

  // ---- lessons ----
  openingsCat: { en: 'Openings', zh: '開局' },
  endgamesCat: { en: 'Endgames & Tactics', zh: '殘局與戰術' },
  strategyCat: { en: 'Middlegame Strategy', zh: '中局策略' },
  demoMode: { en: 'Demo', zh: '演示' },
  practiceMode: { en: 'Practice', zh: '練習' },
  practiceYourMove: { en: 'Play the highlighted side’s move', zh: '請走出指定一方的著法' },
  practiceCorrect: { en: 'Correct!', zh: '正確！' },
  practiceWrong: { en: 'Not quite — try again', zh: '不對——再試一次' },
  practiceDone: { en: 'Lesson complete!', zh: '完成課程！' },
  restart: { en: 'Restart', zh: '重新開始' },
  nextStep: { en: 'Next', zh: '下一步' },
  prevStep: { en: 'Back', zh: '上一步' },
  showHintBtn: { en: 'Hint', zh: '看提示' },
  backToList: { en: 'All lessons', zh: '返回課程列表' },
  minutes: { en: 'min', zh: '分鐘' },
  lessonComplete: { en: 'Completed', zh: '已完成' },
  lessonNotStarted: { en: 'Not started', zh: '尚未開始' },
  yourProgress: { en: 'Your progress', zh: '你的進度' },
  mistakesLabel: { en: 'mistakes', zh: '次失誤' },
  lessonPracticeHint: {
    en: 'Practice mode only accepts the lesson’s move — use Demo to explore freely.',
    zh: '練習模式只接受課程指定的著法——想自由研究請用演示模式。'
  },

  // ---- move classes ----
  brilliant: { en: 'Brilliant', zh: '妙手' },
  great: { en: 'Great', zh: '精彩' },
  bestMove: { en: 'Best', zh: '最佳' },
  bestAttempt: { en: 'Best Attempt', zh: '最佳嘗試' },
  excellent: { en: 'Excellent', zh: '極佳' },
  good: { en: 'Good', zh: '良好' },
  book: { en: 'Book', zh: '譜著' },
  timeLoss: { en: 'Time Loss', zh: '時間損失' },
  missedWin: { en: 'Missed Win', zh: '錯過勝機' },
  missedDraw: { en: 'Missed Draw', zh: '錯過和棋' },
  inaccuracy: { en: 'Inaccuracy', zh: '不精確' },
  mistake: { en: 'Mistake', zh: '失誤' },
  blunder: { en: 'Blunder', zh: '敗著' },

  somethingWrong: { en: 'Something went wrong. Reload the page to continue.', zh: '發生錯誤，請重新整理頁面。' },
  reload: { en: 'Reload', zh: '重新載入' }
}

const LangContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('xqm_lang') || 'zh' } catch { return 'zh' }
  })

  const toggle = useCallback(() => {
    setLang(prev => {
      const next = prev === 'zh' ? 'en' : 'zh'
      try { localStorage.setItem('xqm_lang', next) } catch {}
      return next
    })
  }, [])

  /** t('key', { n: 3 }) supports simple {token} interpolation. */
  const t = useCallback((key, vars) => {
    const s = STRINGS[key]
    if (!s) return key
    let out = s[lang] ?? s.en
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
    }
    return out
  }, [lang])

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}