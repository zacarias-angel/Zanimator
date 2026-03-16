/**
 * Canvas — Preview del stage
 * - Renderiza elementos del schema en DOM (GSAP los anima por ID)
 * - Acepta drag & drop de imágenes del sistema para crear assets
 * - Cambia tamaño del frame según target (desktop/mobile)
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

// Inyecta @font-face en el <head> para fuentes subidas como assets
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

  useFontFaces(assets)

  const target = schema.target ?? 'desktop'
  const frame  = FRAME_SIZES[target] ?? FRAME_SIZES.desktop

  // Recarga el player cada vez que cambia el schema
  useEffect(() => {
    player.load(schema)
  }, [schema])

  // Drop de archivos de imagen desde el SO al canvas
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

  return (
    <div
      className="canvas-wrapper"
      onClick={() => selectElement(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Indicador de device */}
      <div className="canvas-device-badge">
        {target === 'mobile' ? '📱 Mobile' : target === 'both' ? '🖥📱 Both' : '🖥 Desktop'}
      </div>

      <div
        className={`canvas-stage ${isDragOver ? 'drop-active' : ''}`}
        style={{ width: frame.w, height: frame.h }}
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
          />
        ))}
      </div>
      <div className="canvas-label">
        Stage — {schema.name} &nbsp;
        <span className="canvas-size">{frame.w}×{frame.h}</span>
      </div>
    </div>
  )
}

function CanvasElement({ element, selected, onSelect }) {
  const { style = {}, type = 'div', label = '', content, domId, src } = element

  const inlineStyle = {
    width:         typeof style.width  === 'number' ? style.width  + 'px' : style.width,
    height:        typeof style.height === 'number' ? style.height + 'px' : style.height,
    background:    style.background,
    borderRadius:  typeof style.borderRadius === 'number' ? style.borderRadius + 'px' : style.borderRadius,
    position:      style.position ?? 'absolute',
    left:          typeof style.left === 'number' ? style.left + 'px' : style.left,
    top:           typeof style.top  === 'number' ? style.top  + 'px' : style.top,
    opacity:       style.opacity,
    fontSize:      typeof style.fontSize === 'number' ? style.fontSize + 'px' : style.fontSize,
    fontWeight:    style.fontWeight,
    fontStyle:     style.fontStyle,
    textTransform: style.textTransform,
    lineHeight:    style.lineHeight,
    textAlign:     style.textAlign,
    fontFamily:    style.fontFamily || undefined,
    color:         style.color,
    objectFit:     style.objectFit,
    overflow:      'hidden',
    outline:       selected ? '2px solid #7c3aed' : 'none',
    outlineOffset: '2px',
    cursor:        'pointer',
    userSelect:    'none',
  }

  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(element.id)
  }

  if (type === 'img') {
    if (!src) {
      // Placeholder para imágenes sin asset asignado
      return (
        <div
          id={domId}
          style={{ ...inlineStyle, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#555', border: '1px dashed #444' }}
          onClick={handleClick}
        >
          Sin imagen
        </div>
      )
    }
    return (
      <img
        id={domId}
        src={src}
        alt={label}
        style={inlineStyle}
        onClick={handleClick}
        draggable={false}
      />
    )
  }

  return React.createElement(
    type,
    { id: domId, style: inlineStyle, onClick: handleClick },
    content ?? label
  )
}

