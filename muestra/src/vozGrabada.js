// Voz grabada de Cosmo (ElevenLabs, generada con generar-voz.mjs): reproduce las
// frases de una respuesta una tras otra, sin los silencios del principio y del
// final, para que suene como una sola. Si falta alguna frase, la página usa la
// voz del teléfono para esa respuesta.

import { partirFrases } from './conversacion.js';

export async function crearVozGrabada(base) {
  let indice = null;
  try {
    const r = await fetch(`${base}indice.json`, { cache: 'no-cache' });
    if (r.ok) indice = await r.json();
  } catch { /* sin audios: se usa la voz del teléfono */ }
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!indice?.frases || !Contexto) return null;

  const ctx = new Contexto();
  const memoria = new Map();
  let fuentes = [];
  let turno = 0;
  let temporizador = 0;

  // Quita el silencio de los extremos dejando un margen corto.
  function recortar(buffer) {
    const datos = buffer.getChannelData(0);
    const umbral = 0.012;
    let ini = 0;
    let fin = datos.length - 1;
    while (ini < fin && Math.abs(datos[ini]) < umbral) ini++;
    while (fin > ini && Math.abs(datos[fin]) < umbral) fin--;
    const margen = Math.floor(buffer.sampleRate * 0.03);
    ini = Math.max(0, ini - margen);
    fin = Math.min(datos.length, fin + margen * 2);
    const corto = ctx.createBuffer(buffer.numberOfChannels, Math.max(1, fin - ini), buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) corto.copyToChannel(buffer.getChannelData(c).subarray(ini, fin), c);
    return corto;
  }

  function cargar(archivo) {
    if (!memoria.has(archivo)) {
      const promesa = fetch(`${base}${archivo}`)
        .then((r) => { if (!r.ok) throw new Error(archivo); return r.arrayBuffer(); })
        .then((datos) => new Promise((ok, mal) => ctx.decodeAudioData(datos, ok, mal)))
        .then(recortar);
      promesa.catch(() => memoria.delete(archivo));
      memoria.set(archivo, promesa);
    }
    return memoria.get(archivo);
  }

  function callar() {
    turno++;
    clearTimeout(temporizador);
    for (const f of fuentes) { try { f.stop(); } catch { /* ya terminó */ } }
    fuentes = [];
  }

  return {
    /** ¿Están grabadas todas las frases de este texto? */
    cubre: (texto) => partirFrases(texto).every((f) => indice.frases[f]),
    async hablar(texto, { alIniciar, alTerminar } = {}) {
      callar();
      const mio = turno;
      try {
        const buffers = await Promise.all(partirFrases(texto).map((f) => cargar(indice.frases[f])));
        if (mio !== turno) return;
        await ctx.resume();
        let t = ctx.currentTime + 0.04;
        for (const b of buffers) {
          const fuente = ctx.createBufferSource();
          fuente.buffer = b;
          fuente.connect(ctx.destination);
          fuente.start(t);
          fuentes.push(fuente);
          t += b.duration + 0.14;
        }
        alIniciar?.();
        temporizador = setTimeout(() => { if (mio === turno) { fuentes = []; alTerminar?.(); } }, (t - ctx.currentTime) * 1000);
      } catch {
        if (mio === turno) alTerminar?.(false);
      }
    },
    callar,
    /** El navegador solo deja sonar audio después de un toque: se llama en «Empezar». */
    desbloquear: () => ctx.resume(),
    /** Descarga y prepara todos los audios en segundo plano. */
    precargar: () => { for (const a of new Set(Object.values(indice.frases))) cargar(a).catch(() => {}); },
  };
}
