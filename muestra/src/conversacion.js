// Conversación del mesero en AR: entiende frases como «hola, ¿cómo estás? tengo
// hambre, algo ligero» o «¿y algo más gourmet para mi esposa?» y decide qué decir
// y qué plato poner en la mesa. Sin IA externa ni internet; todo sale de la
// configuración del restaurante (rasgos, alias y presentación de cada plato).
// Puro, para probarlo con `node --test`.

export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const contiene = (texto, frase) => (` ${texto} `).includes(` ${frase} `);
const alguna = (texto, frases) => frases.some((f) => contiene(texto, f));

const RASGOS = {
  ligero: ['ligero', 'ligera', 'liviano', 'liviana', 'light', 'sencillo', 'sencilla', 'algo simple', 'poquito', 'no tengo mucha hambre', 'no mucha hambre', 'picar', 'para picar', 'rapido', 'algo rapido'],
  gourmet: ['gourmet', 'gurmet', 'gourmand', 'elegante', 'especial', 'sofisticado', 'sofisticada', 'fino', 'fina', 'elaborado', 'mas elaborado', 'refinado', 'premium', 'de chef', 'romantico', 'romantica', 'algo mejor'],
  hambre: ['mucha hambre', 'muerto de hambre', 'muerta de hambre', 'bastante hambre', 'completo', 'contundente', 'llenar'],
  saludable: ['saludable', 'sano', 'sana', 'verduras', 'fresco', 'fresca'],
  ninos: ['ninos', 'nino', 'nina', 'mi hijo', 'mi hija', 'mis hijos', 'los ninos'],
};

const INTENCIONES = {
  saludo: ['hola', 'holi', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'hey', 'que mas', 'quiubo'],
  estado: ['como estas', 'como esta', 'que tal', 'como vas', 'como te va', 'como andas'],
  recomendar: ['tengo hambre', 'hambre', 'recomienda', 'recomiendas', 'recomiendame', 'que me recomiendas', 'sugiere', 'no se que', 'que hay de bueno', 'algo rico', 'que comer', 'algo de comer', 'que me das', 'que tienes'],
  juntos: ['los dos', 'las dos', 'ambos', 'ambas', 'juntos', 'juntas', 'al lado', 'comparar', 'compara', 'comparalos', 'para los dos'],
  elogio: ['rico', 'rica', 'ricos', 'ricas', 'delicioso', 'deliciosa', 'deliciosos', 'provoca', 'se ve bien', 'se ve muy bien', 'que bueno', 'que buena', 'uf', 'uff', 'wow', 'guau', 'hermoso', 'espectacular', 'buenisimo', 'buenisima', 'divino', 'divina', 'brutal', 'que chimba', 'tremendo', 'me encanta'],
  pedir: ['lo quiero', 'la quiero', 'los quiero', 'me lo llevo', 'me la llevo', 'pidelo', 'pidemelo', 'lo pido', 'quiero ese', 'quiero esa', 'dame ese', 'dame esa', 'ese mismo', 'esa misma', 'me quedo con', 'me quedo', 'para mi ese', 'listo ese', 'pidamos'],
  otro: ['otro', 'otra', 'otra cosa', 'otra opcion', 'algo diferente', 'que mas tienes', 'que mas hay', 'siguiente', 'cambiar', 'cambialo'],
  mesa: ['en mi mesa', 'en la mesa', 'ver en la mesa', 'realidad aumentada', 'camara', 'tamano real', 'ponlo en la mesa'],
  gracias: ['gracias', 'muchas gracias', 'mil gracias'],
  afirmar: ['si', 'dale', 'claro', 'de una', 'ok', 'listo', 'bueno', 'vale', 'perfecto', 'hagale'],
};

// «para mi esposa» → «tu esposa». Se usa la última persona nombrada («mi marido, digo, mi esposa»).
const PERSONAS = [
  ['mi esposa', 'tu esposa'], ['mi mujer', 'tu esposa'], ['mi esposo', 'tu esposo'], ['mi marido', 'tu esposo'],
  ['mi novia', 'tu novia'], ['mi novio', 'tu novio'], ['mi pareja', 'tu pareja'], ['mi mama', 'tu mamá'],
  ['mi papa', 'tu papá'], ['mi hijo', 'tu hijo'], ['mi hija', 'tu hija'], ['mi amigo', 'tu amigo'], ['mi amiga', 'tu amiga'],
  ['mi jefe', 'tu jefe'], ['mi familia', 'tu familia'], ['para ella', 'ella'], ['para el', 'él'],
];

function persona(texto) {
  let mejor = null;
  for (const [frase, como] of PERSONAS) {
    const i = (` ${texto} `).lastIndexOf(` ${frase} `);
    if (i !== -1 && (!mejor || i > mejor.i)) mejor = { i, como };
  }
  return mejor?.como ?? null;
}

export function analizar(textoOriginal, platos) {
  const texto = normalizar(textoOriginal);
  const intenciones = new Set(Object.entries(INTENCIONES).filter(([, f]) => alguna(texto, f)).map(([k]) => k));
  // «sí» suelto solo cuenta si la frase es corta («si quiero algo gourmet» no es un sí).
  if (intenciones.has('afirmar') && texto.split(' ').length > 3 && !/^(si|dale|claro|listo|ok|bueno|perfecto) /.test(texto)) intenciones.delete('afirmar');
  const rasgos = new Set(Object.entries(RASGOS).filter(([, f]) => alguna(texto, f)).map(([k]) => k));
  // «nada ligero» o «no tan sencillo»: ese rasgo no cuenta.
  for (const [rasgo, frases] of Object.entries(RASGOS)) {
    if (frases.some((f) => alguna(texto, [`no ${f}`, `no tan ${f}`, `nada ${f}`, `no algo ${f}`]))) rasgos.delete(rasgo);
  }
  const mencionados = [];
  for (const p of platos) {
    const alias = [p.nombre, ...(p.alias ?? [])].map(normalizar).sort((a, b) => b.length - a.length);
    const pos = Math.min(...alias.map((a) => { const i = (` ${texto} `).indexOf(` ${a} `); return i === -1 ? Infinity : i; }));
    if (pos !== Infinity) mencionados.push({ id: p.id, pos });
  }
  mencionados.sort((a, b) => a.pos - b.pos);
  return { texto, intenciones, rasgos, persona: persona(texto), mencionados: mencionados.map((m) => m.id) };
}

// ── Frases de Cosmo ──────────────────────────────────────────────────
// Todo lo que dice sale de esta lista, frase por frase. Así la voz de ElevenLabs
// se graba una sola vez (generar-voz.mjs) y la página publica solo los audios.
export const FRASES = {
  hola: '¡Hola!',
  bien: 'Muy bien, gracias por preguntar.',
  claroPerfecto: '¡Claro, perfecto!',
  claro: '¡Claro!',
  claroGourmet: '¡Claro, algo más gourmet!',
  paraPersonaEspecial: (como) => `Para ${como}, algo más especial.`,
  paraPersona: (como) => `Algo para ${como}.`,
  tenemos: (presentacion) => `Para ti tenemos ${presentacion}.`,
  recomiendo: (presentacion) => `Te recomiendo ${presentacion}.`,
  aquiTienes: (presentacion) => `Aquí tienes ${presentacion}.`,
  buenaEleccion: '¡Buena elección!',
  otraOpcion: 'Mira esta otra opción.',
  excelente: '¡Excelente elección!',
  paraTi: (nombre) => `${nombre} para ti.`,
  anotado: 'Lo dejo anotado.',
  juntos: (a, b) => `Aquí tienes los dos juntos, ${a} y ${b}, para que veas cómo quedan en la mesa.`,
  verJuntos: '¿Quieres ver los dos juntos en la mesa?',
  buenisimos: '¡Sí, se ven buenísimos!',
  ufSi: '¡Uf, sí!',
  dosReales: 'Y los dos son platos reales, escaneados.',
  conCual: '¿Con cuál te quedas?',
  esReal: 'Y es el plato real, escaneado.',
  tocaMira: 'Toca «Ver en mi mesa» y míralo sobre tu mesa a tamaño real.',
  tocaApunta: 'Toca «Ver en mi mesa» y apunta la cámara a la mesa: aparece a tamaño real.',
  primeroDime: 'Primero dime qué se te antoja y te lo pongo en la mesa.',
  conGusto: '¡Con todo el gusto!',
  disfrutes: 'Que lo disfrutes.',
  puedoMostrar: 'Te puedo mostrar algo ligero o algo más gourmet.',
  quePrefieres: '¿Qué prefieres?',
  queSeAntoja: '¿Qué se te antoja hoy: algo ligero o algo más gourmet?',
  tocaVer: 'Toca «Ver en mi mesa» para verlo a tamaño real.',
  enLaMesa: '¡Ahí está, sobre tu mesa! Muévete alrededor para verlo. Puedes seguir hablándome.',
};

/** Parte un texto en frases («¡Hola! Muy bien.» → «¡Hola!», «Muy bien.»). Igual en la página y al grabar. */
export function partirFrases(texto) {
  return (String(texto).match(/[^.!?]*[.!?]+|[^.!?]+$/g) ?? []).map((f) => f.trim()).filter(Boolean);
}

/** Todas las frases que Cosmo puede decir con esta carta, para grabarlas. */
export function frasesPosibles(config) {
  const platos = config.productos.filter((p) => p.escaneo || p.receta || p.vaso);
  const textos = [config.asistente?.saludo ?? '¡Hola! ¿Qué se te antoja hoy?'];
  for (const valor of Object.values(FRASES)) if (typeof valor === 'string') textos.push(valor);
  for (const como of new Set(PERSONAS.map(([, c]) => c))) textos.push(FRASES.paraPersonaEspecial(como), FRASES.paraPersona(como));
  for (const p of platos) {
    const pres = p.presentacion ?? p.nombre.toLowerCase();
    textos.push(FRASES.tenemos(pres), FRASES.recomiendo(pres), FRASES.aquiTienes(pres), FRASES.paraTi(p.nombre));
    for (const q of platos) if (q !== p) textos.push(FRASES.juntos(p.nombre.toLowerCase(), q.nombre.toLowerCase()));
  }
  return [...new Set(textos.flatMap(partirFrases))];
}

export function crearConversacion(config) {
  const platos = config.productos.filter((p) => p.escaneo || p.receta || p.vaso);
  const porId = new Map(platos.map((p) => [p.id, p]));
  const orden = [config.destacado, ...platos.map((p) => p.id)].filter((id, i, a) => id && porId.has(id) && a.indexOf(id) === i);
  let s;

  function reiniciar() {
    s = { turno: 0, enMesa: [], vistos: [], saludo: false, vioAR: false, elegido: null };
  }
  reiniciar();

  const pres = (p) => p.presentacion ?? p.nombre.toLowerCase();
  const otroQue = (id) => orden.find((x) => x !== id) ?? id;

  function mejorPara(rasgos, evitar = null) {
    const puntaje = (p) => (p.rasgos ?? []).filter((r) => rasgos.has(r)).length;
    const lista = orden.map((id) => porId.get(id)).filter((p) => p.id !== evitar);
    const conPuntaje = lista.map((p, i) => ({ p, i, k: puntaje(p) })).filter((x) => x.k > 0).sort((a, b) => b.k - a.k || a.i - b.i);
    return conPuntaje[0]?.p.id ?? null;
  }

  function chipsTras(ids) {
    const chips = [];
    const actual = ids.length === 1 ? porId.get(ids[0]) : null;
    if (ids.length === 2) {
      for (const id of ids) chips.push({ texto: `Me quedo con ${porId.get(id).nombre.toLowerCase()}`, valor: `me quedo con ${porId.get(id).nombre}` });
      return chips;
    }
    chips.push({ texto: '¡Se ve muy rico!', valor: 'uf, se ve muy rico', primario: true });
    if (actual?.rasgos?.includes('ligero')) chips.push({ texto: 'Algo más gourmet', valor: 'y si quiero algo más gourmet' });
    else chips.push({ texto: 'Algo más ligero', valor: 'algo más ligero' });
    if (s.vistos.length >= 2) chips.push({ texto: 'Ver los dos juntos', valor: 'muéstrame los dos juntos' });
    chips.push({ texto: 'Lo quiero', valor: 'lo quiero' });
    return chips;
  }

  const CHIPS_INICIO = [
    { texto: 'Tengo hambre, algo ligero', valor: 'hola, ¿cómo estás? tengo hambre, algo ligero', primario: true },
    { texto: 'Algo más gourmet', valor: 'quiero algo más gourmet' },
    { texto: '¿Qué me recomiendas?', valor: '¿qué me recomiendas?' },
  ];

  function inicio() {
    reiniciar();
    return { decir: config.asistente?.saludo ?? '¡Hola! ¿Qué se te antoja hoy?', mostrar: [], chips: CHIPS_INICIO, animo: 'saluda' };
  }

  function poner(ids) {
    s.enMesa = ids;
    for (const id of ids) if (!s.vistos.includes(id)) s.vistos.push(id);
  }

  function responder(entrada) {
    s.turno++;
    const a = analizar(entrada, platos);
    const I = a.intenciones;
    const partes = [];
    const decir = (...f) => partes.push(...f);
    let mostrar = null;
    let animo = 'feliz';
    let chips = null;

    if (I.has('saludo') && !s.saludo) decir(FRASES.hola);
    if (I.has('estado')) decir(FRASES.bien);
    if (I.has('saludo') || I.has('estado')) s.saludo = true;
    const saludado = partes.length > 0;

    const actual = s.enMesa.length === 1 ? s.enMesa[0] : null;
    const paraOtro = a.persona;
    // «Uf, esos nuggets son ricos, pero ¿y algo más gourmet?»: el plato que ya está en la
    // mesa es contexto, no un pedido; mandan el gusto o la persona.
    if ((a.rasgos.size || paraOtro || I.has('otro')) && !I.has('juntos') && !I.has('pedir')
      && a.mencionados.every((id) => s.enMesa.includes(id))) {
      a.mencionados = [];
    }
    if (I.has('elogio') && (a.rasgos.size || paraOtro || a.mencionados.length)) decir(s.enMesa.length ? FRASES.buenisimos : FRASES.ufSi);

    const elegir = (p) => {
      s.elegido = p.id;
      decir(FRASES.excelente, FRASES.paraTi(p.nombre), FRASES.anotado);
      animo = 'celebra';
      chips = [{ texto: 'Gracias', valor: 'gracias' }, { texto: 'Ver el otro plato', valor: 'muéstrame otro' }];
    };

    if (a.mencionados.length >= 2 || (I.has('juntos') && orden.length >= 2)) {
      const ids = a.mencionados.length >= 2 ? a.mencionados.slice(0, 2) : (s.vistos.length >= 2 ? s.vistos.slice(-2) : orden.slice(0, 2));
      poner(ids);
      mostrar = ids;
      decir(FRASES.claro, FRASES.juntos(porId.get(ids[0]).nombre.toLowerCase(), porId.get(ids[1]).nombre.toLowerCase()));
      animo = 'celebra';
    } else if (a.mencionados.length === 1 && (I.has('pedir') || I.has('afirmar'))) {
      const p = porId.get(a.mencionados[0]);
      poner([p.id]);
      mostrar = [p.id];
      elegir(p);
    } else if (a.mencionados.length === 1) {
      const p = porId.get(a.mencionados[0]);
      poner([p.id]);
      mostrar = [p.id];
      decir(FRASES.buenaEleccion, FRASES.aquiTienes(pres(p)));
      animo = 'guino';
    } else if (a.rasgos.size || paraOtro) {
      const evitar = paraOtro && actual ? actual : (I.has('otro') ? actual : null);
      const id = mejorPara(a.rasgos, evitar) ?? (paraOtro && actual ? otroQue(actual) : mejorPara(a.rasgos) ?? orden[0]);
      const p = porId.get(id);
      poner([id]);
      mostrar = [id];
      if (paraOtro && a.rasgos.has('gourmet')) decir(FRASES.claro, FRASES.paraPersonaEspecial(paraOtro), FRASES.recomiendo(pres(p)));
      else if (paraOtro) decir(FRASES.claro, FRASES.paraPersona(paraOtro), FRASES.recomiendo(pres(p)));
      else if (a.rasgos.has('gourmet')) decir(FRASES.claroGourmet, FRASES.recomiendo(pres(p)));
      else decir(...(saludado ? [] : [FRASES.claroPerfecto]), FRASES.tenemos(pres(p)));
      if (paraOtro && s.vistos.length >= 2) decir(FRASES.verJuntos);
      animo = 'guino';
    } else if (I.has('otro') && orden.length > 1) {
      const id = otroQue(actual ?? orden[0]);
      poner([id]);
      mostrar = [id];
      decir(FRASES.otraOpcion, FRASES.aquiTienes(pres(porId.get(id))));
      animo = 'guino';
    } else if (I.has('pedir') || (I.has('afirmar') && s.enMesa.length)) {
      if (s.enMesa.length === 1) {
        elegir(porId.get(s.enMesa[0]));
      } else if (s.enMesa.length === 2) {
        decir(FRASES.conCual);
        chips = chipsTras(s.enMesa);
      } else {
        const id = orden[0];
        poner([id]);
        mostrar = [id];
        decir(FRASES.recomiendo(pres(porId.get(id))));
      }
    } else if (I.has('elogio')) {
      if (s.enMesa.length === 2) {
        decir(FRASES.ufSi, FRASES.dosReales, FRASES.conCual);
        chips = chipsTras(s.enMesa);
      } else {
        decir(FRASES.ufSi, FRASES.esReal, FRASES.tocaMira);
      }
      animo = 'celebra';
    } else if (I.has('mesa')) {
      decir(s.enMesa.length ? FRASES.tocaApunta : FRASES.primeroDime);
    } else if (I.has('recomendar') || I.has('afirmar')) {
      const id = orden[0];
      poner([id]);
      mostrar = [id];
      decir(...(saludado ? [] : [FRASES.claroPerfecto]), FRASES.recomiendo(pres(porId.get(id))));
      animo = 'guino';
    } else if (I.has('gracias')) {
      decir(FRASES.conGusto, FRASES.disfrutes);
      animo = 'celebra';
      chips = CHIPS_INICIO;
    } else if (!partes.length) {
      decir(FRASES.puedoMostrar, FRASES.quePrefieres);
      animo = 'pensando';
      chips = CHIPS_INICIO;
    } else {
      decir(FRASES.queSeAntoja);
      chips = CHIPS_INICIO;
    }

    if (mostrar && !s.vioAR && mostrar.length === 1) {
      decir(FRASES.tocaVer);
      s.vioAR = true;
    }
    return { decir: partes.join(' '), mostrar, chips: chips ?? chipsTras(s.enMesa.length ? s.enMesa : orden.slice(0, 1)), animo };
  }

  return { inicio, responder, plato: (id) => porId.get(id), estado: () => ({ ...s }) };
}
