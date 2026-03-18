/**
 * Zanimator — Store Global (Zustand)
 * Maneja el estado completo del editor: elementos, keyframes,
 * estado de reproducción, elemento seleccionado.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
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
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
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
export const useAnimatorStore = create(
persist(
(set, get) => ({
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
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
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
      transform: { x: 0, y: 0, scale: 1, rotation: 0 },
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

  // Mueve un elemento hacia arriba (-1) o hacia abajo (+1) en el array
  // El último elemento del array se renderiza encima (mayor z en el DOM)
  reorderElement(id, dir) {
    set(s => {
      const els = [...s.schema.elements]
      const idx = els.findIndex(e => e.id === id)
      const next = idx + dir
      if (next < 0 || next >= els.length) return s
      ;[els[idx], els[next]] = [els[next], els[idx]]
      return { schema: { ...s.schema, elements: els } }
    })
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

  updateElementTransform(id, prop, value) {
    set(s => ({
      schema: {
        ...s.schema,
        elements: s.schema.elements.map(e =>
          e.id === id
            ? { ...e, transform: { ...(e.transform ?? { x:0, y:0, scale:1, rotation:0 }), [prop]: value } }
            : e
        ),
      },
    }))
    // Aplica el transform inmediatamente en el DOM sin recargar toda la animación
    const el = get().schema.elements.find(e => e.id === id)
    if (el?.domId) player.setBaseTransform(`#${el.domId}`, el.transform ?? {})
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
}),
{
  name: 'zanimator-state',        // clave en localStorage
  partialize: (s) => ({           // solo persistimos lo que importa
    schema: s.schema,
    assets: s.assets,
  }),
  onRehydrateStorage: () => (state) => {
    if (!state) return
    // Reajusta el contador de IDs para evitar colisiones
    const ids = state.schema?.elements?.map(e => parseInt(e.id.replace('elem-', '')) || 0) ?? []
    if (ids.length) _elemCounter = Math.max(...ids, _elemCounter)
    // Carga el schema restaurado en el player
    player.load(state.schema)
  },
}
))

// ─── Sincroniza los eventos del player con el store ──────
player.on('play',     ()      => useAnimatorStore.getState().setPlayerState('playing'))
player.on('pause',    ()      => useAnimatorStore.getState().setPlayerState('paused'))
player.on('stop',     ()      => useAnimatorStore.getState().setPlayerState('stopped'))
player.on('restart',  ()      => useAnimatorStore.getState().setPlayerState('playing'))
player.on('complete', ()      => useAnimatorStore.getState().setPlayerState('stopped'))
player.on('update',   ({ time }) => useAnimatorStore.getState().setPlayhead(time))

// ─── Carga el schema inicial en el player ────────────────
player.load(useAnimatorStore.getState().schema)
