import React, { useState } from 'react'
import Canvas from './canvas/Canvas.jsx'
import Timeline from './timeline/Timeline.jsx'
import Toolbar from './toolbar/Toolbar.jsx'
import Inspector from './inspector/Inspector.jsx'
import AssetManager from './assets/AssetManager.jsx'
import { useAnimatorStore } from '@store/useAnimatorStore'
import './Editor.css'
import './elements/ElementList.css'
import './assets/AssetManager.css'

export default function Editor() {
  const [leftTab, setLeftTab] = useState('elements')

  return (
    <div className="editor-layout">
      <Toolbar />
      <div className="editor-body">
        {/* Panel izquierdo con tabs */}
        <div className="panel panel-left">
          <div className="panel-tabs">
            <button
              className={`tab-btn ${leftTab === 'elements' ? 'active' : ''}`}
              onClick={() => setLeftTab('elements')}
            >Elementos</button>
            <button
              className={`tab-btn ${leftTab === 'assets' ? 'active' : ''}`}
              onClick={() => setLeftTab('assets')}
            >Assets</button>
          </div>
          <div className="panel-body">
            {leftTab === 'elements' ? <ElementList /> : <AssetManager />}
          </div>
        </div>

        <div className="editor-center">
          <Canvas />
          <Timeline />
        </div>

        <div className="panel panel-right">
          <div className="panel-tabs">
            <button className="tab-btn active">Inspector</button>
          </div>
          <div className="panel-body">
            <Inspector />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ElementList ──────────────────────────────────────────
function ElementList() {
  const schema         = useAnimatorStore(s => s.schema)
  const selectedId     = useAnimatorStore(s => s.selectedElementId)
  const selectElement  = useAnimatorStore(s => s.selectElement)
  const addElement     = useAnimatorStore(s => s.addElement)
  const removeElement  = useAnimatorStore(s => s.removeElement)

  return (
    <div className="element-list">
      <div className="element-list-actions">
        <button onClick={() => addElement('div')}  title="Agregar Div">+ Div</button>
        <button onClick={() => addElement('p')}    title="Agregar Texto">+ Texto</button>
        <button onClick={() => addElement('img')}  title="Agregar Imagen">+ Img</button>
      </div>
      {schema.elements.map(el => (
        <div
          key={el.id}
          className={`elem-item ${el.id === selectedId ? 'selected' : ''}`}
          onClick={() => selectElement(el.id)}
        >
          <span className="elem-type">{el.type}</span>
          <span className="elem-label">{el.label}</span>
          <button
            className="elem-remove"
            onClick={e => { e.stopPropagation(); removeElement(el.id) }}
            title="Eliminar"
          >✕</button>
        </div>
      ))}
      {schema.elements.length === 0 && (
        <p className="elem-empty">No hay elementos. Agregá uno arriba.</p>
      )}
    </div>
  )
}
