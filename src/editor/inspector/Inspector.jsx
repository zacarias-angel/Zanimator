/**
 * Inspector — Panel derecho
 * Muestra y edita las propiedades del elemento seleccionado
 * y sus animaciones (keyframes).
 */
import React, { useState, useRef } from 'react'
import { useAnimatorStore } from '@store/useAnimatorStore'
import { EASINGS, DEFAULT_EASING } from '@engine/easingLibrary'
import './Inspector.css'

export default function Inspector() {
  const schema          = useAnimatorStore(s => s.schema)
  const assets          = useAnimatorStore(s => s.assets)
  const selectedId      = useAnimatorStore(s => s.selectedElementId)
  const addElement      = useAnimatorStore(s => s.addElement)
  const removeEl        = useAnimatorStore(s => s.removeElement)
  const updateStyle     = useAnimatorStore(s => s.updateElementStyle)
  const updateLabel     = useAnimatorStore(s => s.updateElementLabel)
  const updateContent   = useAnimatorStore(s => s.updateElementContent)
  const setElementAsset = useAnimatorStore(s => s.setElementAsset)
  const addAsset        = useAnimatorStore(s => s.addAsset)
  const addAnim         = useAnimatorStore(s => s.addAnimation)
  const removeAnim      = useAnimatorStore(s => s.removeAnimation)
  const updateAnim      = useAnimatorStore(s => s.updateAnimation)
  const fileInputRef    = useRef(null)

  const element = schema.elements.find(e => e.id === selectedId)

  if (!selectedId || !element) {
    return (
      <div className="inspector-empty">
        <div className="inspector-empty-actions">
          <button className="btn-add-elem" onClick={() => addElement('div')}>+ Div</button>
          <button className="btn-add-elem" onClick={() => addElement('p')}>+ Texto</button>
          <button className="btn-add-elem" onClick={() => addElement('img')}>+ Imagen</button>
        </div>
        <p>Seleccioná un elemento en el Stage o la Timeline para editar sus propiedades.</p>
      </div>
    )
  }

  // Upload rápido de imagen para el elemento img seleccionado
  const handleImgFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const assetId = await addAsset(file)
    setElementAsset(element.id, assetId)
    e.target.value = ''
  }

  return (
    <div className="inspector">
      {/* Elemento info */}
      <Section title="Elemento">
        <Field label="Nombre">
          <input value={element.label} onChange={e => updateLabel(element.id, e.target.value)} />
        </Field>
        <Field label="ID DOM"><code className="mono">{element.domId}</code></Field>
        <Field label="Tipo"><code className="mono">{element.type}</code></Field>
        <button className="btn-danger-sm" onClick={() => removeEl(element.id)}>
          Eliminar elemento
        </button>
      </Section>

      {/* Sección de texto */}
      {['p','h1','h2','h3','h4','span','div'].includes(element.type) && (
        <Section title="Texto">
          <Field label="Contenido">
            <textarea
              className="text-content-area"
              value={element.content ?? element.label ?? ''}
              onChange={e => updateContent(element.id, e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Tamaño">
            <input type="number" min="6" max="200"
              value={element.style.fontSize ?? 16}
              onChange={e => updateStyle(element.id, 'fontSize', Number(e.target.value))} />
          </Field>
          <Field label="Color texto">
            <input type="color"
              value={element.style.color ?? '#ffffff'}
              onChange={e => updateStyle(element.id, 'color', e.target.value)} />
          </Field>
          <Field label="Peso">
            <div className="btn-group">
              {[['Normal','normal'],['Negrita','bold'],['Light','300'],['900','900']].map(([lab,val]) => (
                <button key={val}
                  className={`btn-group-item ${(element.style.fontWeight ?? 'normal') === val ? 'active' : ''}`}
                  onClick={() => updateStyle(element.id, 'fontWeight', val)}>{lab}</button>
              ))}
            </div>
          </Field>
          <Field label="Estilo">
            <div className="btn-group">
              <button
                className={`btn-group-item ${(element.style.fontStyle ?? 'normal') === 'normal' ? 'active' : ''}`}
                onClick={() => updateStyle(element.id, 'fontStyle', 'normal')}>Normal</button>
              <button
                className={`btn-group-item ${element.style.fontStyle === 'italic' ? 'active' : ''}`}
                onClick={() => updateStyle(element.id, 'fontStyle', 'italic')}><em>Itálica</em></button>
            </div>
          </Field>
          <Field label="Transform">
            <div className="btn-group">
              {[['Ab','none'],['AB','uppercase'],['ab','lowercase'],['Ab+','capitalize']].map(([lab,val]) => (
                <button key={val}
                  className={`btn-group-item ${(element.style.textTransform ?? 'none') === val ? 'active' : ''}`}
                  onClick={() => updateStyle(element.id, 'textTransform', val)}>{lab}</button>
              ))}
            </div>
          </Field>
          <Field label="Alineación">
            <div className="btn-group">
              {[['\u2190','left'],['\u2194','center'],['\u2192','right'],['\u2630','justify']].map(([lab,val]) => (
                <button key={val}
                  className={`btn-group-item ${(element.style.textAlign ?? 'left') === val ? 'active' : ''}`}
                  onClick={() => updateStyle(element.id, 'textAlign', val)}>{lab}</button>
              ))}
            </div>
          </Field>
          <Field label="Interlineado">
            <input type="number" min="0.5" max="5" step="0.1"
              value={element.style.lineHeight ?? 1.4}
              onChange={e => updateStyle(element.id, 'lineHeight', Number(e.target.value))} />
          </Field>
          <Field label="Fuente">
            <select
              value={element.style.fontFamily ?? ''}
              onChange={e => updateStyle(element.id, 'fontFamily', e.target.value)}
            >
              <option value="">— sistema —</option>
              <option value="sans-serif">Sans-serif</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              {assets.filter(a => a.type === 'font').map(a => (
                <option key={a.id} value={a.fontFamily}>{a.fontFamily}</option>
              ))}
            </select>
          </Field>
        </Section>
      )}

      {/* Sección especial para imágenes */}
      {element.type === 'img' && (
        <Section title="Imagen">
          {element.src ? (
            <div className="img-preview-wrap">
              <img src={element.src} alt="" className="img-preview" />
            </div>
          ) : (
            <p className="img-no-src">Sin imagen asignada</p>
          )}

          {/* Picker de asset existente */}
          {assets.length > 0 && (
            <Field label="Asset">
              <select
                value={element.assetId ?? ''}
                onChange={e => e.target.value && setElementAsset(element.id, e.target.value)}
              >
                <option value="">— elegir asset —</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </Field>
          )}

          {/* Upload directo */}
          <button className="btn-upload-img" onClick={() => fileInputRef.current?.click()}>
            📂 Subir imagen
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImgFileChange}
          />

          <Field label="Object fit">
            <select
              value={element.style.objectFit ?? 'contain'}
              onChange={e => updateStyle(element.id, 'objectFit', e.target.value)}
            >
              <option value="contain">contain</option>
              <option value="cover">cover</option>
              <option value="fill">fill</option>
              <option value="none">none</option>
            </select>
          </Field>
        </Section>
      )}

      {/* Estilo */}
      <Section title="Estilo">
        <Field label="X (left)">
          <input type="number" value={element.style.left ?? 0}
            onChange={e => updateStyle(element.id, 'left', Number(e.target.value))} />
        </Field>
        <Field label="Y (top)">
          <input type="number" value={element.style.top ?? 0}
            onChange={e => updateStyle(element.id, 'top', Number(e.target.value))} />
        </Field>
        <Field label="Ancho">
          <input type="number" value={element.style.width ?? 80}
            onChange={e => updateStyle(element.id, 'width', Number(e.target.value))} />
        </Field>
        <Field label="Alto">
          <input type="number" value={element.style.height ?? 80}
            onChange={e => updateStyle(element.id, 'height', Number(e.target.value))} />
        </Field>
        {element.type !== 'img' && (
          <Field label="Color">
            <input type="color" value={element.style.background ?? '#7c3aed'}
              onChange={e => updateStyle(element.id, 'background', e.target.value)} />
          </Field>
        )}
        <Field label="Radio borde">
          <input type="number" value={element.style.borderRadius ?? 0}
            onChange={e => updateStyle(element.id, 'borderRadius', Number(e.target.value))} />
        </Field>
        <Field label="Opacidad">
          <input type="number" min="0" max="1" step="0.1" value={element.style.opacity ?? 1}
            onChange={e => updateStyle(element.id, 'opacity', Number(e.target.value))} />
        </Field>
      </Section>

      {/* Animaciones */}
      <Section title="Animaciones">
        {element.animations.map((anim, i) => (
          <AnimCard
            key={i}
            anim={anim}
            index={i}
            elementId={element.id}
            onUpdate={updateAnim}
            onRemove={removeAnim}
          />
        ))}
        <AddAnimationForm elementId={element.id} onAdd={addAnim} />
      </Section>
    </div>
  )
}

// ─── AnimCard ─────────────────────────────────────────────
function AnimCard({ anim, index, elementId, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="anim-card">
      <div className="anim-card-header" onClick={() => setOpen(o => !o)}>
        <span className="anim-prop">{anim.property}</span>
        <span className="anim-summary">{anim.from} → {anim.to} | {anim.duration}s</span>
        <button
          className="anim-remove"
          onClick={e => { e.stopPropagation(); onRemove(elementId, index) }}
        >✕</button>
      </div>
      {open && (
        <div className="anim-card-body">
          <Field label="Propiedad">
            <input value={anim.property}
              onChange={e => onUpdate(elementId, index, { property: e.target.value })} />
          </Field>
          <Field label="Desde">
            <input type="number" value={anim.from}
              onChange={e => onUpdate(elementId, index, { from: Number(e.target.value) })} />
          </Field>
          <Field label="Hasta">
            <input type="number" value={anim.to}
              onChange={e => onUpdate(elementId, index, { to: Number(e.target.value) })} />
          </Field>
          <Field label="Duración (s)">
            <input type="number" step="0.1" value={anim.duration}
              onChange={e => onUpdate(elementId, index, { duration: Number(e.target.value) })} />
          </Field>
          <Field label="Inicio (s)">
            <input type="number" step="0.1" value={anim.position ?? 0}
              onChange={e => onUpdate(elementId, index, { position: Number(e.target.value) })} />
          </Field>
          <Field label="Easing">
            <select value={anim.ease ?? DEFAULT_EASING}
              onChange={e => onUpdate(elementId, index, { ease: e.target.value })}>
              {EASINGS.map(e => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Repetir">
            <input type="number" value={anim.repeat ?? 0}
              onChange={e => onUpdate(elementId, index, { repeat: Number(e.target.value) })} />
          </Field>
          <Field label="Yoyo">
            <input type="checkbox" checked={anim.yoyo ?? false}
              onChange={e => onUpdate(elementId, index, { yoyo: e.target.checked })} />
          </Field>
        </div>
      )}
    </div>
  )
}

// ─── Formulario para nueva animación ─────────────────────
const COMMON_PROPS = ['x', 'y', 'rotation', 'scale', 'scaleX', 'scaleY', 'opacity', 'width', 'height', 'skewX', 'skewY']

function AddAnimationForm({ elementId, onAdd }) {
  const [prop, setProp]     = useState('x')
  const [from, setFrom]     = useState(0)
  const [to, setTo]         = useState(100)
  const [dur, setDur]       = useState(1)
  const [pos, setPos]       = useState(0)
  const [ease, setEase]     = useState(DEFAULT_EASING)

  const handleAdd = () => {
    onAdd(elementId, {
      property: prop,
      from: Number(from),
      to:   Number(to),
      duration: Number(dur),
      position: Number(pos),
      ease,
    })
  }

  return (
    <div className="add-anim-form">
      <div className="add-anim-title">+ Nueva animación</div>
      <Field label="Propiedad">
        <select value={prop} onChange={e => setProp(e.target.value)}>
          {COMMON_PROPS.map(p => <option key={p} value={p}>{p}</option>)}
          <option value="custom">personalizada...</option>
        </select>
      </Field>
      <div className="add-anim-row">
        <Field label="Desde"><input type="number" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="Hasta"><input type="number" value={to}   onChange={e => setTo(e.target.value)} /></Field>
      </div>
      <div className="add-anim-row">
        <Field label="Dur (s)"><input type="number" step="0.1" value={dur} onChange={e => setDur(e.target.value)} /></Field>
        <Field label="Inicio (s)"><input type="number" step="0.1" value={pos} onChange={e => setPos(e.target.value)} /></Field>
      </div>
      <Field label="Easing">
        <select value={ease} onChange={e => setEase(e.target.value)}>
          {EASINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
      </Field>
      <button className="btn-add-anim" onClick={handleAdd}>Agregar</button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="inspector-section">
      <div className="inspector-section-title">{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="inspector-field">
      <label className="field-label">{label}</label>
      <div className="field-control">{children}</div>
    </div>
  )
}
