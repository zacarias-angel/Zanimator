# Zanimator

> Editor visual de animaciones web — crea, previsualiza y exporta animaciones GSAP como HTML portátil.

![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![GSAP](https://img.shields.io/badge/GSAP-3.12-88CE02?logo=greensock) ![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ¿Qué es?

Zanimator es una herramienta de autor web que permite diseñar animaciones basadas en fotogramas clave (keyframes) sobre un canvas WYSIWYG y exportarlas como un HTML completamente autónomo — sin dependencias externas en tiempo de ejecución.

El HTML exportado incluye el runtime GSAP embebido, todos los assets en base64 (o como archivos en un ZIP), y una API JavaScript pública (`window.zanimator`) para integrarlo en cualquier página o proyecto.

---

## Características

- **Editor visual** — canvas drag-and-drop con soporte para imágenes, textos y formas
- **Timeline** — gestión de clips por elemento, arrastre de playhead y duración editable
- **Inspector** — edición de propiedades visuales y tipográficas en tiempo real
- **Asset Manager** — carga de imágenes y fuentes tipográficas (.woff / .ttf / .otf)
- **Tipografía completa** — peso, estilo, alineación, transformación, interlineado, color y font-family con fuentes propias
- **Target responsive** — modos Desktop (600×340), Mobile (390×550) y Both (auto-scale)
- **Exportación HTML** — archivo único autocontenido con assets en base64
- **Exportación ZIP** — HTML + imágenes en `img/` + fuentes en `fonts/` como archivos separados
- **API pública** — `window.zanimator` con métodos `play()`, `pause()`, `stop()`, `seek(t)` y eventos

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + Vite 6 |
| Animación | GSAP 3.12 |
| Estado | Zustand 5 |
| Empaquetado export | JSZip 3 |
| Renderizado canvas | Pixi.js 8 |

---

## Instalación

```bash
git clone https://github.com/tu-usuario/zanimator.git
cd zanimator
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en el navegador.

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo con HMR
npm run build    # Build de producción en /dist
npm run preview  # Previsualiza el build local
```

---

## Estructura del proyecto

```
src/
├── engine/
│   └── AnimationPlayer.js   # Motor GSAP + EventEmitter + API window.zanimator
├── store/
│   └── useAnimatorStore.js  # Estado global (Zustand): schema, assets, playback
├── exporter/
│   └── htmlExporter.js      # Generador HTML standalone + ZIP (JSZip)
└── editor/
    ├── canvas/              # Canvas WYSIWYG con drag-drop y preview
    ├── timeline/            # Timeline con clips, playhead arrastrable y duración
    ├── inspector/           # Panel de propiedades: posición, tamaño, tipografía
    ├── toolbar/             # Controles de playback, nombre del proyecto y export
    └── assets/              # Asset Manager: imágenes y fuentes
```

---

## API del HTML exportado

El HTML generado expone `window.zanimator` para control externo:

```js
// Controles de reproducción
window.zanimator.play()
window.zanimator.pause()
window.zanimator.stop()
window.zanimator.seek(2.5)   // ir al segundo 2.5

// Eventos
window.zanimator.on('play',     () => console.log('comenzó'))
window.zanimator.on('pause',    () => console.log('pausado'))
window.zanimator.on('complete', () => console.log('terminó'))
window.zanimator.on('seek',     ({ time }) => console.log('seek a', time))
```

---

## Exportación

### HTML (archivo único)
Genera un `<nombre>.html` con todos los assets embebidos en base64. Ideal para compartir o incrustar en un `<iframe>`.

### ZIP
Genera un `.zip` con:
```
index.html      ← HTML con rutas relativas
img/            ← imágenes extraídas del canvas
fonts/          ← fuentes tipográficas cargadas
```

---

## Licencia

MIT
