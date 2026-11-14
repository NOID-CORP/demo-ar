// Formatos compartidos por la carta, el generador y las pruebas.

/** 42000 → «$42.000». Sin precio (carta de muestra) → «». */
export function pesos(valor) {
  if (!Number.isFinite(valor)) return '';
  return `$${String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** «Frutos rojos» → «frutos-rojos», «Maracuyá» → «maracuya». */
export function slug(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** 11.6 → «11,6 cm». */
export function centimetros(valor) {
  return `${String(Math.round(valor * 10) / 10).replace('.', ',')} cm`;
}

/** Texto para la síntesis de voz: precios hablados, sin emojis ni símbolos. */
export function textoParaVoz(texto) {
  return String(texto)
    .replace(/\$(\d{1,3})\.000\b/g, '$1 mil pesos')
    .replace(/\$(\d{1,3})\.(\d{3})\b/g, (_, mil, resto) => `${mil} mil ${Number(resto)} pesos`)
    .replace(/~\s?(\d)/g, 'unos $1')
    .replace(/[«»]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}
