// Cosmo: la mascota del mesero, dibujada en SVG con los colores de la marca.
// Sus estados (hablando, escuchando, pensando, celebra, guiño, saluda) son
// clases CSS, así que animarlo no cuesta nada al teléfono.

export function crearMascota(contenedor, { colores, estilo }) {
  const p = colores.primario;
  const claro = colores.primarioClaro ?? '#c9a7ff';
  const acento = colores.acento ?? '#ffd21f';
  const astronauta = estilo === 'astronauta';
  contenedor.innerHTML = `
  <svg class="cosmo-svg" viewBox="0 -16 220 266" role="img" aria-label="Cosmo, el mesero virtual">
    <defs>
      <radialGradient id="cz-cuerpo" cx="38%" cy="28%" r="80%">
        <stop offset="0" stop-color="#ffffff"/><stop offset="0.62" stop-color="#f3f0fb"/><stop offset="1" stop-color="#cfc5ec"/>
      </radialGradient>
      <linearGradient id="cz-visor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2d2357"/><stop offset="1" stop-color="#0d0920"/>
      </linearGradient>
      <radialGradient id="cz-oreja" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="${claro}"/><stop offset="1" stop-color="${p}"/>
      </radialGradient>
      <linearGradient id="cz-aleta" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0" stop-color="${p}" stop-opacity="0.75"/><stop offset="1" stop-color="${claro}" stop-opacity="0.95"/>
      </linearGradient>
      <filter id="cz-brillo" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="cz-difuso"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <ellipse class="cz-halo" cx="110" cy="238" rx="40" ry="7" fill="none" stroke="${claro}" stroke-width="4" filter="url(#cz-brillo)"/>
    <ellipse class="cz-halo-suave" cx="110" cy="238" rx="46" ry="9" fill="${p}" opacity="0.35" filter="url(#cz-difuso)"/>
    <g class="cz-cuerpo">
      <path class="cz-aleta cz-aleta-izq" d="M44 108 C 16 92, 6 66, 14 50 C 32 62, 46 82, 56 98 Z" fill="url(#cz-aleta)"/>
      <path class="cz-aleta cz-aleta-der" d="M176 108 C 204 92, 214 66, 206 50 C 188 62, 174 82, 164 98 Z" fill="url(#cz-aleta)"/>
      <g class="cz-brazo cz-brazo-izq"><ellipse cx="54" cy="186" rx="14" ry="11" fill="url(#cz-cuerpo)"/></g>
      <ellipse cx="110" cy="190" rx="42" ry="32" fill="url(#cz-cuerpo)"/>
      <path d="M74 174 Q110 190 146 174 L120 214 Q110 224 100 214 Z" fill="${p}"/>
      <g transform="translate(110 192)" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none">
        <path d="M-6 -8 L-6 9 M-9 -8 L-9 -2 Q-6 2 -3 -2 L-3 -8"/>
        <path d="M6 -8 Q11 -2 6 3 L6 9"/>
      </g>
      <ellipse cx="110" cy="114" rx="74" ry="64" fill="url(#cz-cuerpo)"/>
      <ellipse class="cz-oreja" cx="36" cy="116" rx="11" ry="18" fill="url(#cz-oreja)"/>
      <ellipse class="cz-oreja" cx="184" cy="116" rx="11" ry="18" fill="url(#cz-oreja)"/>
      <rect x="52" y="80" width="116" height="76" rx="38" fill="url(#cz-visor)"/>
      <path d="M72 92 Q 102 80 146 88" stroke="#fff" stroke-opacity="0.2" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g class="cz-ojos" filter="url(#cz-brillo)" stroke="${claro}" fill="${claro}">
        <g class="cz-ojos-felices" fill="none" stroke-width="6.5" stroke-linecap="round">
          <path class="cz-ojo-izq" d="M77 121 Q89 105 101 121"/>
          <path class="cz-ojo-der" d="M119 121 Q131 105 143 121"/>
        </g>
        <g class="cz-ojos-abiertos" stroke="none">
          <ellipse cx="89" cy="114" rx="9" ry="11.5"/><ellipse cx="131" cy="114" rx="9" ry="11.5"/>
          <circle cx="92" cy="110" r="3" fill="#fff"/><circle cx="134" cy="110" r="3" fill="#fff"/>
        </g>
        <g class="cz-ojos-guino" fill="none" stroke-width="6.5" stroke-linecap="round">
          <path d="M77 121 Q89 105 101 121"/><path d="M120 116 L142 116"/>
        </g>
      </g>
      <ellipse cx="72" cy="136" rx="8" ry="4" fill="#ff6fa5" opacity="0.6"/>
      <ellipse cx="148" cy="136" rx="8" ry="4" fill="#ff6fa5" opacity="0.6"/>
      <g class="cz-boca"><path d="M99 130 Q110 146 121 130 Q110 134 99 130 Z" fill="#ff7aa8"/></g>
      <g class="cz-gorro">
        ${astronauta ? `<path d="M138 30 L156 6" stroke="#d9d3ee" stroke-width="3" stroke-linecap="round"/>
        <path class="cz-estrella" d="M158 -4 l3.6 7.4 8.1 1.2 -5.9 5.7 1.4 8.1 -7.2 -3.8 -7.2 3.8 1.4 -8.1 -5.9 -5.7 8.1 -1.2 Z" fill="${acento}" filter="url(#cz-brillo)"/>` : ''}
        <circle cx="84" cy="40" r="19" fill="#fff"/><circle cx="136" cy="40" r="19" fill="#fff"/><circle cx="110" cy="28" r="24" fill="#fff"/>
        <rect x="72" y="46" width="76" height="22" rx="9" fill="#fff" stroke="#e4ddf5" stroke-width="2"/>
        <path d="M100 55 Q110 64 120 55 Z M98 55 L122 55" stroke="${p}" stroke-width="2.4" fill="none" stroke-linejoin="round"/>
        <path d="M105 52 q-2 -3 0 -5 M110 52 q-2 -3 0 -5 M115 52 q-2 -3 0 -5" stroke="${p}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M74 66 Q110 76 146 66" stroke="${p}" stroke-width="3" fill="none"/>
      </g>
      <g class="cz-brazo cz-brazo-der"><ellipse cx="166" cy="186" rx="14" ry="11" fill="url(#cz-cuerpo)"/>
        <path class="cz-pulgar" d="M170 176 q2 -10 8 -8 q4 2 0 10" fill="url(#cz-cuerpo)" stroke="#d9d3ee" stroke-width="1.2"/></g>
    </g>
    <g class="cz-chispas" stroke="${acento}" stroke-width="5" stroke-linecap="round">
      <path d="M182 30 L192 16"/><path d="M196 44 L210 36"/><path d="M168 22 L170 6"/>
    </g>
  </svg>`;

  let estado = 'neutral';
  let hablando = false;
  const raiz = contenedor;

  function aplicar() {
    raiz.dataset.estado = estado;
    raiz.classList.toggle('hablando', hablando);
  }

  return {
    estado(nuevo) { estado = nuevo || 'neutral'; aplicar(); },
    hablando(si) { hablando = si; aplicar(); },
    momento(nuevo, ms = 1600) {
      const previo = estado;
      estado = nuevo;
      aplicar();
      setTimeout(() => { if (estado === nuevo) { estado = previo === nuevo ? 'neutral' : previo; aplicar(); } }, ms);
    },
  };
}
