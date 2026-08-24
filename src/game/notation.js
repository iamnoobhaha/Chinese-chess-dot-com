import { RED, BLACK, colorOf, typeOf, rowOf, colOf, idx } from '../engine/board.js'

export const RED_CHARS = { 1: '帥', 2: '仕', 3: '相', 4: '傌', 5: '俥', 6: '炮', 7: '兵' }
export const BLACK_CHARS = { 1: '將', 2: '士', 3: '象', 4: '馬', 5: '車', 6: '砲', 7: '卒' }

export function pieceChar(pc) {
  if (!pc) return ''
  return colorOf(pc) === RED ? RED_CHARS[typeOf(pc)] : BLACK_CHARS[typeOf(pc)]
}

const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九']

function fileLabel(col, color) {
  if (color === RED) return CN_NUMS[8 - col]
  return String(col + 1)
}

function stepLabel(n, color) {
  if (color === RED) return CN_NUMS[n - 1]
  return String(n)
}

export function chineseMove(bdBefore, from, to) {
  const pc = bdBefore[from]
  if (!pc) return ''
  const color = colorOf(pc)
  const t = typeOf(pc)
  const r0 = rowOf(from), c0 = colOf(from)
  const r1 = rowOf(to), c1 = colOf(to)
  const ch = pieceChar(pc)

  let prefix
  const sameFile = []
  for (let i = 0; i < 90; i++) {
    if (i !== from && bdBefore[i] && bdBefore[i] === pc && colOf(i) === c0) sameFile.push(i)
  }
  if (sameFile.length === 0) {
    prefix = ch + fileLabel(c0, color)
  } else {
    const all = [...sameFile, from].sort((a, b) =>
      color === RED ? a - b : b - a
    )
    const pos = all.indexOf(from)
    const n = all.length
    let tag
    if (n === 2) tag = pos === 0 ? '前' : '後'
    else tag = pos === 0 ? '前' : pos === n - 1 ? '後' : pos <= (n - 1) / 2 ? CN_NUMS[pos] : CN_NUMS[n - 1 - pos]
    prefix = tag + ch
  }

  let verb
  const forward = color === RED ? -1 : 1
  if (r1 === r0) verb = '平'
  else if ((r1 - r0) * forward > 0) verb = '進'
  else verb = '退'

  let param
  if (verb === '平') param = fileLabel(c1, color)
  else if (t === 4 || t === 3 || t === 2) param = fileLabel(c1, color)
  else param = stepLabel(Math.abs(r1 - r0), color)

  return prefix + verb + param
}
