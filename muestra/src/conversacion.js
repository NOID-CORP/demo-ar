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

export function crearConversacion(config) {
  const platos = config.productos.filter((p) => p.escaneo || p.receta || p.vaso);
  const porId = new Map(platos.map((p) => [p.id, p]));
  const orden = [config.destacado, ...platos.map((p) => p.id)].filter((id, i, a) => id && porId.has(id) && a.indexOf(id) === i);
  let s;

  function reiniciar() {
    s = { turno: 0, enMesa: [], vistos: [], saludo: false, vioAR: false, elegido: null };
  }
  reiniciar();

  const nombreCon = (p) => (p.presentacion ?? p.nombre.toLowerCase());
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
    let mostrar = null;
    let animo = 'feliz';
    let chips = null;

    if (I.has('saludo') && !s.saludo) partes.push('¡Hola!');
    if (I.has('estado')) partes.push('Muy bien, gracias por preguntar.');
    const saludado = partes.length > 0;
    if (I.has('saludo') || I.has('estado')) s.saludo = true;

    const actual = s.enMesa.length === 1 ? s.enMesa[0] : null;
    const paraOtro = a.persona;
    // «Uf, esos nuggets son ricos, pero ¿y algo más gourmet?»: el plato que ya está en la
    // mesa es contexto, no un pedido; mandan el gusto o la persona.
    if ((a.rasgos.size || paraOtro || I.has('otro')) && !I.has('juntos') && !I.has('pedir')
      && a.mencionados.every((id) => s.enMesa.includes(id))) {
      a.mencionados = [];
    }
    if (I.has('elogio') && (a.rasgos.size || paraOtro || a.mencionados.length)) {
      partes.push(s.enMesa.length ? '¡Sí, se ven buenísimos!' : '¡Uf, sí!');
    }

    if (a.mencionados.length >= 2 || (I.has('juntos') && orden.length >= 2)) {
      const ids = a.mencionados.length >= 2 ? a.mencionados.slice(0, 2) : (s.vistos.length >= 2 ? s.vistos.slice(-2) : orden.slice(0, 2));
      poner(ids);
      mostrar = ids;
      partes.push(`¡Claro! Aquí tienes los dos juntos, ${porId.get(ids[0]).nombre.toLowerCase()} y ${porId.get(ids[1]).nombre.toLowerCase()}, para que veas cómo quedan en la mesa.`);
      animo = 'celebra';
    } else if (a.mencionados.length === 1 && (I.has('pedir') || I.has('afirmar'))) {
      const p = porId.get(a.mencionados[0]);
      s.elegido = p.id;
      poner([p.id]);
      mostrar = [p.id];
      partes.push(`¡Excelente elección! ${p.nombre} para ti. Lo dejo anotado.`);
      animo = 'celebra';
      chips = [{ texto: 'Gracias', valor: 'gracias' }, { texto: 'Ver el otro plato', valor: 'muéstrame otro' }];
    } else if (a.mencionados.length === 1) {
      const p = porId.get(a.mencionados[0]);
      poner([p.id]);
      mostrar = [p.id];
      partes.push(`¡Buena elección! Aquí tienes ${nombreCon(p)}.`);
      animo = 'guino';
    } else if (a.rasgos.size || paraOtro) {
      const evitar = paraOtro && actual ? actual : (I.has('otro') ? actual : null);
      const id = mejorPara(a.rasgos, evitar) ?? (paraOtro && actual ? otroQue(actual) : mejorPara(a.rasgos) ?? orden[0]);
      const p = porId.get(id);
      poner([id]);
      mostrar = [id];
      if (paraOtro && a.rasgos.has('gourmet')) partes.push(`¡Claro! Para ${paraOtro}, algo más especial: ${nombreCon(p)}.`);
      else if (paraOtro) partes.push(`¡Claro! Para ${paraOtro} te recomiendo ${nombreCon(p)}.`);
      else if (a.rasgos.has('gourmet')) partes.push(`¡Claro! Si buscas algo más gourmet, te recomiendo ${nombreCon(p)}.`);
      else partes.push(`${saludado ? 'Para' : '¡Claro, perfecto! Para'} ti tenemos ${nombreCon(p)}.`);
      if (paraOtro && s.vistos.length >= 2) partes.push('¿Quieres ver los dos juntos en la mesa?');
      animo = 'guino';
    } else if (I.has('otro') && orden.length > 1) {
      const id = otroQue(actual ?? orden[0]);
      poner([id]);
      mostrar = [id];
      partes.push(`Mira esta otra opción: ${nombreCon(porId.get(id))}.`);
      animo = 'guino';
    } else if (I.has('pedir') || (I.has('afirmar') && s.enMesa.length)) {
      if (s.enMesa.length === 1) {
        const p = porId.get(s.enMesa[0]);
        s.elegido = p.id;
        partes.push(`¡Excelente elección! ${p.nombre} para ti. Lo dejo anotado.`);
        animo = 'celebra';
        chips = [{ texto: 'Gracias', valor: 'gracias' }, { texto: 'Ver el otro plato', valor: 'muéstrame otro' }];
      } else if (s.enMesa.length === 2) {
        partes.push('¿Con cuál te quedas?');
        chips = chipsTras(s.enMesa);
      } else {
        const id = orden[0];
        poner([id]);
        mostrar = [id];
        partes.push(`Te recomiendo ${nombreCon(porId.get(id))}.`);
      }
    } else if (I.has('elogio')) {
      partes.push(s.enMesa.length === 2
        ? '¡Uf, sí! Y los dos son platos reales, escaneados. ¿Con cuál te quedas?'
        : '¡Uf, sí! Y es el plato real, escaneado. Toca «Ver en mi mesa» y míralo sobre tu mesa a tamaño real.');
      if (s.enMesa.length === 2) chips = chipsTras(s.enMesa);
      animo = 'celebra';
    } else if (I.has('mesa')) {
      partes.push(s.enMesa.length
        ? 'Toca «Ver en mi mesa» y apunta la cámara a la mesa: aparece a tamaño real.'
        : 'Primero dime qué se te antoja y te lo pongo en la mesa.');
    } else if (I.has('recomendar') || I.has('afirmar')) {
      const id = orden[0];
      poner([id]);
      mostrar = [id];
      partes.push(`¡Claro, perfecto! Te recomiendo ${nombreCon(porId.get(id))}.`);
      animo = 'guino';
    } else if (I.has('gracias')) {
      partes.push('¡Con todo el gusto! Que lo disfrutes.');
      animo = 'celebra';
      chips = CHIPS_INICIO;
    } else if (!partes.length) {
      partes.push('Te puedo mostrar algo ligero o algo más gourmet. ¿Qué prefieres?');
      animo = 'pensando';
      chips = CHIPS_INICIO;
    } else {
      partes.push('¿Qué se te antoja hoy: algo ligero o algo más gourmet?');
      chips = CHIPS_INICIO;
    }

    if (mostrar && !s.vioAR && mostrar.length === 1) {
      partes.push('Toca «Ver en mi mesa» para verlo a tamaño real.');
      s.vioAR = true;
    }
    return { decir: partes.join(' '), mostrar, chips: chips ?? chipsTras(s.enMesa.length ? s.enMesa : orden.slice(0, 1)), animo };
  }

  return { inicio, responder, plato: (id) => porId.get(id), estado: () => ({ ...s }) };
}
