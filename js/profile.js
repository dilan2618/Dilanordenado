// =====================================================================
// Perfil inicial de la relación (sin IA): reglas transparentes sobre
// respuestas de opción y escala que cada persona autorizó compartir.
// Nunca diagnostica; separa observaciones, diferencias e hipótesis.
// =====================================================================
import { GOALS } from './content.js';

const goalLabel = (k) => GOALS.find((g) => g.key === k)?.label || k;
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const lc = (s) => String(s || '').toLowerCase();

export function buildRuleProfile(inputs) {
  const people = (inputs || []).filter((p) => p.consent);
  const pending = (inputs || []).filter((p) => !p.consent).map((p) => p.name);
  const out = {
    source: 'reglas', generated_at: new Date().toISOString(), resumen: '', fortalezas: [], necesidades_individuales: [], diferencias: [],
    estilos_de_comunicacion: [], fuentes_de_conflicto: [], expectativas: [], objetivos_compartidos: [], hipotesis_por_confirmar: [], sugerencias: [], tags: [],
    razonamiento: 'Este perfil se calcula con reglas simples a partir de las respuestas de opción y escala que cada persona autorizó usar. No incluye respuestas escritas ni hace diagnósticos. Las diferencias no son problemas: son puntos a conversar.',
    pendientes: pending,
  };

  // Objetivos (visibles para ambos siempre)
  const allGoals = (inputs || []).map((p) => arr(p.goals));
  if (allGoals.length === 2) {
    const shared = allGoals[0].filter((g) => allGoals[1].includes(g));
    out.objetivos_compartidos = shared.map(goalLabel);
    const only = (inputs || []).map((p, i) => ({ n: p.name, g: allGoals[i].filter((g) => !shared.includes(g)) })).filter((x) => x.g.length);
    only.forEach((x) => out.sugerencias.push(`${x.n} también eligió: ${x.g.map(goalLabel).join(', ')}. Vale la pena conversar por qué es importante.`));
    shared.forEach((g) => out.tags.push(g));
  } else if (allGoals.length === 1) { out.objetivos_compartidos = allGoals[0].map(goalLabel); allGoals[0].forEach((g) => out.tags.push(g)); }

  if (!people.length) {
    out.resumen = 'Aún no hay respuestas autorizadas para construir el perfil. Cada persona puede activarlo en "Conocernos" → "Privacidad del perfil".';
    return out;
  }

  // Necesidades individuales
  for (const p of people) {
    const a = p.answers || {};
    const needs = [...arr(a.a_amado)];
    if (a.a_contacto >= 4) needs.push('Contacto físico frecuente');
    if (a.a_palabras >= 4) needs.push('Palabras de afirmación');
    if (/muy importante|bastante/.test(lc(a.a_iniciativa))) needs.push('Que su pareja tome la iniciativa');
    out.necesidades_individuales.push({ persona: p.name, necesidades: [...new Set(needs)].slice(0, 7) });

    const st = [];
    if (a.p_expresivo) st.push(`Se describe como ${lc(a.p_expresivo)}`);
    if (a.c_timing) st.push(`prefiere ${lc(a.c_timing)}`);
    if (arr(a.c_desacuerdo).length) st.push(`ante un desacuerdo: ${arr(a.c_desacuerdo).map(lc).join(', ')}`);
    if (st.length) out.estilos_de_comunicacion.push({ persona: p.name, descripcion: st.join('; ') + '.' });

    if (arr(a.e_construir).length) out.expectativas.push({ persona: p.name, texto: `Quiere construir: ${arr(a.e_construir).map(lc).join(', ')}.` });
  }

  // Comparaciones (solo si ambos autorizaron)
  if (people.length === 2) {
    const [A, B] = people; const a = A.answers || {}, b = B.answers || {};

    const amadoA = arr(a.a_amado), amadoB = arr(b.a_amado);
    const common = amadoA.filter((x) => amadoB.includes(x));
    if (common.length) out.fortalezas.push({ texto: `Coinciden en que se sienten queridos con: ${common.map(lc).join(', ')}.`, base: 'Ambos lo eligieron en "qué te hace sentir amado/a".' });
    const onlyA = amadoA.filter((x) => !amadoB.includes(x)), onlyB = amadoB.filter((x) => !amadoA.includes(x));
    if (onlyA.length && onlyB.length) {
      out.diferencias.push({ tema: 'Formas de recibir cariño', tipo: 'diferencia', base: 'Respuestas a "qué acciones te hacen sentir amado/a".',
        descripcion: `${A.name} valora especialmente ${onlyA.slice(0, 3).map(lc).join(', ')}; ${B.name}, ${onlyB.slice(0, 3).map(lc).join(', ')}. Es posible que cada uno demuestre cariño de la forma en que le gusta recibirlo.` });
      out.tags.push('afecto', 'diferencias');
    }

    const diffScale = (k, tema, tag) => {
      if (typeof a[k] === 'number' && typeof b[k] === 'number' && Math.abs(a[k] - b[k]) >= 2) {
        const hi = a[k] > b[k] ? A : B, lo = hi === A ? B : A;
        out.diferencias.push({ tema, tipo: 'diferencia', base: `Escalas de ${A.name} (${a[k]}/5) y ${B.name} (${b[k]}/5).`, descripcion: `Para ${hi.name} tiene más peso que para ${lo.name}.` });
        if (tag) out.tags.push(tag);
      }
    };
    diffScale('a_contacto', 'Importancia del contacto físico', 'intimidad');
    diffScale('a_palabras', 'Importancia de las palabras de afirmación', 'afecto');
    diffScale('e_espacio', 'Necesidad de espacio individual', 'espacio');

    const ini = (x) => /muy importante|bastante/.test(lc(x));
    if (ini(a.a_iniciativa) !== ini(b.a_iniciativa) && a.a_iniciativa && b.a_iniciativa) {
      const who = ini(a.a_iniciativa) ? A : B;
      out.diferencias.push({ tema: 'Iniciativa', tipo: 'hipotesis', base: 'Respuestas sobre la importancia de la iniciativa.',
        descripcion: `Para ${who.name} la iniciativa de su pareja pesa más. Puede ser útil hablar de qué cuenta como "tomar la iniciativa" para cada uno.` });
      out.tags.push('iniciativa');
    }

    const now = (x) => /inmediato|mismo día/.test(lc(x)), wait = (x) => /esperar/.test(lc(x));
    if ((now(a.c_timing) && wait(b.c_timing)) || (wait(a.c_timing) && now(b.c_timing))) {
      out.diferencias.push({ tema: 'Ritmo para resolver problemas', tipo: 'diferencia', base: 'Respuestas a "¿resolver de inmediato o esperar?".',
        descripcion: `${A.name} prefiere ${lc(a.c_timing)} y ${B.name}, ${lc(b.c_timing)}. Ninguna forma es mejor; acordar un ritmo puede evitar que uno se sienta presionado y el otro ignorado.` });
      out.tags.push('ritmo');
    }

    const R = (x) => arr(x).map(lc);
    const pursue = (x) => R(x).some((v) => /insisto/.test(v)), withdraw = (x) => R(x).some((v) => /me alejo|me callo/.test(v));
    if ((pursue(a.d_reaccion) && withdraw(b.d_reaccion)) || (withdraw(a.d_reaccion) && pursue(b.d_reaccion))) {
      out.hipotesis_por_confirmar.push('Cuando discuten, uno podría tender a buscar resolver y el otro a tomar distancia. Si ocurre, puede generar un ciclo en el que ambos se sienten incomprendidos. ¿Lo reconocen?');
      out.tags.push('persecucion', 'conflictos');
    }

    const solo = (x) => /mucho|a veces/.test(lc(x)), company = (x) => /acompañado|casi nunca/.test(lc(x));
    if ((solo(a.p_solo) && company(b.p_solo)) || (company(a.p_solo) && solo(b.p_solo))) {
      out.hipotesis_por_confirmar.push('Ante los problemas, uno parece necesitar más tiempo a solas que el otro. ¿Se interpreta a veces la distancia como rechazo?');
      out.tags.push('espacio');
    }

    const tA = arr(a.r_tension), tB = arr(b.r_tension);
    const tCommon = tA.filter((x) => tB.includes(x));
    tCommon.forEach((t) => out.fuentes_de_conflicto.push({ texto: t, base: 'Ambos lo señalaron como fuente de tensión.' }));
    [...tA.filter((x) => !tB.includes(x)).map((t) => [t, A.name]), ...tB.filter((x) => !tA.includes(x)).map((t) => [t, B.name])]
      .slice(0, 4).forEach(([t, n]) => out.fuentes_de_conflicto.push({ texto: t, base: `Lo señaló ${n}; la otra persona no lo marcó.` }));

    const fA = arr(a.r_funciona), fB = arr(b.r_funciona);
    fA.filter((x) => fB.includes(x)).forEach((f) => out.fortalezas.push({ texto: f, base: 'Ambos lo eligieron como algo que funciona bien.' }));

    if (typeof a.c_escucha === 'number' && typeof b.c_escucha === 'number' && (a.c_escucha <= 2 || b.c_escucha <= 2)) {
      out.hipotesis_por_confirmar.push('Al menos uno de los dos no siempre se siente escuchado. Un ejercicio de escucha podría ayudar a entender por qué.');
      out.tags.push('escucha', 'comunicacion');
    }
    const resolver = [a.r_resolver, b.r_resolver].map(lc);
    if (resolver.some((r) => /varias veces|dejamos pasar/.test(r))) { out.tags.push('conflictos'); out.hipotesis_por_confirmar.push('Algunos temas parecen quedar sin cerrar. Registrarlos en "Conversaciones pendientes" puede ayudar a retomarlos con calma.'); }
  } else {
    out.hipotesis_por_confirmar.push(`Por ahora solo hay respuestas autorizadas de ${people[0].name}. Las comparaciones aparecerán cuando ambos lo autoricen.`);
  }

  const n = out.diferencias.length, f = out.fortalezas.length;
  out.resumen = people.length === 2
    ? `${people[0].name} y ${people[1].name} comparten ${f ? `${f} fortaleza${f > 1 ? 's' : ''} clara${f > 1 ? 's' : ''}` : 'una base sobre la que construir'}${n ? ` y tienen ${n} diferencia${n > 1 ? 's' : ''} que vale la pena entender` : ''}. ${out.objetivos_compartidos.length ? `Quieren trabajar juntos en: ${out.objetivos_compartidos.join(', ').toLowerCase()}.` : ''}`
    : `Perfil parcial basado en las respuestas de ${people[0].name}.`;
  out.tags = [...new Set(out.tags)];
  return out;
}
