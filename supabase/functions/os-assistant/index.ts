// =====================================================================
// OUR SPACE · Asistente de acompañamiento (Supabase Edge Function)
// Acciones: status · chat · conflict · profile · activities · delete_account
// La clave de IA vive SOLO aquí, como secreto: ANTHROPIC_API_KEY
// Modelo configurable con el secreto OS_MODEL (por defecto claude-sonnet-5-5)
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("OS_MODEL") || "claude-sonnet-5-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ---------------------------------------------------------------------
// Detección de riesgo (abuso, violencia, coerción, autolesión)
// Es una red de seguridad adicional; el modelo también evalúa el riesgo.
// ---------------------------------------------------------------------
const RISK = [
  /me (pega|golpea|golpe[oó]|empuj[aó]|ahorc[aó]|lastim[aó]|amenaz[aó]|amenaza|forz[oó]|obliga|oblig[oó])/i,
  /(tengo|siento) miedo de (él|el|ella)/i, /me va a (matar|hacer daño|lastimar)/i,
  /me (quiere|quiso) (matar|pegar)/i, /violencia|abus(o|a|ó)|viol[oó]|maltrat/i,
  /no me deja (salir|ver a|trabajar|usar)|me quita el (tel[eé]fono|dinero)|revisa mi tel[eé]fono a la fuerza/i,
  /(quiero|pienso en) (morir|matarme|suicid)|hacerme daño|no quiero vivir|autolesi/i,
  /(le|la|lo) voy a (pegar|matar|hacer daño)/i,
];
const isRisk = (t: string) => RISK.some((r) => r.test(t || ""));

const PRINCIPLES = `
Eres el asistente de acompañamiento de OUR SPACE, un espacio privado para una pareja. Hablas en español, con calidez, calma y madurez emocional. No eres terapeuta ni juez: eres un facilitador de comprensión y comunicación.

Principios innegociables:
1. Nunca asumas que alguien tiene la razón por ser quien escribe o quien inició la conversación.
2. No minimices emociones. Valida lo que se siente sin dar por cierta toda interpretación.
3. Igualdad no es tratar todas las necesidades como idénticas: cada persona puede necesitar cosas distintas.
4. No diagnostiques enfermedades, trastornos ni pongas etiquetas (evitativo, narcisista, dependiente, tóxico, etc.).
5. No fomentes dependencia emocional hacia ti: anima a hablar entre ellos y con su red de apoyo.
6. Nunca recomiendes tolerar faltas de respeto, manipulación, control o violencia.
7. No conviertas la relación en puntuaciones.
8. No reveles información privada de una persona a la otra. Si tienes contexto privado de alguien, úsalo solo para comprender mejor; nunca lo cites, parafrasees de forma reconocible ni lo menciones.
9. Explica brevemente el razonamiento detrás de tus observaciones.
10. Reconoce cuando falta información y haz preguntas en lugar de concluir.
Nunca inventes las intenciones de la pareja ausente. Distingue siempre entre: hechos observables, interpretaciones, emociones, necesidades e hipótesis (y presenta las hipótesis como preguntas o posibilidades, nunca como hechos).
Si en el contexto hay memoria de conversaciones anteriores, puedes señalar similitudes con cuidado ("en otra ocasión mencionaste…, ¿crees que también influye aquí?") sin asumir que las situaciones son iguales.

Seguridad: si aparece cualquier señal de abuso, amenazas, coerción, control, violencia física, sexual o económica, o riesgo de autolesión, prioriza la seguridad de la persona: no propongas mediación conjunta, no pidas "ver las dos versiones", valida, pregunta si está a salvo ahora, sugiere contactar a servicios de emergencia locales o a una línea de ayuda especializada y a personas de confianza. En modo pareja, sugiere continuar en un espacio individual y privado.

Estilo: respuestas claras, humanas y breves (normalmente 80–220 palabras). Usa como mucho una o dos preguntas por respuesta. Sin listas largas salvo que ayuden de verdad. Sin emojis de corazones.`;

const MODES: Record<string, string> = {
  individual: `MODO INDIVIDUAL: una persona te habla en privado. Escucha, refleja lo que entiendes, ayúdale a ordenar sus pensamientos y a identificar lo que siente y necesita. Ayúdale también a considerar la perspectiva de su pareja sin invalidar la suya. Si quiere hablar con su pareja, ayúdale a preparar cómo decirlo de forma clara y no acusatoria.`,
  pareja: `MODO PAREJA: ambas personas participan en esta conversación (cada mensaje indica quién lo escribe). Facilita: da espacio equitativo a ambas perspectivas, resume lo que cada uno dijo antes de avanzar, identifica malentendidos, reformula expresiones agresivas o absolutas ("siempre", "nunca") en mensajes constructivos, nombra necesidades que no se están diciendo con claridad y ayuda a construir acuerdos concretos. Dirígete a cada persona por su nombre cuando corresponda.`,
  analisis: `MODO ANÁLISIS: la persona presenta una situación o conflicto. Analízalo con esta estructura, usando títulos breves en negrita:
1. Qué sucedió (solo hechos observables)
2. Qué interpreta cada persona (lo dicho; lo de la otra persona solo si se sabe, si no, márcalo como desconocido)
3. Qué emociones aparecen
4. Qué necesidades podrían estar involucradas (como hipótesis)
5. En qué puntos coinciden
6. En qué puntos discrepan
7. Qué información falta
8. Qué alternativas saludables existen
Cierra con una pregunta útil. Si solo tienes una perspectiva, dilo explícitamente.`,
};

const OUTPUT_FORMAT = `
Formato de salida OBLIGATORIO:
<respuesta>
(tu respuesta para la persona, en texto con markdown ligero)
</respuesta>
Opcionalmente, después, hasta 2 propuestas de memoria (solo hechos estables y útiles que la persona haya expresado claramente, como preferencias, temas recurrentes, objetivos o avances; nunca diagnósticos ni inferencias psicológicas; nunca detalles de violencia):
<memoria alcance="privada|compartida" tipo="preferencia|tema|objetivo|avance|situacion">texto breve en tercera persona</memoria>
Y si detectas riesgo para la seguridad de alguien añade: <riesgo>sí</riesgo>`;

// ---------------------------------------------------------------------
async function callModel(system: string, messages: { role: string; content: string }[], maxTokens = 1400) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": AI_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`ai_error ${r.status}: ${t.slice(0, 300)}`);
  }
  const d = await r.json();
  return (d.content || []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
}

function parseTagged(text: string) {
  const resp = text.match(/<respuesta>([\s\S]*?)<\/respuesta>/i);
  const reply = (resp ? resp[1] : text.replace(/<memoria[\s\S]*?<\/memoria>|<riesgo>[\s\S]*?<\/riesgo>/gi, "")).trim();
  const memories: { scope: string; kind: string; content: string }[] = [];
  for (const m of text.matchAll(/<memoria([^>]*)>([\s\S]*?)<\/memoria>/gi)) {
    const attrs = m[1];
    const scope = /alcance="compartida"/i.test(attrs) ? "shared" : "private";
    const kind = (attrs.match(/tipo="(\w+)"/i)?.[1] || "preferencia").toLowerCase();
    const content = m[2].trim();
    if (content) memories.push({ scope, kind: ["preferencia", "tema", "objetivo", "avance", "situacion"].includes(kind) ? kind : "preferencia", content: content.slice(0, 400) });
  }
  const risk = /<riesgo>\s*s[ií]/i.test(text);
  return { reply, memories: memories.slice(0, 2), risk };
}

function parseJSON(text: string) {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < 0) return null;
  try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; }
}

// ---------------------------------------------------------------------
// Contexto autorizado de la pareja
// ---------------------------------------------------------------------
async function buildContext(admin: any, spaceId: string, userId: string, opts: { includeMyPrivate: boolean }) {
  const [{ data: space }, { data: members }, { data: goals }, { data: agreements }, { data: topics }, { data: conflicts }] = await Promise.all([
    admin.from("os_spaces").select("name,relationship_type,start_date,profile").eq("id", spaceId).single(),
    admin.from("os_members").select("user_id,display_name,age,settings").eq("space_id", spaceId),
    admin.from("os_goals").select("user_id,goal").eq("space_id", spaceId),
    admin.from("os_agreements").select("title,description,status").eq("space_id", spaceId).in("status", ["activo", "revision", "ajustar"]).limit(12),
    admin.from("os_topics").select("title,status").eq("space_id", spaceId).neq("status", "resuelto").limit(12),
    admin.from("os_conflicts").select("title,analysis,status").eq("space_id", spaceId).not("analysis", "is", null).order("analysis_at", { ascending: false }).limit(4),
  ]);
  const me = (members || []).find((m: any) => m.user_id === userId);
  const partner = (members || []).find((m: any) => m.user_id !== userId);
  const name = (id: string) => (members || []).find((m: any) => m.user_id === id)?.display_name || "—";

  const lines: string[] = [];
  lines.push(`Pareja: ${me?.display_name || "?"}${partner ? " y " + partner.display_name : " (la pareja aún no se ha unido)"}. Tipo de relación: ${space?.relationship_type || "no indicado"}. Juntos desde: ${space?.start_date || "no indicado"}.`);
  if (goals?.length) lines.push(`Objetivos elegidos: ${goals.map((g: any) => `${name(g.user_id)} → ${g.goal}`).join("; ")}.`);
  if (agreements?.length) lines.push(`Acuerdos vigentes: ${agreements.map((a: any) => `"${a.title}" (${a.status})`).join("; ")}.`);
  if (topics?.length) lines.push(`Conversaciones pendientes: ${topics.map((t: any) => t.title).join("; ")}.`);
  if (space?.profile?.resumen) lines.push(`Perfil inicial de la relación (resumen): ${String(space.profile.resumen).slice(0, 800)}`);
  if (conflicts?.length) lines.push(`Situaciones analizadas antes: ${conflicts.map((c: any) => `"${c.title}": ${String(c.analysis?.resumen || "").slice(0, 240)}`).join(" | ")}`);

  // memoria compartida + memoria privada propia (si la persona la tiene activa)
  const memEnabled = me?.settings?.memory_enabled !== false;
  if (memEnabled) {
    const { data: mems } = await admin.from("os_memories").select("scope,kind,content,owner_id").eq("space_id", spaceId)
      .or(`scope.eq.shared,owner_id.eq.${userId}`).order("updated_at", { ascending: false }).limit(40);
    const shared = (mems || []).filter((m: any) => m.scope === "shared");
    const mine = (mems || []).filter((m: any) => m.scope === "private" && m.owner_id === userId);
    if (shared.length) lines.push(`Memoria compartida de la pareja:\n- ${shared.map((m: any) => `[${m.kind}] ${m.content}`).join("\n- ")}`);
    if (mine.length && opts.includeMyPrivate) lines.push(`Memoria privada de ${me?.display_name}:\n- ${mine.map((m: any) => `[${m.kind}] ${m.content}`).join("\n- ")}`);
  }

  // respuestas: las propias (si la persona autorizó uso por IA) y las de la pareja SOLO con su consentimiento
  const ans = async (uid: string) => {
    const { data } = await admin.from("os_answers").select("qkey,section,value").eq("space_id", spaceId).eq("user_id", uid);
    return (data || []).map((a: any) => `${a.qkey}: ${Array.isArray(a.value) ? a.value.join(", ") : a.value}`).join("\n");
  };
  if (me?.settings?.ai_use_answers && opts.includeMyPrivate) {
    const t = await ans(userId);
    if (t) lines.push(`Respuestas de ${me.display_name} en su cuestionario (suyas):\n${t.slice(0, 3500)}`);
  }
  if (partner?.settings?.ai_use_answers) {
    const t = await ans(partner.user_id);
    if (t) lines.push(`CONTEXTO CONFIDENCIAL de ${partner.display_name} (autorizó su uso para comprender, NO para revelarlo; nunca lo cites ni lo menciones):\n${t.slice(0, 3500)}`);
  }
  return { text: lines.join("\n\n"), me, partner, members: members || [], name };
}

// ---------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "not_authenticated" }, 401);
  const admin = createClient(SB_URL, SB_SERVICE);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const action = body.action;

  if (action === "status") return json({ ai: !!AI_KEY, model: AI_KEY ? MODEL : null });

  if (action === "delete_account") {
    const { data: mships } = await admin.from("os_members").select("space_id").eq("user_id", user.id);
    for (const m of mships || []) await userClient.rpc("os_leave_space", { p_space: m.space_id });
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return json({ error: "delete_failed" }, 500);
    return json({ ok: true });
  }

  const spaceId = body.space_id;
  const { data: mem } = await admin.from("os_members").select("user_id").eq("space_id", spaceId).eq("user_id", user.id).maybeSingle();
  if (!mem) return json({ error: "not_member" }, 403);
  if (!AI_KEY) return json({ error: "ai_not_configured" });

  try {
    // ---------------- CHAT ----------------
    if (action === "chat") {
      const { data: chat } = await admin.from("os_chats").select("*").eq("id", body.chat_id).eq("space_id", spaceId).single();
      if (!chat || (chat.mode !== "pareja" && chat.owner_id !== user.id)) return json({ error: "forbidden" }, 403);
      const text = String(body.message || "").trim().slice(0, 6000);
      if (!text && !body.guide_only) return json({ error: "empty" }, 400);
      const risk = isRisk(text);

      if (text) {
        const { error } = await userClient.from("os_messages").insert({ chat_id: chat.id, space_id: spaceId, author_id: user.id, role: "user", content: text, meta: risk ? { risk: true } : {} });
        if (error) return json({ error: "insert_failed" }, 500);
      }
      if (chat.mode === "pareja" && body.no_reply) return json({ ok: true });

      const ctx = await buildContext(admin, spaceId, user.id, { includeMyPrivate: chat.mode !== "pareja" });
      const { data: hist } = await admin.from("os_messages").select("role,content,author_id,created_at").eq("chat_id", chat.id).order("created_at", { ascending: false }).limit(40);
      const msgs: { role: string; content: string }[] = [];
      for (const m of (hist || []).reverse()) {
        const role = m.role === "assistant" ? "assistant" : "user";
        const content = role === "user" && chat.mode === "pareja" ? `[${ctx.name(m.author_id)}]: ${m.content}` : m.content;
        if (msgs.length && msgs[msgs.length - 1].role === role) msgs[msgs.length - 1].content += "\n\n" + content;
        else msgs.push({ role, content });
      }
      while (msgs.length && msgs[0].role !== "user") msgs.shift();
      if (!msgs.length) return json({ error: "empty" }, 400);

      const system = `${PRINCIPLES}\n\n${MODES[chat.mode] || MODES.individual}\n\nPersona que escribe ahora: ${ctx.me?.display_name}.${
        risk ? "\n\nALERTA: el último mensaje contiene posibles señales de riesgo. Prioriza la seguridad según las indicaciones." : ""}\n\nCONTEXTO DE LA PAREJA:\n${ctx.text}\n${OUTPUT_FORMAT}`;
      const out = parseTagged(await callModel(system, msgs));
      const flagged = risk || out.risk;
      const { data: saved } = await admin.from("os_messages").insert({
        chat_id: chat.id, space_id: spaceId, author_id: null, role: "assistant", content: out.reply,
        meta: { memory_suggestions: out.memories, risk: flagged, for_user: user.id },
      }).select().single();
      await admin.from("os_chats").update({ updated_at: new Date().toISOString() }).eq("id", chat.id);
      return json({ ok: true, message: saved, risk: flagged });
    }

    // ---------------- CONFLICTO ----------------
    if (action === "conflict") {
      const { data: conflict } = await admin.from("os_conflicts").select("*").eq("id", body.conflict_id).eq("space_id", spaceId).single();
      if (!conflict) return json({ error: "not_found" }, 404);
      const { data: versions } = await admin.from("os_conflict_versions").select("*").eq("conflict_id", conflict.id).eq("submitted", true).eq("allow_analysis", true);
      if (!versions?.length) return json({ error: "no_versions" }, 400);
      const ctx = await buildContext(admin, spaceId, user.id, { includeMyPrivate: false });
      const anyRisk = versions.some((v: any) => isRisk([v.what_happened, v.interpretation, v.feelings, v.needs, v.wish].join(" ")));
      const vtext = versions.map((v: any) => `### Versión de ${ctx.name(v.user_id)} (${v.shared ? "compartida con la pareja" : "privada: no la cites textualmente"})
- Qué pasó: ${v.what_happened || "—"}
- Cómo lo interpretó: ${v.interpretation || "—"}
- Qué sintió: ${v.feelings || "—"}
- Qué necesita: ${v.needs || "—"}
- Qué le gustaría: ${v.wish || "—"}`).join("\n\n");
      const system = `${PRINCIPLES}

Tarea: análisis comparativo de una situación difícil titulada "${conflict.title}". ${versions.length < 2 ? "Solo hay UNA perspectiva disponible: dilo explícitamente y no supongas la de la otra persona." : "Hay dos perspectivas."}
No decidas quién tiene la razón. Explora, por ejemplo, si hay diferencias en cómo cada uno expresa y recibe algo, si hay una desigualdad real, o si ambas cosas ocurren. No minimices ninguna necesidad.
El análisis será visible para AMBAS personas: escribe con respeto, sin citar textualmente las versiones privadas.${anyRisk ? "\nATENCIÓN: hay señales de posible riesgo. Pon 'riesgo': true, no propongas mediación conjunta y prioriza la seguridad en 'nota_seguridad'." : ""}

CONTEXTO DE LA PAREJA:
${ctx.text}

Responde SOLO con un JSON válido con esta forma (textos en español, listas de 0 a 5 elementos cortos):
{"resumen":"", "hechos_observables":[], "perspectivas":[{"persona":"","interpretacion":"","emociones":[],"necesidades":[]}], "coincidencias":[], "diferencias_de_percepcion":[], "posibles_malentendidos":[], "necesidades_emocionales":[], "expectativas_no_comunicadas":[], "comportamientos_que_podrian_ajustarse":[], "posibles_soluciones":[], "informacion_faltante":[], "hipotesis_por_confirmar":[], "preguntas_para_conversar":[], "razonamiento":"", "riesgo":false, "nota_seguridad":""}`;
      const raw = await callModel(system, [{ role: "user", content: vtext }], 2500);
      const analysis = parseJSON(raw) || { resumen: raw.slice(0, 4000), razonamiento: "No se pudo estructurar el análisis." };
      analysis.perspectivas_incluidas = versions.length;
      analysis.riesgo = !!(analysis.riesgo || anyRisk);
      await admin.from("os_conflicts").update({ analysis, analysis_at: new Date().toISOString(), status: "analizado" }).eq("id", conflict.id);
      return json({ ok: true, analysis });
    }

    // ---------------- PERFIL ----------------
    if (action === "profile") {
      const ctx = await buildContext(admin, spaceId, user.id, { includeMyPrivate: false });
      const { data: members } = await admin.from("os_members").select("user_id,display_name,settings").eq("space_id", spaceId);
      const parts: string[] = [];
      for (const m of members || []) {
        if (!m.settings?.ai_use_answers) { parts.push(`${m.display_name}: no autorizó el uso de sus respuestas.`); continue; }
        const { data } = await admin.from("os_answers").select("qkey,value").eq("space_id", spaceId).eq("user_id", m.user_id);
        parts.push(`### ${m.display_name}\n${(data || []).map((a: any) => `${a.qkey}: ${Array.isArray(a.value) ? a.value.join(", ") : a.value}`).join("\n")}`);
      }
      const system = `${PRINCIPLES}

Tarea: generar el perfil inicial de la relación a partir de las respuestas AUTORIZADAS. El perfil será visible para ambos: no cites respuestas textualmente, resume con respeto. No diagnostiques ni etiquetes. Marca como hipótesis lo que no esté confirmado. Si falta información de alguien, dilo.

CONTEXTO:
${ctx.text}

Responde SOLO con JSON válido:
{"resumen":"", "fortalezas":[{"texto":"","base":""}], "necesidades_individuales":[{"persona":"","necesidades":[]}], "diferencias":[{"tema":"","descripcion":"","tipo":"diferencia|hipotesis","base":""}], "estilos_de_comunicacion":[{"persona":"","descripcion":""}], "fuentes_de_conflicto":[{"texto":"","base":""}], "expectativas":[{"persona":"","texto":""}], "objetivos_compartidos":[], "hipotesis_por_confirmar":[], "sugerencias":[], "razonamiento":""}`;
      const raw = await callModel(system, [{ role: "user", content: parts.join("\n\n") || "Sin respuestas autorizadas." }], 2500);
      const profile = parseJSON(raw);
      if (!profile) return json({ error: "parse_failed" }, 500);
      profile.source = "ia";
      profile.generated_at = new Date().toISOString();
      await admin.from("os_spaces").update({ profile, profile_updated_at: new Date().toISOString() }).eq("id", spaceId);
      return json({ ok: true, profile });
    }

    // ---------------- ACTIVIDADES ----------------
    if (action === "activities") {
      const ctx = await buildContext(admin, spaceId, user.id, { includeMyPrivate: false });
      const { data: done } = await admin.from("os_activity_log").select("title,status").eq("space_id", spaceId).limit(40);
      const system = `${PRINCIPLES}

Tarea: proponer 3 actividades para conectar, adaptadas a ESTA pareja (sus objetivos, diferencias, temas pendientes y acuerdos). Evita actividades genéricas o ya hechas: ${(done || []).map((d: any) => d.title).join("; ") || "ninguna"}.
Cada actividad debe explicar por qué encaja con ellos, sin revelar información privada.

CONTEXTO:
${ctx.text}

Responde SOLO con JSON válido:
{"actividades":[{"titulo":"","tipo":"preguntas|conversacion|gratitud|escucha|reconexion|futuro|necesidades","duracion":"","por_que":"","pasos":[],"preguntas":[]}]}`;
      const raw = await callModel(system, [{ role: "user", content: "Propón las actividades." }], 2000);
      const out = parseJSON(raw);
      const acts = (out?.actividades || []).slice(0, 3);
      const rows = acts.map((a: any) => ({ space_id: spaceId, created_by: user.id, activity_key: "ia", title: String(a.titulo || "Actividad").slice(0, 120), payload: a, status: "sugerida" }));
      if (rows.length) await admin.from("os_activity_log").insert(rows);
      return json({ ok: true, activities: acts });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "ai_failed", detail: String((e as Error).message || e).slice(0, 300) }, 502);
  }
});
