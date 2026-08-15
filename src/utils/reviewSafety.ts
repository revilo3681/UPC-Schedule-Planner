const BANNED_PATTERNS = [
  /\b(idiota|imbecil|estupido|estupida|basura|inutil|inutila|mierda|carajo|puta|puto|putas|putos|cabr[oó]n|hijueputa|conchatumadre|conchudo|marica|maricon|gay de mierda|zorra|perra|pendejo|pendeja|huevon|huevona|boludo|pelotudo|ctm|ptm|hdp)\b/i,
  /\b(sexo|sexual|porno|pornografia|desnudo|desnuda|coger|cogida|verga|pito|pene|vagina|tetas|culo|nalgas|follar|pajero|pajera)\b/i,
  /\b(matar|violar|violacion|suicidio|odio a|te odio|amenazo|amenaza)\b/i,
  /\b(racista|negro de mierda|cholo de mierda|indio de mierda| terruco)\b/i,
];

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function hasBannedLanguage(text: string): boolean {
  const clean = fold(text).replace(/[^a-z0-9\s]/g, ' ');
  return BANNED_PATTERNS.some((pattern) => pattern.test(clean));
}

export function reviewSafetyMessage(text: string): string | null {
  if (hasBannedLanguage(text)) {
    return 'Esa reseña no se puede publicar: evita insultos, groserías, contenido sexual o ataques personales. Habla del curso y de cómo enseña.';
  }
  if (text.trim().length < 12) {
    return 'Escribe al menos una frase útil sobre la clase o la forma de enseñar.';
  }
  return null;
}
