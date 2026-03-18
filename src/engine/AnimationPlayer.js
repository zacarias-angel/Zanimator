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
    // 1. Mata el timeline anterior
    if (this.timeline) {
      this.timeline.kill()
      this.timeline = null
    }

    // 2. Limpia solo las propiedades que GSAP maneja (transforms + opacity)
    //    NUNCA clearProps:'all' — eso borra también width/height/background del elemento
    ;(schema.elements ?? []).forEach(el => {
      if (!el.domId) return
      gsap.set(`#${el.domId}`, {
        clearProps: 'x,y,rotation,scale,scaleX,scaleY,skewX,skewY,opacity,xPercent,yPercent,transformOrigin',
      })
    })

    this.schema   = schema
    this.timeline = this._buildTimeline(schema)

    // 3. Seek a t=0 para que los tweens que arrancan en t=0 apliquen su 'from'
    this.timeline.seek(0)

    // 4. Aplica los transforms base DESPUÉS del seek — así son la última instrucción
    //    y no pueden ser pisados por la inicialización del timeline.
    //    Para tweens que arrancan en t=0 el valor coincide con el 'from' de la animación.
    //    Para tweens que arrancan en t>0 esto posiciona el elemento en su estado inicial
    //    antes de que la animación lo tome.
    this._applyBaseTransforms(schema)

    this._state = 'idle'
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

  // Aplica transforms base (x/y/scale/rotation) a un elemento sin recargar el timeline
  setBaseTransform(target, transform = {}) {
    gsap.set(target, {
      x:        transform.x        ?? 0,
      y:        transform.y        ?? 0,
      scale:    transform.scale    ?? 1,
      rotation: transform.rotation ?? 0,
    })
    return this
  }

  // Aplica los transforms base de todos los elementos del schema
  _applyBaseTransforms(schema) {
    ;(schema.elements ?? []).forEach(el => {
      if (!el.domId) return
      const t = el.transform ?? {}
      // Solo hace el set si hay algún valor non-default para evitar efectos innecesarios
      if ((t.x ?? 0) !== 0 || (t.y ?? 0) !== 0 || (t.scale ?? 1) !== 1 || (t.rotation ?? 0) !== 0) {
        gsap.set(`#${el.domId}`, {
          x:        t.x        ?? 0,
          y:        t.y        ?? 0,
          scale:    t.scale    ?? 1,
          rotation: t.rotation ?? 0,
        })
      }
    })
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
