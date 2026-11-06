# OUR SPACE

Un espacio seguro para comprender, cuidar y construir una relación.

## Arquitectura

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | HTML + CSS + JavaScript (módulos ES, sin compilación) | `web/` → Netlify |
| Autenticación | Supabase Auth (correo + contraseña, cuentas individuales) | proyecto `dilex` |
| Base de datos | Postgres con Row Level Security, tablas `os_*` | `supabase/migrations/001_ourspace.sql` |
| Fotos | Supabase Storage, bucket privado `os-photos` con URLs firmadas | misma migración |
| Tiempo real | Supabase Realtime (respeta RLS) | misma migración |
| Asistente IA | Supabase Edge Function `os-assistant` → API de Anthropic | `supabase/functions/os-assistant/index.ts` |

### Modelo de datos
- `os_spaces`: la relación (nombre, tipo, fecha de inicio, código de invitación, perfil).
- `os_members`: las dos personas (máx. 2), con progreso de bienvenida y consentimientos.
- `os_answers`: respuestas de los cuestionarios. **Privadas por defecto** (`shared=false`).
- `os_goals`, `os_checkins`, `os_topics`, `os_agreements`, `os_dates`, `os_plans`, `os_activity_log`.
- `os_journal`: diario (`visibility` = `private` | `shared`), con fotos en Storage.
- `os_conflicts` + `os_conflict_versions`: cada versión es privada salvo que su autor la comparta.
- `os_chats` + `os_messages`: los modos `individual` y `analisis` solo los ve su dueño; `pareja` lo ven ambos.
- `os_memories`: memoria contextual privada o compartida, visible, editable y eliminable.

### Privacidad (impuesta por la base de datos, no por la interfaz)
- Nadie puede leer respuestas, entradas, check-ins, versiones o chats privados de su pareja, ni usando la API directamente.
- El perfil compartido usa solo respuestas de opción/escala de quien dio su consentimiento (`os_profile_inputs`).
- El asistente solo usa las respuestas de una persona si ella activó `ai_use_answers`, con instrucción de no revelarlas.
- Salir del espacio (`os_leave_space`) borra todos los datos privados de esa persona.
- Detección de señales de riesgo (abuso, amenazas, coerción, autolesión) en el navegador y en el servidor: prioriza la seguridad y no fuerza mediación.

## Puesta en marcha

1. **Base de datos**: ✅ ya aplicada en el proyecto `dilex` (archivo `supabase/migrations/001_ourspace.sql`).
2. **Asistente**: ✅ función `os-assistant` ya desplegada. Falta añadir el secreto `ANTHROPIC_API_KEY`
   en Supabase → Edge Functions → Secrets. Opcional: `OS_MODEL` (por defecto `claude-sonnet-5-5`).
   Sin la clave, todo funciona menos las respuestas de IA, y la app lo indica claramente.
3. **Correo de confirmación**: en Supabase → Authentication → URL Configuration, poner la URL de Netlify
   como *Site URL* y añadirla en *Redirect URLs* (para confirmar cuentas y recuperar contraseña).
4. **Publicar**: subir el contenido de `web/` a Netlify (arrastrar la carpeta o el .zip en Deploys).

## Instalarla en el teléfono (como app)
La app es una PWA: no necesita tienda de aplicaciones.
- **iPhone (Safari):** abrir la URL de Netlify → botón Compartir → “Agregar a pantalla de inicio”.
- **Android (Chrome):** abrir la URL → menú ⋮ → “Instalar app” o “Agregar a pantalla principal”.
- **Computadora (Chrome/Edge):** icono de instalar en la barra de direcciones.
Queda con su propio icono y abre a pantalla completa. Las actualizaciones llegan solas al volver a subir la carpeta a Netlify.

## Pruebas
`test/db.mock.js` emula la capa de datos con las mismas reglas de privacidad y `test/e2e.js` recorre
con Playwright el flujo completo de dos personas (registro, invitación, bienvenida, perfil, diario privado,
conflicto con análisis, asistente con memoria y acuerdo aceptado por ambos).
