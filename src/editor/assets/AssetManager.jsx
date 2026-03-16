/**
 * AssetManager â€” Panel de assets (imÃ¡genes + fuentes)
 */
import React, { useRef, useState } from 'react'
import { useAnimatorStore } from '@store/useAnimatorStore'
import './AssetManager.css'

const IMG_ACCEPT  = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
const FONT_ACCEPT = '.woff,.woff2,.ttf,.otf'

function fontFamilyFromName(filename) {
  return filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
}

export default function AssetManager() {
  const assets          = useAnimatorStore(s => s.assets)
  const addAsset        = useAnimatorStore(s => s.addAsset)
  const addFontAsset    = useAnimatorStore(s => s.addFontAsset)
  const removeAsset     = useAnimatorStore(s => s.removeAsset)
  const addImageElement = useAnimatorStore(s => s.addImageElement)
  const imgInputRef     = useRef(null)
  const fontInputRef    = useRef(null)
  const [dropping, setDropping] = useState(false)

  const imgAssets  = assets.filter(a => a.type !== 'font')
  const fontAssets = assets.filter(a => a.type === 'font')

  const processFiles = async (files) => {
    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        await addAsset(file)
      } else if (/\.(woff2?|ttf|otf)$/i.test(file.name)) {
        await addFontAsset(file, fontFamilyFromName(file.name))
      }
    }
  }

  const handleFileChange = (e) => { processFiles(e.target.files); e.target.value = '' }
  const handleFontChange = (e) => { processFiles(e.target.files); e.target.value = '' }
  const handleDragOver   = (e) => { e.preventDefault(); setDropping(true) }
  const handleDragLeave  = ()  => setDropping(false)
  const handleDrop = (e) => {
    e.preventDefault(); setDropping(false)
    processFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`asset-manager ${dropping ? 'dropping' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ImÃ¡genes */}
      <div className="asset-section-label">ImÃ¡genes</div>
      <div
        className="asset-upload-zone"
        onClick={() => imgInputRef.current?.click()}
        title="Subir imagen"
      >
        <span className="upload-icon">ðŸ–¼</span>
        <span>ArrastrÃ¡ imÃ¡genes aquÃ­<br/>o hacÃ© click para subir</span>
        <input ref={imgInputRef} type="file" accept={IMG_ACCEPT} multiple
          style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      {imgAssets.length === 0 && (
        <p className="asset-empty">Sin imÃ¡genes todavÃ­a.</p>
      )}
      <div className="asset-grid">
        {imgAssets.map(asset => (
          <AssetThumb key={asset.id} asset={asset}
            onUse={() => addImageElement(asset.id)}
            onRemove={() => removeAsset(asset.id)} />
        ))}
      </div>

      {/* Fuentes */}
      <div className="asset-section-label" style={{ marginTop: 12 }}>Fuentes personalizadas</div>
      <div
        className="asset-upload-zone asset-upload-zone--sm"
        onClick={() => fontInputRef.current?.click()}
        title="Subir fuente (.woff, .ttf, .otf)"
      >
        <span className="upload-icon">&#65332;</span>
        <span>Subir .woff / .ttf / .otf</span>
        <input ref={fontInputRef} type="file" accept={FONT_ACCEPT} multiple
          style={{ display: 'none' }} onChange={handleFontChange} />
      </div>

      {fontAssets.length === 0 && (
        <p className="asset-empty">Sin fuentes. Las fuentes subidas aparecerÃ¡n en el selector del Inspector.</p>
      )}
      <div className="font-asset-list">
        {fontAssets.map(a => (
          <FontThumb key={a.id} asset={a} onRemove={() => removeAsset(a.id)} />
        ))}
      </div>
    </div>
  )
}

function AssetThumb({ asset, onUse, onRemove }) {
  const [hover, setHover] = useState(false)
  const shortName = asset.name.length > 14 ? asset.name.slice(0, 12) + 'â€¦' : asset.name
  return (
    <div className="asset-thumb" title={`${asset.name}\nDoble click para agregar al stage`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onDoubleClick={onUse}>
      <div className="asset-img-wrap">
        <img src={asset.dataUrl} alt={asset.name} draggable={false} />
        {hover && (
          <div className="asset-overlay">
            <button className="asset-btn-use" onClick={onUse} title="Agregar al stage">ï¼‹</button>
            <button className="asset-btn-del" onClick={e => { e.stopPropagation(); onRemove() }} title="Eliminar asset">âœ•</button>
          </div>
        )}
      </div>
      <span className="asset-name">{shortName}</span>
    </div>
  )
}

function FontThumb({ asset, onRemove }) {
  return (
    <div className="font-asset-item">
      <span className="font-asset-name" style={{ fontFamily: asset.fontFamily }}>
        {asset.fontFamily}
      </span>
      <span className="font-asset-file">{asset.name}</span>
      <button className="asset-btn-del" onClick={onRemove} title="Eliminar fuente">âœ•</button>
    </div>
  )
}