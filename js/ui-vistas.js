/* Pantallas de la app. Cada vista devuelve { titulo, sub, atras, acciones, html, bind(el) }. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, D = root.PF_DATA, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  const V = (UI.vistas = {});

  UI.estado = { tab: "sesiones", semanaVista: {}, pdf: { alcance: "semana", desde: 1, hasta: 4, semana: null }, busqueda: "" };

  UI.anchoGrafica = () => { const m = $("#main"); const base = m ? m.clientWidth : Math.min(innerWidth - (innerWidth >= 900 ? 320 : 0), 1000); return Math.max(290, Math.min(900, base - 28 - 32)); };

  const nav = (ruta) => { location.hash = ruta; };
  UI.nav = nav;

  const campo = (etq, b, valor, attrs = "") => `<label class="campo"><span>${h(etq)}</span><input data-b="${b}" value="${h(valor ?? "")}" ${attrs}></label>`;
  const interruptor = (t, sub, b, on) => `<label class="interruptor"><span class="t"><b>${h(t)}</b>${sub ? `<span>${h(sub)}</span>` : ""}</span><span class="sw"><input type="checkbox" data-sw="${b}" ${on ? "checked" : ""}><i></i></span></label>`;

  const faseTexto = (plan) => {
    const w = PF.semanaActual(plan), f = PF.faseDeSemana(plan, w);
    return `Semana ${w} de ${plan.semanas}${f ? " · " + f.fase.nombre : ""}`;
  };

  /* ============ CLIENTES ============ */

  UI.listaClientes = (activo) => {
    const d = Store.datos;
    const q = (UI.estado.busqueda || "").toLowerCase();
    const lista = d.clientes.filter((c) => !q || (c.nombre || "").toLowerCase().includes(q))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

    if (!d.clientes.length) return "";

    return (d.clientes.length > 6 ? `<label class="campo"><span style="display:none">Buscar</span><input id="buscar" type="search" placeholder="Buscar cliente…" value="${h(UI.estado.busqueda)}"></label>` : "") +
      lista.map((c) => {
        const planes = Store.planesDe(c.id);
        const p = planes[0];
        const sub = p ? `${p.titulo} · ${faseTexto(p)}` : "Sin planes todavía";
        return `<a class="fila ${c.id === activo ? "on" : ""}" href="#/c/${c.id}">
          <span class="avatar" style="background:${UI.colorAvatar(c.nombre + c.id)}">${h(UI.iniciales(c.nombre))}</span>
          <span class="t"><b>${h(c.nombre || "Cliente sin nombre")}</b><span>${h(sub)}</span></span>
          ${planes.length > 1 ? `<span class="pildora">${planes.length} planes</span>` : ""}
          ${UI.ic("right", "flecha")}</a>`;
      }).join("") + (lista.length ? "" : `<p class="vacio">Sin resultados</p>`);
  };

  const hoyMenos = (dias) => Date.now() - dias * 86400000;

  V.clientes = () => {
    const d = Store.datos;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const instalada = window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
    const avisos = [];

    if (!d.entrenador.nombre) {
      avisos.push(`<div class="aviso-caja info-caja">${UI.ic("info")}<div><b>Completa tus datos</b><br>Tu nombre, contacto y logo aparecen en la portada de cada PDF. <a href="#/ajustes" style="color:var(--acento);font-weight:700">Ir a Ajustes</a></div></div>`);
    }
    if (ios && !instalada && !localStorage.getItem("pf.ocultarInstalar")) {
      avisos.push(`<div class="aviso-caja info-caja" id="av-instalar">${UI.ic("share")}<div><b>Instala la app</b><br>En Safari toca <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>. Así se abre a pantalla completa y funciona sin conexión. <a href="#" data-ocultar style="color:var(--acento);font-weight:700">Ocultar</a></div></div>`);
    }
    if (d.planes.length && (!d.ultimaCopia || d.ultimaCopia < hoyMenos(30)) && !sessionStorage.getItem("pf.ocultarCopia")) {
      avisos.push(`<div class="aviso-caja">${UI.ic("alert")}<div><b>Haz una copia de seguridad</b><br>Tus datos se guardan solo en este dispositivo. <a href="#/ajustes" style="color:inherit;font-weight:700;text-decoration:underline">Guardar copia</a></div></div>`);
    }

    const lista = UI.listaClientes(null);

    return {
      titulo: "Clientes",
      acciones: `<button class="icono" data-act="nuevo-cliente" aria-label="Nuevo cliente">${UI.ic("plus")}</button>`,
      html: `${avisos.join("")}
        ${lista || `<div class="vacio"><div class="ic">${UI.ic("users")}</div><h2>Aún no hay clientes</h2><p>Crea un cliente, arma su plan de entrenamiento y envíale un PDF profesional en minutos.</p><button class="btn primario" data-act="nuevo-cliente">${UI.ic("plus")}Nuevo cliente</button></div>`}`,
      bind(el) {
        const b = $("#buscar", el);
        if (b) b.addEventListener("input", UI.debounce(() => { UI.estado.busqueda = b.value; UI.render(true); const n = $("#buscar"); n && (n.focus(), n.setSelectionRange(n.value.length, n.value.length)); }, 200));
        const o = $("[data-ocultar]", el);
        if (o) o.addEventListener("click", (e) => { e.preventDefault(); localStorage.setItem("pf.ocultarInstalar", "1"); $("#av-instalar").remove(); });
      },
    };
  };

  V.inicioAncho = () => ({
    titulo: "PlanFit",
    html: `<div class="vacio" style="padding-top:80px"><div class="ic">${UI.ic("dumbbell")}</div><h2>Rutinas profesionales en minutos</h2><p>Elige un cliente a la izquierda, o crea uno nuevo, para armar su plan de entrenamiento y exportarlo en PDF.</p><button class="btn primario" data-act="nuevo-cliente">${UI.ic("plus")}Nuevo cliente</button></div>`,
  });

  /* ============ CLIENTE ============ */

  V.cliente = (r) => {
    const c = Store.cliente(r.id);
    if (!c) return { titulo: "Cliente", atras: "#/", html: `<div class="vacio"><h2>No se encontró el cliente</h2></div>` };
    UI.ctx = { cliente: c };
    const planes = Store.planesDe(c.id);

    const objetivos = D.OBJETIVOS_SUGERIDOS.map((o) => `<button class="chip" data-obj="${h(o)}">${h(o)}</button>`).join("");

    const datosHtml = `
        <div class="titulo-sec">Datos del cliente</div>
        <div class="tarjeta">
          ${campo("Nombre y apellido", "c:nombre", c.nombre, 'placeholder="Ej.: Lucía Fernández" autocapitalize="words" autocomplete="off"')}
          <div class="cols3">
            ${campo("Edad", "c:edad", c.edad, 'inputmode="numeric" placeholder="años"')}
            ${campo("Altura (cm)", "c:altura", c.altura, 'inputmode="decimal" placeholder="cm"')}
            ${campo("Peso (kg)", "c:peso", c.peso, 'inputmode="decimal" placeholder="kg"')}
          </div>
          <label class="campo"><span>Objetivos</span><textarea data-b="c:objetivos" placeholder="¿Qué quiere lograr?">${h(c.objetivos)}</textarea></label>
          <div class="chips scroll">${objetivos}</div>
          <label class="campo"><span>Lesiones y limitaciones</span><textarea data-b="c:lesiones" placeholder="Lesiones previas, dolores, cirugías, condiciones médicas…">${h(c.lesiones)}</textarea></label>
          <label class="campo"><span>Notas privadas (no salen en el PDF)</span><textarea data-b="c:notas" placeholder="Horarios, preferencias, historial…">${h(c.notas)}</textarea></label>
        </div>`;

    return {
      titulo: c.nombre || "Nuevo cliente", sub: planes.length ? `${planes.length} ${planes.length === 1 ? "plan" : "planes"}` : "", atras: "#/",
      acciones: `<button class="icono" data-act="menu-cliente" aria-label="Más opciones">${UI.ic("dots")}</button>`,
      html: (planes.length ? "" : datosHtml) + `
        <div class="titulo-sec">Planes
          <span class="der"><button class="btn chico suave" data-act="nuevo-plan">${UI.ic("plus")}Nuevo plan</button></span></div>
        ${planes.length ? planes.map((p) => {
          const est = PF.estadoPlan(p);
          return `<a class="fila" href="#/p/${p.id}"><span class="avatar" style="background:${(p.fases[0] || {}).color || "var(--acento)"}">${UI.ic("trend")}</span>
            <span class="t"><b>${h(p.titulo)}</b><span>${h(faseTexto(p))}</span></span>
            <span class="pildora ${est === "en curso" ? "ok" : ""}">${est}</span>${UI.ic("right", "flecha")}</a>`;
        }).join("") : `<div class="tarjeta" style="text-align:center;color:var(--txt2)">Este cliente todavía no tiene planes.<br><br><button class="btn primario" data-act="nuevo-plan">${UI.ic("plus")}Crear el primer plan</button></div>`}
` + (planes.length ? datosHtml : ""),
      bind(el) {
        $$("[data-obj]", el).forEach((b) => b.addEventListener("click", () => {
          const t = $('[data-b="c:objetivos"]', el), v = b.dataset.obj;
          if (!t.value.includes(v)) { t.value = (t.value.trim() ? t.value.trim().replace(/[.,;]$/, "") + ". " : "") + v; c.objetivos = t.value; Store.guardar(); }
        }));
      },
    };
  };

  /* ============ PLAN ============ */

  const semanaVista = (plan) => {
    const v = UI.estado.semanaVista[plan.id];
    return Math.max(1, Math.min(plan.semanas, v || PF.semanaActual(plan)));
  };

  V.plan = (r) => {
    const plan = Store.plan(r.id);
    if (!plan) return { titulo: "Plan", atras: "#/", html: `<div class="vacio"><h2>No se encontró el plan</h2></div>` };
    const cli = Store.cliente(plan.clienteId);
    UI.ctx = { cliente: cli, plan };
    const tab = UI.estado.tab;

    const tabs = `<div class="tabs-plan"><div class="seg">
      ${[["plan", "Plan"], ["sesiones", "Sesiones"], ["pdf", "PDF"]].map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? "on" : ""}">${t}</button>`).join("")}</div></div>`;

    const cuerpo = tab === "plan" ? tabPlan(plan, cli) : tab === "pdf" ? tabPDF(plan, cli) : tabSesiones(plan, cli);

    return {
      titulo: plan.titulo || "Plan", sub: cli ? cli.nombre : "", atras: cli ? `#/c/${cli.id}` : "#/",
      acciones: `<button class="icono" data-act="menu-plan" aria-label="Más opciones">${UI.ic("dots")}</button>`,
      html: tabs + cuerpo.html,
      bind(el) { cuerpo.bind && cuerpo.bind(el); },
    };
  };

  /* ---------- pestaña PLAN ---------- */

  function tabPlan(plan, cli) {
    const suma = PF.sumaFases(plan);
    const marcada = PF.semanaActual(plan);
    const desajuste = suma !== plan.semanas;

    const fases = plan.fases.map((f, i) => `
      <div class="fase-ed" data-fase="${i}">
        <div class="cab">
          <button class="punto" style="background:${f.color};border:0;padding:0" data-color="${i}" aria-label="Cambiar color"></button>
          <input data-bf="${i}:nombre" value="${h(f.nombre)}" placeholder="Nombre de la fase" aria-label="Nombre de la fase">
          <button class="icono gris" data-fmov="${i}:-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>${UI.ic("up")}</button>
          <button class="icono gris" data-fmov="${i}:1" aria-label="Bajar" ${i === plan.fases.length - 1 ? "disabled" : ""}>${UI.ic("down")}</button>
          <button class="icono gris" data-fdel="${i}" aria-label="Eliminar fase">${UI.ic("trash")}</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="stepper"><button data-fsem="${i}:-1" aria-label="Menos">−</button><input data-bf="${i}:semanas" inputmode="numeric" value="${f.semanas}" aria-label="Semanas"><small>sem</small><button data-fsem="${i}:1" aria-label="Más">+</button></div>
          <span class="muted peq" id="f-rango-${i}"></span>
        </div>
        <textarea class="entrada" style="min-height:64px" data-bf="${i}:objetivo" placeholder="¿De qué trata esta fase? (aparece en el PDF)">${h(f.objetivo)}</textarea>
      </div>`).join("");

    return {
      html: `
        <div class="tarjeta">
          <h2>Datos del plan</h2>
          ${campo("Título del plan", "p:titulo", plan.titulo, 'placeholder="Ej.: Plan de fuerza e hipertrofia"')}
          <div class="cols2">
            <label class="campo"><span>Fecha de inicio</span><input type="date" data-b="p:inicio" value="${h(plan.inicio)}"></label>
            <div class="campo"><span>Duración</span><div class="stepper" style="width:100%;justify-content:space-between"><button data-sem="-1" aria-label="Menos">−</button><input id="in-semanas" inputmode="numeric" value="${plan.semanas}" style="flex:1"><small>semanas</small><button data-sem="1" aria-label="Más">+</button></div></div>
          </div>
          <p class="ayuda" id="ayuda-duracion">${h(duracionTxt(plan))}</p>
          <div class="campo"><span>Semana actual del cliente</span>
            <div class="seg"><button data-auto="1" class="${plan.semanaManual ? "" : "on"}">Automática</button><button data-auto="0" class="${plan.semanaManual ? "on" : ""}">Elegir a mano</button></div></div>
          ${plan.semanaManual ? `<label class="campo"><select data-b="p:semanaManual" data-t="int">${Array.from({ length: plan.semanas }, (_, i) => `<option value="${i + 1}" ${i + 1 === plan.semanaManual ? "selected" : ""}>Semana ${i + 1}</option>`).join("")}</select></label>` : ""}
        </div>

        <div class="tarjeta">
          <h2>Mapa del plan <span class="der">${h(faseTexto(plan))}</span></h2>
          <div id="grafica">${UI.grafica(plan, marcada, UI.anchoGrafica())}</div>
          <div id="grafica-ley">${UI.leyendaGrafica(plan)}</div>
        </div>

        <div class="titulo-sec">Fases <span class="der"><button class="btn chico suave" data-act="plantilla-fases">${UI.ic("layers")}Usar plantilla</button></span></div>
        ${desajuste ? `<div class="aviso-caja">${UI.ic("alert")}<div>Las fases suman <b>${suma}</b> semanas y el plan dura <b>${plan.semanas}</b>. ${suma < plan.semanas ? "Las semanas que sobran quedan sin fase." : "Se recortará lo que sobre."} <a href="#" data-ajustar style="color:inherit;font-weight:700;text-decoration:underline">Ajustar duración a las fases</a></div></div>` : ""}
        <div id="fases">${fases}</div>
        <button class="btn bloque" data-act="nueva-fase">${UI.ic("plus")}Añadir fase</button>

        <div class="titulo-sec">Notas y recomendaciones</div>
        <div class="tarjeta">
          <label class="campo"><span>Notas del entrenador (salen al final del PDF)</span><textarea data-b="p:notas" placeholder="Un mensaje personal para el cliente…">${h(plan.notas)}</textarea></label>
          <label class="campo"><span>Recomendaciones (una por línea)</span><textarea data-b="p:recs" style="min-height:140px">${h(plan.recomendaciones.join("\n"))}</textarea></label>
        </div>`,
      bind(el) {
        pintarRangos(el, plan);
        const sem = $("#in-semanas", el);
        sem.addEventListener("change", () => { cambiarSemanas(plan, PF.num(sem.value) ?? plan.semanas); });
        $$("[data-sem]", el).forEach((b) => b.addEventListener("click", () => cambiarSemanas(plan, plan.semanas + +b.dataset.sem)));
        $$("[data-auto]", el).forEach((b) => b.addEventListener("click", () => {
          plan.semanaManual = b.dataset.auto === "1" ? null : PF.semanaActual(plan);
          tocarPlan(plan); UI.render(true);
        }));
        const aj = $("[data-ajustar]", el);
        if (aj) aj.addEventListener("click", (e) => { e.preventDefault(); cambiarSemanas(plan, PF.sumaFases(plan) || plan.semanas); });

        /* fases */
        $$("[data-color]", el).forEach((b) => b.addEventListener("click", () => elegirColor(plan, +b.dataset.color)));
        $$("[data-fmov]", el).forEach((b) => b.addEventListener("click", () => {
          const [i, d] = b.dataset.fmov.split(":").map(Number), j = i + d;
          if (j < 0 || j >= plan.fases.length) return;
          [plan.fases[i], plan.fases[j]] = [plan.fases[j], plan.fases[i]]; tocarPlan(plan); UI.render(true);
        }));
        $$("[data-fdel]", el).forEach((b) => b.addEventListener("click", async () => {
          if (await UI.confirmar("Eliminar fase", "¿Eliminar esta fase? Las semanas quedarán sin fase.", { si: "Eliminar", peligro: true })) { plan.fases.splice(+b.dataset.fdel, 1); tocarPlan(plan); UI.render(true); }
        }));
        $$("[data-fsem]", el).forEach((b) => b.addEventListener("click", () => {
          const [i, d] = b.dataset.fsem.split(":").map(Number);
          plan.fases[i].semanas = Math.max(1, (+plan.fases[i].semanas || 1) + d); tocarPlan(plan); UI.render(true);
        }));
        $$("[data-bf]", el).forEach((inp) => inp.addEventListener("input", () => {
          const [i, k] = inp.dataset.bf.split(":");
          const f = plan.fases[+i];
          if (k === "semanas") { f.semanas = Math.max(0, Math.round(PF.num(inp.value) ?? 0)); }
          else f[k] = inp.value;
          tocarPlan(plan);
          refrescarGrafica(plan); pintarRangos(el, plan);
        }));
        $$("[data-bf$=':semanas']", el).forEach((inp) => inp.addEventListener("change", () => UI.render(true)));
      },
    };
  }

  const duracionTxt = (plan) => {
    const meses = plan.semanas / 4.345;
    const fin = PF.sumarDias(plan.inicio, plan.semanas * 7 - 1);
    return `≈ ${(Math.round(meses * 10) / 10).toString().replace(".", ",")} meses · del ${PF.fechaCorta(plan.inicio)} al ${PF.fechaCorta(fin)}`;
  };

  function pintarRangos(el, plan) {
    PF.rangosFases(plan).forEach((r) => {
      const i = plan.fases.indexOf(r.fase), t = $("#f-rango-" + i, el);
      if (t) t.textContent = r.desde === r.hasta ? `semana ${r.desde}` : `semanas ${r.desde}–${r.hasta}`;
    });
  }

  function refrescarGrafica(plan) {
    const g = $("#grafica");
    if (g) { g.innerHTML = UI.grafica(plan, PF.semanaActual(plan), UI.anchoGrafica()); $("#grafica-ley").innerHTML = UI.leyendaGrafica(plan); }
  }

  function tocarPlan(plan) { plan.modificado = Date.now(); Store.guardar(); }
  UI.tocarPlan = tocarPlan;

  function cambiarSemanas(plan, n) {
    n = Math.max(1, Math.min(52, Math.round(n)));
    if (n === plan.semanas) { UI.render(true); return; }
    plan.semanas = n;
    PF.normalizarPlan(plan);
    if (plan.semanaManual) plan.semanaManual = Math.min(plan.semanaManual, n);
    tocarPlan(plan);
    UI.render(true);
  }

  function elegirColor(plan, i) {
    const h2 = UI.hoja({
      titulo: "Color de la fase", clase: "dialogo",
      html: `<div class="paleta" style="padding:8px 0 14px">${D.FASES_COLORES.map((c) => `<button data-c="${c}" style="background:${c}" class="${plan.fases[i].color === c ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div>`,
    });
    h2.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]");
      if (!b) return;
      plan.fases[i].color = b.dataset.c; tocarPlan(plan); h2.cerrar(); UI.render(true);
    });
  }

  /* ---------- pestaña SESIONES ---------- */

  function tabSesiones(plan, cli) {
    const w = semanaVista(plan);
    const info = PF.faseDeSemana(plan, w);
    const desc = plan.semInfo[w - 1].descarga;
    const hoy = PF.semanaActual(plan);
    const rpe = plan.opciones.rpe;
    const cols = rpe ? 5 : 4;

    const strip = Array.from({ length: plan.semanas }, (_, i) => {
      const f = PF.faseDeSemana(plan, i + 1);
      return `<button data-w="${i + 1}" class="${i + 1 === w ? "on" : ""} ${i + 1 === hoy ? "hoy" : ""}" style="background:${f ? f.fase.color : "#8A93A6"}" aria-label="Semana ${i + 1}">${i + 1}</button>`;
    }).join("");

    const sesiones = plan.sesiones.map((s, si) => {
      const total = s.ejercicios.reduce((a, e) => a + (+e.sem[w - 1].s || 0), 0);
      const dia = s.dia ? s.dia.slice(0, 3).toUpperCase() : "";
      return `<section class="sesion" data-ses="${si}">
        <div class="sesion-cab">
          ${dia ? `<span class="dia">${h(dia)}</span>` : ""}
          <button class="t" data-edit-ses="${si}" style="border:0;background:none;text-align:left;padding:0"><b>${h(s.nombre || "Sesión " + (si + 1))}</b><span data-resumen="${si}">${s.ejercicios.length} ejercicios · ${total} series${s.foco ? " · " + h(s.foco) : ""}</span></button>
          <button class="icono" data-menu-ses="${si}" aria-label="Opciones de la sesión">${UI.ic("dots")}</button>
        </div>
        ${s.ejercicios.map((e, ei) => {
          const c = e.sem[w - 1];
          const kg = plan.opciones.kg ? PF.kgDe(e, w) : null;
          return `<div class="ej" data-ej="${e.id}" data-si="${si}" data-ei="${ei}">
            <div class="ej-cab">
              ${e.super ? `<span class="et">${h(e.super)}</span>` : ""}
              <button class="nombre" data-edit-ej="${si}:${ei}">${h(e.nombre)}<span class="nota">${[e.tempo ? "Tempo " + h(e.tempo) : "", e.rm ? "Máx. " + h(e.rm) + " kg" : "", e.nota ? h(e.nota) : ""].filter(Boolean).join(" · ") || "&nbsp;"}</span></button>
              <button class="icono gris" data-mov-ej="${si}:${ei}:-1" aria-label="Subir" ${ei === 0 ? "disabled" : ""} style="width:34px;height:34px">${UI.ic("up")}</button>
              <button class="icono gris" data-mov-ej="${si}:${ei}:1" aria-label="Bajar" ${ei === s.ejercicios.length - 1 ? "disabled" : ""} style="width:34px;height:34px">${UI.ic("down")}</button>
            </div>
            <div class="vals" style="grid-template-columns:repeat(${cols},1fr)">
              <label><span>Series</span><input data-c="s" inputmode="numeric" value="${h(c.s)}"></label>
              <label><span>Reps</span><input data-c="r" value="${h(c.r)}"></label>
              <label><span>Desc. s</span><input data-c="d" inputmode="numeric" value="${h(c.d)}"></label>
              <label><span>%</span><input data-c="i" inputmode="decimal" value="${h(c.i ?? "")}" placeholder="–"><div class="kg" data-kg>${kg ? kg + " kg" : "&nbsp;"}</div></label>
              ${rpe ? `<label><span>RPE</span><input data-c="rpe" inputmode="decimal" value="${h(c.rpe ?? "")}" placeholder="–"></label>` : ""}
            </div>
          </div>`;
        }).join("")}
        <button class="add-ej" data-add-ej="${si}">${UI.ic("plus")}Añadir ejercicio</button>
      </section>`;
    }).join("");

    return {
      html: `
        <div class="sel-semana">
          <button class="icono" data-wk="-1" aria-label="Semana anterior" ${w <= 1 ? "disabled" : ""}>${UI.ic("left")}</button>
          <div class="centro"><b>Semana ${w} de ${plan.semanas}</b><span>${info ? `<i class="punto" style="background:${info.fase.color}"></i>${h(info.fase.nombre)}` : "Sin fase"}${desc ? ` · <span class="pildora aviso">descarga</span>` : ""}${w === hoy ? ` · <span class="pildora acento">actual</span>` : ""}</span></div>
          <button class="icono" data-wk="1" aria-label="Semana siguiente" ${w >= plan.semanas ? "disabled" : ""}>${UI.ic("right")}</button>
        </div>
        <div class="mini-semanas">${strip}</div>
        <div class="dos-btn" style="margin-bottom:12px">
          <button class="btn chico" data-act="copiar-semana" ${w <= 1 ? "disabled" : ""}>${UI.ic("copy")}Copiar sem. anterior</button>
          <button class="btn chico ${desc ? "suave" : ""}" data-act="descarga">${desc ? "Quitar descarga" : "Marcar descarga"}</button>
        </div>
        <details ${plan.semInfo[w - 1].nota ? "open" : ""} style="margin-bottom:14px"><summary class="peq muted" style="cursor:pointer;padding:4px 2px">Nota para esta semana (sale en el PDF)</summary>
          <textarea class="entrada" id="nota-sem" style="margin-top:6px;min-height:70px" placeholder="Ej.: Semana de adaptación, prioriza la técnica">${h(plan.semInfo[w - 1].nota)}</textarea></details>
        ${plan.sesiones.length ? sesiones : `<div class="vacio"><div class="ic">${UI.ic("dumbbell")}</div><h2>Crea la primera sesión</h2><p>Una sesión es un día de entrenamiento (por ejemplo «Día 1 · Pierna»). Después añades los ejercicios.</p></div>`}
        <button class="btn ${plan.sesiones.length ? "" : "primario"} bloque" data-act="nueva-sesion">${UI.ic("plus")}Añadir sesión</button>
        ${plan.sesiones.length ? `<p class="ayuda" style="margin-top:12px;text-align:center">Edita aquí los valores de la semana ${w}. Toca el nombre de un ejercicio para cambiar su evolución semana a semana.</p>` : ""}`,
      bind(el) {
        const nota = $("#nota-sem", el);
        if (nota) nota.addEventListener("input", () => { plan.semInfo[w - 1].nota = nota.value; tocarPlan(plan); });

        $$("[data-wk]", el).forEach((b) => b.addEventListener("click", () => { UI.estado.semanaVista[plan.id] = w + +b.dataset.wk; UI.render(true); }));
        $$(".mini-semanas [data-w]", el).forEach((b) => b.addEventListener("click", () => { UI.estado.semanaVista[plan.id] = +b.dataset.w; UI.render(true); }));
        const on = $(".mini-semanas .on", el);
        if (on) on.scrollIntoView({ inline: "center", block: "nearest" });

        // valores inline
        el.addEventListener("input", (e) => {
          const inp = e.target.closest(".ej input[data-c]");
          if (!inp) return;
          const fila = inp.closest(".ej"), si = +fila.dataset.si, ei = +fila.dataset.ei;
          const ej = plan.sesiones[si].ejercicios[ei], c = ej.sem[w - 1], k = inp.dataset.c;
          if (k === "s" || k === "d") c[k] = inp.value === "" ? 0 : Math.max(0, Math.round(PF.num(inp.value) ?? 0));
          else if (k === "i") { c.i = PF.num(inp.value); const kg = $("[data-kg]", fila); if (kg) { const v = plan.opciones.kg ? PF.kgDe(ej, w) : null; kg.innerHTML = v ? v + " kg" : "&nbsp;"; } }
          else c[k] = inp.value;
          if (k === "s") { const s = plan.sesiones[si]; const t = s.ejercicios.reduce((a, x) => a + (+x.sem[w - 1].s || 0), 0); $(`[data-resumen="${si}"]`, el).textContent = `${s.ejercicios.length} ejercicios · ${t} series${s.foco ? " · " + s.foco : ""}`; }
          tocarPlan(plan);
        });

        $$("[data-edit-ej]", el).forEach((b) => b.addEventListener("click", () => {
          const [si, ei] = b.dataset.editEj.split(":").map(Number);
          const ses = plan.sesiones[si];
          UI.editarEjercicio(plan, ses.ejercicios[ei], (ej) => { ses.ejercicios[ei] = ej; tocarPlan(plan); UI.render(true); }, () => { ses.ejercicios.splice(ei, 1); tocarPlan(plan); UI.render(true); });
        }));

        $$("[data-mov-ej]", el).forEach((b) => b.addEventListener("click", () => {
          const [si, ei, d] = b.dataset.movEj.split(":").map(Number), l = plan.sesiones[si].ejercicios, j = ei + d;
          if (j < 0 || j >= l.length) return;
          [l[ei], l[j]] = [l[j], l[ei]]; tocarPlan(plan); UI.render(true);
        }));

        $$("[data-add-ej]", el).forEach((b) => b.addEventListener("click", () => {
          const ses = plan.sesiones[+b.dataset.addEj];
          UI.editarEjercicio(plan, null, (ej) => { ses.ejercicios.push(ej); tocarPlan(plan); UI.render(true); });
        }));

        $$("[data-edit-ses]", el).forEach((b) => b.addEventListener("click", () => editarSesionN(plan, +b.dataset.editSes)));
        $$("[data-menu-ses]", el).forEach((b) => b.addEventListener("click", () => menuSesion(plan, +b.dataset.menuSes)));
      },
    };
  }

  function editarSesionN(plan, si) {
    const ses = plan.sesiones[si];
    UI.editarSesion(plan, ses, (b) => { Object.assign(ses, { nombre: b.nombre, dia: b.dia, foco: b.foco, calentamiento: b.calentamiento }); tocarPlan(plan); UI.render(true); }, {
      duplicar: () => duplicarSesion(plan, si),
      eliminar: () => { plan.sesiones.splice(si, 1); tocarPlan(plan); UI.render(true); },
    });
  }

  function duplicarSesion(plan, si) {
    const copia = JSON.parse(JSON.stringify(plan.sesiones[si]));
    copia.id = PF.id(); copia.nombre += " (copia)";
    copia.ejercicios.forEach((e) => (e.id = PF.id()));
    plan.sesiones.splice(si + 1, 0, copia); tocarPlan(plan); UI.render(true);
    UI.aviso("Sesión duplicada");
  }

  function menuSesion(plan, si) {
    const ses = plan.sesiones[si];
    UI.menu(ses.nombre || "Sesión", [
      { t: "Editar sesión", ic: "settings", f: () => editarSesionN(plan, si) },
      { t: "Duplicar sesión", ic: "copy", f: () => duplicarSesion(plan, si) },
      ...(si > 0 ? [{ t: "Mover arriba", ic: "up", f: () => { [plan.sesiones[si - 1], plan.sesiones[si]] = [plan.sesiones[si], plan.sesiones[si - 1]]; tocarPlan(plan); UI.render(true); } }] : []),
      ...(si < plan.sesiones.length - 1 ? [{ t: "Mover abajo", ic: "down", f: () => { [plan.sesiones[si + 1], plan.sesiones[si]] = [plan.sesiones[si], plan.sesiones[si + 1]]; tocarPlan(plan); UI.render(true); } }] : []),
      { t: "Eliminar sesión", ic: "trash", peligro: true, f: async () => { if (await UI.confirmar("Eliminar sesión", `¿Eliminar «${ses.nombre}» con sus ${ses.ejercicios.length} ejercicios?`, { si: "Eliminar", peligro: true })) { plan.sesiones.splice(si, 1); tocarPlan(plan); UI.render(true); } } },
    ]);
  }

  /* ---------- pestaña PDF ---------- */

  function tabPDF(plan, cli) {
    const e = UI.estado.pdf;
    const hoy = PF.semanaActual(plan);
    if (!e.semana || e.semana > plan.semanas) e.semana = hoy;
    e.hasta = Math.min(Math.max(e.hasta, 1), plan.semanas);
    e.desde = Math.min(e.desde, e.hasta);
    const o = plan.opciones;
    const ent = Store.datos.entrenador;
    const opSem = (sel) => Array.from({ length: plan.semanas }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? "selected" : ""}>Semana ${i + 1}</option>`).join("");
    const rangosF = PF.rangosFases(plan);
    if (e.fase == null || e.fase >= rangosF.length) e.fase = 0;
    const hayEj = plan.sesiones.some((s) => s.ejercicios.length);

    return {
      html: `
        ${!hayEj ? `<div class="aviso-caja">${UI.ic("alert")}<div>Todavía no hay ejercicios. El PDF tendrá la portada y la gráfica, pero sin rutinas. Ve a <b>Sesiones</b> para agregarlos.</div></div>` : ""}
        ${!ent.nombre ? `<div class="aviso-caja info-caja">${UI.ic("info")}<div>Agrega tu nombre y logo en <a href="#/ajustes" style="color:var(--acento);font-weight:700">Ajustes</a> para que aparezcan en el PDF.</div></div>` : ""}
        <div class="tarjeta">
          <h2>¿Qué quieres enviar?</h2>
          <div class="seg" style="margin-bottom:12px">
            <button data-al="semana" class="${e.alcance === "semana" ? "on" : ""}">Semana</button>
            <button data-al="rango" class="${e.alcance === "rango" ? "on" : ""}">Varias</button>
            <button data-al="fase" class="${e.alcance === "fase" ? "on" : ""}">Fase</button>
            <button data-al="completo" class="${e.alcance === "completo" ? "on" : ""}">Todo</button>
          </div>
          ${e.alcance === "semana" ? `<label class="campo"><span>Semana</span><select id="pdf-semana">${opSem(e.semana)}</select></label>
            <p class="ayuda">Solo la rutina de esa semana. La gráfica resalta qué parte del plan cubre.</p>` : ""}
          ${e.alcance === "rango" ? `<div class="cols2"><label class="campo"><span>Desde</span><select id="pdf-desde">${opSem(e.desde)}</select></label><label class="campo"><span>Hasta</span><select id="pdf-hasta">${opSem(e.hasta)}</select></label></div>
            <p class="ayuda">Una página por semana y un cuadro de evolución. La gráfica resalta el tramo incluido.</p>` : ""}
          ${e.alcance === "fase" ? (rangosF.length ? `<div class="lista-fases">${rangosF.map((r, i) => `<button class="fila-fase ${i === e.fase ? "on" : ""}" data-fase="${i}"><i style="background:${r.fase.color}"></i><span><b>${h(r.fase.nombre)}</b><small>Semanas ${r.desde}–${r.hasta} · ${r.hasta - r.desde + 1} sem</small></span></button>`).join("")}</div>
            <p class="ayuda">Envía una fase por vez, con su cuadro de evolución. La gráfica resalta esa fase.</p>` : `<p class="ayuda" style="margin:0">Este plan todavía no tiene fases. Agrégalas en la pestaña Plan.</p>`) : ""}
          ${e.alcance === "completo" ? `<p class="ayuda" style="margin:0">Incluye las ${plan.semanas} semanas, el cuadro de evolución y la hoja de seguimiento. </p>` : ""}
        </div>

        <div class="tarjeta">
          <h2>Qué mostrar</h2>
          ${interruptor("Intensidad (%)", "Porcentaje del máximo en cada ejercicio", "pct", o.pct)}
          ${interruptor("Kilos estimados", "Si indicaste el máximo del ejercicio", "kg", o.kg)}
          ${interruptor("RPE", "Esfuerzo percibido (1-10)", "rpe", o.rpe)}
          ${interruptor("Tempo y notas por ejercicio", "Ritmo de ejecución y observaciones", "notas", o.notas)}
          ${interruptor("Columna «Mi carga»", "Para que el cliente anote el peso", "registro", o.registro)}
          ${interruptor("Hoja de seguimiento", "Peso, energía y sueño por semana (varias semanas)", "seguimiento", o.seguimiento)}
          ${interruptor("Recomendaciones", "Consejos generales al final", "recomendaciones", o.recomendaciones)}
        </div>

        <button class="btn primario bloque" data-act="compartir" style="min-height:52px;font-size:16px">${UI.ic("share")}Compartir / guardar PDF</button>
        <div class="dos-btn" style="margin-top:10px">
          <button class="btn" data-act="ver-pdf">${UI.ic("eye")}Ver PDF</button>
          <button class="btn" data-act="descargar-pdf">${UI.ic("download")}Descargar</button>
        </div>
        <p class="ayuda" id="pdf-info" style="text-align:center;margin-top:12px"></p>`,
      bind(el) {
        $$("[data-al]", el).forEach((b) => b.addEventListener("click", () => { e.alcance = b.dataset.al; UI.render(true); }));
        $$("[data-fase]", el).forEach((b) => b.addEventListener("click", () => { e.fase = +b.dataset.fase; UI.render(true); }));
        const s = $("#pdf-semana", el); if (s) s.addEventListener("change", () => { e.semana = +s.value; });
        const d = $("#pdf-desde", el), hh = $("#pdf-hasta", el);
        if (d) d.addEventListener("change", () => { e.desde = +d.value; if (e.hasta < e.desde) { e.hasta = e.desde; hh.value = e.hasta; } });
        if (hh) hh.addEventListener("change", () => { e.hasta = +hh.value; if (e.desde > e.hasta) { e.desde = e.hasta; d.value = e.desde; } });
      },
    };
  }

  /* ============ AJUSTES ============ */

  V.ajustes = () => {
    const ent = Store.datos.entrenador, d = Store.datos;
    const ult = d.ultimaCopia ? new Date(d.ultimaCopia).toLocaleDateString("es") : "nunca";
    return {
      titulo: "Ajustes", atras: "#/",
      html: `
        <div class="titulo-sec">Tus datos (salen en los PDF)</div>
        <div class="tarjeta">
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">
            <div class="logo-prev" id="logo-prev">${ent.logo ? `<img src="${ent.logo}" alt="Logo">` : UI.ic("image")}</div>
            <div style="flex:1;display:flex;flex-direction:column;gap:8px">
              <label class="btn chico suave" style="cursor:pointer">${UI.ic("upload")}${ent.logo ? "Cambiar logo" : "Subir logo"}<input type="file" id="logo-in" accept="image/*" hidden></label>
              ${ent.logo ? `<button class="btn chico fantasma peligro" data-act="quitar-logo" style="justify-content:flex-start">Quitar logo</button>` : `<span class="peq muted">PNG o JPG. Se ve mejor con fondo claro.</span>`}
            </div>
          </div>
          ${campo("Tu nombre o marca", "ent:nombre", ent.nombre, 'placeholder="Ej.: Martín Acosta · Entrenador"')}
          ${campo("Contacto (email o teléfono)", "ent:contacto", ent.contacto, 'placeholder="tu@correo.com"')}
          ${campo("Web o Instagram (opcional)", "ent:web", ent.web, 'placeholder="www.tuweb.com"')}
          <div class="campo"><span>Color de tu marca</span>
            <div class="paleta" id="paleta">${["#2F6BFF", "#7C4DFF", "#F2603C", "#16A085", "#E5A00D", "#D6336C", "#1F9BD1", "#111827"].map((c) => `<button data-col="${c}" style="background:${c}" class="${ent.color.toLowerCase() === c.toLowerCase() ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div></div>
        </div>

        <div class="titulo-sec">Copia de seguridad</div>
        <div class="tarjeta">
          <p class="muted peq" style="margin:0 0 12px">Tus clientes y planes se guardan <b>solo en este dispositivo</b>. Guarda una copia de vez en cuando (por ejemplo, en Archivos o en tu correo) para no perder nada si cambias de teléfono o borras los datos del navegador.</p>
          <div class="kv"><span>Última copia</span><span>${ult}</span></div>
          <div class="kv"><span>Clientes / planes</span><span>${d.clientes.length} / ${d.planes.length}</span></div>
          <div class="dos-btn" style="margin-top:12px">
            <button class="btn" data-act="exportar">${UI.ic("download")}Guardar copia</button>
            <label class="btn" style="cursor:pointer">${UI.ic("upload")}Restaurar<input type="file" id="importar" accept=".json,application/json" hidden></label>
          </div>
        </div>

        <div class="titulo-sec">Acerca de</div>
        <div class="tarjeta">
          <div class="kv"><span>Versión</span><span>${h(UI.VERSION)}</span></div>
          <button class="btn bloque" data-act="buscar-act" style="margin-top:10px">${UI.ic("refresh")}Buscar actualización</button>
          <button class="btn peligro bloque" data-act="borrar-todo" style="margin-top:10px">${UI.ic("trash")}Borrar todos los datos</button>
        </div>`,
      bind(el) {
        $$("[data-col]", el).forEach((b) => b.addEventListener("click", () => {
          ent.color = b.dataset.col; UI.aplicarColor(ent.color); Store.guardar();
          $$("#paleta button", el).forEach((x) => x.classList.toggle("on", x === b));
        }));
        $("#logo-in", el).addEventListener("change", async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try { ent.logo = await UI.logoDesdeArchivo(f); Store.guardar(); UI.render(true); UI.aviso("Logo guardado"); }
          catch (err) { UI.aviso("No se pudo leer la imagen", { error: true }); }
        });
        $("#importar", el).addEventListener("change", async (e) => {
          const f = e.target.files[0]; if (!f) return;
          try {
            const txt = await f.text();
            if (!(await UI.confirmar("Restaurar copia", "Esto reemplazará los datos actuales por los de la copia. ¿Continuar?", { si: "Restaurar", peligro: true }))) return;
            Store.importarJSON(txt); UI.aplicarColor(Store.datos.entrenador.color); UI.render(); UI.aviso("Copia restaurada");
          } catch (err) { UI.aviso(err.message || "Archivo no válido", { error: true }); }
          e.target.value = "";
        });
      },
    };
  };
})(window);
