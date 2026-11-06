import { esc, icon } from '../ui.js';
import { SAFETY_TEXT } from '../content.js';

export default function (el) {
  el.innerHTML = `<div class="page narrow">
    <div class="page-head"><span class="eyebrow">Seguridad</span><h1>Tu seguridad es lo primero</h1>
      <p>OUR SPACE ayuda a comprender desacuerdos entre dos personas que se respetan. No es un espacio para mediar situaciones de abuso, amenazas, control o violencia.</p></div>
    <section class="card stack">
      <div class="safety"><b>Si estás en peligro ahora</b><p>Llama a los servicios de emergencia de tu país o pide ayuda a alguien cercano.</p></div>
      <p class="prose">${esc(SAFETY_TEXT)}</p>
      <div class="divider"></div>
      <h3>Señales que merecen atención</h3>
      <ul style="padding-left:20px;display:flex;flex-direction:column;gap:6px;color:var(--ink-2)">
        <li>Sientes miedo de la reacción de tu pareja.</li><li>Te controla el teléfono, el dinero, la ropa o con quién te ves.</li>
        <li>Te amenaza, te humilla o te aísla de tu familia y amistades.</li><li>Te presiona para tener relaciones sexuales.</li><li>Hay empujones, golpes o daño a objetos para intimidarte.</li>
      </ul>
      <div class="divider"></div>
      <div class="notice info">${icon('lock')}<p>Tus conversaciones individuales con el asistente son privadas: tu pareja no puede verlas. Si necesitas hablar, usa el modo “A solas”. Si temes que tu pareja acceda a tu teléfono, considera borrar la conversación y cerrar sesión.</p></div>
      <a class="btn" href="#/asistente">Hablar a solas con el asistente</a>
    </section></div>`;
}
