/* Datos fijos de la app: biblioteca de ejercicios, plantillas de periodización y colores. */
(function (root) {
  "use strict";

  const BIBLIOTECA = {
    "Piernas": [
      "Sentadilla trasera", "Sentadilla frontal", "Sentadilla goblet", "Sentadilla búlgara", "Prensa de piernas",
      "Peso muerto convencional", "Peso muerto rumano", "Peso muerto sumo", "Zancada caminando", "Zancada inversa",
      "Step-up al cajón", "Hip thrust", "Puente de glúteo", "Curl femoral tumbado", "Curl femoral sentado",
      "Extensión de cuádriceps", "Elevación de talones de pie", "Elevación de talones sentado", "Abducción de cadera en máquina",
      "Sentadilla hack", "Buenos días", "Patada de glúteo en polea",
    ],
    "Pecho": [
      "Press de banca con barra", "Press de banca con mancuernas", "Press inclinado con barra", "Press inclinado con mancuernas",
      "Press declinado", "Aperturas con mancuernas", "Aperturas en polea (cruces)", "Fondos en paralelas", "Flexiones",
      "Press en máquina", "Pec deck",
    ],
    "Espalda": [
      "Dominadas", "Dominadas asistidas", "Jalón al pecho", "Jalón agarre cerrado", "Remo con barra", "Remo con mancuerna a una mano",
      "Remo en polea baja", "Remo en máquina", "Remo en T", "Pullover en polea", "Face pull", "Hiperextensiones", "Encogimientos de hombros",
    ],
    "Hombros": [
      "Press militar con barra", "Press de hombros con mancuernas", "Press Arnold", "Elevaciones laterales", "Elevaciones frontales",
      "Pájaros (deltoides posterior)", "Elevaciones laterales en polea", "Press en máquina de hombros",
    ],
    "Brazos": [
      "Curl de bíceps con barra", "Curl con mancuernas", "Curl martillo", "Curl predicador", "Curl en polea", "Curl concentrado",
      "Press francés", "Extensión de tríceps en polea", "Fondos en banco", "Extensión de tríceps sobre la cabeza", "Patada de tríceps",
      "Press cerrado",
    ],
    "Core": [
      "Plancha", "Plancha lateral", "Crunch abdominal", "Elevación de piernas colgado", "Rueda abdominal", "Russian twist",
      "Dead bug", "Bird dog", "Pallof press", "Crunch en polea", "Mountain climbers", "Hollow hold",
    ],
    "Funcional y potencia": [
      "Kettlebell swing", "Clean (cargada)", "Snatch (arrancada)", "Push press", "Salto al cajón", "Burpees", "Saltos de rana",
      "Lanzamiento de balón medicinal", "Farmer walk", "Trineo (empuje)", "Cuerdas de batalla", "Turkish get-up",
    ],
    "Cardio": [
      "Cinta (caminata inclinada)", "Cinta (trote)", "Bicicleta estática", "Remo ergómetro", "Elíptica", "Cuerda de saltar",
      "Intervalos HIIT", "Escaladora",
    ],
    "Movilidad y calentamiento": [
      "Movilidad de cadera", "Movilidad de hombros", "Movilidad de columna torácica", "Activación de glúteos con banda",
      "Estiramiento de isquiotibiales", "Estiramiento de pectoral", "Rodillo de espuma", "Cat-camel", "World's greatest stretch",
      "Rotaciones externas con banda",
    ],
  };

  const FASES_COLORES = [
    "#2F6BFF", "#7C4DFF", "#F2603C", "#16A085", "#E5A00D", "#D6336C", "#1F9BD1", "#5C7A29",
  ];

  const PLANTILLAS_PLAN = [
    {
      id: "fuerza-hipertrofia-24",
      nombre: "6 meses: fuerza → fuerza máxima → hipertrofia",
      semanas: 24,
      fases: [
        { nombre: "Fuerza", semanas: 8, objetivo: "Base de fuerza con cargas moderadas-altas y técnica sólida." },
        { nombre: "Fuerza máxima", semanas: 8, objetivo: "Cargas altas, pocas repeticiones y descansos largos." },
        { nombre: "Hipertrofia", semanas: 8, objetivo: "Volumen alto, cercanía al fallo y control del tempo." },
      ],
    },
    {
      id: "hipertrofia-12",
      nombre: "12 semanas: adaptación → hipertrofia → descarga",
      semanas: 12,
      fases: [
        { nombre: "Adaptación", semanas: 2, objetivo: "Aprender los movimientos y preparar tendones y articulaciones." },
        { nombre: "Hipertrofia", semanas: 8, objetivo: "Aumentar volumen e intensidad de forma progresiva." },
        { nombre: "Descarga y test", semanas: 2, objetivo: "Recuperar y evaluar la evolución." },
      ],
    },
    {
      id: "grasa-12",
      nombre: "12 semanas: pérdida de grasa",
      semanas: 12,
      fases: [
        { nombre: "Adaptación", semanas: 2, objetivo: "Crear el hábito y la técnica." },
        { nombre: "Acondicionamiento", semanas: 6, objetivo: "Circuitos y fuerza-resistencia para aumentar el gasto." },
        { nombre: "Intensificación", semanas: 4, objetivo: "Más densidad de trabajo y mayor intensidad." },
      ],
    },
    {
      id: "fuerza-16",
      nombre: "16 semanas: fuerza (bloques de 4)",
      semanas: 16,
      fases: [
        { nombre: "Acumulación", semanas: 4, objetivo: "Volumen moderado-alto y técnica." },
        { nombre: "Intensificación", semanas: 4, objetivo: "Menos volumen, más carga." },
        { nombre: "Fuerza máxima", semanas: 4, objetivo: "Trabajo cercano al máximo." },
        { nombre: "Realización", semanas: 4, objetivo: "Expresar la fuerza ganada y evaluar." },
      ],
    },
    { id: "libre", nombre: "En blanco (yo defino las fases)", semanas: 8, fases: [{ nombre: "Fase 1", semanas: 8, objetivo: "" }] },
  ];

  const OBJETIVOS_SUGERIDOS = [
    "Ganar masa muscular", "Perder grasa", "Ganar fuerza", "Mejorar el rendimiento deportivo", "Recomposición corporal",
    "Salud y bienestar general", "Rehabilitación y vuelta a la actividad", "Preparar una competencia",
  ];

  const RECOMENDACIONES_BASE = [
    "Calienta 8-10 minutos antes de empezar: movilidad y series de aproximación.",
    "Prioriza la técnica sobre la carga. Si no puedes mantenerla, baja el peso.",
    "Duerme 7-9 horas y mantén una alimentación acorde a tu objetivo.",
    "Hidrátate durante la sesión y respeta los descansos indicados.",
    "Si sientes dolor (no molestia muscular) detén el ejercicio y avísame.",
  ];

  const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  /* ---------- módulo funcional e híbrido ---------- */
  const TIPOS_BLOQUE = {
    amrap:     { id: "amrap", nombre: "AMRAP", largo: "As Many Rounds As Possible", desc: "Tantas rondas como puedas en un tiempo fijo.", color: "#19C3B0" },
    emom:      { id: "emom", nombre: "EMOM", largo: "Every Minute On the Minute", desc: "Cada minuto (o intervalo) se hace el trabajo y se descansa lo que sobre.", color: "#38A3F8" },
    tabata:    { id: "tabata", nombre: "TABATA", largo: "Trabajo / descanso corto", desc: "Ej.: 8 rondas de 20 s de trabajo y 10 s de descanso.", color: "#F0609E" },
    fortime:   { id: "fortime", nombre: "FOR TIME", largo: "Por tiempo", desc: "Completar un trabajo fijo lo más rápido posible, con time cap.", color: "#F5A524" },
    circuito:  { id: "circuito", nombre: "CIRCUITO", largo: "Estaciones", desc: "Estaciones con tiempo de trabajo y descanso, por rondas.", color: "#9B7BFF" },
    intervalos:{ id: "intervalos", nombre: "INTERVALOS", largo: "Series de trabajo y descanso", desc: "Ej.: 6 × 3' fuertes con 1' de pausa (correr, remo, bici).", color: "#43C06E" },
    libre:     { id: "libre", nombre: "BLOQUE LIBRE", largo: "Fuerza, técnica o accesorios", desc: "Lista de ejercicios con series, repeticiones y carga a tu medida.", color: "#8B97AB" },
  };
  const EQUIPAMIENTO = ["Sin equipo", "Mancuernas", "Kettlebell", "Barra", "Discos", "Cajón", "Soga", "Pelota medicinal", "Wall ball", "Banda elástica", "TRX", "Barra de dominadas", "Anillas", "Remo", "Bicicleta", "Ski erg", "Trineo", "Cuerda de batalla", "Colchoneta", "Banco"];
  BIBLIOTECA["Funcional / WOD"] = ["Thruster", "Wall ball", "Burpee", "Burpee over the bar", "Box jump", "Box step-up", "Doble salto de soga (double under)", "Toes to bar", "Dominadas (pull-up)", "Kettlebell swing", "Devil press", "Man maker", "Snatch con mancuerna", "Clean & jerk con mancuerna", "Peso muerto con kettlebell", "Remo (metros)", "Bicicleta (calorías)", "Ski erg (metros)", "Empuje de trineo", "Farmer carry", "Sprawl", "Mountain climbers", "Salto de tijera (jumping jack)", "Plancha con toque de hombro", "Rotación rusa con pelota", "Slam ball", "Press con mancuerna alterno", "Zancada caminando con mancuernas"];

  root.PF_DATA = { TIPOS_BLOQUE, EQUIPAMIENTO, BIBLIOTECA, FASES_COLORES, PLANTILLAS_PLAN, OBJETIVOS_SUGERIDOS, RECOMENDACIONES_BASE, DIAS_SEMANA };
})(typeof window !== "undefined" ? window : globalThis);
