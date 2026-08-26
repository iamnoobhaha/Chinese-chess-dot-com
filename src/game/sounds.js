const KEY = 'xqm_sound'

export function soundEnabled() {
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}

export function setSoundEnabled(on) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch {}
}

let ctx = null

function ac() {
  if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return null
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(c, { freq = 440, dur = 0.1, type = 'sine', gain = 0.15, delay = 0, slide = 0 }) {
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function knock(c, { freq = 160, gain = 0.5, dur = 0.09, delay = 0 }) {
  // wooden piece click: short sine thump + tiny noise snap
  tone(c, { freq, dur, type: 'sine', gain, delay, slide: -freq * 0.6 })
  const len = Math.floor(c.sampleRate * 0.03)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5)
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.setValueAtTime(gain * 0.35, c.currentTime + delay)
  const filt = c.createBiquadFilter()
  filt.type = 'highpass'
  filt.frequency.value = 1800
  src.connect(filt).connect(g).connect(c.destination)
  src.start(c.currentTime + delay)
}

function play(fn) {
  if (!soundEnabled()) return
  const c = ac()
  if (!c) return
  try { fn(c) } catch {}
}

export const sfx = {
  move() {
    play(c => knock(c, { freq: 175 }))
  },
  capture() {
    play(c => {
      knock(c, { freq: 130, gain: 0.6 })
      tone(c, { freq: 520, dur: 0.06, type: 'triangle', gain: 0.12, delay: 0.03 })
    })
  },
  check() {
    play(c => {
      tone(c, { freq: 880, dur: 0.09, type: 'square', gain: 0.08 })
      tone(c, { freq: 880, dur: 0.09, type: 'square', gain: 0.08, delay: 0.13 })
    })
  },
  win() {
    play(c => {
      ;[523, 659, 784, 1047].forEach((f, i) =>
        tone(c, { freq: f, dur: 0.22, type: 'triangle', gain: 0.14, delay: i * 0.11 }))
    })
  },
  lose() {
    play(c => {
      ;[392, 330, 262].forEach((f, i) =>
        tone(c, { freq: f, dur: 0.3, type: 'triangle', gain: 0.14, delay: i * 0.14 }))
    })
  },
  draw() {
    play(c => {
      tone(c, { freq: 494, dur: 0.25, type: 'triangle', gain: 0.13 })
      tone(c, { freq: 494, dur: 0.25, type: 'triangle', gain: 0.13, delay: 0.28 })
    })
  }
}
