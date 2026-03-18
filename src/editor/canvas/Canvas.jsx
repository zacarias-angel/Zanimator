/**
 * Canvas — Preview del stage
 * - Renderiza elementos del schema en DOM (GSAP los anima por ID)
 * - Acepta drag & drop de imágenes del sistema para crear assets
 * - Auto-escala el stage para que siempre quepa en el área disponible
 * - Drag de elementos para reposicionarlos (cuando el player está detenido)
 */
import React, { useEffect, useRef, useState } from 'react'
import { useAnimatorStore } from '@store/useAnimatorStore'
import { player } from '@engine/AnimationPlayer'
import './Canvas.css'

const FRAME_SIZES = {
  desktop: { w: 600, h: 340 },
  mobile:  { w: 390, h: 550 },
  both:    { w: 600, h: 340 },
}

function useFontFaces(assets) {
  useEffect(() => {
    assets
      .filter(a => a.type === 'font')
      .forEach(a => {
        const id = `zfont-${a.id}`
        if (document.getElementById(id)) return
        const style = document.createElement('style')
        style.id = id
        style.textContent = `@font-face { font-family: "${a.fontFamily}"; src: url("${a.dataUrl}"); }`
        document.head.appendChild(style)
      })
  }, [assets])
}

export default function Canvas() {
  const schema          = useAnimatorStore(s => s.schema)
  const assets          = useAnimatorStore(s => s.assets)
  const selectedId      = useAnimatorStore(s => s.selectedElementId)
  const selectElement   = useAnimatorStore(s => s.selectElement)
  const addAsset        = useAnimatorStore(s => s.addAsset)
  const addImageElement = useAnimatorStore(s => s.addImageElement)
  const [isDragOver, setIsDragOver] = useState(false)
  const [stageScale, setStageScale] = useState(1)
  const wrapperRef = useRef(null)

  useFontFaces(assets)

  const target = schema.target ?? 'desktop'
  const frame  = FRAME_SIZES[target] ?? FRAME_SIZES.desktop

  // Auto-escala: el stage siempre cabe en el area disponible (fundamental en mobile)
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const measure = () => {
      const { width, height } = wrapper.getBoundingClientRect()
      const sx = (width  - 24) / frame.w
      const sy = (height - 52) / frame.h
      setStageScale(Math.min(sx, sy, 1))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [frame.w, frame.h])
  // Recarga el player preservando tiempo si estaba avanzado
  useEffect(() => {
    const prevTime  = player.time
    const prevState = player.state
    player.load(schema)
    if (prevTime > 0) {
      player.seek(prevTime)
      if (prevState === 'playing') player.play()
    }
  }, [schema])

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = ()  => setIsDragOver(false)
  const handleDrop      = async (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files ?? []).filter(f => f.type.startsWith('image/'))
    for (const file of files) {
      const assetId = await addAsset(file)
      addImageElement(assetId)
    }
  }

  const selectedElement = schema.elements.find(e => e.id === selectedId)

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper"
      onClick={() => selectElement(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="canvas-device-badge">
        {target === 'mobile' ? '📱 Mobile' : target === 'both' ? '🖥📱 Both' : '🖥 Desktop'}
      </div>

      {/* clip-container: dimensiones visuales reales = frame × scale, hace el recorte correcto */}
      <div
        className="canvas-clip"
        style={{ width: frame.w * stageScale, height: frame.h * stageScale }}
      >
      <div
        className={`canvas-stage ${isDragOver ? 'drop-active' : ''}`}
        style={{
          width: frame.w,
          height: frame.h,
          transform: `scale(${stageScale})`,
          transformOrigin: 'top left',
        }}
      >
        {isDragOver && (
          <div className="drop-overlay">
            <span>Soltar imagen para agregar al stage</span>
          </div>
        )}
        {schema.elements.map(el => (
          <CanvasElement
            key={el.id}
            element={el}
            selected={el.id === selectedId}
            onSelect={selectElement}
            stageScale={stageScale}
          />
        ))}
        {selectedElement && <PivotIndicator element={selectedElement} />}
      </div>
      </div>{/* /canvas-clip */}

      <div className="canvas-label">
        Stage — {schema.name}&nbsp;
        <span className="canvas-size">{frame.w}×{frame.h}</span>
        {stageScale < 0.99 && (
          <span className="canvas-zoom">{Math.round(stageScale * 100)}%</span>
        )}
      </div>
    </div>
  )
}

// Cruz amarilla que indica el punto de pivote del elemento seleccionado
function PivotIndicator({ element }) {
  const { style = {} } = element
  const origin = style.transformOrigin ?? '50% 50%'
  const parts  = origin.split(' ')
  const ox = parseFloat(parts[0]) / 100
  const oy = parseFloat(parts[1] ?? parts[0]) / 100
  const left = typeof style.left === 'number' ? style.left : parseFloat(style.left) || 0
  const top  = typeof style.top  === 'number' ? style.top  : parseFloat(style.top)  || 0
  const w    = typeof style.width  === 'number' ? style.width  : parseFloat(style.width)  || 0
  const h    = typeof style.height === 'number' ? style.height : parseFloat(style.height) || 0

  return (
    <div
      className="pivot-indicator"
      style={{ left: left + ox * w, top: top + oy * h }}
    />
  )
}

// Elemento renderizado en el canvas con drag para reposicionar
function CanvasElement({ element, selected, onSelect, stageScale = 1 }) {
  const updateStyle = useAnimatorStore(s => s.updateElementStyle)
  const playerState = useAnimatorStore(s => s.playerState)
  const { style = {}, type = 'div', label = '', content, domId, src } = element
  const canDrag = playerState !== 'playing'

  const inlineStyle = {
    width:           typeof style.width  === 'number' ? style.width  + 'px' : style.width,
    height:          typeof style.height === 'number' ? style.height + 'px' : style.height,
    background:      style.background,
    borderRadius:    typeof style.borderRadius === 'number' ? style.borderRadius + 'px' : style.borderRadius,
    position:        style.position ?? 'absolute',
    left:            typeof style.left === 'number' ? style.left + 'px' : style.left,
    top:             typeof style.top  === 'number' ? style.top  + 'px' : style.top,
    opacity:         style.opacity,
    fontSize:        typeof style.fontSize === 'number' ? style.fontSize + 'px' : style.fontSize,
    fontWeight:      style.fontWeight,
    fontStyle:       style.fontStyle,
    textTransform:   style.textTransform,
    lineHeight:      style.lineHeight,
    textAlign:       style.textAlign,
    fontFamily:      style.fontFamily || undefined,
    color:           style.color,
    objectFit:       style.objectFit,
    transformOrigin: style.transformOrigin ?? '50% 50%',
    overflow:        'hidden',
    whiteSpace:      ['p','h1','h2','h3','h4','span','div'].includes(type) ? 'pre-wrap' : undefined,
    outline:         selected ? '2px solid #7c3aed' : 'none',
    outlineOffset:   '2px',
    cursor:          canDrag ? 'move' : 'default',
    userSelect:      'none',
  }

  const handleMouseDown = (e) => {
    e.stopPropagation()
    onSelect(element.id)
    if (!canDrag) return

    const startX   = e.clientX
    const startY   = e.clientY
    const origLeft = typeof style.left === 'number' ? style.left : parseFloat(style.left) || 0
    const origTop  = typeof style.top  === 'number' ? style.top  : parseFloat(style.top)  || 0

    const onMove = (ev) => {
      ev.preventDefault()
      updateStyle(element.id, 'left', origLeft + Math.round((ev.clientX - startX) / stageScale))
      updateStyle(element.id, 'top',  origTop  + Math.round((ev.clientY - startY) / stageScale))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  if (type === 'img') {
    if (!src) {
      return (
        <div
          id={domId}
          style={{ ...inlineStyle, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#555', border: '1px dashed #444' }}
          onMouseDown={handleMouseDown}
        >
          Sin imagen
        </div>
      )
    }
    return (
      <img id={domId} src={src} alt={label} style={inlineStyle}
        onMouseDown={handleMouseDown} draggable={false} />
    )
  }

  return React.createElement(
    type,
    { id: domId, style: inlineStyle, onMouseDown: handleMouseDown },
    content ?? label
  )
}