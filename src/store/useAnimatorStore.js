/**
 * Zanimator — Store Global (Zustand)
 * Maneja el estado completo del editor: elementos, keyframes,
 * estado de reproducción, elemento seleccionado.
 */
import { create } from 'zustand'
import { player } from '@engine/AnimationPlayer'

// ─── Schema de ejemplo inicial ───────────────────────────
const INITIAL_SCHEMA = {
  name: 'Mi Animación',
  target: 'desktop',   // 'desktop' | 'mobile' | 'both'
  duration: 3,
  elements: [
    {
      id: 'elem-1',
      domId: 'elem-1',
      label: 'Caja 1',
      type: 'div',
      style: {
        width: 100,
        height: 100,
        background: '#7c3aed',
        borderRadius: 8,
        position: 'absolute',
        left: 50,
        top: 100,
      },
      animations: [
        {
          property: 'x',
          from: 0,
          to: 400,
          duration: 1.5,
          ease: 'power2.out',
          position: 0,
        },
        {
          property: 'rotation',
          from: 0,
          to: 360,
          duration: 1.5,
          ease: 'none',
          position: 0,
        },
        {
          property: 'scale',
          from: 1,
          to: 1.5,
          duration: 0.5,
          ease: 'back.out(1.7)',
          position: 1,
        },
      ],
    },
    {
      id: 'elem-2',
      domId: 'elem-2',
      label: 'Caja 2',
      type: 'div',
      style: {
        width: 80,
        height: 80,
        background: '#22c55e',
        borderRadius: '50%',
        position: 'absolute',
        left: 50,
        top: 230,
      },
      animations: [
        {
          property: 'x',
          from: 0,
          to: 300,
          duration: 1,
          ease: 'elastic.out(1, 0.3)',
          position: 0.5,
        },
        {
          property: 'opacity',
          from: 0,
          to: 1,
          duration: 0.4,
          ease: 'power2.out',
          position: 0.3,
        },
      ],
    },
  ],
}

// ─── Helpers ─────────────────────────────────────────────
let _elemCounter = 10
let _assetCounter = 0

function newElemId()  { return `elem-${++_elemCounter}` }
function newAssetId() { return `asset-${++_assetCounter}` }

// Lee un File del browser y retorna una Promise<{dataUrl, name, type}>
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve({ dataUrl: e.target.result, name: file.name, type: file.type })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Store ───────────────────────────────────────────────
export const useAnimatorStore = create((set, get) => ({
  // Estado del schema
  schema: INITIAL_SCHEMA,
  assets: [],             // [{ id, name, type, dataUrl }]
  selectedElementId: null,
  selectedAnimationIndex: null,
  playerState: 'idle',   // idle | playing | paused | stopped
  playhead: 0,           // tiempo actual en segundos

  // ── Schema ────────────────────────────────────────────
  setSchema(schema) {
    set({ schema })
    player.load(schema)
  },

  updateSchemaName(name) {
    set(s => ({ schema: { ...s.schema, name } }))
  },

  setTarget(target) {
    set(s => ({ schema: { ...s.schema, target } }))
  },

  setDuration(secs) {
    set(s => ({ schema: { ...s.schema, duration: Math.max(0.1, secs) } }))
  },

  // ── Assets ────────────────────────────────────────────
  async addAsset(file) {
    const { dataUrl, name, type } = await readFileAsDataUrl(file)
    const id = newAssetId()
    set(s => ({ assets: [...s.assets, { id, name, type, dataUrl }] }))
    return id
  },

  async addFontAsset(file, fontFamily) {
    const { dataUrl, name, type } = await readFileAsDataUrl(file)
    const id = newAssetId()
    set(s => ({ assets: [...s.assets, { id, name, type: 'font', dataUrl, fontFamily }] }))
    return id
  },

  removeAsset(assetId) {
    set(s => ({ assets: s.assets.filter(a => a.id !== assetId) }))
  },

  // ── Elementos ─────────────────────────────────────────
  selectElement(id) {
    set({ selectedElementId: id, selectedAnimationIndex: null })
  },

  addElement(type = 'div') {
    const id = newElemId()
    const isImg  = type === 'img'
    const isText = ['p', 'h1', 'h2', 'h3', 'h4', 'span'].includes(type)
    const newEl = {
      id,
      domId: id,
      label: isImg ? 'Imagen' : isText ? 'Texto' : `Elemento ${id}`,
      type,
      src:     isImg  ? '' : undefined,
      assetId: isImg  ? null : undefined,
      content: isText ? 'Escribí tu texto aquí' : undefined,
      style: {
        width:         isImg ? 120 : isText ? 200 : 80,
        height:        isImg ? 120 : isText ? 40  : 80,
        background:    isImg ? 'transparent' : isText ? 'transparent' : '#7c3aed',
        borderRadius:  isImg ? 0 : isText ? 0 : 4,
        position:      'absolute',
        left:          50,
        top:           50,
        objectFit:     isImg ? 'contain' : undefined,
        color:         isText ? '#ffffff' : undefined,
        fontSize:      isText ? 18 : undefined,
        fontWeight:    isText ? 'normal' : undefined,
        fontStyle:     isText ? 'normal' : undefined,
        textTransform: isText ? 'none' : undefined,
        lineHeight:    isText ? 1.4 : undefined,
        textAlign:     isText ? 'left' : undefined,
        fontFamily:    isText ? '' : undefined,
      },
      animations: [],
    }
    set(s => ({
      schema: { ...s.schema, elements: [...s.schema.elements, newEl] },
      selectedElementId: id,
    }))
    return id
  },

  // Crea un elemento img ya vinculado a un asset
  addImageElement(assetId) {
    const asset = get().assets.find(a => a.id === assetId)
    if (!asset) return
    const id = newElemId()
    const newEl = {
      id,
      domId: id,
      label: asset.name.replace(/\.[^.]+$/, ''),
      type: 'img',
      src: asset.dataUrl,
      assetId: asset.id,
      style: {
        width: 120,
        height: 120,
        position: 'absolute',
        left: 50,
        top: 50,
        objectFit: 'contain',
      },
      animations: [],
    }
    set(s => ({
      schema: { ...s.schema, elements: [...s.schema.elements, newEl] },
      selectedElementId: id,
    }))
  },

  // Asigna un asset a un elemento img existente
  setElementAsset(elementId, assetId) {
    const asset = get().assets.find(a => a.id === assetId)
    if (!asset) return
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === elementId ? { ...e, src: asset.dataUrl, assetId } : e
        ),
      },
    }))
  },

  removeElement(id) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.filter(e => e.id !== id),
      },
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    }))
  },

  updateElementStyle(id, styleKey, value) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === id ? { ...e, style: { ...e.style, [styleKey]: value } } : e
        ),
      },
    }))
  },

  updateElementLabel(id, label) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === id ? { ...e, label } : e
        ),
      },
    }))
  },

  updateElementContent(id, content) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === id ? { ...e, content } : e
        ),
      },
    }))
  },

  // ── Animaciones (keyframes) ───────────────────────────
  addAnimation(elementId, animation) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === elementId
            ? { ...e, animations: [...e.animations, animation] }
            : e
        ),
      },
    }))
  },

  removeAnimation(elementId, index) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === elementId
            ? { ...e, animations: e.animations.filter((_, i) => i !== index) }
            : e
        ),
      },
    }))
  },

  updateAnimation(elementId, index, patch) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === elementId
            ? {
                ...e,
                animations: e.animations.map((a, i) =>
                  i === index ? { ...a, ...patch } : a
                ),
              }
            : e
        ),
      },
    }))
  },

  // ── Playback ──────────────────────────────────────────
  setPlayerState(state) { set({ playerState: state }) },
  setPlayhead(time)     { set({ playhead: time }) },

  // ── Helpers ───────────────────────────────────────────
  getAsset(assetId) { return get().assets.find(a => a.id === assetId) ?? null },
}))

// ─── Sincroniza los eventos del player con el store ──────
player.on('play',     ()      => useAnimatorStore.getState().setPlayerState('playing'))
player.on('pause',    ()      => useAnimatorStore.getState().setPlayerState('paused'))
player.on('stop',     ()      => useAnimatorStore.getState().setPlayerState('stopped'))
player.on('restart',  ()      => useAnimatorStore.getState().setPlayerState('playing'))
player.on('complete', ()      => useAnimatorStore.getState().setPlayerState('stopped'))
player.on('update',   ({ time }) => useAnimatorStore.getState().setPlayhead(time))

// ─── Carga el schema inicial en el player ────────────────
player.load(INITIAL_SCHEMA)
