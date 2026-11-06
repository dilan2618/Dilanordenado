// Señales de riesgo (detección local, complementaria a la del asistente)
const RISK = [
  /me (pega|golpea|golpe[oó]|empuj[aó]|ahorc[aó]|lastim[aó]|amenaz[aó]|amenaza|forz[oó]|obliga|oblig[oó])/i,
  /(tengo|siento) miedo de (él|el|ella)/i, /me va a (matar|hacer daño|lastimar)/i, /me (quiere|quiso) (matar|pegar)/i,
  /violencia|abus(o|a|ó)|viol[oó]|maltrat/i,
  /no me deja (salir|ver a|trabajar|usar)|me quita el (tel[eé]fono|dinero)/i,
  /(quiero|pienso en) (morir|matarme|suicid)|hacerme daño|no quiero vivir|autolesi/i,
  /(le|la|lo) voy a (pegar|matar|hacer daño)/i,
];
export const riskText = (t) => RISK.some((r) => r.test(t || ''));
