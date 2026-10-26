/* Arranque de PlanFit: rutas, acciones, PDF, copia de seguridad y actualizaciones. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, D = root.PF_DATA, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  UI.VERSION = "1.12.0";
  UI.lateralOculto = () => { try { return localStorage.getItem("planfit.lateralOculto") === "1"; } catch (e) { return false; } };

  const ancho = () => matchMedia("(min-width: 900px)").matches;

  /* ============ rutas ============ */

  function ruta() {
    const p = (location.hash || "#/").replace(/^#\/?/, "").split("/");
    if (p[0] === "c" && p[1]) return { n: "cliente", id: p[1] };
    if (p[0] === "p" && p[1] && p[2] === "entrenar") return { n: "entrenar", id: p[1], si: parseInt(p[3], 10) || 0 };
    if (p[0] === "p" && p[1]) return { n: "plan", id: p[1] };
    if (p[0] === "ajustes") return { n: "ajustes" };
    if (p[0] === "planes") return { n: "planes" };
    if (p[0] === "biblioteca") return { n: "biblioteca" };
    return { n: "clientes" };
  }

  let rutaPrevia = null;

  function limpiarVacios(nueva) {
    const prev = rutaPrevia;
    rutaPrevia = nueva;
    if (!prev || prev.n !== "cliente" || (nueva.n === "cliente" && nueva.id === prev.id)) return;
    const c = Store.cliente(prev.id);
    if (c && !(c.nombre || "").trim() && !Store.planesDe(c.id).length) {
      Store.datos.clientes = Store.datos.clientes.filter((x) => x.id !== c.id);
      Store.guardar();
    }
  }

  /* ============ render ============ */

  UI.render = (conservarScroll) => {
    const r = ruta();
    limpiarVacios(r);

    const sc = { w: document.scrollingElement.scrollTop, p: $(".principal") ? $(".principal").scrollTop : 0 };
    let vista;

    if (r.n === "clientes") vista = ancho() ? UI.vistas.inicioAncho() : UI.vistas.clientes();
    else if (r.n === "cliente") vista = UI.vistas.cliente(r);
    else if (r.n === "entrenar") vista = UI.vistas.entrenar(r);
    else if (r.n === "plan") vista = (Store.plan(r.id) || {}).tipo === "funcional" ? UI.vistas.funcional(r) : UI.vistas.plan(r);
    else if (r.n === "planes") vista = UI.vistas.planes();
    else if (r.n === "biblioteca") vista = UI.vistas.biblioteca();
    else vista = UI.vistas.ajustes();

    const esFx = r.n === "plan" && (Store.plan(r.id) || {}).tipo === "funcional";
    const activo = r.n === "cliente" ? r.id : r.n === "plan" ? (Store.plan(r.id) || {}).clienteId : null;
    const enSesion = r.n === "clientes" || r.n === "ajustes" || r.n === "cliente" || r.n === "plan";

    const lateral = `
      <aside class="lateral">
        <div class="lat-cab"><span class="logo">${UI.ic("dumbbell")}</span><strong>PlanFit</strong>
          <button class="icono" data-act="nuevo-cliente" aria-label="Nuevo cliente">${UI.ic("plus")}</button>
          <button class="icono gris" data-act="lateral" aria-label="Ocultar la lista de clientes" title="Ocultar la lista">${UI.ic("panel")}</button></div>
        <div class="lat-lista" id="lat-lista">${Store.datos.clientes.length ? UI.listaClientes(activo) : `<p class="muted peq" style="padding:10px 8px">Aún no hay clientes.</p>`}</div>
        <nav class="lat-nav">
          <a class="${!["ajustes", "planes", "biblioteca"].includes(r.n) ? "on" : ""}" href="#/">${UI.ic("home")}Inicio</a>
          <a class="${r.n === "planes" ? "on" : ""}" href="#/planes">${UI.ic("layers")}Mis planes</a>
          <a class="${r.n === "biblioteca" ? "on" : ""}" href="#/biblioteca">${UI.ic("book")}Biblioteca</a>
          <a class="${r.n === "ajustes" ? "on" : ""}" href="#/ajustes">${UI.ic("settings")}Ajustes</a>
        </nav>
      </aside>`;

    const banner = "";

    const principal = `
      <div class="principal">
        ${banner}
        <header class="barra-sup" id="barra">
          <button class="icono gris btn-lateral" data-act="lateral" aria-label="Mostrar la lista de clientes" title="Mostrar la lista">${UI.ic("panel")}</button>
          ${vista.atras ? `<a class="icono ${vista.atras === "#/" ? "solo-movil" : ""}" href="${vista.atras}" aria-label="Volver">${UI.ic("left")}</a>` : ""}
          <h1>${h(vista.titulo)}${vista.sub ? `<span class="sub">${h(vista.sub)}</span>` : ""}</h1>
          ${vista.acciones || ""}
        </header>
        <main class="contenido ${r.n === "plan" ? "ancho" : ""} ${r.n === "plan" && esFx ? "fx-pag" : ""} ${r.n === "entrenar" ? "entrenar" : ""} ${UI.amplia() && !esFx && (r.n === "plan" || r.n === "cliente") ? "amplio" : ""}" id="main">${vista.html}</main>
      </div>`;

    const tab = `
      <nav class="tabbar">
        <button class="${!["ajustes", "planes", "biblioteca"].includes(r.n) ? "on" : ""}" data-ir="#/">${UI.ic("home")}Inicio</button>
        <button class="${r.n === "planes" ? "on" : ""}" data-ir="#/planes">${UI.ic("layers")}Planes</button>
        <button class="${r.n === "biblioteca" ? "on" : ""}" data-ir="#/biblioteca">${UI.ic("book")}Biblioteca</button>
        <button class="${r.n === "ajustes" ? "on" : ""}" data-ir="#/ajustes">${UI.ic("settings")}Ajustes</button>
      </nav>`;

    $("#app").innerHTML = lateral + principal + tab;
    $("#app").classList.toggle("lat-oculto", UI.lateralOculto());
    $("#app").classList.toggle("modo-entrenar", r.n === "entrenar");
    if (vista.bind) vista.bind($("#main"));

    if (conservarScroll) {
      document.scrollingElement.scrollTop = sc.w;
      const pr = $(".principal");
      if (pr) pr.scrollTop = sc.p;
    } else {
      document.scrollingElement.scrollTop = 0;
      const pr = $(".principal");
      if (pr) pr.scrollTop = 0;
    }

    const b = $("#barra");
    const marca = () => b.classList.toggle("borde", (document.scrollingElement.scrollTop > 4) || ($(".principal") && $(".principal").scrollTop > 4));
    window.onscroll = marca;
    const pr2 = $(".principal"); if (pr2) pr2.onscroll = marca;

    bindBuscar(activo);

    // animación de entrada solo cuando cambia de pantalla (no en cada edición)
    const clave = r.n + "|" + (r.id || "") + "|" + (r.n === "plan" ? UI.estado.tab : "");
    if (clave !== UI.ultimaClave) {
      UI.ultimaClave = clave;
      const m = $("#main"), br = $("#barra");
      $$(".fila", m).forEach((f, i) => f.style.setProperty("--n", Math.min(i, 12)));
      if (m) { m.classList.add("entra"); br && br.classList.add("entra-barra"); clearTimeout(UI._tEntra); UI._tEntra = setTimeout(() => { m.classList.remove("entra"); br && br.classList.remove("entra-barra"); }, 1800); }
    }
  };

  function bindBuscar(activo) {
    const bl = $("#lat-lista #buscar");
    if (bl) bl.addEventListener("input", UI.debounce(() => { UI.estado.busqueda = bl.value; $("#lat-lista").innerHTML = UI.listaClientes(activo); const n = $("#lat-lista #buscar"); n && (n.focus(), n.setSelectionRange(n.value.length, n.value.length)); bindBuscar(activo); }, 200));
  }

  /* ============ eventos globales ============ */

  document.addEventListener("input", (e) => {
    const el = e.target.closest("[data-b]");
    if (!el || el.tagName === "SELECT") return;
    aplicarBinding(el);
  });
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-b]");
    if (el && el.tagName === "SELECT") aplicarBinding(el);
    const sw = e.target.closest("[data-sw]");
    if (sw && UI.ctx && UI.ctx.plan) { UI.ctx.plan.opciones[sw.dataset.sw] = sw.checked; UI.tocarPlan(UI.ctx.plan); }
  });

  function aplicarBinding(el) {
    const [k, campo] = el.dataset.b.split(":");
    let v = el.value;
    if (el.dataset.t === "int") v = parseInt(v, 10) || null;

    if (k === "c" && UI.ctx.cliente) {
      UI.ctx.cliente[campo] = v;
      if (campo === "nombre") { const t = $("#barra h1"); if (t) t.firstChild.textContent = v || "Nuevo cliente"; const l = $("#lat-lista"); }
      Store.guardar();
    } else if (k === "p" && UI.ctx.plan) {
      const plan = UI.ctx.plan;
      if (campo === "recs") plan.recomendaciones = v.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      else plan[campo] = v;
      if (campo === "titulo") { const t = $("#barra h1"); if (t) t.firstChild.textContent = v || "Plan"; }
      if (campo === "inicio" || campo === "semanaManual") { UI.tocarPlan(plan); UI.render(true); return; }
      UI.tocarPlan(plan);
    } else if (k === "ent") {
      Store.datos.entrenador[campo] = v;
      Store.guardar();
    }
  }

  document.addEventListener("click", async (e) => {
    const ir = e.target.closest("[data-ir]");
    if (ir) { UI.nav(ir.dataset.ir); return; }

    const tab = e.target.closest("[data-tab]");
    if (tab) { UI.estado.tab = tab.dataset.tab; UI.render(true); document.scrollingElement.scrollTop = 0; return; }

    const td = e.target.closest("[data-tab-der]");
    if (td) { UI.estado.tabDer = td.dataset.tabDer; UI.render(true); return; }

    const a = e.target.closest("[data-act]");
    if (!a) return;
    const f = ACCIONES[a.dataset.act];
    if (f) { e.preventDefault(); try { await f(a); } catch (err) { console.error(err); UI.aviso("Algo salió mal: " + (err.message || err), { error: true }); } }
  });

  window.addEventListener("hashchange", () => { UI.cerrarTodas(); UI.render(); });
  matchMedia("(min-width: 900px)").addEventListener("change", () => UI.render(true));
  matchMedia("(min-width: 1100px)").addEventListener("change", () => UI.render(true));

  /* ============ acciones ============ */

  const planActual = () => UI.ctx && UI.ctx.plan;
  const clienteActual = () => UI.ctx && UI.ctx.cliente;

  const ACCIONES = {
    "nuevo-cliente"() {
      let esGrupo = false;
      const hoja = UI.hoja({
        titulo: "Nuevo cliente", clase: "dialogo",
        html: `<div class="seg" style="margin-bottom:14px">
            <button data-tipo-cliente="0" class="on">Cliente individual</button>
            <button data-tipo-cliente="1">Grupo / clase</button>
          </div>
          <label class="campo"><span id="nc-lbl">Nombre y apellido</span><input id="nc-nombre" placeholder="Ej.: Lucía Fernández" autocapitalize="words" autocomplete="off"></label>
          <p class="ayuda" id="nc-ayuda">Después podrás completar edad, medidas, objetivos y lesiones.</p>`,
        pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="nc-ok">Crear cliente</button>`,
        alAbrir: (hh) => setTimeout(() => { const i = $("#nc-nombre", hh.el); i && i.focus(); }, 320),
      });
      $$("[data-tipo-cliente]", hoja.el).forEach((b) => b.addEventListener("click", () => {
        esGrupo = b.dataset.tipoCliente === "1";
        $$("[data-tipo-cliente]", hoja.el).forEach((x) => x.classList.toggle("on", x === b));
        $("#nc-lbl", hoja.el).textContent = esGrupo ? "Nombre del grupo o clase" : "Nombre y apellido";
        $("#nc-nombre", hoja.el).placeholder = esGrupo ? "Ej.: Clase de las 18 hs" : "Ej.: Lucía Fernández";
        $("#nc-ayuda", hoja.el).textContent = esGrupo ? "Después podrás indicar cuántos participantes son y sus objetivos." : "Después podrás completar edad, medidas, objetivos y lesiones.";
      }));
      const crear = () => {
        const nombre = $("#nc-nombre", hoja.el).value.trim();
        if (!nombre) { UI.aviso(esGrupo ? "Escribe el nombre del grupo o clase" : "Escribe el nombre del cliente", { error: true }); $("#nc-nombre", hoja.el).focus(); return; }
        const c = PF.nuevoCliente(esGrupo); c.nombre = nombre;
        Store.datos.clientes.push(c); Store.guardar();
        hoja.cerrar(); UI.nav("#/c/" + c.id);
      };
      $("#nc-ok", hoja.el).addEventListener("click", crear);
      $("#nc-nombre", hoja.el).addEventListener("keydown", (ev) => { if (ev.key === "Enter") crear(); });
    },

    "menu-cliente"() {
      const c = clienteActual();
      UI.menu(c.nombre || "Cliente", [
        { t: "Nuevo plan", ic: "plus", f: () => ACCIONES["nuevo-plan"]() },
        { t: "Eliminar cliente y sus planes", ic: "trash", peligro: true, f: async () => {
          const n = Store.planesDe(c.id).length;
          if (await UI.confirmar("Eliminar cliente", `Se eliminará ${c.nombre || "este cliente"}${n ? ` y sus ${n} ${n === 1 ? "plan" : "planes"}` : ""}. Esta acción no se puede deshacer.`, { si: "Eliminar", peligro: true })) {
            Store.datos.planes = Store.datos.planes.filter((p) => p.clienteId !== c.id);
            Store.datos.clientes = Store.datos.clientes.filter((x) => x.id !== c.id);
            Store.guardar(); UI.nav("#/"); UI.aviso("Cliente eliminado");
          }
        } },
      ]);
    },

    "nuevo-plan"() { UI.elegirTipoPlan(clienteActual()); },
    "nuevo-plan-rapido"() { UI.nuevoPlanRapido(); },
    "generar-pdf"() { UI.generarPDFRapido(); },

    "nuevo-plan-fuerza"() {
      const c = clienteActual();
      const otros = Store.datos.planes.filter((p) => p.tipo !== "funcional").slice().sort((a, b) => b.modificado - a.modificado).slice(0, 6);
      const hoja = UI.hoja({
        titulo: "Nuevo plan",
        html: `<div class="titulo-sec" style="margin-top:4px">Empieza con una estructura</div>
          ${D.PLANTILLAS_PLAN.map((p) => `<button class="fila" data-pl="${p.id}"><span class="avatar" style="background:${D.FASES_COLORES[0]}">${UI.ic("trend")}</span><span class="t"><b>${h(p.nombre)}</b><span>${p.fases.map((f) => f.nombre).join(" → ")}</span></span>${UI.ic("right", "flecha")}</button>`).join("")}
          ${otros.length ? `<div class="titulo-sec">O copia un plan que ya hiciste</div>
            ${otros.map((p) => { const cl = Store.cliente(p.clienteId); return `<button class="fila" data-cp="${p.id}"><span class="avatar" style="background:var(--relleno2);color:var(--txt2)">${UI.ic("copy")}</span><span class="t"><b>${h(p.titulo)}</b><span>${h(cl ? cl.nombre || "Cliente" : "")} · ${p.semanas} semanas · ${p.sesiones.length} sesiones</span></span></button>`; }).join("")}` : ""}`,
      });
      hoja.el.addEventListener("click", (e) => {
        const pl = e.target.closest("[data-pl]"), cp = e.target.closest("[data-cp]");
        if (pl) {
          const plan = PF.nuevoPlan(c.id, pl.dataset.pl);
          plan.titulo = "Plan de entrenamiento";
          Store.datos.planes.push(plan); Store.guardar(); hoja.cerrar();
          UI.estado.tab = "plan"; UI.nav("#/p/" + plan.id);
        } else if (cp) {
          const plan = PF.duplicarPlan(Store.plan(cp.dataset.cp), c.id);
          Store.datos.planes.push(plan); Store.guardar(); hoja.cerrar();
          UI.estado.tab = "plan"; UI.nav("#/p/" + plan.id);
          UI.aviso("Plan copiado. Ajusta las fechas y los valores.");
        }
      });
    },

    "menu-plan"() {
      const p = planActual();
      UI.menu(p.titulo, [
        { t: "Duplicar para este cliente", ic: "copy", f: () => { const c = PF.duplicarPlan(p); Store.datos.planes.push(c); Store.guardar(); UI.nav("#/p/" + c.id); UI.aviso("Plan duplicado"); } },
        { t: "Duplicar para otro cliente", ic: "users", f: () => elegirClienteParaCopia(p) },
        { t: "Eliminar plan", ic: "trash", peligro: true, f: async () => {
          if (await UI.confirmar("Eliminar plan", `¿Eliminar «${p.titulo}»? No se puede deshacer.`, { si: "Eliminar", peligro: true })) {
            Store.datos.planes = Store.datos.planes.filter((x) => x.id !== p.id); Store.guardar(); UI.nav("#/c/" + p.clienteId); UI.aviso("Plan eliminado");
          }
        } },
      ]);
    },

    "plantilla-fases"() {
      const p = planActual();
      const hoja = UI.hoja({
        titulo: "Plantillas de periodización", clase: "dialogo",
        html: `<p>Reemplaza las fases (y la duración) por una estructura típica. Tus ejercicios no se tocan.</p>${D.PLANTILLAS_PLAN.filter((x) => x.id !== "libre").map((x) => `<button class="fila" data-pl="${x.id}" style="box-shadow:none"><span class="t"><b>${h(x.nombre)}</b><span>${h(x.fases.map((f) => f.nombre + " " + f.semanas + " sem").join(" · "))}</span></span></button>`).join("")}`,
      });
      hoja.el.addEventListener("click", (e) => {
        const b = e.target.closest("[data-pl]"); if (!b) return;
        const t = D.PLANTILLAS_PLAN.find((x) => x.id === b.dataset.pl);
        p.semanas = t.semanas;
        p.fases = t.fases.map((f, i) => ({ id: PF.id(), nombre: f.nombre, semanas: f.semanas, objetivo: f.objetivo, color: D.FASES_COLORES[i % D.FASES_COLORES.length] }));
        PF.normalizarPlan(p); UI.tocarPlan(p); hoja.cerrar(); UI.render(true);
      });
    },

    "nueva-fase"() {
      const p = planActual();
      const resto = Math.max(1, p.semanas - PF.sumaFases(p));
      p.fases.push({ id: PF.id(), nombre: `Fase ${p.fases.length + 1}`, semanas: resto, objetivo: "", color: D.FASES_COLORES[p.fases.length % D.FASES_COLORES.length] });
      UI.tocarPlan(p); UI.render(true);
    },

    "nueva-sesion"() {
      const p = planActual();
      UI.editarSesion(p, null, (s) => { PF.normalizarPlan(p); p.sesiones.push(s); UI.tocarPlan(p); UI.render(true); });
    },

    async "copiar-semana"() {
      const p = planActual(), w = Math.max(1, Math.min(p.semanas, UI.estado.semanaVista[p.id] || PF.semanaActual(p)));
      if (w <= 1) return;
      if (await UI.confirmar("Copiar semana anterior", `Se reemplazarán los valores de la semana ${w} por los de la semana ${w - 1}.`, { si: "Copiar" })) {
        PF.copiarSemana(p, w - 1, w); UI.tocarPlan(p); UI.render(true); UI.aviso(`Semana ${w - 1} copiada a la ${w}`);
      }
    },

    traerFase() {
      const p = planActual(), w = Math.max(1, Math.min(p.semanas, UI.estado.semanaVista[p.id] || PF.semanaActual(p)));
      const rg = PF.rangosFases(p), aqui = PF.faseDeSemana(p, w);
      if (!aqui) return;
      const todos = p.sesiones.flatMap((s) => s.ejercicios);
      const enFase = (e, r) => !Array.isArray(e.fases) || e.fases.includes(r.fase.id);
      const otras = rg.filter((r) => r.fase.id !== aqui.fase.id);
      const hoja = UI.hoja({
        titulo: "Traer ejercicios de otra fase",
        html: `<p>Los ejercicios de la otra fase se suman a «${h(aqui.fase.nombre)}», con sus series y repeticiones. Los que ya estén aquí no se duplican.</p>
          ${otras.map((r) => { const t = todos.filter((e) => enFase(e, r) && !enFase(e, aqui)).length; return `<button class="fila" data-fid="${r.fase.id}" ${t ? "" : "disabled"} style="box-shadow:none"><span class="t"><b>${h(r.fase.nombre)}</b><span>${t ? t + (t === 1 ? " ejercicio" : " ejercicios") + " para traer" : "Nada nuevo para traer"}</span></span></button>`; }).join("")}`,
      });
      hoja.el.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-fid]"); if (!b || b.disabled) return;
        const r = rg.find((x) => x.fase.id === b.dataset.fid);
        let n = 0;
        todos.forEach((e) => { if (enFase(e, r) && !enFase(e, aqui)) { e.fases = [...e.fases, aqui.fase.id]; n++; } });
        UI.tocarPlan(p); hoja.cerrar(); UI.render(true); UI.aviso(n + (n === 1 ? " ejercicio traído" : " ejercicios traídos"));
      });
    },

    async descarga() {
      const p = planActual(), w = Math.max(1, Math.min(p.semanas, UI.estado.semanaVista[p.id] || PF.semanaActual(p)));
      const info = p.semInfo[w - 1];
      if (info.descarga) { info.descarga = false; UI.tocarPlan(p); UI.render(true); return; }
      if (w > 1 && p.sesiones.some((s) => s.ejercicios.length) &&
        await UI.confirmar("Semana de descarga", "¿Reducir automáticamente el volumen (≈ 60 % de las series) y la intensidad (≈ 85 %) respecto a la semana anterior?", { si: "Sí, reducir", no: "Solo marcar" })) {
        PF.aplicarDescarga(p, w);
      } else info.descarga = true;
      UI.tocarPlan(p); UI.render(true);
    },

    async compartir() {
      const { bytes, nombre } = crearPDF();
      const archivo = new File([bytes], nombre, { type: "application/pdf" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
          UI.compartiendo = true;
          try { await navigator.share({ files: [archivo], title: nombre.replace(/\.pdf$/, "").replace(/_/g, " ") }); } finally { UI.compartiendo = false; }
          return;
        }
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
      descargar(bytes, nombre);
      UI.aviso("PDF guardado en descargas");
    },

    "ver-pdf"() {
      const { bytes } = crearPDF();
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const w = window.open(url, "_blank");
      if (!w) location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    },

    "descargar-pdf"() { const { bytes, nombre } = crearPDF(); descargar(bytes, nombre); },

    exportar() {
      const txt = Store.exportarJSON();
      const nombre = `PlanFit_copia_${PF.hoyISO()}.json`;
      const bytes = new TextEncoder().encode(txt);
      const archivo = new File([bytes], nombre, { type: "application/json" });
      Store.datos.ultimaCopia = Date.now(); Store.guardarYa();
      (async () => {
        try { if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo], title: nombre }); UI.render(true); return; } }
        catch (err) { if (err && err.name === "AbortError") return; }
        descargar(bytes, nombre, "application/json"); UI.render(true); UI.aviso("Copia guardada");
      })();
    },

    "quitar-logo"() { Store.datos.entrenador.logo = ""; Store.guardar(); UI.render(true); },

    async "borrar-todo"() {
      if (await UI.confirmar("Borrar todos los datos", "Se eliminarán todos los clientes, planes y ajustes de este dispositivo. Si no tienes una copia de seguridad, no se podrán recuperar.", { si: "Borrar todo", peligro: true })) {
        Store.datos = PF.datosIniciales(); Store.guardarYa(); UI.aplicarColor(Store.datos.entrenador.color); UI.nav("#/"); UI.render(); UI.aviso("Datos borrados");
      }
    },

    actualizar() { aplicarActualizacion(); },
    lateral() { const v = !UI.lateralOculto(); try { localStorage.setItem("planfit.lateralOculto", v ? "1" : "0"); } catch (e) {} $("#app").classList.toggle("lat-oculto", v); UI.render(true); },
    "vista-ancha"(a) { Store.datos.entrenador.vistaAncha = a.dataset.v === "1"; Store.guardarYa(); UI.render(true); },
    async "buscar-act"() {
      if (!UI.reg) { UI.aviso("Las actualizaciones automáticas no están disponibles aquí"); return; }
      try { await UI.reg.update(); } catch (e) { /* sin conexión */ }
      setTimeout(() => { if (UI.hayActualizacion) UI.aviso("Hay una versión nueva", { accion: "Actualizar", alAccion: aplicarActualizacion, ms: 8000 }); else UI.aviso("Ya tienes la última versión"); }, 1200);
    },
  };
  UI.acciones = ACCIONES;

  function elegirClienteParaCopia(plan) {
    const otros = Store.datos.clientes.filter((c) => c.id !== plan.clienteId);
    if (!otros.length) { UI.aviso("No hay otros clientes. Crea uno primero."); return; }
    const hoja = UI.hoja({ titulo: "Duplicar para…", clase: "dialogo", html: otros.map((c) => `<button class="fila" data-c="${c.id}" style="box-shadow:none"><span class="avatar" style="background:${UI.colorAvatar(c.nombre + c.id)}">${h(UI.iniciales(c.nombre))}</span><span class="t"><b>${h(c.nombre || "Cliente")}</b></span></button>`).join("") });
    hoja.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]"); if (!b) return;
      const copia = PF.duplicarPlan(plan, b.dataset.c);
      Store.datos.planes.push(copia); Store.guardar(); hoja.cerrar(); UI.nav("#/p/" + copia.id); UI.aviso("Plan copiado");
    });
  }

  /* ============ PDF ============ */

  function crearPDF() {
    const plan = planActual(), cli = Store.cliente(plan.clienteId);
    if (plan.tipo === "funcional") {
      const bytes = root.PlanPDF.generarFuncional(plan, cli, Store.datos.entrenador, {});
      const nombre = [UI.nombreArchivo(cli && cli.nombre), UI.nombreArchivo(plan.titulo), "Funcional"].filter(Boolean).join("_") + ".pdf";
      let paginas = 0;
      try { const txt = new TextDecoder("latin1").decode(bytes); paginas = (txt.match(/\/Type \/Page /g) || []).length; } catch (x) { /* nada */ }
      const info = $("#pdf-info");
      if (info) info.textContent = `${nombre} · ${paginas} ${paginas === 1 ? "página" : "páginas"} · ${Math.max(1, Math.round(bytes.length / 1024))} KB`;
      return { bytes, nombre };
    }
    const e = UI.estado.pdf;
    const alcance = e.alcance;
    const rf = PF.rangosFases(plan)[e.fase || 0];
    const op = { alcance: alcance === "fase" && !rf ? "completo" : alcance, semana: e.semana, desde: e.desde, hasta: e.hasta };
    if (alcance === "fase" && rf) { op.desde = rf.desde; op.hasta = rf.hasta; }
    const bytes = root.PlanPDF.generar(plan, cli, Store.datos.entrenador, op);
    const suf = alcance === "semana" ? `Semana_${e.semana}` : alcance === "rango" ? `Semanas_${e.desde}-${e.hasta}` : alcance === "fase" && rf ? `Fase_${UI.nombreArchivo(rf.fase.nombre)}_Sem_${rf.desde}-${rf.hasta}` : "Completo";
    const nombre = [UI.nombreArchivo(cli && cli.nombre), UI.nombreArchivo(plan.titulo), suf].filter(Boolean).join("_") + ".pdf";
    let paginas = 0;
    try { const txt = new TextDecoder("latin1").decode(bytes); paginas = (txt.match(/\/Type \/Page /g) || []).length; } catch (x) { /* nada */ }
    const info = $("#pdf-info");
    if (info) info.textContent = `${nombre} · ${paginas} ${paginas === 1 ? "página" : "páginas"} · ${Math.max(1, Math.round(bytes.length / 1024))} KB`;
    return { bytes, nombre };
  }

  function descargar(bytes, nombre, tipo = "application/pdf") {
    const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
    const a = document.createElement("a");
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  UI.logoDesdeArchivo = (archivo) => new Promise((res, rej) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("imagen no válida")); };
    img.src = url;
  });

  /* ============ actualizaciones (service worker) ============ */

  function aplicarActualizacion() {
    if (UI.reg && UI.reg.waiting) { UI.recargarAlCambiar = true; UI.reg.waiting.postMessage({ tipo: "SALTAR_ESPERA" }); }
    else location.reload();
  }

  function iniciarSW() {
    UI.chequeo = Promise.resolve();
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    // La pantalla de arranque espera (máx. 2,5 s) a saber si hay versión nueva, para actualizar sin que se note
    let liberar = () => {};
    UI.chequeo = new Promise((r) => { liberar = r; setTimeout(r, 2500); });

    navigator.serviceWorker.register("sw.js").then((reg) => {
      UI.reg = reg;
      // Actualiza sola y en silencio: al abrir (con la pantalla de arranque todavía visible) o en cuanto sea seguro
      // (sin editar un campo, sin ventanas abiertas ni PDF en curso). Sin carteles: al volver a cargar solo
      // aparece una notita discreta que dice que se actualizó.
      const seguro = () => {
        const a = document.activeElement;
        const escribiendo = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);
        return !escribiendo && !document.querySelector("#capa .fondo") && !UI.compartiendo;
      };
      let reintento = null;
      const intentar = () => {
        if (!reg.waiting) { clearInterval(reintento); reintento = null; return; }
        if (seguro()) {
          clearInterval(reintento); reintento = null;
          try { Store.guardarYa(); localStorage.setItem("planfit.recienActualizada", "1"); } catch (e) { /* nada */ }
          aplicarActualizacion();
        }
      };
      const avisar = () => {
        UI.hayActualizacion = true;
        intentar();
        if (reg.waiting && !reintento) reintento = setInterval(intentar, 4000);
      };
      if (reg.waiting && navigator.serviceWorker.controller) avisar();
      reg.addEventListener("updatefound", () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener("statechange", () => {
          if (nuevo.state === "installed" && navigator.serviceWorker.controller) avisar();
          else if (nuevo.state === "redundant") liberar();
        });
      });
      reg.update().then(() => { if (!reg.installing && !reg.waiting) liberar(); }).catch(liberar);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) reg.update().catch(() => {}); });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => liberar());

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (UI.recargarAlCambiar) { UI.recargarAlCambiar = false; location.reload(); }
    });
  }

  /* ============ inicio ============ */

  Store.cargar();
  UI.aplicarColor(Store.datos.entrenador.color);
  UI.render();
  iniciarSW();

  // sin zoom: ni doble toque, ni pellizco, ni ctrl+rueda
  ["gesturestart", "gesturechange", "gestureend"].forEach((ev) => document.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });
  let ultimoToque = 0;
  document.addEventListener("touchend", (e) => {
    const t = Date.now();
    if (t - ultimoToque < 350 && !e.target.closest("input, textarea, select")) e.preventDefault();
    ultimoToque = t;
  }, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });

  // quita la pantalla de arranque
  const arr = document.getElementById("arranque");
  Promise.all([new Promise((r) => setTimeout(r, 650)), UI.chequeo]).then(() => {
    if (arr) { arr.classList.add("fuera"); setTimeout(() => arr.remove(), 600); }
    // aviso muy discreto si la app acaba de actualizarse sola
    let nota = false;
    try { nota = localStorage.getItem("planfit.recienActualizada") === "1"; localStorage.removeItem("planfit.recienActualizada"); } catch (e) { /* nada */ }
    if (nota) setTimeout(() => {
      const n = document.createElement("div");
      n.className = "nota-disc"; n.textContent = "Actualizada · v" + UI.VERSION;
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 3800);
    }, 700);
  });

  // Pide almacenamiento persistente para que el sistema no borre los datos
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* nada */ }
})(window);
