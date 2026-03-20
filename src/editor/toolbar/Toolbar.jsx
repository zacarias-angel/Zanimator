import React, { useRef, useState } from 'react'
import { useAnimatorStore } from '@store/useAnimatorStore'
import { downloadZIP, importZIP } from '@exporter/htmlExporter'
import { player } from '@engine/AnimationPlayer'
import './Toolbar.css'

const TARGET_OPTIONS = [
  { value: 'desktop', label: '🖥 Desktop', title: 'Export 600×340' },
  { value: 'mobile',  label: '📱 Mobile',  title: 'Export 390×550' },
  { value: 'both',    label: '🖥📱 Both',   title: 'Responsive auto-scale' },
]

export default function Toolbar() {
  const schema      = useAnimatorStore(s => s.schema)
  const assets      = useAnimatorStore(s => s.assets)
  const updateName  = useAnimatorStore(s => s.updateSchemaName)
  const setTarget   = useAnimatorStore(s => s.setTarget)
  const playerState = useAnimatorStore(s => s.playerState)
  const loadProject = useAnimatorStore(s => s.loadProject)
  const [exportMenu, setExportMenu] = useState(false)
  const importInputRef = useRef(null)

  const target = schema.target ?? 'desktop'

  const handlePlayPause = () => {
    if (playerState === 'playing') player.pause()
    else player.play()
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { schema: importedSchema, assets: importedAssets } = await importZIP(file)
      loadProject(importedSchema, importedAssets)
    } catch (err) {
      alert('No se pudo importar el ZIP: ' + err.message)
    }
  }

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">Z</span>
        <span className="toolbar-name">animator</span>
      </div>

      <input
        className="toolbar-project-name"
        value={schema.name}
        onChange={e => updateName(e.target.value)}
        title="Nombre del proyecto"
      />

      {/* Selector Desktop / Mobile */}
      <div className="target-selector">
        {TARGET_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`target-btn ${target === opt.value ? 'active' : ''}`}
            onClick={() => setTarget(opt.value)}
            title={opt.title}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="toolbar-controls">
        <button
          className={`ctrl-btn ${playerState === 'playing' ? 'active' : ''}`}
          onClick={handlePlayPause}
          title={playerState === 'playing' ? 'Pausar' : 'Reproducir'}
        >
          {playerState === 'playing' ? '⏸' : '▶'}
        </button>
        <button className="ctrl-btn" onClick={() => player.stop()}    title="Detener">⏹</button>
        <button className="ctrl-btn" onClick={() => player.restart()} title="Reiniciar">⏮</button>
      </div>

      {/* Menú de export / import */}
      <div className="toolbar-actions">
        <div className="export-menu-wrap">
          <button
            className="btn-export btn-import"
            onClick={() => importInputRef.current?.click()}
            title="Abrir un ZIP exportado previamente para modificarlo"
          >
            📂 Abrir
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            className="btn-export btn-export-zip"
            onClick={() => downloadZIP(schema, assets)}
            title="Exportar ZIP con HTML + imágenes en carpeta ./img/"
          >
            📦 ZIP
          </button>
        </div>
      </div>
    </header>
  )
}
