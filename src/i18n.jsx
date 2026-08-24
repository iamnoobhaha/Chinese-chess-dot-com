import { createContext, useContext, useState } from 'react'

const STRINGS = {
  appName: { en: 'Xiangqi Master', zh: '象棋大師' },
  play: { en: 'Play', zh: '對弈' },
  review: { en: 'Game Review', zh: '復盤分析' },
  learn: { en: 'Learn', zh: '學習中心' },
  language: { en: '中文', zh: 'English' },

  chooseColor: { en: 'Choose your side', zh: '選擇執方' },
  red: { en: 'Red', zh: '紅方' },
  black: { en: 'Black', zh: '黑方' },
  random: { en: 'Random', zh: '隨機' },
  difficulty: { en: 'Difficulty', zh: '難度' },
  startGame: { en: 'Start Game', zh: '開始對局' },
  botNames: {
    en: ['Beginner', 'Casual', 'Intermediate', 'Advanced', 'Expert', 'Master', 'Grandmaster', 'Maximum'],
    zh: ['初學者', '業餘棋手', '中級棋手', '高級棋手', '專家', '大師', '特級大師', '極限']
  },

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
  shareCodeHint: { en: 'Share this code with your friend (open this app in another tab):', zh: '把此代碼告訴朋友（在另一個分頁開啟本程式）：' },
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
  movesLabel: { en: 'Moves', zh: '著法' },

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

  savedGames: { en: 'Saved Games', zh: '已保存對局' },
  noGames: { en: 'No games yet — play a game first!', zh: '還沒有對局——先去下一局吧！' },
  analyzeFast: { en: 'Fast (depth 4)', zh: '快速（4層）' },
  analyzeDeep: { en: 'Deep (depth 6)', zh: '深度（6層）' },
  startAnalysis: { en: 'Analyze Game', zh: '開始分析' },
  analyzing: { en: 'Analyzing…', zh: '分析中…' },
  cancelAnalysis: { en: 'Cancel', zh: '取消' },
  analysisDone: { en: 'Analysis complete', zh: '分析完成' },
  accuracy: { en: 'Accuracy', zh: '準確度' },
  summaryTab: { en: 'Summary', zh: '總結' },
  movesTab: { en: 'Moves', zh: '著法' },
  bestLine: { en: 'Engine line', zh: '引擎變化' },
  showBest: { en: 'Show best move', zh: '顯示最佳著法' },
  brilliant: { en: 'Brilliant', zh: '妙手' },
  bestMove: { en: 'Best', zh: '最佳' },
  excellent: { en: 'Excellent', zh: '極佳' },
  good: { en: 'Good', zh: '良好' },
  book: { en: 'Book', zh: '譜著' },
  inaccuracy: { en: 'Inaccuracy', zh: '不精確' },
  mistake: { en: 'Mistake', zh: '失誤' },
  blunder: { en: 'Blunder', zh: '敗著' },
  autoplay: { en: 'Auto', zh: '自動播放' },
  lostCp: { en: 'cp lost', zh: '厘兵損失' },

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
  minutes: { en: 'min', zh: '分鐘' }
}

const LangContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('xqm_lang') || 'zh')
  const toggle = () => {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLang(next)
    localStorage.setItem('xqm_lang', next)
  }
  const t = key => {
    const s = STRINGS[key]
    if (!s) return key
    return s[lang] ?? s.en
  }
  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
