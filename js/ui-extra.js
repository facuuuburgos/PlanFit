/* Selector de tipo de plan, Mis planes, Biblioteca de ejercicios y acceso rápido a «Generar PDF». */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, D = root.PF_DATA, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  const V = UI.vistas;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  UI.COLOR_FUERZA = "#FF7A29";
  UI.COLOR_FUNCIONAL = "#19C3B0";
  UI.tipoPlan = (p) => p.tipo === "funcional" ? { id: "funcional", nombre: "Funcional", color: UI.COLOR_FUNCIONAL } : { id: "fuerza", nombre: "Fuerza", color: UI.COLOR_FUERZA };
  UI.pildoraTipo = (p) => { const t = UI.tipoPlan(p); return `<span class="pildora-tipo" style="--c:${t.color}">${t.nombre}</span>`; };
  UI.textoPlan = (p) => p.tipo === "funcional"
    ? `${p.sesiones.length} ${p.sesiones.length === 1 ? "sesión" : "sesiones"} · ${(() => { const n = p.sesiones.reduce((a, s) => a + s.bloques.length, 0); return n + (n === 1 ? " bloque" : " bloques"); })()}`
    : `Semana ${PF.semanaActual(p)} de ${p.semanas}${(PF.faseDeSemana(p, PF.semanaActual(p)) || {}).fase ? " · " + PF.faseDeSemana(p, PF.semanaActual(p)).fase.nombre : ""}`;

  /* ============ elegir el tipo de plan ============ */

  // cliente: cliente al que se asigna el plan
  UI.elegirTipoPlan = (cliente) => {
    const hoja = UI.hoja({
      titulo: "Nuevo plan", clase: "tipos-plan",
      html: `
        <p class="ayuda" style="margin:0 0 12px">¿Qué tipo de entrenamiento vas a armar${cliente && cliente.nombre ? " para " + h(cliente.nombre) : ""}?</p>
        <button class="tipo-card fuerza" data-t="fuerza">
          <span class="tipo-ic">${UI.ic("dumbbell")}</span>
          <span class="tipo-t"><b>Fuerza e hipertrofia</b><small>Semanas, fases, ejercicios, series, repeticiones, % de intensidad y progresiones. PDF con evolución semanal.</small></span>
          ${UI.ic("right", "flecha")}
        </button>
        <button class="tipo-card funcional" data-t="funcional">
          <span class="tipo-ic">${UI.ic("bolt")}</span>
          <span class="tipo-t"><b>Funcional e híbrido</b><small>AMRAP, EMOM, Tabata, For Time, circuitos por estaciones, intervalos y bloques combinados.</small></span>
          ${UI.ic("right", "flecha")}
        </button>`,
    });
    hoja.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      hoja.cerrar();
      UI.ctx = Object.assign(UI.ctx || {}, { cliente });
      if (b.dataset.t === "fuerza") setTimeout(() => UI.acciones["nuevo-plan-fuerza"](), 150);
      else {
        const plan = PF.nuevoPlanFuncional(cliente.id);
        Store.datos.planes.push(plan); Store.guardar(); UI.nav("#/p/" + plan.id);
        UI.aviso("Plan funcional creado · añade una sesión");
      }
    });
  };

  // desde el inicio: primero se elige el cliente
  UI.nuevoPlanRapido = () => {
    const cs = Store.datos.clientes.slice().sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));
    if (!cs.length) { UI.aviso("Primero crea un cliente"); UI.acciones["nuevo-cliente"](); return; }
    if (cs.length === 1) return UI.elegirTipoPlan(cs[0]);
    const hoja = UI.hoja({
      titulo: "¿Para qué cliente?",
      html: cs.map((c) => `<button class="fila" data-c="${c.id}" style="box-shadow:none"><span class="avatar" style="background:${UI.colorAvatar(c.nombre + c.id)}">${h(UI.iniciales(c.nombre))}</span><span class="t"><b>${h(c.nombre || "Cliente sin nombre")}</b></span>${UI.ic("right", "flecha")}</button>`).join(""),
    });
    hoja.el.addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (!b) return; hoja.cerrar(); setTimeout(() => UI.elegirTipoPlan(Store.cliente(b.dataset.c)), 150); });
  };

  /* ============ Generar PDF (acceso rápido) ============ */

  UI.generarPDFRapido = () => {
    const planes = Store.datos.planes.filter((p) => Store.cliente(p.clienteId)).sort((a, b) => b.modificado - a.modificado);
    if (!planes.length) { UI.aviso("Todavía no hay planes para exportar"); return; }
    const hoja = UI.hoja({
      titulo: "Generar PDF · elige el plan",
      html: planes.map((p) => { const c = Store.cliente(p.clienteId); return `<button class="fila" data-p="${p.id}" style="box-shadow:none"><span class="avatar" style="background:${UI.tipoPlan(p).color}">${UI.ic(p.tipo === "funcional" ? "bolt" : "dumbbell")}</span><span class="t"><b>${h(p.titulo)}</b><span>${h(c.nombre || "Cliente")} · ${h(UI.textoPlan(p))}</span></span>${UI.ic("right", "flecha")}</button>`; }).join(""),
    });
    hoja.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      const p = Store.plan(b.dataset.p);
      hoja.cerrar();
      UI.estado.tab = "pdf"; UI.estado.tabDer = "pdf";
      UI.nav("#/p/" + p.id);
      if (p.tipo === "funcional") setTimeout(() => { const s = $("#fx-pdf"); if (s) s.scrollIntoView({ behavior: "smooth", block: "start" }); }, 600);
    });
  };

  /* ============ MIS PLANES ============ */

  UI.estado.planesFiltro = "todos";
  UI.estado.planesBusqueda = "";

  V.planes = () => {
    const todos = Store.datos.planes.filter((p) => Store.cliente(p.clienteId)).sort((a, b) => b.modificado - a.modificado);
    const f = UI.estado.planesFiltro, q = norm(UI.estado.planesBusqueda);
    const lista = todos.filter((p) => (f === "todos" || UI.tipoPlan(p).id === f) && (!q || norm(p.titulo + " " + Store.cliente(p.clienteId).nombre).includes(q)));
    const n = (t) => todos.filter((p) => UI.tipoPlan(p).id === t).length;
    const chips = [["todos", "Todos", todos.length], ["fuerza", "Fuerza", n("fuerza")], ["funcional", "Funcional", n("funcional")]];

    return {
      titulo: "Mis planes", sub: `${todos.length} ${todos.length === 1 ? "plan" : "planes"}`, atras: "#/",
      acciones: `<button class="icono" data-planes-nuevo aria-label="Nuevo plan">${UI.ic("plus")}</button>`,
      html: `
        ${todos.length > 5 ? `<label class="campo"><span style="display:none">Buscar</span><input id="pl-buscar" type="search" placeholder="Buscar por cliente o plan…" value="${h(UI.estado.planesBusqueda)}"></label>` : ""}
        <div class="chips filtro-planes">${chips.map(([k, t, c]) => `<button class="chip ${f === k ? "on" : ""}" data-pf="${k}">${t} · ${c}</button>`).join("")}</div>
        <div class="lista-planes">
        ${lista.length ? lista.map((p, i) => { const c = Store.cliente(p.clienteId), t = UI.tipoPlan(p); return `<a class="fila plan-fila" style="--n:${i};--c:${t.color}" href="#/p/${p.id}"><span class="avatar" style="background:${t.color}">${UI.ic(p.tipo === "funcional" ? "bolt" : "dumbbell")}</span><span class="t"><b>${h(p.titulo)}</b><span>${h(c.nombre || "Cliente sin nombre")} · ${h(UI.textoPlan(p))}</span></span>${UI.pildoraTipo(p)}${UI.ic("right", "flecha")}</a>`; }).join("")
          : `<div class="vacio"><div class="ic">${UI.ic("layers")}</div><h2>${todos.length ? "Sin resultados" : "Aún no hay planes"}</h2><p>${todos.length ? "Prueba con otro filtro." : "Crea un plan de fuerza o uno funcional para empezar."}</p>${todos.length ? "" : `<button class="btn primario" data-planes-nuevo>${UI.ic("plus")}Nuevo plan</button>`}</div>`}
        </div>`,
      bind(el) {
        $$("[data-pf]", el).forEach((b) => b.addEventListener("click", () => { UI.estado.planesFiltro = b.dataset.pf; UI.render(true); }));
        const bs = $("#pl-buscar", el);
        if (bs) bs.addEventListener("input", UI.debounce(() => { UI.estado.planesBusqueda = bs.value; UI.render(true); const n2 = $("#pl-buscar"); n2 && (n2.focus(), n2.setSelectionRange(n2.value.length, n2.value.length)); }, 200));
        $$("[data-planes-nuevo]").forEach((b) => b.addEventListener("click", () => UI.nuevoPlanRapido()));
      },
    };
  };

  /* ============ BIBLIOTECA DE EJERCICIOS ============ */

  UI.estado.bibGrupo = "todos";
  UI.estado.bibBusqueda = "";

  V.biblioteca = () => {
    const propios = Store.datos.ejerciciosPropios || [];
    const grupos = Object.keys(D.BIBLIOTECA);
    const g = UI.estado.bibGrupo, q = norm(UI.estado.bibBusqueda);
    const filtra = (n) => !q || norm(n).includes(q);
    const total = grupos.reduce((a, k) => a + D.BIBLIOTECA[k].length, 0) + propios.length;

    const bloque = (titulo, lista, color, propio) => lista.length ? `
      <section class="bib-grupo">
        <div class="titulo-sec"><span class="bib-punto" style="background:${color}"></span>${h(titulo)} <span class="der muted peq">${lista.length}</span></div>
        <div class="bib-lista">${lista.map((n) => `<div class="bib-it"><span>${h(n)}</span>${propio ? `<button class="icono gris" data-bib-del="${h(n)}" aria-label="Quitar">${UI.ic("x")}</button>` : ""}</div>`).join("")}</div>
      </section>` : "";

    const colores = ["#FF7A29", "#2F6BFF", "#9B7BFF", "#43C06E", "#F0609E", "#F5A524", "#19C3B0", "#38A3F8", "#8B97AB", "#E5484D"];
    const secciones = [
      (g === "todos" || g === "__propios") ? bloque("Mis ejercicios", propios.filter(filtra), "#FF7A29", true) : "",
      ...grupos.filter((k) => g === "todos" || g === k).map((k, i) => bloque(k, D.BIBLIOTECA[k].filter(filtra), colores[(i + 1) % colores.length], false)),
    ].join("");

    return {
      titulo: "Biblioteca", sub: `${total} ejercicios`, atras: "#/",
      html: `
        <label class="campo"><span style="display:none">Buscar</span><input id="bib-buscar" type="search" placeholder="Buscar ejercicio…" value="${h(UI.estado.bibBusqueda)}"></label>
        <div class="chips scroll bib-chips">
          <button class="chip ${g === "todos" ? "on" : ""}" data-bg="todos">Todos</button>
          <button class="chip ${g === "__propios" ? "on" : ""}" data-bg="__propios">Mis ejercicios · ${propios.length}</button>
          ${grupos.map((k) => `<button class="chip ${g === k ? "on" : ""}" data-bg="${h(k)}">${h(k)}</button>`).join("")}
        </div>
        <div class="tarjeta bib-nuevo"><label class="campo" style="margin:0"><span>Añadir un ejercicio propio</span>
          <span class="bib-nuevo-f"><input id="bib-nuevo" placeholder="Ej.: Sentadilla búlgara con kettlebell" autocapitalize="sentences" autocomplete="off"><button class="btn primario" id="bib-add">${UI.ic("plus")}Añadir</button></span></label></div>
        ${secciones || `<div class="vacio"><div class="ic">${UI.ic("book")}</div><h2>Sin resultados</h2><p>Prueba con otra búsqueda o añade el ejercicio como propio.</p></div>`}`,
      bind(el) {
        $$("[data-bg]", el).forEach((b) => b.addEventListener("click", () => { UI.estado.bibGrupo = b.dataset.bg; UI.render(true); }));
        const bs = $("#bib-buscar", el);
        bs.addEventListener("input", UI.debounce(() => { UI.estado.bibBusqueda = bs.value; UI.render(true); const n = $("#bib-buscar"); n && (n.focus(), n.setSelectionRange(n.value.length, n.value.length)); }, 180));
        const agregar = () => {
          const i = $("#bib-nuevo", el), v = i.value.trim();
          if (!v) { i.focus(); return; }
          const existe = [...Object.values(D.BIBLIOTECA).flat(), ...propios].some((x) => norm(x) === norm(v));
          if (existe) { UI.aviso("Ese ejercicio ya está en la biblioteca"); return; }
          Store.datos.ejerciciosPropios.push(v); Store.guardar(); UI.estado.bibGrupo = "__propios"; UI.estado.bibBusqueda = ""; UI.render(true); UI.aviso("Ejercicio añadido");
        };
        $("#bib-add", el).addEventListener("click", agregar);
        $("#bib-nuevo", el).addEventListener("keydown", (ev) => { if (ev.key === "Enter") agregar(); });
        $$("[data-bib-del]", el).forEach((b) => b.addEventListener("click", () => {
          Store.datos.ejerciciosPropios = propios.filter((x) => x !== b.dataset.bibDel); Store.guardar(); UI.render(true);
        }));
      },
    };
  };
})(window);
