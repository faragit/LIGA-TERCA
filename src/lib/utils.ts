export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function safeKD(kills: number, deaths: number) {
  if (!deaths) return kills ? kills : 0;
  return kills / deaths;
}

export function clamp(min: number, x: number, max: number) {
  return Math.max(min, Math.min(max, x));
}
