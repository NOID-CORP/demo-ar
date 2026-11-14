// Mesero en realidad aumentada: el cliente le dice a Cosmo qué se le antoja
// (voz, teclado o sugerencias) y el plato escaneado aparece; con «Ver en mi
// mesa» la AR del teléfono lo pone a tamaño real. En Chrome para Android (WebXR)
// la conversación sigue sobre la cámara y el plato cambia en la mesa.

import { crearConversacion, FRASES } from './conversacion.js';
import { crearMascota } from './mascota.js';
import { crearVoz } from './voz.js';
import { crearVozGrabada } from './vozGrabada.js';
import { centimetros } from './formato.js';

const $ = (s) => document.querySelector(s);
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const VOZ_SI = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
const VOZ_NO = '<svg class="icono" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';

const params = new URLSearchParams(location.search);
const idTienda = /^[a-z0-9-]+$/.test(params.get('r') ?? '') ? params.get('r') : 'muestra-noid';
const { default: config } = await import(`../restaurantes/${idTienda}.js`);
const { marca } = config;
const nombreBot = config.asistente?.nombre ?? 'Cosmo';

const css = document.documentElement.style;
for (const [v, k] of Object.entries({ '--primario': 'primario', '--primario-claro': 'primarioClaro', '--acento': 'acento', '--fondo1': 'fondo1', '--fondo2': 'fondo2' })) {
  if (marca.colores[k]) css.setProperty(v, marca.colores[k]);
}
document.title = `${marca.nombre} · Mesero AR`;
document.querySelector('meta[name="theme-color"]').content = marca.colores.fondo1;
for (const img of [$('#logo'), $('#portada-logo')]) img.src = marca.logo;
$('#nombre').textContent = marca.nombre;
// La carta completa: index.html en el repositorio, carta.html en la demo publicada.
$('#enlace-carta').href = `${location.pathname.endsWith('mesero.html') ? 'index.html' : 'carta.html'}?r=${config.id}`;

const mv = $('#mv');
const conversacion = crearConversacion(config);
const voz = crearVoz('es-CO');
// Voz de ElevenLabs grabada de antemano; si no hay audios, la del teléfono.
const vozGrabada = await crearVozGrabada(`media/${config.id}/voz/`);
const cosmo = crearMascota($('#cosmo'), { colores: marca.colores, estilo: config.asistente?.estilo });
crearMascota($('#portada-cosmo'), { colores: marca.colores, estilo: config.asistente?.estilo }).estado('saluda');
$('#btn-voz').innerHTML = VOZ_SI;

// ── Avisos ─────────────────────────────────────────────────────────
let tAviso = 0;
function avisar(texto, ms = 3500) {
  const a = $('#aviso');
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(tAviso);
  tAviso = setTimeout(() => { a.hidden = true; }, ms);
}

// ── Lo que dice Cosmo: burbuja con efecto de escritura y voz ───────
let turno = 0;
function partir(texto) {
  const re = /[.!?](\s|$)/g;
  let m;
  while ((m = re.exec(texto))) if (m.index >= 18) return [texto.slice(0, m.index + 1), texto.slice(m.index + 1).trim()];
  return [texto, ''];
}

function decir(texto) {
  const id = ++turno;
  const [titular, cuerpo] = partir(texto);
  const burbuja = $('#burbuja');
  const elT = burbuja.querySelector('.titular');
  const elC = burbuja.querySelector('.cuerpo');
  burbuja.classList.remove('vacia');
  burbuja.scrollTop = 0;
  burbuja.setAttribute('aria-label', texto);
  const total = titular.length + cuerpo.length;
  const inicio = performance.now();
  const paso = (ahora) => {
    if (id !== turno) return;
    const n = Math.min(total, Math.floor(((ahora - inicio) / 1000) * 50));
    elT.textContent = titular.slice(0, n);
    elC.textContent = n > titular.length ? cuerpo.slice(0, n - titular.length) : '';
    if (n < total) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
  const avisos = {
    alIniciar: () => { if (id === turno) cosmo.hablando(true); },
    alTerminar: () => { if (id === turno) cosmo.hablando(false); },
  };
  vozGrabada?.callar();
  let hablo = false;
  if (voz.estaActiva() && vozGrabada?.cubre(texto)) {
    voz.callar();
    vozGrabada.hablar(texto, avisos);
    hablo = true;
  } else {
    hablo = voz.hablar(texto, avisos);
  }
  if (!hablo) {
    cosmo.hablando(true);
    setTimeout(() => { if (id === turno) cosmo.hablando(false); }, Math.min(4500, (total / 50) * 1000));
  }
}

// ── Lo que dice el cliente ─────────────────────────────────────────
let tDicho = 0;
function mostrarDicho(texto, oyendo = false) {
  const d = $('#dicho');
  clearTimeout(tDicho);
  d.hidden = false;
  d.classList.toggle('escuchando', oyendo);
  d.querySelector('.dicho-texto').textContent = texto;
  if (!oyendo) tDicho = setTimeout(() => { d.hidden = true; }, 5000);
}

function enviar(texto, mostrar = texto) {
  if (!texto?.trim()) return;
  $('#escribir').hidden = true;
  mostrarDicho(mostrar);
  cosmo.estado('pensando');
  const r = conversacion.responder(texto);
  setTimeout(() => pintar(r), 350);
}

// ── Pintar una respuesta ───────────────────────────────────────────
function pintar(r) {
  clearTimeout(tDicho);
  tDicho = setTimeout(() => { $('#dicho').hidden = true; }, 1800);
  if (['celebra', 'guino', 'saluda'].includes(r.animo)) { cosmo.estado('neutral'); cosmo.momento(r.animo, 2400); } else cosmo.estado(r.animo === 'feliz' ? 'neutral' : r.animo);
  decir(r.decir);
  const chips = $('#chips');
  chips.innerHTML = '';
  r.chips.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `chip${c.primario ? ' primario' : ''}`;
    b.textContent = c.texto;
    b.style.animationDelay = `${i * 45}ms`;
    b.addEventListener('click', () => enviar(c.valor, c.texto));
    chips.append(b);
  });
  chips.scrollLeft = 0;
  if (r.mostrar) servir(r.mostrar);
}

// ── Poner platos en la escena ──────────────────────────────────────
let urlTemporal = null;
let servido = '';

function medida(p) {
  const m = p.escaneo?.medidas;
  if (!m) return '';
  const texto = `${centimetros(Math.max(m.ancho, m.fondo))} de ancho · ${centimetros(m.alto)} de alto`;
  return p.escaneo.medidaAproximada ? `Aprox. ${texto} (medida estimada)` : texto;
}

function ficha(titulo, detalle) {
  const f = $('#ficha');
  f.hidden = !titulo;
  f.querySelector('.ficha-nombre').textContent = titulo ?? '';
  f.querySelector('.ficha-medida').textContent = detalle ?? '';
}

function limpiarEtiquetas() { mv.querySelectorAll('.etiqueta-3d').forEach((e) => e.remove()); }

async function servir(ids) {
  const clave = ids.join('+');
  if (clave === servido) return;
  servido = clave;
  limpiarEtiquetas();
  if (urlTemporal) { URL.revokeObjectURL(urlTemporal); urlTemporal = null; }
  if (!ids.length) {
    mv.removeAttribute('src');
    $('#vacio').hidden = false;
    ficha(null);
    return;
  }
  $('#vacio').hidden = true;
  const platos = ids.map((id) => conversacion.plato(id));
  if (platos.length === 1) {
    const [p] = platos;
    mv.autoRotate = true;
    mv.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
    if (p.escaneo?.usdz) mv.setAttribute('ios-src', p.escaneo.usdz); else mv.removeAttribute('ios-src');
    mv.src = p.escaneo.glb;
    mv.alt = `${p.nombre} en 3D`;
    ficha(p.nombre, medida(p));
    return;
  }
  // Dos platos: se unen en un solo modelo, lado a lado y a tamaño real.
  $('#cargando').hidden = false;
  try {
    const { combinar } = await import('./comparar.js');
    const { url, etiquetas } = await combinar(platos.map((p) => p.escaneo.glb));
    if (servido !== clave) { URL.revokeObjectURL(url); return; }
    urlTemporal = url;
    mv.autoRotate = false;
    mv.setAttribute('ar-modes', 'webxr quick-look');
    mv.removeAttribute('ios-src');
    mv.src = url;
    mv.alt = `${platos.map((p) => p.nombre).join(' y ')} juntos en 3D`;
    platos.forEach((p, i) => {
      const e = etiquetas[i];
      const el = document.createElement('div');
      el.className = 'etiqueta-3d';
      el.slot = `hotspot-${i}`;
      el.dataset.position = `${e.x} ${e.y} ${e.z}`;
      el.dataset.normal = '0 1 0';
      el.innerHTML = `<b>${escapar(p.nombre)}</b>`;
      mv.append(el);
    });
    ficha('Los dos juntos', platos.some((p) => p.escaneo?.medidaAproximada) ? 'A tamaño real (medidas estimadas)' : 'A tamaño real');
  } catch (err) {
    console.error(err);
    avisar('No pude juntar los dos platos en este teléfono. Te los muestro uno por uno.');
    servido = '';
    servir([ids[1]]);
  } finally {
    $('#cargando').hidden = true;
  }
}

// Encuadre: el plato un poco más abajo y más lejos, para que no lo tapen Cosmo ni la burbuja.
mv.addEventListener('load', () => {
  const c = mv.getBoundingBoxCenter();
  const d = mv.getDimensions();
  const doble = servido.includes('+');
  mv.cameraTarget = `${c.x}m ${c.y + d.z * (doble ? 0.06 : 0.16)}m ${c.z}m`;
  mv.cameraOrbit = `0deg 58deg ${doble ? 100 : 118}%`;
  mv.jumpCameraToGoal();
});

// En la AR de Chrome, tocar los botones no debe mover el plato.
mv.addEventListener('beforexrselect', (e) => {
  if (e.target.closest('button, input, a, .burbuja, .chips, .escribir')) e.preventDefault();
});
let intentoAR = 0;
$('#btn-ar').addEventListener('click', () => { intentoAR = Date.now(); }, true);
mv.addEventListener('ar-status', (e) => {
  if (e.detail.status === 'session-started') decir(FRASES.enLaMesa);
  if (e.detail.status === 'failed' && Date.now() - intentoAR < 20000) avisar('No se pudo abrir la cámara. Revisa los permisos e inténtalo de nuevo.');
});

// ── Micrófono y teclado ────────────────────────────────────────────
const ERRORES = {
  'not-allowed': `Activa el permiso del micrófono para hablar con ${nombreBot}.`,
  'service-not-allowed': 'Este navegador no permite dictado aquí. Puedes escribir.',
  'no-speech': 'No te escuché. Toca el micrófono e inténtalo de nuevo.',
  'audio-capture': 'No encuentro un micrófono.',
  network: 'El dictado necesita internet.',
};
let escuchando = false;
const micro = $('#btn-micro');
function terminarEscucha() {
  escuchando = false;
  micro.classList.remove('escuchando');
  if ($('#cosmo').dataset.estado === 'escuchando') cosmo.estado('neutral');
  if ($('#dicho').classList.contains('escuchando')) $('#dicho').hidden = true;
}
micro.addEventListener('click', () => {
  if (escuchando) { voz.dejarDeEscuchar(); return; }
  if (!voz.puedeEscuchar()) {
    abrirTeclado();
    avisar('Este navegador no permite dictado: escribe lo que se te antoja.');
    return;
  }
  escuchando = true;
  turno++;
  voz.callar();
  vozGrabada?.callar();
  cosmo.hablando(false);
  cosmo.estado('escuchando');
  micro.classList.add('escuchando');
  mostrarDicho('Te escucho…', true);
  voz.escuchar({
    alParcial: (t) => mostrarDicho(t, true),
    alFinal: (t) => { terminarEscucha(); enviar(t); },
    alError: (e) => { if (ERRORES[e]) avisar(ERRORES[e]); },
    alTerminar: terminarEscucha,
  });
});

function abrirTeclado() {
  const f = $('#escribir');
  f.hidden = false;
  $('#entrada').value = '';
  $('#entrada').focus();
}
$('#btn-teclado').addEventListener('click', () => { if ($('#escribir').hidden) abrirTeclado(); else $('#escribir').hidden = true; });
$('#escribir').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = $('#entrada').value;
  $('#entrada').value = '';
  enviar(t);
});

$('#btn-voz').addEventListener('click', () => {
  const activa = !voz.estaActiva();
  voz.activar(activa);
  if (!activa) vozGrabada?.callar();
  if (!activa) cosmo.hablando(false);
  $('#btn-voz').innerHTML = activa ? VOZ_SI : VOZ_NO;
  $('#btn-voz').setAttribute('aria-pressed', String(!activa));
  $('#btn-voz').setAttribute('aria-label', activa ? `Silenciar a ${nombreBot}` : `Activar la voz de ${nombreBot}`);
});

// ── Inicio ─────────────────────────────────────────────────────────
function empezar() {
  voz.desbloquear();
  vozGrabada?.desbloquear();
  vozGrabada?.precargar();
  const portada = $('#portada');
  portada.classList.add('saliendo');
  setTimeout(() => { portada.hidden = true; }, 400);
  pintar(conversacion.inicio());
}
$('#btn-empezar').addEventListener('click', empezar);
if (params.get('auto') === '1') empezar();
