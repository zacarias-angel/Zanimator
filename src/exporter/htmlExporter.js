/**
 * Zanimator â€” HTML Exporter
 *
 * Genera un archivo HTML standalone que:
 *  1. Renderiza los elementos con su estilo (imÃ¡genes como base64 inline)
 *  2. Incluye el runtime liviano con GSAP via CDN
 *  3. Expone window.zanimator con controles + sistema de eventos
 *  4. Aplica responsive CSS segÃºn target (desktop / mobile / both)
 *
 * Export ZIP: genera un .zip con HTML + imÃ¡genes como archivos separados
 */
import JSZip from 'jszip'

// â”€â”€â”€ TamaÃ±os de stage por target â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STAGE_SIZES = {
  desktop: { w: 600,  h: 340 },
  mobile:  { w: 390,  h: 550 },
  both:    { w: null, h: null },  // responsive
}

// â”€â”€â”€ Estilos inline del elemento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function styleObjectToCSS(styleObj) {
  const cssProps = {
    width:         (v) => `width:${typeof v === 'number' ? v + 'px' : v}`,
    height:        (v) => `height:${typeof v === 'number' ? v + 'px' : v}`,
    background:    (v) => v && v !== 'transparent' ? `background:${v}` : '',
    borderRadius:  (v) => `border-radius:${typeof v === 'number' ? v + 'px' : v}`,
    position:      (v) => `position:${v}`,
    left:          (v) => `left:${typeof v === 'number' ? v + 'px' : v}`,
    top:           (v) => `top:${typeof v === 'number' ? v + 'px' : v}`,
    opacity:       (v) => v !== undefined ? `opacity:${v}` : '',
    fontSize:      (v) => `font-size:${typeof v === 'number' ? v + 'px' : v}`,
    fontWeight:    (v) => v ? `font-weight:${v}` : '',
    fontStyle:     (v) => v && v !== 'normal' ? `font-style:${v}` : '',
    fontFamily:    (v) => v ? `font-family:${v}` : '',
    textTransform: (v) => v && v !== 'none' ? `text-transform:${v}` : '',
    lineHeight:    (v) => v !== undefined ? `line-height:${v}` : '',
    textAlign:     (v) => v && v !== 'left' ? `text-align:${v}` : '',
    color:         (v) => v ? `color:${v}` : '',
    zIndex:        (v) => `z-index:${v}`,
    overflow:      (v) => `overflow:${v}`,
    display:       (v) => `display:${v}`,
    objectFit:     (v) => `object-fit:${v}`,
    transformOrigin: (v) => v && v !== '50% 50%' ? `transform-origin:${v}` : '',
  }
  return Object.entries(styleObj)
    .map(([k, v]) => cssProps[k]?.(v) ?? '')
    .filter(Boolean)
    .join(';')
}

// â”€â”€â”€ Genera HTML de elementos
//     imgMap: { domId â†’ src } sobreescribe el src del schema (para export ZIP)
const TEXT_TYPES = new Set(['p','h1','h2','h3','h4','span','div'])

function buildElementsHTML(elements, imgMap = {}) {
  return elements.map(el => {
    const isText  = TEXT_TYPES.has(el.type)
    const baseCSS = el.style ? styleObjectToCSS(el.style) : ''
    // overflow:hidden y white-space:pre-wrap son vitales para respetar
    // el contenedor y los saltos de linea — estan hardcodeados en Canvas
    // pero hay que incluirlos explicitamente en el HTML exportado
    const extraCSS = isText
      ? 'overflow:hidden;white-space:pre-wrap'
      : 'overflow:hidden'
    const styleStr    = baseCSS ? `${baseCSS};${extraCSS}` : extraCSS
    const src         = imgMap[el.domId] ?? el.src ?? ''
    const textContent = escapeHtml(el.content ?? el.label ?? '')
    const tag = el.type === 'img'
      ? `<img id="${el.domId}" src="${src}" style="${styleStr}" alt="${escapeAttr(el.label ?? '')}" />`
      : `<${el.type ?? 'div'} id="${el.domId}" style="${styleStr}">${textContent}</${el.type ?? 'div'}>`
    return `  ${tag}`
  }).join('\n')
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
function escapeAttr(str) {
  return String(str).replace(/"/g,'&quot;').replace(/&/g,'&amp;')
}

// ─── Genera @font-face CSS a partir de font assets
function buildFontFaceCSS(assets = []) {
  return assets
    .filter(a => a.type === 'font' && a.dataUrl && a.fontFamily)
    .map(a => `@font-face { font-family: "${a.fontFamily}"; src: url("${a.dataUrl}"); }`)
    .join('\n    ')
}

// â”€â”€â”€ Genera el GSAP script del runtime â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildGSAPScript(schema) {
  const elements   = schema.elements ?? []
  const setLines   = []
  const tweenLines = []

  elements.forEach(el => {
    const target     = `"#${el.domId}"`
    const animations = el.animations ?? []

    animations.forEach(anim => {
      const vars = { duration: anim.duration ?? 1 }
      if (anim.ease)   vars.ease   = anim.ease
      if (anim.repeat) vars.repeat = anim.repeat
      if (anim.yoyo)   vars.yoyo   = anim.yoyo

      if (anim.properties) {
        Object.assign(vars, anim.properties)
      } else if (anim.property) {
        vars[anim.property] = anim.to
      }

      const position = anim.position !== undefined ? `, ${anim.position}` : ''

      if (anim.from !== undefined && anim.to !== undefined && anim.property) {
        const fromVars = JSON.stringify({ [anim.property]: anim.from })
        const toVars   = JSON.stringify(vars)
        tweenLines.push(`  tl.fromTo(${target}, ${fromVars}, ${toVars}${position});`)
      } else {
        tweenLines.push(`  tl.to(${target}, ${JSON.stringify(vars)}${position});`)
      }
    })
  })

  // gsap.set() va DESPUES de todos los tweens — igual que en AnimationPlayer.js
  // para no ser pisado por immediateRender de GSAP en tweens a t=0
  elements.forEach(el => {
    const target2 = `"#${el.domId}"`
    const t  = el.transform ?? {}
    const bx = t.x        ?? 0
    const by = t.y        ?? 0
    const bs = t.scale    ?? 1
    const br = t.rotation ?? 0
    if (bx !== 0 || by !== 0 || bs !== 1 || br !== 0) {
      setLines.push(`  gsap.set(${target2}, { x:${bx}, y:${by}, scale:${bs}, rotation:${br} });`)
    }
  })

  const allLines = [...tweenLines, ...(setLines.length ? [''] : []), ...setLines]
  return allLines.join('\n')
}

// â”€â”€â”€ CSS responsive segÃºn target â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildResponsiveCSS(target, stageW, stageH) {
  if (target === 'both' || target === 'mobile') {
    // Escala proporcional usando transform en el stage
    const baseW = target === 'mobile' ? 390 : 600
    const baseH = target === 'mobile' ? 550 : 340
    return `
    body { background: #000; display: flex; align-items: center; justify-content: center; }
    #zanimator-stage {
      width: ${baseW}px;
      height: ${baseH}px;
      position: relative;
      transform-origin: center center;
    }
    <script>
    (function() {
      function scaleStage() {
        var stage = document.getElementById('zanimator-stage');
        var scaleX = window.innerWidth  / ${baseW};
        var scaleY = window.innerHeight / ${baseH};
        var scale  = Math.min(scaleX, scaleY);
        stage.style.transform = 'scale(' + scale + ')';
      }
      window.addEventListener('resize', scaleStage);
      scaleStage();
    })();
    <\\/script>`.trim()
  }
  // Desktop: stage ocupa todo
  return ``
}

// â”€â”€â”€ Genera el bloque del Runtime con EventEmitter â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildRuntimeScript(schema) {
  const gsapScript = buildGSAPScript(schema)

  return `
  /* â”€â”€ Zanimator Runtime â”€â”€ */
  (function() {
    var _listeners = {};

    function emit(event, data) {
      (_listeners[event] || []).forEach(function(fn) { fn(data); });
    }

    var tl = gsap.timeline({
      paused: true,
      onStart:    function() { emit('start',    { time: 0 }); },
      onComplete: function() { emit('complete', { time: tl.duration() }); },
      onUpdate:   function() { emit('update',   { time: tl.time(), progress: tl.progress() }); },
      onRepeat:   function() { emit('repeat',   {}); },
    });

${gsapScript}

    window.zanimator = {
      play:    function() { tl.play();      emit('play',    { time: tl.time() }); return window.zanimator; },
      pause:   function() { tl.pause();     emit('pause',   { time: tl.time() }); return window.zanimator; },
      stop:    function() { tl.pause(0);    emit('stop',    { time: 0 });          return window.zanimator; },
      restart: function() { tl.restart();   emit('restart', { time: 0 });          return window.zanimator; },
      reverse: function() { tl.reverse();   emit('reverse', { time: tl.time() }); return window.zanimator; },
      seek:    function(t){ tl.seek(t);     emit('seek',    { time: t });          return window.zanimator; },
      on:   function(e,fn){ if (!_listeners[e]) _listeners[e]=[]; _listeners[e].push(fn); return window.zanimator; },
      off:  function(e,fn){ if (_listeners[e]) _listeners[e]=_listeners[e].filter(function(l){return l!==fn;}); return window.zanimator; },
      once: function(e,fn){ var w=function(d){fn(d);window.zanimator.off(e,w);}; return window.zanimator.on(e,w); },
      duration: function() { return tl.duration(); },
      progress: function() { return tl.progress(); },
      time:     function() { return tl.time(); },
    };

    emit('ready', { duration: tl.duration() });
  })();
`.trim()
}

// â”€â”€â”€ CSS base del stage segÃºn target â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function buildStageCSS(target) {
  const size = STAGE_SIZES[target] ?? STAGE_SIZES.desktop

  if (target === 'desktop') {
    return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; width: 100vw; height: 100vh; }
    #zanimator-stage { position: relative; width: 100%; height: 100%; overflow: hidden; }`
  }

  if (target === 'mobile') {
    return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
    #zanimator-stage { position: relative; width: 390px; height: 550px; overflow: hidden; transform-origin: center; }`
  }

  // both â€” responsive auto-scale
  return `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; }
    #zanimator-stage { position: relative; width: 600px; height: 340px; overflow: hidden; transform-origin: center; }`
}

function buildScaleScript(target) {
  if (target === 'both') {
    return `
  /* Auto-scale para 'both' */
  (function() {
    function scale() {
      var s = document.getElementById('zanimator-stage');
      var sx = window.innerWidth  / 600;
      var sy = window.innerHeight / 340;
      s.style.transform = 'scale(' + Math.min(sx, sy) + ')';
    }
    window.addEventListener('resize', scale);
    scale();
  })();`
  }
  if (target === 'mobile') {
    return `
  /* Auto-scale para mobile */
  (function() {
    function scale() {
      var s = document.getElementById('zanimator-stage');
      var sx = window.innerWidth  / 390;
      var sy = window.innerHeight / 550;
      s.style.transform = 'scale(' + Math.min(sx, sy) + ')';
    }
    window.addEventListener('resize', scale);
    scale();
  })();`
  }
  return ''
}

// â”€â”€â”€ Exportador principal (HTML con base64 inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function exportHTML(schema, imgMap = {}, assets = []) {
  const elements   = schema.elements ?? []
  const target     = schema.target ?? 'desktop'
  const elemHTML   = buildElementsHTML(elements, imgMap)
  const runtimeJS  = buildRuntimeScript(schema)
  const stageCSS   = buildStageCSS(target)
  const scaleJS    = buildScaleScript(target)
  const fontCSS    = buildFontFaceCSS(assets)

  // Schema limpio: reemplaza base64 por rutas relativas para no inflar el HTML
  const cleanSchema = {
    ...schema,
    elements: elements.map(el =>
      (el.type === 'img' && imgMap[el.domId])
        ? { ...el, src: imgMap[el.domId] }
        : el
    ),
  }
  const schemaJSON = JSON.stringify(cleanSchema, null, 2)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${schema.name ?? 'Zanimator Export'}</title>
  <style>${stageCSS}
    ${fontCSS}
  </style>
</head>
<body>

<div id="zanimator-stage">
${elemHTML}
</div>

<!-- GSAP via CDN -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>

<!--
  Zanimator Runtime â€” window.zanimator
  Controles : play() pause() stop() restart() reverse() seek(s)
  Eventos   : on('play'|'pause'|'stop'|'restart'|'complete'|'update'|'ready', fn)
              once(event, fn)  |  off(event, fn)
  Ejemplo   : zanimator.on('complete', () => alert('fin!')).play()
  Target    : ${target}  (desktop | mobile | both)
-->
<script>
${runtimeJS}
${scaleJS}
</script>

<script type="application/json" id="zanimator-schema">
${schemaJSON}
</script>

</body>
</html>`
}

// â”€â”€â”€ Descarga como HTML (imÃ¡genes base64 inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function downloadHTML(schema, assets = []) {
  const html     = exportHTML(schema, {}, assets)
  const blob     = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url      = URL.createObjectURL(blob)
  const link     = document.createElement('a')
  link.href      = url
  link.download  = slugify(schema.name) + '.html'
  link.click()
  URL.revokeObjectURL(url)
}

// â”€â”€â”€ Descarga como ZIP (HTML + imÃ¡genes como archivos) â”€â”€â”€â”€
// Las imÃ¡genes base64 se convierten a binario y van en /img/
// --- Descarga como ZIP (HTML + imagenes + fuentes como archivos) ---
export async function downloadZIP(schema, assets = []) {
  const zip       = new JSZip()
  const imgMap    = {}   // domId -> ruta relativa (img/nombre.ext)
  const imgFolder = zip.folder('img')

  // Imagenes: base64 -> binario en /img/
  for (const el of schema.elements ?? []) {
    if (el.type === 'img' && el.src?.startsWith('data:')) {
      const [header, base64] = el.src.split(',')
      const mime   = header.match(/:(.*?);/)?.[1] ?? 'image/png'
      const ext    = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      const name   = slugify(el.label ?? el.domId) + '.' + ext
      const binary = atob(base64)
      const bytes  = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      imgFolder.file(name, bytes)
      imgMap[el.domId] = `./img/${name}`
    }
  }

  // Fuentes: base64 -> binario en /fonts/, @font-face con rutas relativas
  const fontFolder = zip.folder('fonts')
  const resolvedAssets = await Promise.all(
    assets.map(async (a) => {
      if (a.type !== 'font' || !a.dataUrl?.startsWith('data:')) return a
      const [, base64] = a.dataUrl.split(',')
      const ext    = a.name.match(/\.([^.]+)$/)?.[1] ?? 'woff2'
      const fname  = slugify(a.fontFamily) + '.' + ext
      const binary = atob(base64)
      const bytes  = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      fontFolder.file(fname, bytes)
      return { ...a, dataUrl: `./fonts/${fname}` }
    })
  )

  const html = exportHTML(schema, imgMap, resolvedAssets)
  zip.file('index.html', html)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = slugify(schema.name) + '.zip'
  link.click()
  URL.revokeObjectURL(url)
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function slugify(str) {
  return (str ?? 'animacion').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '').toLowerCase() || 'animacion'
}

// ─── Importa un ZIP exportado y devuelve { schema, assets } ──
export async function importZIP(file) {
  const zip = await JSZip.loadAsync(file)

  // Leer index.html
  const htmlFile = zip.file('index.html')
  if (!htmlFile) throw new Error('No se encontró index.html en el ZIP')
  const html = await htmlFile.async('text')

  // Extraer el JSON del schema embebido
  const match = html.match(/<script[^>]+id="zanimator-schema"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) throw new Error('El archivo no contiene un schema Zanimator válido')
  const schema = JSON.parse(match[1].trim())

  const assets = []
  const imgMimeByExt = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' }

  // Reconstruir assets de imagen: leer binario desde img/ en el ZIP
  for (const el of schema.elements ?? []) {
    if (el.type !== 'img') continue
    let dataUrl = ''
    if (el.src?.startsWith('data:')) {
      // Schema antiguo (base64 inline) — compatibilidad hacia atrás
      dataUrl = el.src
    } else if (el.src) {
      // Schema nuevo (ruta relativa)
      const relPath = el.src.replace(/^\.\//,  '')
      const imgFile = zip.file(relPath)
      if (imgFile) {
        const ext  = relPath.match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? 'png'
        const mime = imgMimeByExt[ext] ?? 'image/png'
        const b64  = await imgFile.async('base64')
        dataUrl    = `data:${mime};base64,${b64}`
        el.src     = dataUrl   // restaurar para el editor
      }
    }
    if (dataUrl) {
      const mime = dataUrl.match(/data:(.*?);/)?.[1] ?? 'image/png'
      const ext  = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
      assets.push({
        id:      el.assetId ?? el.domId,
        name:    (el.label ?? el.domId) + '.' + ext,
        type:    mime,
        dataUrl,
      })
    }
  }

  // Reconstruir assets de fuentes desde la carpeta fonts/ del ZIP
  const fontMime = { woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/truetype', otf: 'font/otf' }
  const fontFiles = zip.file(/^fonts\/.+/)
  for (const fontFile of fontFiles) {
    const fname      = fontFile.name.replace('fonts/', '')
    const ext        = fname.match(/\.([^.]+)$/)?.[1]?.toLowerCase() ?? 'woff2'
    const mime       = fontMime[ext] ?? 'font/woff2'
    const b64        = await fontFile.async('base64')
    const dataUrl    = `data:${mime};base64,${b64}`
    const fontFamily = fname.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim()
    assets.push({
      id:         'asset-' + fname,
      name:       fname,
      type:       'font',
      dataUrl,
      fontFamily,
    })
  }

  return { schema, assets }
}
