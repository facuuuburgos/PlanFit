/* Modelo de datos, cálculos y almacenamiento local. Sin dependencias del navegador salvo Store (localStorage). */
(function (root) {
  "use strict";

  const D = root.PF_DATA;
  const CLAVE = "planfit.datos.v1";
  const MAX_SEMANAS = 52;

  const PF = {};

  /* ---------- utilidades ---------- */

  PF.id = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

  PF.hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  PF.fechaDeISO = (iso) => {
    if (!iso) return null;
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d);
  };

  PF.sumarDias = (iso, dias) => {
    const f = PF.fechaDeISO(iso);
    f.setDate(f.getDate() + dias);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
  };

  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  PF.fechaLarga = (iso) => {
    const f = PF.fechaDeISO(iso);
    return f ? `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}` : "";
  };

  PF.fechaCorta = (iso) => {
    const f = PF.fechaDeISO(iso);
    return f ? `${String(f.getDate()).padStart(2, "0")}/${String(f.getMonth() + 1).padStart(2, "0")}/${f.getFullYear()}` : "";
  };

  PF.formatoDescanso = (seg) => {
    if (seg === null || seg === undefined || seg === "" || isNaN(seg)) return "";
    seg = Math.round(+seg);
    if (seg < 60) return `${seg} s`;
    const m = Math.floor(seg / 60), s = seg % 60;
    return s ? `${m}:${String(s).padStart(2, "0")} min` : `${m} min`;
  };

  PF.num = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  };

  /* ---------- creación ---------- */

  PF.nuevoCliente = (esGrupo = false) => ({
    id: PF.id(), nombre: "", esGrupo: !!esGrupo, participantes: "", edad: "", altura: "", peso: "", lesiones: "", objetivos: "", notas: "", creado: Date.now(),
  });

  PF.semanaVacia = () => ({ s: 3, r: "10", d: 60, i: null, rpe: "" });

  /* ---------- ejercicio de una semana ----------
     cada ejercicio vive dentro de una sola semana (session.semanas[w-1].ejercicios) y es totalmente
     independiente del mismo ejercicio en otra semana: nombre, series, repeticiones, carga, descanso, etc. */
  PF.nuevoEjercicio = (nombre = "", base = null) => {
    const def = PF.semanaVacia();
    return {
      id: PF.id(), nombre,
      grupo: (base && base.grupo) || "", nota: (base && base.nota) || "", tempo: (base && base.tempo) || "",
      rm: base && base.rm != null ? base.rm : null, super: (base && base.super) || "",
      s: base && base.s !== undefined ? base.s : def.s,
      r: base && base.r !== undefined ? base.r : def.r,
      d: base && base.d !== undefined ? base.d : def.d,
      i: base && base.i !== undefined ? base.i : def.i,
      rpe: base && base.rpe !== undefined ? base.rpe : def.rpe,
    };
  };

  PF.nuevaSesion = (nombre = "", semanas = 1) => ({
    id: PF.id(), nombre, dia: "", foco: "", calentamiento: "",
    semanas: Array.from({ length: Math.max(1, Math.round(+semanas || 1)) }, () => ({ ejercicios: [] })),
  });


  PF.nuevoPlan = (clienteId, plantillaId = "libre") => {
    const pl = D.PLANTILLAS_PLAN.find((p) => p.id === plantillaId) || D.PLANTILLAS_PLAN[D.PLANTILLAS_PLAN.length - 1];
    const plan = {
      id: PF.id(), clienteId, titulo: "Plan de entrenamiento", inicio: PF.hoyISO(), semanas: pl.semanas, semanaManual: null,
      fases: pl.fases.map((f, i) => ({ id: PF.id(), nombre: f.nombre, semanas: f.semanas, objetivo: f.objetivo, color: D.FASES_COLORES[i % D.FASES_COLORES.length] })),
      semInfo: [], sesiones: [],
      opciones: { pct: true, kg: true, rpe: false, tempo: false, notas: true, registro: true, seguimiento: true, recomendaciones: false },
      recomendaciones: D.RECOMENDACIONES_BASE.slice(), notas: "", creado: Date.now(), modificado: Date.now(),
    };
    PF.normalizarPlan(plan);
    return plan;
  };

  /* ---------- planes funcionales (AMRAP, EMOM, Tabata, For Time, circuitos, intervalos) ---------- */

  const PARAMS = {
    amrap: { minutos: 12 },
    emom: { minutos: 12, cada: 60, modo: "alterna" },
    tabata: { rondas: 8, trabajo: 20, descanso: 10, series: 1, descansoSerie: 60 },
    fortime: { rondas: 3, timeCap: 15, esquema: "" },
    circuito: { rondas: 3, trabajo: 40, descanso: 20, descansoRonda: 60 },
    intervalos: { series: 6, trabajo: 180, descanso: 60 },
    libre: {},
  };

  PF.fmtTiempo = (seg) => {
    const t = Math.round(+seg || 0);
    if (t < 60) return `${t}"`;
    const m = Math.floor(t / 60), r = t % 60;
    return r ? `${m}'${String(r).padStart(2, "0")}"` : `${m}'`;
  };
  const plural = (n, u, p) => `${n} ${n === 1 ? u : p}`;

  PF.nuevoEjFunc = (nombre = "") => ({ id: PF.id(), nombre, reps: "", carga: "", equip: [], nota: "" });
  PF.nuevoBloque = (tipo = "amrap") => ({ id: PF.id(), tipo, nombre: "", nota: "", descansoDespues: 0, ...PARAMS[tipo], ejercicios: [] });
  PF.nuevaSesionFunc = (nombre = "") => ({ id: PF.id(), nombre, dia: "", foco: "", calentamiento: "", bloques: [] });

  PF.nuevoPlanFuncional = (clienteId) => {
    const plan = {
      id: PF.id(), tipo: "funcional", clienteId, titulo: "Entrenamiento funcional", inicio: PF.hoyISO(), semanas: 1, semanaManual: null,
      fases: [], semInfo: [], sesiones: [], opciones: { equipo: true, notas: true }, recomendaciones: [], notas: "",
      creado: Date.now(), modificado: Date.now(),
    };
    return plan;
  };

  // título corto del bloque: «AMRAP 12'», «EMOM 10'», «TABATA 8 × 20"/10"»…
  PF.tituloBloque = (b) => {
    switch (b.tipo) {
      case "amrap": return `AMRAP ${b.minutos || 0}'`;
      case "emom": return `EMOM ${b.minutos || 0}'`;
      case "tabata": return `TABATA ${b.rondas || 0} × ${b.trabajo || 0}"/${b.descanso || 0}"`;
      case "fortime": return `FOR TIME${b.rondas > 1 ? " · " + b.rondas + " rondas" : ""}`;
      case "circuito": return `CIRCUITO · ${plural(b.rondas || 1, "ronda", "rondas")}`;
      case "intervalos": return `INTERVALOS ${b.series || 0} × ${PF.fmtTiempo(b.trabajo)}`;
      default: return "BLOQUE LIBRE";
    }
  };

  // explicación en una línea
  PF.detalleBloque = (b) => {
    const n = b.ejercicios.length;
    switch (b.tipo) {
      case "amrap": return `Tantas rondas como puedas en ${b.minutos || 0} min`;
      case "emom": return `Cada ${PF.fmtTiempo(b.cada || 60)} durante ${b.minutos || 0} min` + (b.modo === "alterna" && n > 1 ? " · alterna los ejercicios" : b.modo === "todos" && n > 1 ? " · todos los ejercicios cada vez" : "");
      case "tabata": return `${b.trabajo || 0}" trabajo / ${b.descanso || 0}" descanso · ${plural(b.rondas || 0, "ronda", "rondas")}` + (b.series > 1 ? ` · ${b.series} series (pausa ${PF.fmtTiempo(b.descansoSerie)})` : "");
      case "fortime": return [b.esquema ? `Esquema ${b.esquema}` : (b.rondas > 1 ? plural(b.rondas, "ronda", "rondas") : "1 ronda"), b.timeCap ? `time cap ${b.timeCap} min` : "sin time cap"].join(" · ");
      case "circuito": return `${plural(n, "estación", "estaciones")} · ${PF.fmtTiempo(b.trabajo)} trabajo / ${PF.fmtTiempo(b.descanso)} descanso` + (b.rondas > 1 && b.descansoRonda ? ` · pausa entre rondas ${PF.fmtTiempo(b.descansoRonda)}` : "");
      case "intervalos": return `${b.series || 0} × ${PF.fmtTiempo(b.trabajo)} con ${PF.fmtTiempo(b.descanso)} de pausa`;
      default: return "";
    }
  };

  // duración estimada en segundos (null si no se puede estimar)
  PF.duracionBloque = (b) => {
    const n = Math.max(1, b.ejercicios.length);
    let t = null;
    switch (b.tipo) {
      case "amrap": t = (b.minutos || 0) * 60; break;
      case "emom": t = (b.minutos || 0) * 60; break;
      case "tabata": t = (b.series || 1) * (b.rondas || 0) * ((b.trabajo || 0) + (b.descanso || 0)) + Math.max(0, (b.series || 1) - 1) * (b.descansoSerie || 0); break;
      case "fortime": t = b.timeCap ? b.timeCap * 60 : null; break;
      case "circuito": t = (b.rondas || 1) * n * ((b.trabajo || 0) + (b.descanso || 0)) + Math.max(0, (b.rondas || 1) - 1) * (b.descansoRonda || 0); break;
      case "intervalos": t = (b.series || 0) * (b.trabajo || 0) + Math.max(0, (b.series || 0) - 1) * (b.descanso || 0); break;
      default: t = null;
    }
    return t;
  };
  PF.duracionSesionMin = (ses) => Math.round(ses.bloques.reduce((a, b) => a + (PF.duracionBloque(b) || 0) + (b.descansoDespues || 0), 0) / 60);

  PF.normalizarFuncional = (plan) => {
    plan.fases = []; plan.semInfo = []; plan.semanas = 1;
    plan.opciones = Object.assign({ equipo: true, notas: true }, plan.opciones || {});
    plan.sesiones = plan.sesiones || [];
    for (const s of plan.sesiones) {
      s.bloques = s.bloques || [];
      for (const b of s.bloques) {
        b.tipo = PARAMS[b.tipo] ? b.tipo : "libre";
        for (const [k, v] of Object.entries(PARAMS[b.tipo])) if (b[k] === undefined) b[k] = v;
        b.ejercicios = b.ejercicios || [];
        for (const e of b.ejercicios) { e.equip = Array.isArray(e.equip) ? e.equip : []; e.reps = e.reps ?? ""; e.carga = e.carga ?? ""; e.nota = e.nota ?? ""; }
      }
    }
    return plan;
  };

  /* ---------- normalización ---------- */

  PF.OPCIONES_BASE = { pct: true, kg: true, rpe: false, tempo: false, notas: true, registro: true, seguimiento: true, recomendaciones: false };

  PF.normalizarPlan = (plan) => {
    if (plan.tipo === "funcional") return PF.normalizarFuncional(plan);
    plan.opciones = Object.assign({}, PF.OPCIONES_BASE, plan.opciones || {});
    plan.fases = plan.fases || []; plan.sesiones = plan.sesiones || []; plan.semInfo = plan.semInfo || []; plan.recomendaciones = plan.recomendaciones || [];
    plan.semanas = Math.max(1, Math.min(MAX_SEMANAS, Math.round(+plan.semanas || 1)));

    while (plan.semInfo.length < plan.semanas) plan.semInfo.push({ nota: "", descarga: false });
    plan.semInfo.length = plan.semanas;

    for (const s of plan.sesiones) {
      // migración desde el modelo viejo: un solo s.ejercicios compartido por todas las semanas,
      // con los valores de cada semana en e.sem[w-1]. Se convierte en semanas totalmente independientes
      // (cada semana ya cargada conserva exactamente sus valores; no se inventa contenido nuevo).
      if (!Array.isArray(s.semanas)) {
        const viejos = Array.isArray(s.ejercicios) ? s.ejercicios : [];
        const nuevasSemanas = [];
        for (let w = 1; w <= plan.semanas; w++) {
          const ejs = [];
          for (const e of viejos) {
            if (e.act && e.act[w - 1] === false) continue;
            const c = (e.sem && e.sem[w - 1]) || PF.semanaVacia();
            const nombre = (e.vars && e.vars[w - 1]) || e.nombre || "";
            ejs.push({
              id: PF.id(), nombre, grupo: e.grupo || "", nota: e.nota || "", tempo: e.tempo || "",
              rm: e.rm ?? null, super: e.super || "",
              s: c.s ?? 3, r: c.r ?? "10", d: c.d ?? 60, i: c.i ?? null, rpe: c.rpe ?? "",
            });
          }
          nuevasSemanas.push({ ejercicios: ejs });
        }
        s.semanas = nuevasSemanas;
        delete s.ejercicios;
      }

      // una semana nueva (plan.semanas creció) empieza vacía: no se copia nada de otra semana
      while (s.semanas.length < plan.semanas) s.semanas.push({ ejercicios: [] });
      s.semanas.length = plan.semanas;

      for (const wk of s.semanas) {
        if (!Array.isArray(wk.ejercicios)) wk.ejercicios = [];
        for (const e of wk.ejercicios) {
          if (e.id == null) e.id = PF.id();
          if (e.nombre === undefined) e.nombre = "";
          if (e.grupo === undefined) e.grupo = "";
          if (e.nota === undefined) e.nota = "";
          if (e.tempo === undefined) e.tempo = "";
          if (e.rm === undefined) e.rm = null;
          if (e.super === undefined) e.super = "";
          if (e.s === undefined) e.s = 3;
          if (e.r === undefined) e.r = "10";
          if (e.d === undefined) e.d = 60;
          if (e.i === undefined) e.i = null;
          if (e.rpe === undefined) e.rpe = "";
          delete e.act; delete e.fases; delete e.vars; delete e.sem;
        }
      }
    }

    return plan;
  };

  /* ---------- fases y semanas ---------- */

  // Devuelve las fases con su rango de semanas (empezando en 1). Las semanas que sobran quedan sin fase.
  PF.rangosFases = (plan) => {
    const r = [];
    let desde = 1;

    for (const f of plan.fases) {
      const n = Math.max(0, Math.round(+f.semanas || 0));
      if (!n) continue;
      r.push({ fase: f, desde, hasta: Math.min(plan.semanas, desde + n - 1) });
      desde += n;
      if (desde > plan.semanas) break;
    }

    return r;
  };

  PF.sumaFases = (plan) => plan.fases.reduce((a, f) => a + Math.max(0, Math.round(+f.semanas || 0)), 0);

  PF.faseDeSemana = (plan, w) => PF.rangosFases(plan).find((r) => w >= r.desde && w <= r.hasta) || null;

  PF.semanaActual = (plan, hoy = PF.hoyISO()) => {
    if (plan.semanaManual) return Math.max(1, Math.min(plan.semanas, plan.semanaManual));
    const ini = PF.fechaDeISO(plan.inicio), h = PF.fechaDeISO(hoy);
    if (!ini || !h) return 1;
    const dias = Math.round((h - ini) / 86400000);
    return Math.max(1, Math.min(plan.semanas, Math.floor(dias / 7) + 1));
  };

  PF.estadoPlan = (plan, hoy = PF.hoyISO()) => {
    const ini = PF.fechaDeISO(plan.inicio), h = PF.fechaDeISO(hoy);
    if (plan.semanaManual || !ini || !h) return "en curso";
    const dias = Math.round((h - ini) / 86400000);
    if (dias < 0) return "por comenzar";
    if (dias >= plan.semanas * 7) return "finalizado";
    return "en curso";
  };

  PF.fechaSemana = (plan, w) => PF.sumarDias(plan.inicio, (w - 1) * 7);

  PF.mesDeSemana = (w) => Math.floor((w - 1) / 4.345) + 1;

  /* ---------- cálculos ---------- */

  PF.kgDe = (ej) => {
    const rm = PF.num(ej.rm), i = PF.num(ej.i);
    if (!rm || !i) return null;
    const kg = (rm * i) / 100;
    return Math.round(kg / 2.5) * 2.5;
  };

  PF.resumenSemana = (plan, w) => {
    let series = 0, sumaInt = 0, nInt = 0, ejercicios = 0;
    const wk = (w >= 1 && w <= plan.semanas) ? w : null;

    for (const s of plan.sesiones) {
      const lista = wk ? (s.semanas[wk - 1] || { ejercicios: [] }).ejercicios : [];
      for (const e of lista) {
        ejercicios++;
        series += Math.max(0, +e.s || 0);
        const i = PF.num(e.i);
        if (i) { sumaInt += i; nInt++; }
      }
    }

    return { series, ejercicios, intensidad: nInt ? sumaInt / nInt : null };
  };

  PF.curva = (plan) => {
    const c = [];
    for (let w = 1; w <= plan.semanas; w++) c.push({ w, ...PF.resumenSemana(plan, w), descarga: !!(plan.semInfo[w - 1] && plan.semInfo[w - 1].descarga) });
    return c;
  };

  /* ---------- copiar / vaciar / descarga de semanas (cada semana es independiente) ---------- */

  // Reemplaza por completo el contenido de la semana `a` con una copia (con ids nuevos) de la semana `de`.
  // La semana de origen no se toca.
  PF.copiarSemana = (plan, de, a) => {
    for (const s of plan.sesiones) {
      const origen = (s.semanas[de - 1] || { ejercicios: [] }).ejercicios;
      s.semanas[a - 1] = { ejercicios: origen.map((e) => ({ ...e, id: PF.id() })) };
    }
    plan.semInfo[a - 1] = { ...plan.semInfo[de - 1] };
  };

  // Vacía el contenido de una semana específica. Las demás semanas no se modifican.
  PF.vaciarSemana = (plan, w) => {
    for (const s of plan.sesiones) s.semanas[w - 1] = { ejercicios: [] };
    plan.semInfo[w - 1] = { nota: "", descarga: false };
  };

  // Marca una semana como descarga: si está vacía, trae una copia de la semana anterior y la reduce;
  // si ya tiene contenido propio, reduce sus propios valores (no toca otras semanas).
  PF.aplicarDescarga = (plan, w, factorSeries = 0.6, factorInt = 0.85) => {
    for (const s of plan.sesiones) {
      let lista = (s.semanas[w - 1] || { ejercicios: [] }).ejercicios;
      if (!lista.length && w > 1) {
        const prevLista = (s.semanas[w - 2] || { ejercicios: [] }).ejercicios;
        lista = prevLista.map((e) => ({ ...e, id: PF.id() }));
        s.semanas[w - 1] = { ejercicios: lista };
      }
      for (const e of lista) {
        e.s = Math.max(1, Math.round((+e.s || 1) * factorSeries));
        const i = PF.num(e.i);
        if (i) e.i = Math.round(i * factorInt);
      }
    }
    plan.semInfo[w - 1].descarga = true;
  };

  PF.duplicarPlan = (plan, clienteId) => {
    const copia = JSON.parse(JSON.stringify(plan));
    copia.id = PF.id();
    if (clienteId) copia.clienteId = clienteId;
    copia.titulo = clienteId && clienteId !== plan.clienteId ? plan.titulo : plan.titulo + " (copia)";
    copia.creado = copia.modificado = Date.now();
    copia.semanaManual = null;
    copia.inicio = PF.hoyISO();
    for (const f of copia.fases) f.id = PF.id();
    for (const s of copia.sesiones) {
      s.id = PF.id();
      for (const wk of (s.semanas || [])) for (const e of (wk.ejercicios || [])) e.id = PF.id();
      for (const b of (s.bloques || [])) { b.id = PF.id(); for (const e of b.ejercicios) e.id = PF.id(); }
    }
    return copia;
  };

  /* ---------- almacenamiento ---------- */

  PF.datosIniciales = () => ({
    version: 1,
    entrenador: { nombre: "", contacto: "", web: "", logo: "", color: "#2F6BFF" },
    clientes: [], planes: [], ejerciciosPropios: [], ultimaCopia: 0,
  });

  PF.Store = {
    datos: PF.datosIniciales(),
    _t: null,
    escuchas: [],

    cargar() {
      try {
        const txt = root.localStorage.getItem(CLAVE);
        if (txt) this.datos = Object.assign(PF.datosIniciales(), JSON.parse(txt));
      } catch (e) { /* sin almacenamiento: se trabaja en memoria */ }
      for (const p of this.datos.planes) PF.normalizarPlan(p);
      return this.datos;
    },

    guardar() {
      clearTimeout(this._t);
      this._t = setTimeout(() => this.guardarYa(), 250);
    },

    guardarYa() {
      clearTimeout(this._t);
      try { root.localStorage.setItem(CLAVE, JSON.stringify(this.datos)); return true; } catch (e) { return false; }
    },

    exportarJSON() { return JSON.stringify(this.datos); },

    importarJSON(txt) {
      const d = JSON.parse(txt);
      if (!d || !Array.isArray(d.clientes) || !Array.isArray(d.planes)) throw new Error("El archivo no es una copia de PlanFit.");
      this.datos = Object.assign(PF.datosIniciales(), d);
      for (const p of this.datos.planes) PF.normalizarPlan(p);
      this.guardarYa();
    },

    cliente(id) { return this.datos.clientes.find((c) => c.id === id) || null; },
    plan(id) { return this.datos.planes.find((p) => p.id === id) || null; },
    planesDe(clienteId) { return this.datos.planes.filter((p) => p.clienteId === clienteId).sort((a, b) => b.modificado - a.modificado); },
  };

  root.PF = PF;
})(typeof window !== "undefined" ? window : globalThis);
