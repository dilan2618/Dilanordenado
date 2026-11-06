// Componentes de presentación compartidos: perfil y análisis
import { esc, icon, fmtDT } from './ui.js';

const li = (x) => `<li>${esc(typeof x === 'string' ? x : x?.texto || x?.descripcion || '')}${x?.base ? `<span class="base">${esc(x.base)}</span>` : ''}</li>`;
const sec = (title, ic, inner, extra = '') => (inner ? `<div class="an-sec">${title ? `<h4>${icon(ic)}${esc(title)} ${extra}</h4>` : ''}${inner}</div>` : '');
const ul = (a) => (Array.isArray(a) && a.length ? `<ul>${a.map(li).join('')}</ul>` : '');
const TAG = { h: '<span class="kind-tag h">hipótesis</span>', f: '<span class="kind-tag f">hecho</span>', d: '<span class="kind-tag d">diferencia</span>' };

export function renderProfile(p) {
  if (!p) return '<div class="empty"><b>Aún no hay perfil</b>Se genera al terminar la bienvenida, con las respuestas que cada uno autorice.</div>';
  return `
    <div class="legend" style="margin-bottom:6px">${TAG.d} ${TAG.h}<span>· ${p.source === 'ia' ? 'Generado por el asistente' : 'Calculado con reglas transparentes'}${p.generated_at ? ' · ' + fmtDT(p.generated_at) : ''}</span></div>
    ${sec('', '', p.resumen ? `<p class="prose" style="font-family:var(--serif);font-size:1.12rem">${esc(p.resumen)}</p>` : '')}
    ${sec('Fortalezas', 'leaf', ul(p.fortalezas))}
    ${sec('Objetivos compartidos', 'target', ul(p.objetivos_compartidos))}
    ${sec('Necesidades de cada uno', 'sparkle', (p.necesidades_individuales || []).map((n) => `<p style="margin-bottom:6px"><b>${esc(n.persona)}:</b> ${esc((n.necesidades || []).join(', ') || '—')}</p>`).join(''))}
    ${sec('Diferencias a comprender', 'compass', (p.diferencias || []).length ? `<ul>${p.diferencias.map((d) => `<li><b>${esc(d.tema || '')}</b> ${d.tipo === 'hipotesis' ? TAG.h : TAG.d}<br/>${esc(d.descripcion || '')}${d.base ? `<span class="base">${esc(d.base)}</span>` : ''}</li>`).join('')}</ul>` : '')}
    ${sec('Estilos de comunicación', 'message', (p.estilos_de_comunicacion || []).map((n) => `<p style="margin-bottom:6px"><b>${esc(n.persona)}:</b> ${esc(n.descripcion)}</p>`).join(''))}
    ${sec('Fuentes frecuentes de tensión', 'wave', ul(p.fuentes_de_conflicto))}
    ${sec('Expectativas', 'anchor', (p.expectativas || []).map((n) => `<p style="margin-bottom:6px"><b>${esc(n.persona)}:</b> ${esc(n.texto)}</p>`).join(''))}
    ${sec('Hipótesis para confirmar juntos', 'info', ul(p.hipotesis_por_confirmar), TAG.h)}
    ${sec('Sugerencias', 'compass', ul(p.sugerencias))}
    ${p.pendientes?.length ? `<div class="notice info" style="margin-top:14px">${icon('lock')}<p>${esc(p.pendientes.join(' y '))} aún no autorizó usar sus respuestas para el perfil.</p></div>` : ''}
    ${p.razonamiento ? `<details style="margin-top:14px"><summary class="link" style="cursor:pointer">¿Cómo se construyó este perfil?</summary><p class="small" style="margin-top:8px">${esc(p.razonamiento)}</p></details>` : ''}`;
}

export function renderAnalysis(a) {
  if (!a) return '';
  const persp = (a.perspectivas || []).map((p) => `<div class="card flat" style="padding:14px 16px;margin-bottom:8px"><b>${esc(p.persona)}</b>
    ${p.interpretacion ? `<p class="small" style="margin-top:4px"><span class="muted">Interpreta:</span> ${esc(p.interpretacion)}</p>` : ''}
    ${(p.emociones || []).length ? `<p class="small"><span class="muted">Emociones:</span> ${esc(p.emociones.join(', '))}</p>` : ''}
    ${(p.necesidades || []).length ? `<p class="small"><span class="muted">Posibles necesidades:</span> ${esc(p.necesidades.join(', '))}</p>` : ''}</div>`).join('');
  return `
    ${a.riesgo ? `<div class="safety" style="margin-bottom:14px"><b>Primero, la seguridad</b><p>${esc(a.nota_seguridad || 'Hay señales que podrían indicar riesgo. Este no es un espacio para mediar esa situación.')}</p><a class="link" href="#/seguridad">Ver recursos de ayuda →</a></div>` : ''}
    ${a.perspectivas_incluidas === 1 ? `<div class="notice info" style="margin-bottom:12px">${icon('info')}<p>Este análisis se basa en <b>una sola perspectiva</b>. Falta la otra mirada para comprender la situación completa.</p></div>` : ''}
    <div class="legend">${TAG.f} ${TAG.d} ${TAG.h}</div>
    ${sec('', '', a.resumen ? `<p class="prose" style="font-family:var(--serif);font-size:1.1rem">${esc(a.resumen)}</p>` : '')}
    ${sec('Hechos observables', 'eye', ul(a.hechos_observables), TAG.f)}
    ${sec('Cada perspectiva', 'users', persp)}
    ${sec('Puntos de coincidencia', 'check', ul(a.coincidencias))}
    ${sec('Diferencias de percepción', 'compass', ul(a.diferencias_de_percepcion), TAG.d)}
    ${sec('Posibles malentendidos', 'info', ul(a.posibles_malentendidos), TAG.h)}
    ${sec('Necesidades emocionales', 'sparkle', ul(a.necesidades_emocionales))}
    ${sec('Expectativas no comunicadas', 'message', ul(a.expectativas_no_comunicadas), TAG.h)}
    ${sec('Comportamientos que podrían ajustarse', 'refresh', ul(a.comportamientos_que_podrian_ajustarse))}
    ${sec('Posibles soluciones', 'leaf', ul(a.posibles_soluciones))}
    ${sec('Información que falta', 'alert', ul(a.informacion_faltante))}
    ${sec('Hipótesis por confirmar', 'info', ul(a.hipotesis_por_confirmar), TAG.h)}
    ${sec('Para conversar', 'chat', ul(a.preguntas_para_conversar))}
    ${a.razonamiento ? `<details style="margin-top:12px"><summary class="link" style="cursor:pointer">Razonamiento del análisis</summary><p class="small" style="margin-top:8px">${esc(a.razonamiento)}</p></details>` : ''}`;
}
