// Carta de muestra de NOID: platos reales escaneados con un celular, para enseñar
// a los restaurantes cómo se ve su comida en la mesa antes de escanear la suya.
// Se abre con ?r=muestra-noid. No es la carta de ningún restaurante: sin precios.
//
// Escaneos del 14-nov-2026 con KIRI Engine (Android), limpiados con
// apps/scan-pipeline. No se midieron los platos, así que la escala es una
// estimación y la carta lo dice (`medidaAproximada`):
//  - Nuggets: plato de ~26 cm deducido de las papas (~1 cm de ancho, el corte
//    estándar) y los nuggets (4,2–4,7 cm). Margen aproximado ±2 cm.
//  - Plato gourmet: ~20 cm, comparando el estampado del mismo mantel en los dos
//    escaneos. Referencia más débil: margen ±3 cm.
// Cuando alguien mida los platos (un lado, de borde a borde), repite la limpieza
// con --plato-cm y cambia las medidas aquí.

export default {
  id: 'muestra-noid',
  moneda: 'COP',
  marca: {
    nombre: 'Muestra NOID',
    lema: 'Platos reales escaneados',
    logo: 'media/muestra-noid/logo.svg',
    colores: {
      primario: '#c4581b',
      primarioClaro: '#f08a4b',
      acento: '#ffcf9a',
      rosa: '#e2683a',
      fondo1: '#161513',
      fondo2: '#5a2a12',
    },
  },
  textos: {
    incluye: 'Escaneados con un celular Android y procesados por NOID. Así se vería tu carta.',
  },
  destacado: 'nuggets',

  // Mesero conversacional (mesero.html): cómo se presenta y cómo recomienda.
  asistente: {
    nombre: 'Cosmo',
    saludo: '¡Hola! Soy Cosmo, tu mesero en realidad aumentada. ¿Qué se te antoja hoy?',
  },

  categorias: [{ id: 'escaneado', nombre: 'Platos escaneados' }],

  productos: [
    {
      id: 'nuggets', nombre: 'Nuggets con papas', categoria: 'escaneado',
      imagen: 'media/muestra-noid/nuggets.jpg', insignia: 'Escaneo real',
      descripcion: 'Nuggets apanados con papas a la francesa y salsa para untar.',
      // Para la conversación: rasgos que lo hacen la recomendación y cómo lo nombra la gente.
      rasgos: ['ligero', 'sencillo', 'ninos', 'picar'],
      alias: ['nuggets', 'nugget', 'naggets', 'nogets', 'nuggets con papas', 'deditos de pollo', 'pollo apanado', 'papas a la francesa'],
      presentacion: 'unos nuggets con papas a la francesa y salsa para untar, algo ligero, sencillo y muy rico',
      escaneo: {
        glb: 'modelos/muestra-noid/escaneos/nuggets.glb',
        usdz: 'modelos/muestra-noid/escaneos/nuggets.usdz',
        medidas: { ancho: 26, fondo: 25.6, alto: 4.2 },
        medidaAproximada: true,
      },
    },
    {
      id: 'plato-gourmet', nombre: 'Plato gourmet', categoria: 'escaneado',
      imagen: 'media/muestra-noid/plato-gourmet.jpg', insignia: 'Escaneo real',
      descripcion: 'Apanado, carne en salsa, ensalada fresca con maíz y tomate, y acompañante.',
      rasgos: ['gourmet', 'especial', 'completo', 'saludable', 'hambre'],
      alias: ['plato gourmet', 'el gourmet', 'ese gourmet', 'plato especial', 'carne en salsa'],
      presentacion: 'nuestro plato gourmet, con apanado, carne en salsa y una ensalada fresca con maíz y tomate',
      escaneo: {
        glb: 'modelos/muestra-noid/escaneos/plato-gourmet.glb',
        usdz: 'modelos/muestra-noid/escaneos/plato-gourmet.usdz',
        medidas: { ancho: 20, fondo: 19.9, alto: 4.6 },
        medidaAproximada: true,
      },
    },
  ],
};
