// Carta web en realidad aumentada. El cliente escanea el QR de la mesa, ve la
// carta del restaurante y, en cada plato con 3D, toca «Ver en mi mesa»: la AR
// nativa del teléfono (Android: WebXR o Scene Viewer; iPhone: Quick Look) lo
// pone a tamaño real sobre su mesa. También puede ver dos platos juntos.

import { centimetros, pesos, slug } from './formato.js';

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CUBO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>';
const VASO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-1.6 17a1 1 0 0 1-1 .9H8.6a1 1 0 0 1-1-.9z"/><path d="M6.6 9h10.8"/></svg>';

// ── Restaurante (?r=<id>, el QR de cada local apunta a su carta) ───
const params = new URLSearchParams(location.search);
const idTienda = /^[a-z0-9-]+$/.test(params.get('r') ?? '') ? params.get('r') : 'la-gloriosa';
const { default: config } = await import(`../restaurantes/${idTienda}.js`);
// Índice de las vistas previas dibujadas por código; una carta con solo escaneos no lo tiene.
const necesitaIndice = config.productos.some((p) => !p.escaneo && (p.receta || p.vaso));
const indice = necesitaIndice
  ? await fetch(`modelos/${config.id}/indice.json`).then((r) => (r.ok ? r.json() : { modelos: {} })).catch(() => ({ modelos: {} }))
  : { modelos: {} };
const { marca } = config;
const porId = new Map(config.productos.map((p) => [p.id, p]));

const css = document.documentElement.style;
for (const [var_, clave] of Object.entries({ '--primario': 'primario', '--primario-claro': 'primarioClaro', '--acento': 'acento', '--rosa': 'rosa', '--fondo1': 'fondo1', '--fondo2': 'fondo2' })) {
  if (marca.colores[clave]) css.setProperty(var_, marca.colores[clave]);
}
document.title = `${marca.nombre} · ${marca.lema}`;
document.querySelector('meta[name="theme-color"]').content = marca.colores.fondo1;
$('#logo').src = marca.logo;
$('#nombre').textContent = marca.nombre;
$('#lema').textContent = marca.lema;
$('#pie-incluye').textContent = config.textos.incluye;

// ── Modelos 3D: escaneo real si existe, si no la vista previa generada ──
function modelo(p, sabor = null) {
  if (!p) return null;
  // `medidas` (cm) del informe de la limpieza; `medidaAproximada` si no se midió el plato.
  if (p.escaneo) return { principal: p.escaneo.medidas, ...p.escaneo, escaneado: true, tipo: p.receta ? 'hamburguesa' : p.vaso ? 'bebida' : 'plato' };
  const s = sabor ?? p.sabores?.[0]?.nombre;
  const m = indice.modelos[s ? `${p.id}--${slug(s)}` : p.id];
  return m ? { ...m, escaneado: false } : null;
}

const hayEscaneos = config.productos.some((p) => p.escaneo);
const hayPrevias = config.productos.some((p) => !p.escaneo && modelo(p));
$('#pie-origen').textContent = !hayEscaneos
  ? 'Por ahora son vistas previas: al escanear cada plato verás exactamente el que te sirven.'
  : hayPrevias ? 'Los marcados «Escaneado» son el plato real; el resto, una vista previa.' : 'Todos son el plato real escaneado.';

function textoMedidas(m) {
  if (!m?.principal) return '';
  let texto;
  if (m.tipo === 'hamburguesa') texto = `Plato de ${centimetros(m.medidas.ancho)} · hamburguesa de ${centimetros(m.principal.alto)} de alto`;
  else if (m.tipo === 'bebida') texto = `${centimetros(m.principal.alto)} de alto · ${centimetros(Math.max(m.principal.ancho, m.principal.fondo))} de ancho`;
  else texto = `${centimetros(m.medidas.ancho)} × ${centimetros(m.medidas.fondo)} · ${centimetros(m.medidas.alto)} de alto`;
  return m.medidaAproximada ? `Aprox. ${texto} (medida estimada)` : texto;
}

function colorProducto(p) {
  return p.sabores?.[0]?.color ?? p.vaso?.color ?? marca.colores.primario;
}

// ── Avisos ─────────────────────────────────────────────────────────
let temporizador = 0;
function avisar(texto, ms = 3500) {
  const a = $('#aviso');
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { a.hidden = true; }, ms);
}

// ── Carta ──────────────────────────────────────────────────────────
function tarjeta(p) {
  const m = modelo(p);
  const foto = p.imagen
    ? `<img src="${escapar(p.imagen)}" alt="" loading="lazy">`
    : `<div class="foto-vaso" style="--liquido:${escapar(colorProducto(p))}">${VASO}</div>`;
  const sello = m ? `<span class="marca-3d">${m.escaneado ? 'Escaneado' : '3D'}</span>` : '';
  return `<article class="plato${m ? ' con-3d' : ''}" data-id="${p.id}">
    <button class="plato-foto" type="button" data-accion="ver" ${m ? '' : 'tabindex="-1" disabled'} aria-label="Ver ${escapar(p.nombre)} en 3D">${foto}${sello}</button>
    <div class="plato-info">
      ${p.insignia ? `<span class="insignia">${escapar(p.insignia)}</span>` : ''}
      <h3>${escapar(p.nombre)}</h3>
      ${p.descripcion ? `<p class="desc">${escapar(p.descripcion)}</p>` : ''}
      ${p.sabores ? `<p class="desc">Sabores: ${escapar(p.sabores.map((s) => s.nombre).join(' · '))}</p>` : ''}
      <div class="plato-pie">
        <strong class="precio">${pesos(p.precio)}</strong>
        ${m ? `<button class="ver-mesa" type="button" data-accion="ver">${CUBO}Ver en mi mesa</button>` : ''}
      </div>
      ${m ? `<label class="comparar"><input type="checkbox" data-accion="comparar"> Comparar</label>` : ''}
    </div>
  </article>`;
}

function filaAdicion(p) {
  return `<li><span>${escapar(p.nombre)}${p.descripcion ? `<small>${escapar(p.descripcion)}</small>` : ''}</span><strong>${pesos(p.precio)}</strong></li>`;
}

function pintarCarta() {
  const secciones = [];
  const pestanas = [];
  for (const c of config.categorias) {
    const productos = config.productos.filter((p) => p.categoria === c.id);
    if (!productos.length) continue;
    const adultos = productos.some((p) => p.alcohol);
    pestanas.push(`<a href="#cat-${c.id}" data-cat="${c.id}">${escapar(c.nombre)}</a>`);
    const cuerpo = c.id === 'adicion'
      ? `<ul class="adiciones">${productos.map(filaAdicion).join('')}</ul>`
      : `<div class="rejilla">${productos.map(tarjeta).join('')}</div>`;
    secciones.push(`<section id="cat-${c.id}" class="categoria" data-cat="${c.id}">
      <h2>${escapar(c.nombre)}${adultos ? ` <small>${escapar(config.textos.mayoresDe18)}</small>` : ''}</h2>${cuerpo}</section>`);
  }
  $('#pestanas').innerHTML = pestanas.join('');
  $('#carta').innerHTML = secciones.join('');
}
pintarCarta();

$('#carta').addEventListener('click', (e) => {
  const el = e.target.closest('[data-accion="ver"]');
  if (!el) return;
  abrirPlato(porId.get(el.closest('.plato').dataset.id));
});
$('#carta').addEventListener('change', (e) => {
  if (e.target.matches('[data-accion="comparar"]')) alternarComparacion(e.target.closest('.plato').dataset.id, e.target.checked);
});

// Pestaña activa según la sección visible.
const enlaces = [...document.querySelectorAll('#pestanas a')];
const observador = new IntersectionObserver((entradas) => {
  for (const en of entradas) {
    if (!en.isIntersecting) continue;
    enlaces.forEach((a) => a.classList.toggle('activa', a.dataset.cat === en.target.dataset.cat));
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('.categoria').forEach((s) => observador.observe(s));

// ── Plato destacado en la portada ──────────────────────────────────
const destacado = porId.get(config.destacado) ?? config.productos.find((p) => modelo(p));
const mDestacado = modelo(destacado);
if (mDestacado) {
  const visorPortada = $('#destacado');
  visorPortada.src = mDestacado.glb;
  if (mDestacado.usdz) visorPortada.setAttribute('ios-src', mDestacado.usdz);
  visorPortada.alt = `${destacado.nombre} en 3D`;
  $('#destacado-info').innerHTML = `<b>${escapar(destacado.nombre)}</b><span>${[pesos(destacado.precio), 'ver detalles'].filter(Boolean).join(' · ')}</span>`;
  $('#destacado-info').addEventListener('click', () => abrirPlato(destacado));
  visorPortada.addEventListener('ar-status', estadoAR);
} else {
  document.querySelector('.portada-visor').hidden = true;
}

// ── Visor de un plato ──────────────────────────────────────────────
const visor = $('#visor');
const mv = $('#mv');
let urlTemporal = null;
let abiertoDesdeCarta = false;

function urlDe(clave) {
  const u = new URL(location.href);
  u.searchParams.set('r', config.id);
  if (clave) u.searchParams.set('plato', clave); else u.searchParams.delete('plato');
  return u.toString();
}

function mostrarVisor(clave) {
  if (visor.hidden) {
    visor.hidden = false;
    document.body.classList.add('con-visor');
    history.pushState({ visor: true }, '', urlDe(clave));
    abiertoDesdeCarta = true;
  } else {
    history.replaceState({ visor: true }, '', urlDe(clave));
  }
}

function cerrarVisor({ desdeHistorial = false } = {}) {
  if (visor.hidden) return;
  visor.hidden = true;
  document.body.classList.remove('con-visor');
  if (!desdeHistorial) {
    if (abiertoDesdeCarta && history.state?.visor) history.back();
    else history.replaceState(null, '', urlDe(null));
  }
  abiertoDesdeCarta = false;
}
$('#btn-cerrar').addEventListener('click', () => cerrarVisor());
window.addEventListener('popstate', () => cerrarVisor({ desdeHistorial: true }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarVisor(); });

function limpiarEtiquetas() {
  mv.querySelectorAll('.etiqueta-3d').forEach((el) => el.remove());
}

function ponerModelo({ glb, usdz, modos, girar = true }) {
  if (urlTemporal && glb !== urlTemporal) { URL.revokeObjectURL(urlTemporal); urlTemporal = null; }
  mv.autoRotate = girar;
  mv.setAttribute('ar-modes', modos);
  if (usdz) mv.setAttribute('ios-src', usdz); else mv.removeAttribute('ios-src');
  mv.src = glb;
  mv.cameraOrbit = '25deg 62deg auto';
}

function abrirPlato(p, sabor = null) {
  const m = modelo(p, sabor);
  if (!m) return;
  const elegido = sabor ?? p.sabores?.[0]?.nombre ?? null;
  mostrarVisor(elegido ? `${p.id}--${slug(elegido)}` : p.id);
  limpiarEtiquetas();
  $('#cargando').hidden = true;
  $('#visor-insignia').textContent = p.insignia ?? (p.alcohol ? config.textos.mayoresDe18 : '');
  $('#visor-nombre').textContent = p.nombre;
  $('#visor-precio').textContent = pesos(p.precio);
  $('#visor-medidas').textContent = textoMedidas(m);
  $('#visor-origen').innerHTML = m.escaneado
    ? `<b>Escaneado del plato real.</b> ${m.medidaAproximada ? 'El tamaño es una estimación: falta medir el plato.' : 'Así llega a tu mesa.'}`
    : '<b>Vista previa en 3D.</b> Cuando escaneemos este plato verás exactamente el que te sirven.';
  $('#visor-descripcion').textContent = [p.descripcion, p.receta ? config.textos.incluye : ''].filter(Boolean).join(' ');
  const sabores = $('#visor-sabores');
  sabores.innerHTML = (p.sabores ?? []).map((s) => `<button type="button" class="sabor" style="--liquido:${escapar(s.color)}" aria-pressed="${s.nombre === elegido}" data-sabor="${escapar(s.nombre)}"><i></i>${escapar(s.nombre)}</button>`).join('');
  sabores.onclick = (e) => {
    const b = e.target.closest('[data-sabor]');
    if (b) abrirPlato(p, b.dataset.sabor);
  };
  const btnComparar = $('#btn-comparar-con');
  btnComparar.hidden = false;
  btnComparar.onclick = () => {
    if (!seleccion.includes(p.id)) alternarComparacion(p.id, true);
    cerrarVisor();
    avisar('Ahora marca «Comparar» en otro plato con 3D.');
    document.querySelector(`#cat-${p.categoria}`)?.scrollIntoView({ behavior: 'smooth' });
  };
  ponerModelo({ glb: m.glb, usdz: m.usdz, modos: 'webxr scene-viewer quick-look' });
  mv.alt = `${p.nombre} en 3D`;
  revisarAR('plato');
}

// ── Comparar dos platos ────────────────────────────────────────────
const seleccion = [];
function alternarComparacion(id, marcado) {
  const i = seleccion.indexOf(id);
  if (marcado && i === -1) {
    seleccion.push(id);
    if (seleccion.length > 2) seleccion.shift();
  } else if (!marcado && i !== -1) seleccion.splice(i, 1);
  document.querySelectorAll('[data-accion="comparar"]').forEach((c) => { c.checked = seleccion.includes(c.closest('.plato').dataset.id); });
  const barra = $('#barra-comparar');
  barra.hidden = seleccion.length === 0;
  barra.querySelector('.barra-texto span').textContent = seleccion.length === 2
    ? seleccion.map((x) => porId.get(x).nombre).join(' y ')
    : `${porId.get(seleccion[0])?.nombre ?? ''} · elige otro`;
  $('#btn-ver-comparacion').disabled = seleccion.length < 2;
}
$('#btn-limpiar-comparacion').addEventListener('click', () => { [...seleccion].forEach((x) => alternarComparacion(x, false)); });
$('#btn-ver-comparacion').addEventListener('click', () => abrirComparacion());

async function abrirComparacion() {
  if (seleccion.length < 2) return;
  const [a, b] = seleccion.map((x) => porId.get(x));
  const [ma, mb] = [modelo(a), modelo(b)];
  mostrarVisor(null);
  limpiarEtiquetas();
  $('#visor-insignia').textContent = 'Comparación a tamaño real';
  $('#visor-nombre').textContent = `${a.nombre} y ${b.nombre}`;
  $('#visor-precio').textContent = '';
  $('#visor-sabores').innerHTML = '';
  $('#visor-descripcion').textContent = '';
  $('#btn-comparar-con').hidden = true;
  $('#visor-medidas').textContent = [ma, mb].every((m) => m.principal)
    ? `${a.nombre}: ${centimetros(ma.principal.alto)} de alto · ${b.nombre}: ${centimetros(mb.principal.alto)} de alto${[ma, mb].some((m) => m.medidaAproximada) ? ' (medidas estimadas)' : ''}`
    : '';
  $('#visor-origen').innerHTML = '<b>Las dos juntas sobre tu mesa.</b> Así comparas el tamaño real antes de pedir.';
  $('#cargando').hidden = false;
  try {
    const { combinar } = await import('./comparar.js');
    const { url, etiquetas } = await combinar([ma.glb, mb.glb]);
    ponerModelo({ glb: url, usdz: null, modos: 'webxr quick-look', girar: false });
    urlTemporal = url;
    mv.alt = `${a.nombre} y ${b.nombre} juntas en 3D`;
    [a, b].forEach((p, i) => {
      const e = etiquetas[i];
      const el = document.createElement('div');
      el.className = 'etiqueta-3d';
      el.slot = `hotspot-${i}`;
      el.dataset.position = `${e.x} ${e.y} ${e.z}`;
      el.dataset.normal = '0 1 0';
      el.innerHTML = `<b>${escapar(p.nombre)}</b><span>${pesos(p.precio)}</span>`;
      mv.append(el);
    });
    revisarAR('comparar');
  } catch (err) {
    avisar('No se pudo preparar la comparación en este teléfono.');
    console.error(err);
  } finally {
    $('#cargando').hidden = true;
  }
}

// ── ¿Este teléfono puede abrir la AR? Si no, QR para abrirlo en uno que sí ──
function esTactil() { return matchMedia('(pointer: coarse)').matches; }

function revisarAR(tipo) {
  const bloque = $('#sin-ar');
  const actualizar = () => {
    const puede = mv.canActivateAR;
    bloque.hidden = puede;
    if (puede) return;
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (!esTactil()) {
      const url = location.href;
      const qr = $('#qr');
      if (window.qrcode) {
        const q = window.qrcode(0, 'M');
        q.addData(url);
        q.make();
        qr.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      }
      $('#sin-ar-texto').innerHTML = `<b>Escanéalo con tu celular</b> para ver ${tipo === 'comparar' ? 'los platos' : 'el plato'} sobre tu mesa a tamaño real.${local ? ' <small>(Este enlace es local: funciona al publicar la carta o con el reenvío USB.)</small>' : ''}`;
    } else {
      $('#qr').innerHTML = '';
      $('#sin-ar-texto').innerHTML = tipo === 'comparar'
        ? 'Ver dos platos juntos en la mesa necesita Chrome en un Android con ARCore o un iPhone. Puedes verlos uno por uno o girarlos aquí.'
        : 'Este teléfono no abre la realidad aumentada desde el navegador. Puedes girar el plato con el dedo.';
    }
  };
  actualizar();
  mv.addEventListener('load', actualizar, { once: true });
  setTimeout(actualizar, 1200);
}

// Solo se avisa del fallo si el cliente acaba de tocar «Ver en mi mesa».
let intentoAR = 0;
document.addEventListener('click', (e) => { if (e.target.closest('[slot="ar-button"]')) intentoAR = Date.now(); }, true);
function estadoAR(e) {
  if (e.detail.status === 'failed' && Date.now() - intentoAR < 20000) {
    avisar('No se pudo abrir la cámara en realidad aumentada. Revisa los permisos e inténtalo de nuevo.');
  }
}
mv.addEventListener('ar-status', estadoAR);

// Enlace directo a un plato (?plato=…), por ejemplo desde el QR del computador.
const pedido = params.get('plato');
if (pedido) {
  const [idPlato, saborSlug] = pedido.split('--');
  const p = porId.get(idPlato);
  const sabor = p?.sabores?.find((s) => slug(s.nombre) === saborSlug)?.nombre ?? null;
  if (modelo(p, sabor)) {
    abrirPlato(p, sabor);
    history.replaceState({ visor: true }, '', urlDe(pedido));
    abiertoDesdeCarta = false;
  }
}
