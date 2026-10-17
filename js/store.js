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

  PF.nuevoCliente = () => ({
    id: PF.id(), nombre: "", edad: "", altura: "", peso: "", lesiones: "", objetivos: "", notas: "", creado: Date.now(),
  });

  PF.semanaVacia = () => ({ s: 3, r: "10", d: 60, i: null, rpe: "" });

  /* ---------- semanas en las que aparece un ejercicio ----------
     ej.act = lista de true/false (una por semana). Si no existe, el ejercicio aparece en todas las semanas. */
  PF.activo = (e, w) => !e.act || e.act[w - 1] !== false;
  PF.semanasActivas = (e, n) => { const l = []; for (let w = 1; w <= n; w++) if (PF.activo(e, w)) l.push(w); return l; };
  PF.ponerActivas = (e, n, lista) => {
    const set = new Set(lista);
    const act = Array.from({ length: n }, (_, i) => set.has(i + 1));
    if (act.every(Boolean)) delete e.act; else e.act = act;
  };
  /* ---------- ejercicios por fase ----------
     ej.fases = ids de las fases donde aparece (si no existe, aparece en todas). De ahí se calcula ej.act (semanas). */
  PF.sincEj = (plan, rangos, e) => {
    if (!Array.isArray(e.fases)) { delete e.fases; delete e.act; return; }
    const ids = e.fases.filter((id) => rangos.some((r) => r.fase.id === id));
    if (!ids.length || ids.length === rangos.length) { delete e.fases; delete e.act; return; }
    e.fases = ids;
    const act = Array.from({ length: plan.semanas }, (_, i) => { const r = rangos.find((x) => i + 1 >= x.desde && i + 1 <= x.hasta); return !r || ids.includes(r.fase.id); });
    if (act.every(Boolean)) delete e.act; else e.act = act;
  };
  PF.sincronizarFases = (plan) => { if (plan.tipo === "funcional") return; const rg = PF.rangosFases(plan); for (const s of plan.sesiones) for (const e of s.ejercicios) PF.sincEj(plan, rg, e); };
  PF.ponerActivo = (e, n, w, valor) => { const l = PF.semanasActivas(e, n).filter((x) => x !== w); if (valor) l.push(w); PF.ponerActivas(e, n, l); };
  /* ---------- variantes: otro nombre para el mismo ejercicio en ciertas semanas ----------
     ej.vars = lista (una por semana) con el nombre de la variante, o "" si esa semana usa el ejercicio original. */
  const normN = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  PF.nombreEn = (e, w) => (e.vars && e.vars[w - 1]) || e.nombre;
  PF.esVariante = (e, w) => !!(e.vars && e.vars[w - 1]);
  // nombres distintos que usa el ejercicio (el original primero)
  PF.nombresDe = (e, n, soloActivas = true) => {
    const out = [e.nombre];
    for (let w = 1; w <= n; w++) { if (soloActivas && !PF.activo(e, w)) continue; const x = PF.nombreEn(e, w); if (!out.includes(x)) out.push(x); }
    return out;
  };
  PF.ponerVariante = (e, n, semanas, nombre) => {
    const nuevo = normN(nombre) === normN(e.nombre) ? "" : String(nombre || "").trim();
    const v = Array.from({ length: n }, (_, i) => (e.vars && e.vars[i]) || "");
    for (const w of semanas) v[w - 1] = nuevo;
    if (v.every((x) => !x)) delete e.vars; else e.vars = v;
  };

  // [1,2,3,4,9] -> "1–4, 9"
  PF.textoSemanas = (lista) => {
    const l = [...lista].sort((a, b) => a - b), out = [];
    for (let i = 0; i < l.length;) { let j = i; while (j + 1 < l.length && l[j + 1] === l[j] + 1) j++; out.push(j > i ? `${l[i]}–${l[j]}` : `${l[i]}`); i = j + 1; }
    return out.join(", ");
  };

  PF.nuevoEjercicio = (nombre = "", semanas = 1, base = null) => {
    const ej = { id: PF.id(), nombre, grupo: "", nota: "", tempo: "", rm: null, super: "", sem: [] };
    for (let i = 0; i < semanas; i++) ej.sem.push(base ? { ...base } : PF.semanaVacia());
    return ej;
  };

  PF.nuevaSesion = (nombre = "", semanas = 1) => ({
    id: PF.id(), nombre, dia: "", foco: "", calentamiento: "", ejercicios: [],
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
      for (const e of s.ejercicios) {
        while (e.sem.length < plan.semanas) e.sem.push({ ...(e.sem[e.sem.length - 1] || PF.semanaVacia()) });
        e.sem.length = plan.semanas;
        delete e.vars;
      }
    }

    PF.sincronizarFases(plan);
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

  PF.kgDe = (ej, w) => {
    const rm = PF.num(ej.rm), i = PF.num(ej.sem[w - 1] && ej.sem[w - 1].i);
    if (!rm || !i) return null;
    const kg = (rm * i) / 100;
    return Math.round(kg / 2.5) * 2.5;
  };

  PF.resumenSemana = (plan, w) => {
    let series = 0, sumaInt = 0, nInt = 0, ejercicios = 0;

    for (const s of plan.sesiones) {
      for (const e of s.ejercicios) {
        const c = e.sem[w - 1];
        if (!c || !PF.activo(e, w)) continue;
        ejercicios++;
        series += Math.max(0, +c.s || 0);
        const i = PF.num(c.i);
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

  /* ---------- herramientas de progresión ---------- */

  const sumarValor = (valor, delta) => {
    // admite "10", "8-10", "12" ...
    const s = String(valor ?? "").trim();
    const rango = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
    const f = (n) => { const x = Math.max(0, Math.round((n + delta) * 100) / 100); return String(x).replace(".", ","); };
    if (rango) return `${f(parseFloat(rango[1].replace(",", ".")))}-${f(parseFloat(rango[2].replace(",", ".")))}`;
    const n = PF.num(s);
    return n === null ? s : f(n);
  };

  // Aplica una progresión lineal a un campo desde la semana `desde` hasta `hasta` (1-based).
  PF.progresion = (ej, campo, desde, hasta, inicio, paso) => {
    for (let w = desde; w <= hasta && w <= ej.sem.length; w++) {
      const k = (w - desde) * paso;
      const c = ej.sem[w - 1];
      if (!PF.activo(ej, w)) continue;

      if (campo === "r") c.r = sumarValor(inicio, k);
      else if (campo === "rpe") c.rpe = sumarValor(inicio, k);
      else {
        const base = PF.num(inicio) ?? 0;
        let v = base + k;
        if (campo === "i") v = Math.max(0, Math.min(150, Math.round(v * 10) / 10));
        else if (campo === "s") v = Math.max(0, Math.round(v));
        else if (campo === "d") v = Math.max(0, Math.round(v / 5) * 5);
        c[campo] = v;
      }
    }
  };

  PF.copiarSemana = (plan, de, a) => {
    for (const s of plan.sesiones) for (const e of s.ejercicios) {
      const act = PF.activo(e, de);
      PF.ponerActivo(e, plan.semanas, a, act);
      if (act) e.sem[a - 1] = { ...e.sem[de - 1] };
    }
    plan.semInfo[a - 1] = { ...plan.semInfo[de - 1] };
  };

  PF.aplicarDescarga = (plan, w, factorSeries = 0.6, factorInt = 0.85) => {
    for (const s of plan.sesiones) {
      for (const e of s.ejercicios) {
        if (!PF.activo(e, w)) continue;
        const prev = (w > 1 && PF.activo(e, w - 1)) ? e.sem[w - 2] : e.sem[w - 1];
        const c = e.sem[w - 1];
        c.s = Math.max(1, Math.round((+prev.s || 1) * factorSeries));
        c.r = prev.r;
        c.d = prev.d;
        const i = PF.num(prev.i);
        c.i = i ? Math.round(i * factorInt) : prev.i;
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
    for (const s of copia.sesiones) { s.id = PF.id(); for (const e of (s.ejercicios || [])) e.id = PF.id(); for (const b of (s.bloques || [])) { b.id = PF.id(); for (const e of b.ejercicios) e.id = PF.id(); } }
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
