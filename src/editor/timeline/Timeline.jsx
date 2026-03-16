/**
 * Timeline — Barra de tiempo
 * - Playhead arrastrable para scrubbing
 * - Clips arrastrables horizontalmente (cambiar position/inicio)
 * - Handle en borde derecho del clip para resize (cambiar duration)
 * - Duración total editable con doble clic
 */
import React, { useRef, useCallback, useState } from 'react'
import { useAnimatorStore } from '@store/useAnimatorStore'
import { player } from '@engine/AnimationPlayer'
import './Timeline.css'

const LABEL_W  = 90    // px del label izquierdo
const TRACK_W  = 560   // px que representan la duración total del stage

export default function Timeline() {
  const schema       = useAnimatorStore(s => s.schema)
  const playhead     = useAnimatorStore(s => s.playhead)
  const playerState  = useAnimatorStore(s => s.playerState)
  const selectedId   = useAnimatorStore(s => s.selectedElementId)
  const selectEl     = useAnimatorStore(s => s.selectElement)
  const updateAnim   = useAnimatorStore(s => s.updateAnimation)
  const setDuration  = useAnimatorStore(s => s.setDuration)
  const setPlayhead  = useAnimatorStore(s => s.setPlayhead)
  const bodyRef      = useRef(null)
  const dragRef      = useRef(null)

  // Estado para editar la duración total
  const [editDur, setEditDur] = useState(null)  // null = cerrado, string = en edición

  // Duración total = lo que el usuario fijó, expandida si hay clips que sobresalen
  const autoDur = schema.elements.reduce((max, el) =>
    Math.max(max, el.animations.reduce((m, a) =>
      Math.max(m, (a.position ?? 0) + (a.duration ?? 1)), 0)
    ), 0)
  const duration = Math.max(schema.duration ?? 3, autoDur)

  const toPx  = (t) => (t / duration) * TRACK_W
  const toSec = (px) => (px / TRACK_W) * duration

  // ── Seek clickando en la regla (no playhead) ─────────
  const handleRulerClick = useCallback((e) => {
    if (dragRef.current) return
    const rect = bodyRef.current?.querySelector('.timeline-ruler')?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left - LABEL_W
    const t = Math.max(0, Math.min(toSec(x), duration))
    player.seek(t)
    setPlayhead(t)
  }, [duration])

  // ── Drag del playhead ─────────────────────────────────
  const handlePlayheadMouseDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    const bodyRect = bodyRef.current?.getBoundingClientRect()
    if (!bodyRect) return
    dragRef.current = { type: 'playhead' }
    const onMove = (ev) => {
      const x = ev.clientX - bodyRect.left - LABEL_W
      const t = Math.max(0, Math.min(toSec(x), duration))
      player.seek(t)
      setPlayhead(t)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  // ── Edición de duración total ─────────────────────────
  const openDurEdit = () => setEditDur(String(duration.toFixed(1)))
  const commitDurEdit = () => {
    const v = parseFloat(editDur)
    if (!isNaN(v) && v > 0) setDuration(v)
    setEditDur(null)
  }
  const handleDurKey = (e) => {
    if (e.key === 'Enter') commitDurEdit()
    if (e.key === 'Escape') setEditDur(null)
  }

  // ── mousedown en un clip (drag posición) ─────────────
  const handleClipMouseDown = (e, elemId, animIdx, position, dur) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      type: 'move',
      elemId, animIdx,
      startX: e.clientX,
      origValue: position,
      dur,
    }
    attachDragListeners()
  }

  // ── mousedown en el handle derecho (resize duración) ─
  const handleResizeMouseDown = (e, elemId, animIdx, dur) => {
    e.stopPropagation()
    e.preventDefault()
    dragRef.current = {
      type: 'resize',
      elemId, animIdx,
      startX: e.clientX,
      origValue: dur,
    }
    attachDragListeners()
  }

  // ── Listeners de drag globales ────────────────────────
  const attachDragListeners = () => {
    const onMove = (ev) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - d.startX
      const dt = toSec(dx)
      if (d.type === 'move') {
        const newPos = Math.max(0, parseFloat((d.origValue + dt).toFixed(3)))
        updateAnim(d.elemId, d.animIdx, { position: newPos })
      } else {
        const newDur = Math.max(0.05, parseFloat((d.origValue + dt).toFixed(3)))
        updateAnim(d.elemId, d.animIdx, { duration: newDur })
      }
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  return (
    <div className="timeline">
      <div className="timeline-header">
        <span>Timeline</span>
        <div className="timeline-time">
          <span>{playhead.toFixed(2)}s&nbsp;/&nbsp;</span>
          {editDur !== null ? (
            <input
              className="duration-edit-input"
              value={editDur}
              autoFocus
              onChange={e => setEditDur(e.target.value)}
              onBlur={commitDurEdit}
              onKeyDown={handleDurKey}
            />
          ) : (
            <span
              className="duration-clickable"
              title="Doble clic para editar duración total"
              onDoubleClick={openDurEdit}
            >
              {duration.toFixed(1)}s
            </span>
          )}
        </div>
        <div className="timeline-playback">
          <button className="tl-btn" onClick={() => player.play()}    title="Play">▶</button>
          <button className="tl-btn" onClick={() => player.pause()}   title="Pause">⏸</button>
          <button className="tl-btn" onClick={() => player.stop()}    title="Stop">⏹</button>
          <button className="tl-btn" onClick={() => player.restart()} title="Restart">⏮</button>
        </div>
      </div>

      <div className="timeline-body" ref={bodyRef}>

        {/* Regla de tiempo */}
        <div className="timeline-ruler" onClick={handleRulerClick}>
          <div style={{ width: LABEL_W, flexShrink: 0 }} />
          <div className="ruler-track" style={{ width: TRACK_W, position: 'relative' }}>
            {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
              <div key={i} className="ruler-mark" style={{ left: toPx(i) }}>
                <span>{i}s</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tracks por elemento */}
        <div className="timeline-tracks">
          {schema.elements.map(el => (
            <div
              key={el.id}
              className={`timeline-track ${el.id === selectedId ? 'selected' : ''}`}
              onClick={() => selectEl(el.id)}
            >
              <div className="track-label" title={el.label}>{el.label}</div>
              <div className="track-clips" style={{ width: TRACK_W }}>
                {el.animations.map((anim, i) => {
                  const startPx = toPx(anim.position ?? 0)
                  const durPx   = Math.max(toPx(anim.duration ?? 1), 8)
                  return (
                    <div
                      key={i}
                      className="clip"
                      title={`${anim.property}: ${anim.from} → ${anim.to}\nDur: ${(anim.duration ?? 1).toFixed(2)}s | Inicio: ${(anim.position ?? 0).toFixed(2)}s\nArrastrá para mover · handle derecho para redimensionar`}
                      style={{ left: startPx, width: durPx }}
                      onMouseDown={e => handleClipMouseDown(e, el.id, i, anim.position ?? 0, anim.duration ?? 1)}
                    >
                      <span className="clip-label">{anim.property}</span>
                      {/* Handle resize — borde derecho */}
                      <div
                        className="clip-resize-handle"
                        onMouseDown={e => handleResizeMouseDown(e, el.id, i, anim.duration ?? 1)}
                        title="Arrastrar para cambiar duración"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: LABEL_W + toPx(playhead) }}
          onMouseDown={handlePlayheadMouseDown}
          title="Arrastrar para scrubbing"
        />

        {/* Estado */}
        <div className={`timeline-state state-${playerState}`}>{playerState}</div>
      </div>
    </div>
  )
}

