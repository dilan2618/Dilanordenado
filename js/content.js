// =====================================================================
// Contenido: cuestionarios, objetivos, estados, actividades
// =====================================================================
const SCALE = (lo, hi) => ({ type: 'scale', ends: [lo, hi] });

export const SECTIONS = [
  { key: 'personalidad', stage: 'individual', title: 'Cómo eres', icon: 'user',
    intro: 'Empecemos por ti. No hay respuestas correctas: se trata de entender cómo funcionas.' },
  { key: 'afecto', stage: 'individual', title: 'Cómo te sientes querido/a', icon: 'sparkle',
    intro: 'Cada persona recibe el cariño de una forma distinta. Hablemos de la tuya.' },
  { key: 'comunicacion', stage: 'individual', title: 'Cómo te comunicas', icon: 'message',
    intro: 'Ahora, sobre cómo hablas, escuchas y pides lo que necesitas.' },
  { key: 'conflictos', stage: 'individual', title: 'Cuando hay desacuerdos', icon: 'wave',
    intro: 'Todas las parejas discuten. Lo importante es entender qué te pasa a ti cuando ocurre.' },
  { key: 'expectativas', stage: 'individual', title: 'Lo que esperas', icon: 'compass',
    intro: 'Para terminar esta parte: qué significa para ti una relación y qué quieres construir.' },
  { key: 'relacion', stage: 'relacion', title: 'Nuestra dinámica', icon: 'link',
    intro: 'Ahora sobre la relación. Cada uno responde desde su propia mirada; luego podrán compararlo si ambos lo autorizan.' },
];

export const QUESTIONS = [
  // A. Personalidad
  { key: 'p_describe', section: 'personalidad', type: 'text', text: '¿Cómo describirías tu personalidad?', hint: 'Unas pocas palabras o frases bastan.' },
  { key: 'p_expresivo', section: 'personalidad', type: 'single', text: '¿Eres una persona expresiva o reservada?',
    options: ['Muy expresiva', 'Más bien expresiva', 'Depende del momento', 'Más bien reservada', 'Muy reservada'] },
  { key: 'p_molestia', section: 'personalidad', type: 'multi', text: '¿Cómo reaccionas cuando algo te molesta?', hint: 'Elige todas las que apliquen.',
    options: ['Lo digo enseguida', 'Lo pienso antes de decirlo', 'Me cierro', 'Lo acumulo hasta que explota', 'Uso el humor', 'Me alejo un rato', 'Cambio de actitud sin decir por qué'] },
  { key: 'p_expresar', section: 'personalidad', ...SCALE('Nada', 'Muchísimo'), text: '¿Cuánto te cuesta expresar lo que sientes?' },
  { key: 'p_solo', section: 'personalidad', type: 'single', text: '¿Necesitas tiempo a solas cuando tienes problemas?',
    options: ['Sí, mucho', 'A veces', 'Casi nunca', 'Prefiero estar acompañado/a'] },
  { key: 'p_criticas', section: 'personalidad', type: 'multi', text: '¿Cómo reaccionas ante las críticas?',
    options: ['Escucho y reflexiono', 'Me defiendo', 'Me duele aunque no lo diga', 'Depende mucho del tono', 'Me cuesta aceptarlas', 'Las agradezco si son concretas'] },

  // B. Necesidades afectivas
  { key: 'a_amado', section: 'afecto', type: 'multi', text: '¿Qué acciones te hacen sentir amado/a?', hint: 'Elige las que más pesan para ti.',
    options: ['Palabras de cariño', 'Tiempo de calidad', 'Contacto físico', 'Detalles y sorpresas', 'Ayuda en lo práctico', 'Que tome la iniciativa', 'Que me escuche de verdad', 'Que me incluya en sus planes', 'Sentirme elegido/a frente a otros'] },
  { key: 'a_contacto', section: 'afecto', ...SCALE('Poco importante', 'Esencial'), text: '¿Qué importancia tiene para ti el contacto físico?' },
  { key: 'a_palabras', section: 'afecto', ...SCALE('Poco importante', 'Esencial'), text: '¿Qué importancia tienen para ti las palabras de afirmación?' },
  { key: 'a_iniciativa', section: 'afecto', type: 'single', text: '¿Necesitas que tu pareja tome la iniciativa?',
    options: ['Es muy importante para mí', 'Me importa bastante', 'Me da igual quién la tome', 'Prefiero tomarla yo'] },
  { key: 'a_cambios', section: 'afecto', type: 'single', text: 'Cuando tu pareja cambia su comportamiento, ¿cómo lo interpretas?',
    options: ['Pregunto directamente qué pasa', 'Me preocupo pero espero', 'Pienso que hice algo mal', 'Le doy espacio', 'Casi no lo noto'] },
  { key: 'a_inseguro', section: 'afecto', type: 'multi', text: '¿Qué situaciones te hacen sentir inseguro/a emocionalmente?',
    options: ['Distancia o frialdad', 'Que tarde en responder', 'Secretos o evasivas', 'Poco tiempo juntos', 'Críticas frecuentes', 'Comparaciones', 'Planes en los que no me incluye', 'Cambios de humor sin explicación'] },
  { key: 'a_triste', section: 'afecto', type: 'multi', text: '¿Qué necesitas cuando estás triste?',
    options: ['Un abrazo', 'Que me escuche sin dar consejos', 'Consejos prácticos', 'Espacio', 'Distraerme', 'Que me pregunte qué necesito'] },
  { key: 'a_extra', section: 'afecto', type: 'text', optional: true, text: '¿Algo más sobre cómo te gusta recibir cariño?', hint: 'Opcional.' },

  // C. Comunicación
  { key: 'c_timing', section: 'comunicacion', type: 'single', text: '¿Prefieres resolver los problemas inmediatamente o esperar?',
    options: ['Resolverlos de inmediato', 'El mismo día, cuando estemos más calmados', 'Esperar uno o dos días', 'Depende del tema'] },
  { key: 'c_desacuerdo', section: 'comunicacion', type: 'multi', text: '¿Cómo expresas el desacuerdo?',
    options: ['Lo digo directamente', 'Con calma y cuidado', 'Subo el tono', 'Me quedo callado/a', 'Con ironía o sarcasmo', 'Me expreso mejor por escrito'] },
  { key: 'c_escucha', section: 'comunicacion', ...SCALE('Casi nunca', 'Casi siempre'), text: '¿Sientes que tu pareja te escucha?' },
  { key: 'c_explicar', section: 'comunicacion', ...SCALE('Nada', 'Muchísimo'), text: '¿Cuánto te cuesta explicar lo que necesitas?' },
  { key: 'c_afecta', section: 'comunicacion', type: 'text', text: '¿Qué comportamiento durante una discusión te afecta más?', hint: 'Por ejemplo: que me interrumpan, el silencio, los gritos, que se vaya…' },

  // D. Conflictos
  { key: 'd_reaccion', section: 'conflictos', type: 'multi', text: '¿Cómo reaccionas cuando discutes?', hint: 'Sé honesto/a contigo: solo tú ves esto.',
    options: ['Me defiendo', 'Me callo', 'Insisto hasta resolverlo', 'Me alejo', 'Intento entender al otro', 'Cedo para que termine', 'Me cuesta controlar el enojo', 'Lloro o me bloqueo'] },
  { key: 'd_reconciliar', section: 'conflictos', type: 'multi', text: '¿Qué necesitas para reconciliarte?',
    options: ['Una disculpa', 'Un abrazo o contacto', 'Hablarlo a fondo', 'Tiempo', 'Un gesto concreto', 'Entender qué pasó', 'Saber que no se repetirá'] },
  { key: 'd_disculpa', section: 'conflictos', type: 'text', text: '¿Qué consideras una disculpa sincera?' },
  { key: 'd_limites', section: 'conflictos', type: 'text', text: '¿Qué comportamientos no estás dispuesto/a a aceptar?' },

  // E. Expectativas
  { key: 'e_relacion', section: 'expectativas', type: 'text', text: '¿Qué esperas de una relación?' },
  { key: 'e_compromiso', section: 'expectativas', type: 'text', text: '¿Qué significa para ti el compromiso?' },
  { key: 'e_fidelidad', section: 'expectativas', type: 'text', text: '¿Qué consideras fidelidad?' },
  { key: 'e_espacio', section: 'expectativas', ...SCALE('Poco', 'Mucho'), text: '¿Cuánto espacio individual necesitas?' },
  { key: 'e_construir', section: 'expectativas', type: 'multi', text: '¿Qué quieres construir con tu pareja?',
    options: ['Un hogar', 'Una familia', 'Viajes y experiencias', 'Proyectos en común', 'Crecimiento personal', 'Estabilidad', 'Aventura', 'Libertad compartida'] },

  // Etapa 3. Relación
  { key: 'r_funciona', section: 'relacion', type: 'multi', text: '¿Qué sientes que funciona bien entre ustedes?',
    options: ['La comunicación', 'El humor', 'El apoyo mutuo', 'La intimidad', 'La confianza', 'Los proyectos', 'El tiempo juntos', 'El respeto', 'La admiración'] },
  { key: 'r_problema', section: 'relacion', type: 'text', text: '¿Cuál es el problema que más se repite?' },
  { key: 'r_cambiado', section: 'relacion', type: 'text', text: '¿Qué sientes que ha cambiado desde que comenzaron?' },
  { key: 'r_tension', section: 'relacion', type: 'multi', text: '¿Qué situaciones generan mayor tensión?',
    options: ['Tiempo juntos', 'Dinero', 'Familia', 'Celos o confianza', 'Tareas y responsabilidades', 'Forma de comunicarnos', 'Intimidad', 'Redes sociales', 'Planes de futuro', 'Trabajo o estudios', 'Amistades'] },
  { key: 'r_resolver', section: 'relacion', type: 'single', text: '¿Cómo suelen resolver sus diferencias?',
    options: ['Lo hablamos y llegamos a acuerdos', 'Normalmente uno de los dos cede', 'Lo dejamos pasar sin hablarlo', 'Discutimos varias veces lo mismo', 'Depende del tema'] },
  { key: 'r_mejorar', section: 'relacion', type: 'text', text: '¿Qué te gustaría mejorar?' },
  { key: 'r_no_comprendo', section: 'relacion', type: 'text', text: '¿Qué sientes que no estás comprendiendo de tu pareja?', hint: 'También vale: "qué siento que no comprende de mí".' },
  { key: 'r_experiencias', section: 'relacion', type: 'text', optional: true, text: '¿Qué experiencias importantes han vivido juntos?', hint: 'Opcional. Luego podrás guardarlas con fotos en el diario.' },
];

export const GOALS = [
  { key: 'comunicacion', label: 'Mejorar la comunicación', icon: 'message' },
  { key: 'conexion', label: 'Recuperar la conexión emocional', icon: 'link' },
  { key: 'confianza', label: 'Aumentar la confianza', icon: 'shield' },
  { key: 'conflictos', label: 'Resolver conflictos recurrentes', icon: 'wave' },
  { key: 'intimidad', label: 'Mejorar la intimidad', icon: 'flame' },
  { key: 'diferencias', label: 'Comprender nuestras diferencias', icon: 'compass' },
  { key: 'compromiso', label: 'Fortalecer el compromiso', icon: 'anchor' },
  { key: 'necesidades', label: 'Aprender a expresar necesidades', icon: 'sparkle' },
  { key: 'habitos', label: 'Construir hábitos saludables', icon: 'leaf' },
];

export const REL_TYPES = ['Noviazgo', 'Convivencia', 'Matrimonio', 'Relación a distancia', 'Unión libre', 'Otra'];

export const MOODS = [
  { key: 'calma', label: 'En calma' }, { key: 'cercania', label: 'Cercano/a' }, { key: 'gratitud', label: 'Agradecido/a' },
  { key: 'ganas', label: 'Con ganas de vernos' }, { key: 'cansancio', label: 'Cansado/a' }, { key: 'distancia', label: 'Algo distante' },
  { key: 'preocupacion', label: 'Preocupado/a' }, { key: 'hablar', label: 'Necesito hablar' }, { key: 'espacio', label: 'Necesito espacio' },
];

export const J_KINDS = {
  momento: { label: 'Momento especial', icon: 'sparkle' },
  recuerdo: { label: 'Recuerdo', icon: 'image' },
  experiencia: { label: 'Experiencia', icon: 'compass' },
  pensamiento: { label: 'Pensamiento', icon: 'feather' },
  gratitud: { label: 'Gratitud', icon: 'leaf' },
  superado: { label: 'Lo superamos', icon: 'anchor' },
  carta: { label: 'Carta', icon: 'mail' },
};

export const AGREEMENT_STATUS = {
  propuesto: { label: 'Propuesto', cls: 'warn' }, activo: { label: 'Activo', cls: 'ok' }, revision: { label: 'En revisión', cls: 'terra' },
  cumplido: { label: 'Integrado', cls: 'wine' }, ajustar: { label: 'Por ajustar', cls: 'terra' }, pausado: { label: 'En pausa', cls: '' },
};

export const MEM_KINDS = { preferencia: 'Preferencia', tema: 'Tema recurrente', objetivo: 'Objetivo', avance: 'Avance', acuerdo: 'Acuerdo', situacion: 'Situación analizada' };

export const FEELINGS = ['Triste', 'Enojado/a', 'Frustrado/a', 'Herido/a', 'Ignorado/a', 'Ansioso/a', 'Confundido/a', 'Decepcionado/a', 'Culpable', 'Cansado/a', 'Solo/a', 'Asustado/a'];

// ---------------------------------------------------------------------
// Biblioteca de actividades (se ordenan según objetivos y perfil)
// tags: objetivos + señales del perfil (ritmo, afecto, iniciativa, espacio, escucha, persecucion)
// ---------------------------------------------------------------------
export const ACTIVITIES = [
  { key: 'mapa-afecto', type: 'necesidades', title: 'Nuestro mapa del cariño', duration: '30 min', tags: ['diferencias', 'necesidades', 'conexion', 'afecto', 'iniciativa'],
    why: 'Ayuda a ver si el cariño que uno da es el que el otro necesita recibir.',
    steps: ['Cada uno escribe, por separado, 5 gestos concretos que le hacen sentir querido/a (cuanto más específicos, mejor).', 'Escribe también 3 gestos que tú haces para demostrar cariño.', 'Intercambien las listas y lean en silencio.', 'Comenten: ¿qué les sorprendió?, ¿qué gestos de cariño no estaban siendo "recibidos"?', 'Elijan cada uno un gesto de la lista del otro para practicar esta semana.'],
    questions: ['¿Qué gesto mío no sabías que significaba cariño?', '¿Qué gesto tuyo me gustaría recibir más a menudo?'] },
  { key: 'escucha-3', type: 'escucha', title: 'Escucha de tres minutos', duration: '20 min', tags: ['comunicacion', 'escucha', 'conflictos'],
    why: 'Entrena escuchar para comprender, no para responder.',
    steps: ['Elijan un tema de baja intensidad.', 'Una persona habla 3 minutos sin interrupciones.', 'La otra resume con sus palabras: "Lo que entendí es…" y pregunta "¿Es así?".', 'Corrijan hasta que quien habló se sienta comprendido/a.', 'Cambien de rol.'],
    questions: ['¿Cómo se sintió ser escuchado/a sin interrupciones?', '¿Qué fue lo más difícil al escuchar?'] },
  { key: 'ritmos', type: 'conversacion', title: 'Acordar nuestros ritmos para hablar', duration: '25 min', tags: ['conflictos', 'comunicacion', 'ritmo', 'persecucion', 'espacio'],
    why: 'Cuando uno quiere resolver ya y el otro necesita tiempo, se puede acordar un ritmo que cuide a ambos.',
    steps: ['Cada uno explica qué le pasa por dentro cuando una conversación difícil se pospone, y cuando se fuerza a tenerla ya.', 'Acuerden una señal para pedir pausa (una palabra o gesto).', 'Acuerden cuánto dura la pausa como máximo y quién retoma.', 'Guarden el acuerdo en la sección de Acuerdos.'],
    questions: ['¿Qué necesito para sentirme seguro/a si pedimos una pausa?', '¿Qué me ayuda a volver a la conversación?'] },
  { key: 'gratitud-diaria', type: 'gratitud', title: 'Siete días de gratitud concreta', duration: '5 min al día', tags: ['conexion', 'habitos', 'afecto', 'confianza'],
    why: 'Nombrar lo que valoramos cambia hacia dónde mira la relación.',
    steps: ['Cada día, escribe en el diario una cosa concreta que agradeces de tu pareja ese día.', 'Hazla específica: no "eres bueno/a", sino "gracias por esperarme despierto/a".', 'Al final de la semana, léanlas juntos.'],
    questions: ['¿Qué notaste de tu pareja al buscar cosas para agradecer?'] },
  { key: 'preguntas-36', type: 'preguntas', title: 'Preguntas para volver a conocernos', duration: '45 min', tags: ['conexion', 'intimidad', 'diferencias'],
    why: 'Con el tiempo dejamos de preguntar. Estas preguntas abren conversaciones nuevas.',
    steps: ['Busquen un momento sin pantallas.', 'Túrnense para responder; quien escucha solo pregunta para profundizar.', 'No es necesario hacer todas.'],
    questions: ['¿Qué parte de ti sientes que todavía no conozco?', '¿Qué momento de nuestra relación te hizo sentir más cerca de mí?', '¿Qué sueño tienes que no me has contado?', '¿Qué te preocupa últimamente y no has dicho?', '¿En qué has cambiado desde que estamos juntos?', '¿Qué te gustaría que hiciéramos más seguido?'] },
  { key: 'necesito-pedir', type: 'necesidades', title: 'De la queja a la petición', duration: '20 min', tags: ['necesidades', 'comunicacion', 'conflictos'],
    why: 'Detrás de cada queja suele haber una necesidad que se puede pedir de forma concreta.',
    steps: ['Cada uno escribe una queja frecuente ("nunca…", "siempre…").', 'Debajo responde: ¿qué necesito realmente?', 'Conviértelo en una petición concreta, posible y en positivo: "¿Podrías… cuando…?".', 'Compartan solo las peticiones y conversen si son posibles.'],
    questions: ['¿Qué necesidad había detrás de mi queja?', '¿Qué petición me resulta más fácil de cumplir?'] },
  { key: 'reconexion-cita', type: 'reconexion', title: 'Una cita sin temas pendientes', duration: '2 horas', tags: ['conexion', 'intimidad', 'habitos'],
    why: 'A veces la relación necesita un espacio sin problemas por resolver.',
    steps: ['Planifiquen una salida o una noche en casa.', 'Acuerden no hablar de problemas, logística ni trabajo.', 'Incluyan algo nuevo para ambos.', 'Al final, compartan un momento favorito de la cita.'],
    questions: ['¿Qué momento de hoy quieres recordar?'] },
  { key: 'futuro', type: 'futuro', title: 'Nosotros en cinco años', duration: '40 min', tags: ['compromiso', 'diferencias', 'conexion'],
    why: 'Hablar del futuro revela expectativas que a veces no se dicen.',
    steps: ['Cada uno imagina por separado cómo sería un día cualquiera dentro de cinco años: dónde viven, qué hacen, cómo se tratan.', 'Compártanlo sin interrumpir.', 'Marquen en qué coinciden y en qué no.', 'Elijan un paso pequeño hacia lo que comparten.'],
    questions: ['¿Qué parte de tu visión no sabía?', '¿Qué diferencia necesitamos seguir conversando?'] },
  { key: 'reparar', type: 'conversacion', title: 'Cómo reparamos después de discutir', duration: '30 min', tags: ['conflictos', 'confianza', 'persecucion'],
    why: 'Saber qué necesita cada uno para reconciliarse acorta la distancia después de un conflicto.',
    steps: ['Cada uno cuenta qué le ayudó a reconciliarse la última vez.', 'Expliquen qué consideran una disculpa sincera.', 'Escriban juntos un "plan de reparación": qué hace cada uno cuando se calma.'],
    questions: ['¿Qué gesto mío te ayuda a sentirte en paz después de discutir?'] },
  { key: 'espacio-juntos', type: 'conversacion', title: 'Espacio propio y tiempo juntos', duration: '30 min', tags: ['espacio', 'diferencias', 'confianza', 'habitos'],
    why: 'Necesitar espacio no significa querer menos. Hablarlo evita interpretaciones dolorosas.',
    steps: ['Cada uno dice cuánto tiempo a solas necesita y para qué lo usa.', 'Cada uno dice qué siente cuando el otro toma distancia.', 'Acuerden cómo avisar que necesitan espacio sin que se viva como rechazo.'],
    questions: ['¿Qué me tranquiliza cuando necesitas espacio?'] },
  { key: 'iniciativa', type: 'necesidades', title: 'Turnos de iniciativa', duration: '1 semana', tags: ['iniciativa', 'afecto', 'conexion', 'intimidad'],
    why: 'Cuando una persona siente que siempre inicia, alternar la iniciativa de forma explícita reduce el desgaste.',
    steps: ['Hablen de qué significa "tomar la iniciativa" para cada uno (planes, afecto, conversaciones).', 'Durante una semana, alternen días: quien tiene el turno propone algo.', 'Al final de la semana, comenten cómo se sintieron.'],
    questions: ['¿Qué tipo de iniciativa me hace sentir más elegido/a?'] },
  { key: 'check-semanal', type: 'conversacion', title: 'Conversación semanal de 15 minutos', duration: '15 min / semana', tags: ['habitos', 'comunicacion', 'conflictos', 'confianza'],
    why: 'Un espacio fijo evita que las cosas pequeñas se acumulen.',
    steps: ['Elijan un día y hora fijos.', 'Cada uno responde: algo que valoré esta semana, algo que me costó, algo que necesito la próxima.', 'Sin discutir: solo escuchar y agradecer.'],
    questions: ['¿Qué valoré esta semana?', '¿Qué necesito la próxima semana?'] },
  { key: 'historia', type: 'reconexion', title: 'Nuestra historia en diez momentos', duration: '45 min', tags: ['conexion', 'compromiso'],
    why: 'Recordar lo vivido refuerza el sentido de "nosotros".',
    steps: ['Juntos, elijan los diez momentos más importantes de su relación.', 'Guárdenlos en el diario con fecha y, si quieren, fotos.', 'Para cada uno, digan qué aprendieron como pareja.'],
    questions: ['¿Qué momento cambió algo entre nosotros?'] },
  { key: 'confianza-preguntas', type: 'conversacion', title: 'Lo que construye nuestra confianza', duration: '30 min', tags: ['confianza', 'compromiso'],
    why: 'La confianza se construye con acciones concretas que cada uno puede nombrar.',
    steps: ['Cada uno escribe tres cosas que le dan confianza en la relación.', 'Y una que le genera inseguridad.', 'Compartan sin defenderse: solo pregunten para entender.', 'Si aparece algo concreto que quieran cuidar, pueden proponerlo como acuerdo.'],
    questions: ['¿Qué acción mía te da más tranquilidad?'] },
  { key: 'tacto', type: 'reconexion', title: 'Contacto sin expectativas', duration: '20 min', tags: ['intimidad', 'afecto', 'conexion'],
    why: 'Recuperar el contacto físico afectivo sin presión ayuda a reconectar.',
    steps: ['Acuerden un tiempo de contacto afectivo (abrazo largo, masaje, tomarse de la mano) sin que tenga que llevar a nada más.', 'Cada uno dice qué le resulta cómodo y qué no.', 'Al final, compartan cómo se sintieron.'],
    questions: ['¿Qué tipo de contacto te hace sentir más cuidado/a?'] },
  { key: 'diferencias-valor', type: 'conversacion', title: 'Lo que tu diferencia me aporta', duration: '25 min', tags: ['diferencias', 'conexion'],
    why: 'Las diferencias también pueden ser recursos para la pareja.',
    steps: ['Cada uno nombra una diferencia entre ustedes que a veces le cuesta.', 'Luego nombra qué le aporta esa misma diferencia.', 'Comenten cómo cuidarla.'],
    questions: ['¿En qué momento tu forma de ser me ayudó?'] },
];

export const SAFETY_TEXT = `Si sientes miedo de tu pareja, si hay amenazas, control, golpes, presión sexual o te sientes en peligro, tu seguridad es lo primero. Este espacio no es adecuado para mediar en esa situación.
• Si estás en peligro ahora, llama a los servicios de emergencia de tu país.
• Busca una línea de ayuda especializada en violencia de pareja o a una persona de confianza.
• Si tienes pensamientos de hacerte daño, contacta a una línea de prevención o a emergencias.`;
