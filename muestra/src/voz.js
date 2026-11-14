// Voz del navegador: dictado (SpeechRecognition) y lectura en voz alta
// (speechSynthesis). Funciona en Chrome para Android con internet; donde no
// exista, la interfaz ofrece escribir.

import { textoParaVoz } from './formato.js';

export function crearVoz(idioma = 'es-CO') {
  const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sintesis = window.speechSynthesis;
  let voz = null;
  let activa = true;
  let reco = null;

  function elegirVoz() {
    const voces = sintesis?.getVoices?.() ?? [];
    const espanol = voces.filter((v) => v.lang?.toLowerCase().startsWith('es'));
    const orden = [idioma, 'es-US', 'es-MX', 'es-419', 'es-ES'].map((x) => x.toLowerCase());
    const puntaje = (v) => {
      const lang = v.lang.toLowerCase().replace('_', '-');
      const i = orden.findIndex((o) => lang.startsWith(o));
      return (i === -1 ? 10 : i) - (/google|natural|neural|online|enhanced/i.test(v.name) ? 5 : 0);
    };
    voz = espanol.sort((a, b) => puntaje(a) - puntaje(b))[0] ?? null;
  }
  sintesis?.addEventListener?.('voiceschanged', elegirVoz);
  elegirVoz();

  function hablar(texto, { alIniciar, alTerminar } = {}) {
    if (!activa || !sintesis || !texto) { alTerminar?.(); return false; }
    sintesis.cancel();
    const u = new SpeechSynthesisUtterance(textoParaVoz(texto));
    u.lang = voz?.lang ?? idioma;
    if (voz) u.voice = voz;
    u.rate = 1.05;
    u.pitch = 1.15;
    let terminado = false;
    const fin = () => { if (!terminado) { terminado = true; alTerminar?.(); } };
    u.onstart = () => alIniciar?.();
    u.onend = fin;
    u.onerror = fin;
    sintesis.speak(u);
    // Algunos Android no emiten «end»: margen generoso según la longitud.
    setTimeout(fin, 1500 + texto.length * 85);
    return true;
  }

  function escuchar({ alParcial, alFinal, alError, alTerminar } = {}) {
    if (!Reconocedor) { alError?.('no-soportado'); alTerminar?.(); return; }
    sintesis?.cancel();
    reco = new Reconocedor();
    reco.lang = idioma;
    reco.interimResults = true;
    reco.continuous = false;
    reco.maxAlternatives = 1;
    let final = '';
    let parcial = '';
    reco.onresult = (e) => {
      parcial = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else parcial += r[0].transcript;
      }
      alParcial?.(`${final} ${parcial}`.trim());
    };
    reco.onerror = (e) => alError?.(e.error);
    reco.onend = () => {
      reco = null;
      const texto = (final || parcial).trim();
      if (texto) alFinal?.(texto);
      alTerminar?.();
    };
    try { reco.start(); } catch { alError?.('ocupado'); alTerminar?.(); }
  }

  return {
    hablar,
    escuchar,
    callar: () => sintesis?.cancel(),
    dejarDeEscuchar: () => reco?.stop(),
    puedeEscuchar: () => Boolean(Reconocedor),
    puedeHablar: () => Boolean(sintesis),
    activar(si) { activa = si; if (!si) sintesis?.cancel(); },
    estaActiva: () => activa,
    /** Un primer enunciado mudo dentro de un toque habilita la voz en móviles. */
    desbloquear() {
      if (!sintesis) return;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      sintesis.speak(u);
    },
  };
}
