const LOBBY_CHANNEL = 'xqm-lobby-v1'
const roomChannelName = roomId => `xqm-room-${roomId}`
const JOIN_TIMEOUT = 15000
const START_TIMEOUT = 8000
const HB_INTERVAL = 2000
const HB_TIMEOUT = 7000

function genId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

export function genRoomCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += A[(Math.random() * A.length) | 0]
  return s
}

// Cross-tab real-time play via BroadcastChannel (same browser, two tabs/windows).
//
// Lobby messages: seek / offer / accept / room-open / room-join / room-ready
// Room messages:  start / move / resign / draw-offer / draw-accept /
//                 draw-decline / rematch / leave / hb
export class OnlineClient {
  constructor(handlers = {}) {
    this.h = handlers
    this.myId = genId()
    this.lobby = null
    this.room = null
    this.roomId = null
    this.seekActive = false
    this.pendingJoin = null
    this.hosting = null
    this.sentOffers = new Set()
    this.players = null
    this.redId = null
    this.matched = false
    this.wantRematch = false
    this.oppWantRematch = false
    this.lastSeen = 0
    this.timers = new Set()
    this.recentSeeks = new Map()
  }

  // Listen for lobby traffic immediately (idle tabs can answer seekers).
  connectLobby() {
    if (!this.supported()) return
    try { this._ensureLobby() } catch {}
  }

  _emit(kind, detail = '') {
    if (this.h && this.h.onEvent) {
      try { this.h.onEvent({ kind, detail, t: Date.now() }) } catch {}
    }
  }

  supported() {
    return typeof BroadcastChannel !== 'undefined'
  }

  _later(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id)
      fn()
    }, ms)
    this.timers.add(id)
    return id
  }

  _clearTimers() {
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
    if (this._hb) { clearInterval(this._hb); this._hb = null }
    if (this._watch) { clearInterval(this._watch); this._watch = null }
  }

  destroy() {
    this._clearTimers()
    if (this.room) { try { this.room.postMessage({ type: 'leave' }) } catch {} ; this.room.close(); this.room = null }
    if (this.lobby) { this.lobby.close(); this.lobby = null }
  }

  // ---------- lobby channel ----------

  _ensureLobby() {
    if (!this.supported()) throw new Error('BroadcastChannel unsupported')
    if (this.lobby) return
    this.lobby = new BroadcastChannel(LOBBY_CHANNEL)
    this.lobby.onmessage = e => {
      try { this._onLobby(e.data) } catch (err) { console.error(err) }
    }
  }

  _post(msg) {
    msg.from = this.myId
    this._ensureLobby()
    this.lobby.postMessage(msg)
  }

  seek(profile) {
    this.seekActive = true
    this.me = { id: this.myId, name: profile.name, rating: profile.rating }
    const ping = () => {
      if (!this.seekActive || this.matched) return
      this._post({ type: 'seek', name: this.me.name, rating: this.me.rating })
      this._emit('seek-sent')
      this._later(2000, ping)
    }
    ping()
  }

  cancelSeek() {
    this.seekActive = false
    this.sentOffers.clear()
  }

  openRoom(code, profile) {
    this.hosting = { code, roomId: genId(), profile }
    this.me = { id: this.myId, name: profile.name, rating: profile.rating }
    this._post({ type: 'room-open', code, roomId: this.hosting.roomId })
    this._emit('room-opened', code)
    this.hostAnnounceTimer = this._later(HB_INTERVAL * 2, () => {
      if (this.hosting && !this.matched) {
        this._post({ type: 'room-open', code: this.hosting.code, roomId: this.hosting.roomId })
      }
    })
  }

  closeRoom() {
    this.hosting = null
  }

  joinRoom(code, profile) {
    this.pendingJoin = { code, profile }
    this.me = { id: this.myId, name: profile.name, rating: profile.rating }
    this._post({ type: 'room-join', code, name: profile.name, rating: profile.rating })
    this._later(JOIN_TIMEOUT, () => {
      if (this.pendingJoin && !this.matched) {
        this.pendingJoin = null
        if (this.h.onJoinFailed) this.h.onJoinFailed()
      }
    })
  }

  cancelJoin() {
    this.pendingJoin = null
  }

  _onLobby(m) {
    if (!m || m.from === this.myId) return
    switch (m.type) {
      case 'seek': {
        if (this.matched || this.pendingJoin || this.hosting) return
        const now = Date.now()
        for (const [id, ts] of this.recentSeeks) {
          if (now - ts > 5000) this.recentSeeks.delete(id)
        }
        if (now - (this.recentSeeks.get(m.from) || 0) < 1500) return
        this.recentSeeks.set(m.from, now)
        this._emit('seek-heard', m.name)
        // Offer to help match: always when idle, or when both seeking let the
        // lower id defer (the higher id's offer wins the race deterministically).
        if (!this.seekActive || m.from < this.myId) {
          const roomId = genId()
          this.sentOffers.add(roomId)
          this._later(12000, () => this.sentOffers.delete(roomId))
          this._post({
            type: 'offer', to: m.from, roomId, seeking: !!this.seekActive,
            name: (this.me && this.me.name) || 'Player',
            rating: (this.me && this.me.rating) || 1500
          })
          this._emit('offer-sent', `${m.name} (${m.rating})`)
        }
        break
      }
      case 'offer':
        if (!this.seekActive || m.to !== this.myId) return
        if (m.seeking && m.from <= this.myId) { this._emit('offer-deferred', m.name); return }
        this._emit('offer-received', `${m.name} (${m.rating})`)
        this._acceptOffer(m)
        break
      case 'accept':
        if (this.matched || m.to !== this.myId || !this.sentOffers.has(m.roomId)) return
        this.sentOffers.clear()
        this._emit('handshake-ok')
        this._openRoom(m.roomId)
        this._roomPost({ type: 'ready' })
        this._later(START_TIMEOUT, () => {
          if (!this.matched && this.h.onMatchFailed) this.h.onMatchFailed()
        })
        break
      case 'room-open':
        if (this.pendingJoin && m.code === this.pendingJoin.code && !this.matched) {
          this._emit('room-found', m.code)
          this._post({ type: 'room-join', code: m.code, name: this.pendingJoin.profile.name, rating: this.pendingJoin.profile.rating, roomId: m.roomId })
        }
        break
      case 'room-join':
        if (!this.hosting || this.matched || m.code !== this.hosting.code) return
        this.matched = true
        this._emit('room-join-received', `${m.name} (${m.rating})`)
        this._post({ type: 'room-ready', to: m.from, roomId: this.hosting.roomId })
        this._startMatch(this.hosting.roomId, { id: m.from, name: m.name, rating: m.rating }, true)
        break
      case 'room-ready':
        if (m.to === this.myId && this.pendingJoin && !this.matched) {
          this._emit('handshake-ok')
          this._openRoom(m.roomId)
          this._roomPost({ type: 'ready' })
          this._later(START_TIMEOUT, () => {
            if (!this.matched && this.h.onJoinFailed) this.h.onJoinFailed()
          })
        }
        break
    }
  }

  _acceptOffer(m) {
    this.seekActive = false
    this.sentOffers.clear()
    this._startMatch(m.roomId, { id: m.from, name: m.name, rating: m.rating }, true)
    this._post({ type: 'accept', to: m.from, roomId: m.roomId })
  }

  _startMatch(roomId, opp, amCoordinator) {
    this._openRoom(roomId)
    this.players = { [this.myId]: this.me, [opp.id]: opp }
    this.redId = Math.random() < 0.5 ? this.myId : opp.id
    const start = { type: 'start', roomId, redId: this.redId, players: this.players }
    this.startAcked = false
    if (amCoordinator) {
      this._consumeStart(start)
      let attempts = 0
      const resend = () => {
        if (this.startAcked || !this.matched || attempts > 10 || !this.room) return
        this._roomPost(start)
        attempts++
        this._later(450, resend)
      }
      resend()
    } else {
      this._consumeStart(start)
    }
  }

  _consumeStart(start) {
    this.matched = true
    this.players = start.players
    this.redId = start.redId
    const myColor = start.redId === this.myId ? 0 : 1
    const oppId = Object.keys(start.players).find(id => id !== this.myId)
    this._emit('match-start', `${start.players[oppId].name} (${start.players[oppId].rating})`)
    if (this.h.onMatch) {
      this.h.onMatch({ roomId: start.roomId, myColor, me: start.players[this.myId], opp: start.players[oppId] })
    }
  }

  // ---------- room channel ----------

  _openRoom(roomId) {
    if (this.room) { try { this.room.close() } catch {} }
    this.roomId = roomId
    this.room = new BroadcastChannel(roomChannelName(roomId))
    this.room.onmessage = e => {
      try { this._onRoom(e.data) } catch (err) { console.error(err) }
    }
    this.lastSeen = Date.now()
    this.goneFired = false
    this._hb = setInterval(() => this._roomPost({ type: 'hb' }), HB_INTERVAL)
    this._watch = setInterval(() => {
      if (this.matched && !this.goneFired && Date.now() - this.lastSeen > HB_TIMEOUT) {
        this.goneFired = true
        if (this.h.onOppLeft) this.h.onOppLeft('disconnect')
      }
    }, HB_INTERVAL)
  }

  _roomPost(msg) {
    if (!this.room) return
    msg.from = this.myId
    this.room.postMessage(msg)
  }

  _onRoom(m) {
    if (!m || m.from === this.myId) return
    this.lastSeen = Date.now()
    switch (m.type) {
      case 'ready': {
        const alreadyAcked = this.startAcked
        this.startAcked = true
        // The sender just subscribed to this room. Earlier 'start' posts were
        // sent before it listened and are lost — push a fresh burst now that
        // delivery is guaranteed (sender subscribed before posting 'ready').
        if (!alreadyAcked && this.matched && this.players && this.redId != null && this.room) {
          let pushes = 0
          const pushStart = () => {
            if (!this.matched || !this.room || pushes >= 3) return
            this._roomPost({ type: 'start', roomId: this.roomId, redId: this.redId, players: this.players })
            pushes++
            this._later(350, pushStart)
          }
          pushStart()
        }
        break
      }
      case 'start':
        if (!this.matched) this._consumeStart(m)
        else if (this.h && !this.startAcked) { /* late duplicate — ignore */ }
        break
      case 'move':
        this._emit('move-received', m.iccs)
        if (this.h.onMove) this.h.onMove(m.iccs, m.ply)
        break
      case 'resign': if (this.h.onOppResign) this.h.onOppResign(); break
      case 'draw-offer': if (this.h.onDrawOffer) this.h.onDrawOffer(); break
      case 'draw-accept': if (this.h.onDrawAccepted) this.h.onDrawAccepted(); break
      case 'draw-decline': if (this.h.onDrawDeclined) this.h.onDrawDeclined(); break
      case 'rematch': this._onRematchReq(); break
      case 'leave':
        if (!this.goneFired) {
          this.goneFired = true
          if (this.h.onOppLeft) this.h.onOppLeft('left')
        }
        break
    }
  }

  sendMove(iccs, ply) { this._roomPost({ type: 'move', iccs, ply }) }
  sendResign() { this._roomPost({ type: 'resign' }) }
  sendDrawOffer() { this._roomPost({ type: 'draw-offer' }) }
  sendDrawAccept() { this._roomPost({ type: 'draw-accept' }) }
  sendDrawDecline() { this._roomPost({ type: 'draw-decline' }) }
  sendRematch() { this.wantRematch = true; this._roomPost({ type: 'rematch' }); this._maybeRematch() }

  _onRematchReq() {
    this.oppWantRematch = true
    this._maybeRematch()
  }

  _maybeRematch() {
    if (!(this.wantRematch && this.oppWantRematch)) return
    this.wantRematch = false
    this.oppWantRematch = false
    this.goneFired = false
    this.redId = this.redId === this.myId
      ? Object.keys(this.players).find(id => id !== this.myId)
      : this.myId
    if (this.h.onRematchStart) this.h.onRematchStart(this.redId === this.myId ? 0 : 1)
  }

  leaveRoom() {
    this._roomPost({ type: 'leave' })
    this._teardownRoom()
  }

  _teardownRoom() {
    this._clearTimers()
    if (this.room) { this.room.close(); this.room = null }
    this.roomId = null
    this.matched = false
    this.players = null
    this.redId = null
    this.hosting = null
    this.pendingJoin = null
    this.seekActive = false
    this.sentOffers.clear()
  }
}
