export const START_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w'

export const OPENING_LESSONS = [
  {
    id: 'o1',
    cat: 'opening',
    icon: '炮',
    titleEn: 'Central Cannon: the classic attack',
    titleZh: '中炮：經典攻擊體系',
    descEn: 'The most direct and popular opening — strike down the middle from move one.',
    descZh: '最直接、最流行的開局——第一步就炮鎮中路。',
    minutes: 6,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'c9e7', 'e3e4', 'a9a8'],
    notes: [
      { ply: 0, en: 'Cannon to the center file attacks the central pawn immediately. This is the Central Cannon (當頭炮), the most aggressive classical opening.', zh: '炮平中路，直接威脅中卒。這就是「當頭炮」，最兇悍的經典開局。' },
      { ply: 1, en: 'Black defends with the Screen Horses structure: this horse jumps toward the center to guard the central pawn.', zh: '黑方以「屏風馬」應對：跳馬護住中卒。' },
      { ply: 2, en: 'Red develops a horse toward the center, connecting with the cannon and preparing full coordination.', zh: '紅方跳正馬，與中炮呼應，全軍聯絡。' },
      { ply: 3, en: 'Black activates the chariot early — developing big pieces first is a golden rule.', zh: '黑方及早出車——優先出動大子是金科玉律。' },
      { ply: 4, en: 'Red answers with its own river chariot. Chariots on open files dominate the board.', zh: '紅方同樣出車。河口車控制力極強。' },
      { ply: 5, en: 'Black shores up with the elephant — the fortress behind the Screen Horses becomes very hard to crack.', zh: '黑方補象鞏固——屏風馬後的城牆牢不可破。' },
      { ply: 6, en: 'Red pushes the central pawn to gain space and open lines for the pieces behind it.', zh: '紅方衝中兵，爭取空間並打通後面子力路線。' },
      { ply: 7, en: 'Black lifts the remaining chariot, keeping development pace with Red.', zh: '黑方提起另一方提起另一隻車，緊跟紅方出子速度。' }
    ]
  },
  {
    id: 'o2',
    cat: 'opening',
    icon: '馬',
    titleEn: 'Screen Horses Defense',
    titleZh: '屏風馬防守體系',
    descEn: 'The most solid answer to the Central Cannon — like a shield in front of the king.',
    descZh: '應付中炮最穩健的體系——如屏風般守護九宮。',
    minutes: 6,
    fen: START_FEN,
    userSide: 1,
    moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'e3e4', 'e6e5', 'c3c4', 'a9a8'],
    notes: [
      { ply: -1, en: 'You play BLACK. Face the Central Cannon with the most trusted defense: the Screen Horses.', zh: '你執黑。以最可靠的屏風馬迎戰中炮。' },
      { ply: 1, en: 'First screen: 馬8進7 defends the center pawn. This is the signature of the defense.', zh: '第一道屏風：馬8進7保護中卒。' },
      { ply: 3, en: 'Black brings the left chariot out — fast development of heavy pieces.', zh: '黑方亮出左車——快速出動大子。' },
      { ply: 5, en: 'Second screen: 馬2進3! Both horses stand like a folding screen protecting the palace.', zh: '第二道屏風：馬2進3！雙馬如屏風般護住九宮。' },
      { ply: 6, en: 'Red pushes the central pawn — meet it head-on.', zh: '紅方衝中兵——正面頂住它。' },
      { ply: 7, en: 'Black counters in the center immediately, gaining space and blocking the file.', zh: '黑方立即以中卒還擊，爭取空間並封鎖線路。' },
      { ply: 9, en: 'The last chariot joins the game. The Screen Horses wall is fully operational!', zh: '另一隻車也投入戰鬥，屏風馬防線全面就位！' }
    ]
  },
  {
    id: 'o3',
    cat: 'opening',
    icon: '相',
    titleEn: 'Elephant Opening (飛相局)',
    titleZh: '飛相局',
    descEn: 'A flexible, solid system favored by world champions: shore up the palace first.',
    descZh: '靈活穩健的體系，為世界冠軍所愛：先鞏固陣型。',
    minutes: 5,
    fen: START_FEN,
    userSide: 0,
    moves: ['c0e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'c9e7', 'g3g4', 'e6e5'],
    notes: [
      { ply: 0, en: 'Elephant to the center: Red strengthens the palace before fighting. Flexible and hard to attack.', zh: '相三進五：先補厚中防再圖進取，靈活且難以被攻。' },
      { ply: 1, en: 'Black develops a horse normally.', zh: '黑方正常跳馬出子。' },
      { ply: 2, en: 'Red follows with the standard horse development toward the center.', zh: '紅方跳出正馬。' },
      { ply: 3, en: 'Black mobilizes the chariot — always get the big pieces into play.', zh: '黑方亮車——記得讓大子參與戰鬥。' },
      { ply: 4, en: 'Red takes the river file with its own chariot.', zh: '紅方也搶佔肋道車路。' },
      { ply: 5, en: 'Black solidifies with an elephant, mirroring Red\u2019s solid style.', zh: '黑方補象穩固，與紅方比拼內功。' },
      { ply: 6, en: 'Red advances the side pawn to free the cannon\u2019s diagonal.', zh: '紅方挺邊兵（七兵），疏通砲路。' },
      { ply: 7, en: 'Black pushes the center pawn too — the middlegame battle begins.', zh: '黑方也衝中卒，中局戰鬥正式展開。' }
    ]
  },
  {
    id: 'o4',
    cat: 'opening',
    icon: '過',
    titleEn: 'Sideways Cannon (過宮炮)',
    titleZh: '過宮炮',
    descEn: 'Move the cannon across the palace to support horses and control key files.',
    descZh: '炮過宮庭，支援馬路，控制要線。',
    minutes: 5,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2d2', 'c9e7', 'h0g2', 'h9g7', 'i0h0', 'i9h9', 'c3c4', 'e6e5'],
    notes: [
      { ply: 0, en: 'The cannon crosses the palace: it eyes the 4th/6th files where black\u2019s advisors live.', zh: '炮過宮：瞄住四、六路，直指黑方士角。' },
      { ply: 1, en: 'Black responds with the solid elephant development.', zh: '黑方以補象應對，穩固陣地。' },
      { ply: 2, en: 'Horse to the center connects future piece play.', zh: '跳出正馬，聯絡子力。' },
      { ply: 3, en: 'Black also jumps the screen horse.', zh: '黑方同樣跳屏風馬。' },
      { ply: 4, en: 'Both sides rush their chariots out.', zh: '雙方搶出車。' },
      { ply: 5, en: 'Chariot versus chariot on mirrored files.', zh: '兩車在同線對峙。' },
      { ply: 6, en: 'Red gains space on the side while keeping the flexible sideways cannon.', zh: '紅方挺七兵拓展空間，保留過宮炮彈性。' },
      { ply: 7, en: 'Black strikes back in the center. A rich middlegame ahead.', zh: '黑方以中卒還擊，精彩中局即將展開。' }
    ]
  },
  {
    id: 'o5',
    cat: 'opening',
    icon: '五',
    titleEn: 'Five-Seven Cannon vs Screen Horses',
    titleZh: '五七炮進三兵對屏風馬',
    descEn: 'One cannon in the center, one on the 7th file: double pressure against the screen.',
    descZh: '一中一七雙炮夾擊，破解屏風馬的主流武器。',
    minutes: 7,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'b2c2', 'e6e5', 'b0a2'],
    notes: [
      { ply: 0, en: 'Central cannon again — the starting point of many systems.', zh: '仍是中炮起手——眾多變化的起點。' },
      { ply: 1, en: 'Screen Horses as usual.', zh: '黑方照例屏風馬。' },
      { ply: 2, en: 'Normal development by Red.', zh: '紅方正常出子。' },
      { ply: 3, en: 'Black\u2019s chariot to the horse file.', zh: '黑方出車。' },
      { ply: 4, en: 'Red\u2019s chariot follows.', zh: '紅方跟著亮車。' },
      { ply: 5, en: 'Second screen horse completes the wall.', zh: '第二匹屏風馬完成城牆。' },
      { ply: 6, en: 'Here it is! The second cannon moves to the 7th file: the Five-Seven Cannon aims at black\u2019s 3-line horse and pawn.', zh: '重點來了！另一門炮平至七路：五七炮瞄住黑方3路馬卒。' },
      { ply: 7, en: 'Black counters in the center, blocking the file and gaining space.', zh: '黑方在中路還擊，封鎖線路並拓展空間。' },
      { ply: 8, en: 'Red develops the edge horse, keeping all pieces coordinated.', zh: '紅方跳邊馬，全軍協調出動。' }
    ]
  },
  {
    id: 'o6',
    cat: 'opening',
    icon: '順',
    titleEn: 'Same-Direction Cannons (順炮)',
    titleZh: '順炮直車對橫車',
    descEn: 'Black answers the central cannon with fire on the same side — the sharpest classical fight, analyzed in the old book 《橘中秘》.',
    descZh: '黑方以同側炮還擊中炮——《橘中秘》研究的經典激烈變化。',
    minutes: 6,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2e2', 'b7e7', 'h0g2', 'h9g7', 'i0h0', 'i9h9', 'g3g4', 'b9c7', 'b0c2', 'a9a8'],
    notes: [
      { ply: 0, en: 'Central cannon again. Black replies cannon-to-cannon on the SAME direction (順炮, "matching cannons") — meeting aggression with aggression.', zh: '紅方當頭炮，黑方同方向還以中炮（順炮）——以攻對攻。' },
      { ply: 1, en: 'This head-on system was the battlefield of the Ming-dynasty manual 《橘中秘》, which collected violent cannon attacks.', zh: '這套正面對攻體系正是明代古譜《橘中秘》研究的課題。' },
      { ply: 2, en: 'Red develops the connected horse — never leave the house without it.', zh: '紅方跳出正馬——出子優先。' },
      { ply: 3, en: 'Black builds the Screen Horse, keeping the center solid while the cannons duel.', zh: '黑方跳屏風馬，炮戰之中穩固中防。' },
      { ply: 4, en: 'Red\u2019s chariot takes the h-file: the “straight chariot” (直車) setup.', zh: '紅車占直線——「直車」陣型。' },
      { ply: 5, en: 'Black\u2019s chariot swings sideways early — the “river-crossing horizontal chariot” (橫車) plans to invade the enemy camp.', zh: '黑方早一步橫車——「橫車」準備侵入敵陣。' },
      { ply: 6, en: 'Straight versus horizontal: the classical strategic duel of this opening.', zh: '直車對橫車——本開局的經典策略較量。' },
      { ply: 7, en: 'Space matters: every pawn push opens a line for the pieces behind.', zh: '空間很重要：每一步挺兵都為後面子力開路。' },
      { ply: 8, en: 'Both sides complete development — the middlegame explodes from here.', zh: '雙方完成出子——中局大戰一觸即發。' },
      { ply: 9, en: 'Black\u2019s last chariot wakes up too. Full speed ahead!', zh: '黑方最後一隻車也出動了。全速前進！' }
    ]
  },
  {
    id: 'o7',
    cat: 'opening',
    icon: '列',
    titleEn: 'Cross Cannons (列炮)',
    titleZh: '大列手炮',
    descEn: 'Black fires back on the OPPOSITE side: total symmetry, razor-sharp play, a favorite study of the 《梅花譜》.',
    descZh: '黑方從反方向還炮：完全對稱、鋒利無比，《梅花譜》的熱門課題。',
    minutes: 6,
    fen: START_FEN,
    userSide: 1,
    moves: ['h2e2', 'h7e7', 'h0g2', 'h9g7', 'i0h0', 'i9h9', 'b0c2', 'b9c7', 'c3c4', 'c6c5'],
    notes: [
      { ply: -1, en: 'You play BLACK against the central cannon. Answer from the opposite wing: the Cross Cannons (列炮).', zh: '你執黑應付中炮。從反方向還炮——列手炮。' },
      { ply: 1, en: 'Because your cannon points the OPPOSITE way, the structure mirrors but twists — hence “cross/reverse cannons” (列炮).', zh: '由於你的炮方向相反，陣型對稱而扭轉——故名「列炮」。' },
      { ply: 3, en: 'The screen horse keeps your king safe in the mirrored battle.', zh: '屏風馬在鏡像對攻中保護九宮。' },
      { ply: 5, en: 'Symmetric chariot development — but the first asymmetry decides the race.', zh: '兩車對稱出動——但第一個不對稱就決定賽跑勝負。' },
      { ply: 8, en: 'Red grabs space on the queenside; meet it in the center!', zh: '紅方在左翼搶空間；在中路迎擊！' },
      { ply: 9, en: 'Your center pawn strikes back — in 列炮 the middle explodes first.', zh: '你的中卒還擊——列炮局中路最先開火。' }
    ]
  },
  {
    id: 'o8',
    cat: 'opening',
    icon: '過',
    titleEn: 'Central Cannon · River-Chariot Attack',
    titleZh: '中炮過河車',
    descEn: 'The chariot crosses the river at move four and stomps into black\u2019s camp — the timeless attacking plan of 《橘中秘》.',
    descZh: '第四回合車過河，直踏黑方陣地——《橘中秘》永恆的進攻方案。',
    minutes: 6,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0', 'b9c7', 'h0h6', 'e6e5', 'c3c4', 'f9e8'],
    notes: [
      { ply: 0, en: 'Central cannon: pressure on the middle pawn from move one.', zh: '當頭炮：第一步就壓住中卒。' },
      { ply: 2, en: 'Horse and cannon cooperate on the central files.', zh: '馬炮在中路協同作戰。' },
      { ply: 3, en: 'Black mobilizes the chariot along the horse file.', zh: '黑方沿馬路出車。' },
      { ply: 4, en: 'Red mirrors — chariots must join the attack early.', zh: '紅方照樣出車——大子要及早參戰。' },
      { ply: 6, en: 'THE key move: 車二進六, the chariot marches six points and CROSSES THE RIVER, pressuring the screen horse and the whole queenside.', zh: '關鍵一手：車二進六！過河車壓住屏風馬，威懾整個左翼。' },
      { ply: 7, en: 'Black pushes the center pawn to challenge the invader\u2019s supply line.', zh: '黑方衝中卒，挑戰過河車的補給線。' },
      { ply: 8, en: 'Red opens the c-file so the other chariot can follow.', zh: '紅方開七路，另一隻車隨時跟上。' },
      { ply: 9, en: 'Black shores up the palace — the coming storm will hit the e-file.', zh: '黑方補士固宮——風暴將至，中路是主戰場。' }
    ]
  },
  {
    id: 'o9',
    cat: 'opening',
    icon: '六',
    titleEn: 'Five-Six Cannon System',
    titleZh: '五六炮體系',
    descEn: 'One cannon central, one on the sixth file: flexible double-cannon pressure praised in classical manuals for its balance.',
    descZh: '一中一六雙炮呼應，古譜稱讚其攻守平衡的靈活體系。',
    minutes: 5,
    fen: START_FEN,
    userSide: 0,
    moves: ['h2e2', 'h9g7', 'h0g2', 'b9c7', 'b2d2', 'i9h9', 'i0h0', 'c9e7', 'b0c2', 'a9a8'],
    notes: [
      { ply: 0, en: 'Start with the central cannon as always.', zh: '照例以中炮起手。' },
      { ply: 1, en: 'Screen Horses — the eternal answer.', zh: '屏風馬——永恆的應對。' },
      { ply: 4, en: 'Here is the idea: the second cannon slides to the SIXTH file (五六炮). From there it supports the future horse jump and eyes the palace diagonals.', zh: '精華所在：第二門炮平至六路（五六炮），支援躍馬、瞄住宮角。' },
      { ply: 5, en: 'Black develops calmly — against 五六炮 patience is a weapon.', zh: '黑方從容出子——對付五六炮，耐心就是武器。' },
      { ply: 7, en: 'The elephant move connects black\u2019s defensive network.', zh: '補象聯絡黑方防線。' },
      { ply: 8, en: 'Red completes the classical development: all pieces working together.', zh: '紅方完成古典出子：全軍協調一致。' },
      { ply: 9, en: 'A balanced middlegame — perfect model structure to memorize.', zh: '均勢中局——值得牢記的示範結構。' }
    ]
  }
]

export const ENDGAME_LESSONS = [
  {
    id: 'e1',
    cat: 'endgame',
    icon: '馬',
    titleEn: 'Mate pattern: Horse-Back Cannon',
    titleZh: '殺法：馬後炮',
    descEn: 'The most famous mate in xiangqi — the horse shields the cannon aimed at the king.',
    descZh: '象棋最著名的殺法——以馬作炮架，將死對方老將。',
    minutes: 4,
    fen: '3aka3/9/4P4/9/4N4/9/9/3C5/9/4K4 w',
    userSide: 0,
    moves: ['e5d7'],
    notes: [
      { ply: -1, en: 'Red to move. The horse, the cannon and the black king are all lined up. Can you deliver the famous Horse-Back Cannon mate in one?', zh: '輪到紅方。馬、炮、黑將已成一線。你能一步走出著名的「馬後炮」絕殺嗎？' },
      { ply: 0, en: 'Horse to d7! The horse checks the king AND acts as the cannon\u2019s screen on the same file. King has no escape: this is the classic 馬後炮.', zh: '馬進d7！馬既將軍又充當炮架——經典「馬後炮」殺！' }
    ],
    quizAfter: true
  },
  {
    id: 'e2',
    cat: 'endgame',
    icon: '重',
    titleEn: 'Mate pattern: Double Cannons',
    titleZh: '殺法：重炮殺',
    descEn: 'Two cannons on one file: the rear cannon uses the front one as its screen.',
    descZh: '雙炮同線：後炮借前炮為架，直轟九宮。',
    minutes: 4,
    fen: '3aka3/4C4/9/3N1N3/9/9/6C2/9/9/4K4 w',
    userSide: 0,
    moves: ['g3e3'],
    notes: [
      { ply: -1, en: 'The front cannon already sits beside the enemy king. Bring the second cannon onto the file to complete the Double Cannon mate.', zh: '前炮已貼近敵將。把第二門炮平上同一條線，即可完成「重炮」絕殺。' },
      { ply: 0, en: 'Cannon to e3! Rear cannon checks through the screen; the front cannon guards the flight squares. Mate!', zh: '炮平中路！後炮借架成殺，前炮封鎖逃點——重炮殺！' }
    ],
    quizAfter: true
  },
  {
    id: 'e3',
    cat: 'endgame',
    icon: '臥',
    titleEn: 'Lying Horse & Corner Horse mates',
    titleZh: '臥槽馬・掛角馬',
    descEn: 'Two deadly horse checkpoints every player must know.',
    descZh: '每個棋手都必須掌握的兩個殺馬位。',
    minutes: 5,
    fen: '3aka3/9/4P4/9/6N2/9/5C3/9/9/4K4 w',
    userSide: 0,
    moves: ['g5f7'],
    notes: [
      { ply: -1, en: 'The horse can jump to f7 — the Lying Horse point — checking the king while the pawn and cannon seal every exit.', zh: '馬可跳往 f7「臥槽」位將軍，小兵與大炮封死所有出口。' },
      { ply: 0, en: 'Lying Horse checkmate! The horse attacks from outside the palace\u2019s reach — impossible to capture or block.', zh: '臥槽馬絕殺！馬從九宮外發難，捉不到也擋不了。' }
    ],
    quizAfter: true
  },
  {
    id: 'e4',
    cat: 'endgame',
    icon: '雙',
    titleEn: 'Two-Chariot ladder technique',
    titleZh: '雙車錯殺法',
    descEn: 'Relay checks with two chariots until the king runs out of squares.',
    descZh: '雙車交替將軍，一步步把老將逼入死角。',
    minutes: 6,
    fen: '4k4/R8/2bP1Pb2/9/9/3R5/9/4P4/9/4K4 w',
    userSide: 0,
    moves: ['d4e4', 'e9f9', 'a8f8'],
    notes: [
      { ply: -1, en: 'Two chariots against a defended king — the famous relay called 二車錯. Your soldiers already seal the palace sides; force the king into the open!', zh: '雙車對有防備的老將——著名的「二車錯」。小兵已封住兩側，逼老將現身吧！' },
      { ply: 0, en: 'Step 1: chariot to the center file — check! The king must leave the e-file.', zh: '第一步：車占中路——將軍！老將被迫離開中路。' },
      { ply: 2, en: 'Step 2: the OTHER chariot rides along the king\u2019s new rank WITH CHECK — soldiers cover the flights and the first chariot pins the center. 二車錯, checkmate!', zh: '第二步：另一隻車沿老將新橫線帶將軍殺到——雙兵封邊，第一步的車鎖住中路。二車錯，絕殺！' }
    ]
  },
  {
    id: 'e5',
    cat: 'endgame',
    icon: '捉',
    titleEn: 'Tactics: the Knight Fork',
    titleZh: '戰術：馬的捉雙',
    descEn: 'Win material with a double attack — find the fork that nets a chariot.',
    descZh: '用雙重威脅賺取子力——找出白吃車的那步棋。',
    minutes: 3,
    fen: '4k1r2/9/9/3N5/4p4/9/9/9/9/4K4 w',
    userSide: 0,
    moves: ['d6f7'],
    notes: [
      { ply: -1, en: 'Black\u2019s chariot sits undefended on the same rank as the king. One knight move attacks both.', zh: '黑車與老將同線且無根。一步跳馬即可雙捉。' },
      { ply: 0, en: 'Knight to f7! Check plus attack on the chariot — the fork wins a whole chariot next move.', zh: '馬跳f7！既將軍又捉車——下一步白得一車。' }
    ],
    quizAfter: true
  },
  {
    id: 'e6',
    cat: 'endgame',
    icon: '宮',
    titleEn: 'Mate pattern: Smothered Palace',
    titleZh: '殺法：悶宮殺',
    descEn: 'The king\u2019s own advisors and soldier seal every exit — one cannon shot breaks in.',
    descZh: '老將被自家的士卒團團困住——一炮破門而入。',
    minutes: 4,
    fen: '3aka3/4p4/8p/9/9/9/9/9/9/C2K5 w',
    userSide: 0,
    moves: ['a0a9'],
    notes: [
      { ply: -1, en: 'Look closely at black\u2019s “defence”: the advisors flank the king, and black\u2019s OWN soldier occupies e8 — the only square either advisor could ever reach. The palace is a locked box… from the inside.', zh: '細看黑方的「防禦」：雙士夾住老將，黑卒自己占著e8——那正是兩個士唯一的落點。九宮成了一個從裡面鎖死的箱子。' },
      { ply: 0, en: 'Cannon to the back corner! The d9 advisor becomes the cannon\u2019s SCREEN. Normally you would just move the screening piece — but both advisors are frozen (their only square is filled by their own soldier). No capture, no block, no flight: 悶宮!', zh: '沉底炮！d9的士成了自家炮架。正常只需移開炮架即可解圍——可兩個士都被自己的兵凍死在原地。捉不到、擋不了、逃不脫：悶宮殺！' }
    ],
    quizAfter: true
  },
  {
    id: 'e7',
    cat: 'endgame',
    icon: '鬼',
    titleEn: 'Mate pattern: Two Ghosts at the Door',
    titleZh: '殺法：二鬼拍門',
    descEn: 'Two pawns squat on the palace doors, strangling every flight square. One chariot knock finishes it.',
    descZh: '雙兵扼住九宮兩扇門，鎖死所有逃生格。一車敲門，萬事俱備。',
    minutes: 4,
    fen: '4k4/3P1P3/9/R8/9/9/9/9/9/3K6 w',
    userSide: 0,
    moves: ['a6a9'],
    notes: [
      { ply: -1, en: 'The two “ghosts” already squat on the palace doors (d8 and f8, the fourth and sixth files). Each pawn covers the flight squares the king dreams about. Bring up the executioner.', zh: '兩隻「鬼」已蹲在九宮門前（四、六路的 d8、f8），每個兵都看住老將想去的格子。把劊子手叫上來吧。' },
      { ply: 0, en: 'Chariot to the back rank — checkmate! d9 dies to the door pawn, f9 to the other, e8 dies to both ghosts. The name of the pattern: 二鬼拍門.', zh: '車沉底線——絕殺！d9 死於門前兵，f9 死於另一兵，e8 死於雙鬼夾擊。此局式名曰：二鬼拍門。' }
    ],
    quizAfter: true
  },
  {
    id: 'e8',
    cat: 'endgame',
    icon: '困',
    titleEn: 'Win by Suffocation (困斃)',
    titleZh: '殺法：困斃制勝',
    descEn: 'In xiangqi you do NOT need check to win: a player with no legal move LOSES. Seal every square in silence.',
    descZh: '象棋中不用將軍也能贏：無子可動的一方判負。無聲無息封死每一格。',
    minutes: 5,
    fen: '3k5/2P1P4/1C7/9/9/9/9/9/9/4K4 w',
    userSide: 0,
    moves: ['b7b9'],
    notes: [
      { ply: -1, en: 'Unlike international chess, STALEMATE IS A LOSS in xiangqi (困斃). Black\u2019s king already suffocates — if only that cannon would stop firing and just sit quietly on b9…', zh: '與國際象棋不同，象棋「困斃」判負。黑將已被憋死——只要那門炮不再開火，安安靜靜坐上b9……' },
      { ply: 0, en: 'Cannon to b9 — QUIETLY, no check at all (no screen, no check). Now count black\u2019s moves: c9 falls to the c-pawn, e9 to the e-pawn, d8 to both pawns. ZERO legal moves and no check: black is strangled. 困斃 — Red wins!', zh: '炮平b9——安靜地，連將軍都不是（沒有炮架，不成將軍）。數數黑方的著法：c9被七兵管住，e9被九兵管住，d8被雙兵夾死。零著法、無將軍：黑方困斃，紅勝！' }
    ],
    quizAfter: true
  },
  {
    id: 'e9',
    cat: 'endgame',
    icon: '穿',
    titleEn: 'Mate pattern: Piercing the Heart',
    titleZh: '殺法：大膽穿心',
    descEn: 'The palace center hides behind an advisor. Pay the full price — smash straight through it.',
    descZh: '九宮中心有士遮掩。捨得代價——一舉洞穿。',
    minutes: 4,
    fen: '3nk4/4a4/6N2/4R4/9/R8/9/9/9/3K6 w',
    userSide: 0,
    moves: ['e6e8'],
    notes: [
      { ply: -1, en: 'Black\u2019s advisor squats on the heart of the palace (e8), hiding the king. Your horse on g7 already guards that very square — so a sacrifice there becomes FATAL. Count everything, then strike.', zh: '黑士盤踞九宮心臟（e8），替老將擋風。而你的g7馬恰恰看守著那個格子——棄車入場便是致命一擊。算清之後，果斷出手。' },
      { ply: 0, en: 'CHARIOT TAKES THE HEART! 大膽穿心: the king cannot capture (your horse guards e8), cannot flee (his own horse blocks d9, and your g7-horse covers f9), cannot block (the check is point-blank). Mate!', zh: '車吃心臟！大膽穿心：老將吃不得（紅馬守著e8）、逃不得（自家馬堵住d9，紅馬又看住f9）、擋不得（貼身將軍無處墊）。絕殺！' }
    ],
    quizAfter: true
  }
]

export const STRATEGY_ARTICLES = [
  {
    id: 's1',
    cat: 'strategy',
    titleEn: 'River Control & Key Points',
    titleZh: '河界控制與要點',
    readMin: 4,
    blocks: [
      { type: 'h', en: 'Why the river matters', zh: '河界為何重要' },
      { type: 'p', en: 'The river divides the battlefield. Pieces that cross it gain mobility — especially pawns, which unlock sideways movement after crossing. Controlling the crossing points lets you decide where combat happens.', zh: '河界劃分了整個戰場。越河的子力機動性大增——尤其是過河兵，獲得橫向移動能力。控制渡河點，就能決定戰鬥在哪裡爆發。' },
      { type: 'diagram', fen: START_FEN, captionEn: 'The starting position: the river is quiet, but the fight for it begins immediately.', captionZh: '起始局面：河面看似平靜，爭奪卻已開始。' },
      { type: 'h', en: 'Outposts on the bank', zh: '河岸上的堡壘' },
      { type: 'p', en: 'Place horses on the riverbank squares (like c7/f7 for Red) where they cannot be chased by pawns. A settled outpost horse controls four river files and cramps the enemy.', zh: '把馬放在河口要點（例如紅方的 c7/f7），使對方小兵無法驅趕。站穩的河口馬可控制四條線路，令敵陣窒息。' },
      { type: 'list', items: [
        { en: 'Cross only when you have support nearby', zh: '有支援才過河' },
        { en: 'Trade an enemy outpost occupier or prevent it being built', zh: '兌掉或阻止對方的河口堡壘' },
        { en: 'Keep a chariot patrolling your own bank early on', zh: '開局階段讓車巡視己方河沿' }
      ] }
    ]
  },
  {
    id: 's2',
    cat: 'strategy',
    titleEn: 'Trading Pieces Wisely',
    titleZh: '兌子的學問',
    readMin: 5,
    blocks: [
      { type: 'h', en: 'Material values', zh: '子力價值' },
      { type: 'table', rows: [
        ['俥 Rook', '900', '★★★'],
        ['炮 Cannon', '450', '★★'],
        ['傌 Horse', '400', '★★'],
        ['兵 Pawn (across)', '100–200', '★'],
        ['仕/相 Advisors', '120', 'defence']
      ] },
      { type: 'h', en: 'Cannon or Horse — which to keep?', zh: '留炮還是留馬？' },
      { type: 'p', en: 'Cannons love OPEN positions: many empty lines make them powerful attackers. Horses love CLOSED positions: fewer blocking legs means more squares. When the board opens up, consider trading a horse for a cannon — and vice versa when it closes.', zh: '炮愛開局：空線越多越強；馬愛閉局：蹩腳越少越強。局面打開時考慮以馬換炮，局面閉塞時反之。' },
      { type: 'h', en: 'When NOT to trade', zh: '何時不該兌子' },
      { type: 'list', items: [
        { en: 'You are attacking — trades cool down your initiative', zh: '你在進攻——兌子會冷卻先手' },
        { en: 'Your piece is more active than its counterpart', zh: '己方子力比對方更活躍' },
        { en: 'Trading would relieve the opponent\u2019s cramped position', zh: '兌子會幫助對方解困' }
      ] }
    ]
  },
  {
    id: 's3',
    cat: 'strategy',
    titleEn: 'Palace Attack Patterns',
    titleZh: '九宮攻殺圖式',
    readMin: 6,
    blocks: [
      { type: 'p', en: 'Most games end with a mating attack against the palace. Learn these patterns and you will spot wins two moves earlier.', zh: '大多數對局以攻殺九宮結束。熟悉以下圖式，你能提前兩步看到勝機。' },
      { type: 'h', en: 'Horse-Back Cannon (馬後炮)', zh: '馬後炮' },
      { type: 'diagram', fen: '3aka3/9/4P4/9/4N4/9/9/3C5/9/4K4 b', captionEn: 'Black just moved… find Red\u2019s mate: the horse steps forward to shield the cannon.', captionZh: '試找紅方殺著：跳馬墊炮成殺。（答案：馬進d7）' },
      { type: 'h', en: 'Double Cannon (重炮)', zh: '重炮殺' },
      { type: 'diagram', fen: '3aka3/4C4/9/3N1N3/9/9/6C2/9/9/4K4 b', captionEn: 'One cannon is already parked next to the king. The second one finishes the job.', captionZh: '前炮已就位，後炮一到即殺。（答案：炮平中路）' },
      { type: 'h', en: 'Iron Bolt (鐵門栓)', zh: '鐵門栓' },
      { type: 'p', en: 'A central pawn (or cannon) pins the palace center square so the enemy king can never step down; then a chariot enters the back rank. The name comes from the door-bolt that locks the palace shut.', zh: '以中兵（或中炮）釘住九宮中心，令敵將永遠無法下來，再用車沉底悶殺——如同門栓鎖死宮門。' },
      { type: 'h', en: 'Bold Heart Piercing (大膽穿心)', zh: '大膽穿心' },
      { type: 'p', en: 'A chariot sacrifices itself on the palace center, tearing away the advisors so follow-up forces flood in. Count carefully — the sacrifice must be decisive!', zh: '車捨身棄於九宮中心，拆掉雙士後大軍湧入。務必算清——棄子必須一擊致命！' }
    ]
  },
  {
    id: 's4',
    cat: 'strategy',
    titleEn: 'Opening Principles Checklist',
    titleZh: '開局原則清單',
    readMin: 4,
    blocks: [
      { type: 'list', items: [
        { en: 'Occupy or press the center early (central cannon, central pawn)', zh: '盡早佔據或施壓中路（中炮、沖中兵）' },
        { en: 'Develop horses to connected squares — avoid edge horses without purpose', zh: '跳連環馬——避免無目的的邊馬' },
        { en: 'Bring BOTH chariots out within the first 8 moves', zh: '前8回合內把兩隻車都亮出來' },
        { en: 'Do not move the same piece twice without reason', zh: '無理由不重複走同一子' },
        { en: 'Keep at least the original advisors+elephants until the attack is real', zh: '攻勢成形前別亂動士相' },
        { en: 'Castle-like safety: your general should not face open files', zh: '老帥不要暴露在通線之上' }
      ] },
      { type: 'diagram', fen: '1nbakabr1/r8/1n4n2/p1p1p1p1p/9/4P4/P1P3P1P/1C2C4/9/RNBAKAB1R w', captionEn: 'A healthy opening: central cannon placed, horses connected, chariots ready to roll.', captionZh: '健康的開局：中炮落位、雙馬聯環、兩車蓄勢待發。' },
      { type: 'p', en: 'Break any rule only for a concrete reason: winning material, gaining tempo, or delivering an attack you have calculated.', zh: '只有具體理由才能違反原則：得子、搶先，或已算清的攻殺。' }
    ]
  },
  {
    id: 's5',
    cat: 'strategy',
    titleEn: 'The Two Classics: 橘中秘 & 梅花譜',
    titleZh: '兩大古譜：《橘中秘》與《梅花譜》',
    readMin: 5,
    blocks: [
      { type: 'p', en: 'For four centuries almost every Chinese chess player has learned the game through two books. 《橘中秘》 (The Orange Secret, 1570, Ming dynasty) is the bible of AGGRESSION: it collects ferocious Central Cannon attacks and teaches you to hunt the king from move one.', zh: '四個世紀以來，學象棋幾乎都繞不開兩部書。《橘中秘》（明·1570年）是「攻殺」的聖經：收錄大量兇悍的中炮攻殺，教你從第一步就追殺對方老將。' },
      { type: 'p', en: 'A century later 《梅花譜》 (Plum Blossom Manual, Qing dynasty) answered with the art of DEFENCE: its Screen Horses systems showed that calm, connected structures can swallow every cannon attack — then counterattack in the center.', zh: '百年之後，《梅花譜》（清代）以「防守」的藝術回應：其屏風馬體系證明，冷靜連環的陣型可以吞掉一切炮攻，再從中路反擊。' },
      { type: 'h', en: 'What to take from each', zh: '各取所長' },
      { type: 'list', items: [
        { en: 'From 橘中秘: speed of development, cannon attacks along open files, sacrifice patterns against the palace', zh: '學《橘中秘》：出子速度、沿開放線的炮攻、破宮棄子圖式' },
        { en: 'From 梅花譜: piece coordination before confrontation, the Screen Horses wall, timing the central counter-thrust', zh: '學《梅花譜》：先協調後接觸、屏風馬城牆、把握中路反擊時機' },
        { en: 'Play both sides! Attack with cannons one game, defend with Screen Horses the next', zh: '雙方都要練！一局執炮進攻，一局執馬防守' }
      ] },
      { type: 'diagram', fen: START_FEN, captionEn: 'Every classic begins here: who commands the center first?', captionZh: '所有古譜都從這裡開始：誰先掌控中路？' },
      { type: 'p', en: 'The opening lessons 順炮, 列炮, 過河車 in this app all come straight from these two traditions — master them and you are walking in the footsteps of four centuries of masters.', zh: '本應用中的順炮、列炮、過河車等開局課程皆源於這兩大傳統——掌握它們，就是踏著四百年大師的足跡前行。' }
    ]
  },
  {
    id: 's6',
    cat: 'strategy',
    titleEn: 'Glossary of Classical Mating Patterns',
    titleZh: '古譜殺法小辭典',
    readMin: 6,
    blocks: [
      { type: 'p', en: 'The old books named their mating patterns like weapons. Learn the names, recognize the shapes, and you will find them two moves faster in your own games.', zh: '古譜給殺法起了武器般的名字。記住名字、認出形狀，實戰中你就能提前兩步發現殺機。' },
      { type: 'list', items: [
        { en: '馬後炮 Horse-Back Cannon — the horse screens the checking cannon on the same file', zh: '馬後炮——馬充當同線炮架，炮借馬成殺' },
        { en: '重炮 Double Cannons — the rear cannon uses the front one as an unblockable screen', zh: '重炮——前炮作架，後炮將軍，無法阻擋' },
        { en: '鐵門栓 Iron Door-Bolt — a low pawn pins the palace so back-rank attack decides', zh: '鐵門栓——低兵釘宮，底線定勝負' },
        { en: '大膽穿心 Piercing the Heart — chariot sacrifice on the palace center', zh: '大膽穿心——棄車直搗九宮中心' },
        { en: '二鬼拍門 Two Ghosts at the Door — paired pawns on the fourth/sixth files strangle the king', zh: '二鬼拍門——四六路雙兵扼殺老將' },
        { en: '天地炮 Heaven & Earth — one cannon on the back rank, one down the middle', zh: '天地炮——一炮沉底，一炮鎮中' },
        { en: '海底撈月 Moon from the Seabed — late-game cannon squeezes the king to the edge', zh: '海底撈月——殘局炮逼邊將取勝' },
        { en: '困斃 Suffocation — no check at all; zero legal moves loses on the spot', zh: '困斃——不用將軍，無子可動即負' }
      ] },
      { type: 'diagram', fen: '3aka3/4p4/8p/9/9/9/9/9/9/C2K5 w', captionEn: 'Smothered Palace: black\u2019s own staff and soldier lock the box. One knock from outside. (Answer: cannon a0-a9)', captionZh: '悶宮：自家的士卒鎖死了九宮，只需從外面一敲。（答案：炮a0-a9）' },
      { type: 'diagram', fen: '4k4/3P1P3/9/R8/9/9/9/9/9/4K4 w', captionEn: 'Two Ghosts at the Door: the pawns have already done their job. One knock left. (Answer: chariot a6-a9)', captionZh: '二鬼拍門：雙兵已就位，只差敲門。（答案：車a6-a9）' },
      { type: 'p', en: 'Practice each pattern interactively in the Endgames & Tactics section — every diagram here appears there as a playable lesson.', zh: '請在「殘局與戰術」分區互動練習每一種殺法——此處每張圖都是可實戰演練的課程。' }
    ]
  }
]

export const ALL_LESSONS = [...OPENING_LESSONS, ...ENDGAME_LESSONS]

export const LESSON_SEQUENCES = ALL_LESSONS.filter(l => l.cat === 'opening').map(l => l.moves)
