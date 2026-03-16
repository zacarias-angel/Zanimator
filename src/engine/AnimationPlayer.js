/**
 * Zanimator — Animation Engine
 * Convierte un AnimationSchema (JSON) en un GSAP timeline
 * y expone controles + sistema de eventos.
 */
import gsap from 'gsap'

// ─── EventEmitter liviano ────────────────────────────────
class EventEmitter {
  constructor() {
    this._listeners = {}
  }

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(fn)
    return this  // chainable
  }

  off(event, fn) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(l => l !== fn)
    return this
  }

  emit(event, data) {
    const listeners = this._listeners[event] || []
    listeners.forEach(fn => fn(data))
    return this
  }

  once(event, fn) {
    const wrapper = (data) => { fn(data); this.off(event, wrapper) }
    return this.on(event, wrapper)
  }
}

// ─── AnimationPlayer ────────────────────────────────────
export class AnimationPlayer extends EventEmitter {
  constructor() {
    super()
    this.timeline = null
    this.schema   = null
    this._state   = 'idle'  // idle | playing | paused | stopped
  }

  // ── Carga un schema JSON y construye el timeline ──
  load(schema) {
    this.schema = schema

    // Limpia timeline anterior si existe
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }

    this.timeline = this._buildTimeline(schema)
    this._state   = 'idle'
    this.emit('load', { schema })
    return this
  }

  // ── Controles principales ──────────────────────────
  play() {
    if (!this.timeline) return this
    this.timeline.play()
    this._state = 'playing'
    this.emit('play', { time: this.timeline.time() })
    return this
  }

  pause() {
    if (!this.timeline) return this
    this.timeline.pause()
    this._state = 'paused'
    this.emit('pause', { time: this.timeline.time() })
    return this
  }

  stop() {
    if (!this.timeline) return this
    this.timeline.pause(0)
    this._state = 'stopped'
    this.emit('stop', { time: 0 })
    return this
  }

  restart() {
    if (!this.timeline) return this
    this.timeline.restart()
    this._state = 'playing'
    this.emit('restart', { time: 0 })
    return this
  }

  reverse() {
    if (!this.timeline) return this
    this.timeline.reverse()
    this._state = 'playing'
    this.emit('reverse', { time: this.timeline.time() })
    return this
  }

  seek(time) {
    if (!this.timeline) return this
    this.timeline.seek(time)
    this.emit('seek', { time })
    return this
  }

  // ── Getters de estado ──────────────────────────────
  get state()    { return this._state }
  get duration() { return this.timeline?.duration() ?? 0 }
  get progress() { return this.timeline?.progress() ?? 0 }
  get time()     { return this.timeline?.time() ?? 0 }

  // ── Construcción del GSAP Timeline desde JSON ──────
  _buildTimeline(schema) {
    const tl = gsap.timeline({
      paused: true,
      onStart:    () => this.emit('start', { time: 0 }),
      onComplete: () => { this._state = 'stopped'; this.emit('complete', { time: tl.duration() }) },
      onUpdate:   () => this.emit('update', { time: tl.time(), progress: tl.progress() }),
      onRepeat:   () => this.emit('repeat', { count: tl.totalIterations?.() }),
    })

    const elements = schema.elements ?? []

    elements.forEach(el => {
      const target = el.domId ? `#${el.domId}` : null
      if (!target) return

      const animations = el.animations ?? []

      animations.forEach(anim => {
        const tweenVars = {
          duration: anim.duration ?? 1,
          ease:     anim.ease ?? 'none',
          repeat:   anim.repeat ?? 0,
          yoyo:     anim.yoyo ?? false,
        }

        // Soporte para múltiples propiedades en una sola animación
        if (anim.properties) {
          Object.assign(tweenVars, anim.properties)
        } else if (anim.property) {
          tweenVars[anim.property] = anim.to
        }

        const position = anim.position ?? '>'  // por defecto: secuencial

        if (anim.from !== undefined && anim.to !== undefined && anim.property) {
          // fromTo
          tl.fromTo(target, { [anim.property]: anim.from }, tweenVars, position)
        } else {
          // to
          tl.to(target, tweenVars, position)
        }
      })
    })

    return tl
  }
}

// ─── Instancia global del editor ────────────────────────
export const player = new AnimationPlayer()
