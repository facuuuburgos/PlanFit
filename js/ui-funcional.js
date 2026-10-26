/* Módulo funcional e híbrido: pantalla del plan, selector de bloques y editor (AMRAP, EMOM, Tabata, For Time, circuitos, intervalos). */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, D = root.PF_DATA, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  const V = UI.vistas;
  const TB = D.TIPOS_BLOQUE;
  const tocar = (plan) => UI.tocarPlan(plan);
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  /* ============ reordenar arrastrando ============ */

  const padreScroll = (el) => { let p = el.parentElement; while (p && p !== document.body) { const o = getComputedStyle(p).overflowY; if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p; p = p.parentElement; } return document.scrollingElement; };

  // cont: contenedor; item: selector de los elementos; grip: selector del asa; alTerminar(desde, hasta)
  UI.ordenable = (cont, { item, grip, alTerminar }) => {
    cont.addEventListener("pointerdown", (ev) => {
      const g = ev.target.closest(grip);
      if (!g || !cont.contains(g)) return;
      const el = g.closest(item);
      if (!el || el.parentElement !== cont) return;
      ev.preventDefault();
      const lista = () => [...cont.children].filter((c) => c.matches(item));
      const desde = lista().indexOf(el);
      const sc = padreScroll(cont);
      const r0 = el.getBoundingClientRect();
      const grab = ev.clientY - r0.top;
      let ptrY = ev.clientY, activo = true, raf = 0;
      el.classList.add("arrastrando");
      try { g.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }

      const colocar = () => {
        el.style.transform = "none";
        const nat = el.getBoundingClientRect().top;
        el.style.transform = `translateY(${ptrY - grab - nat}px)`;
      };
      const paso = () => {
        if (!activo) return;
        if (sc) {
          const r = sc === document.scrollingElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect();
          if (ptrY < r.top + 56) sc.scrollTop -= 9; else if (ptrY > r.bottom - 56) sc.scrollTop += 9;
        }
        const otros = lista().filter((c) => c !== el);
        const yc = ptrY - grab + el.offsetHeight / 2;
        let antes = null;
        for (const o of otros) { const r = o.getBoundingClientRect(); if (yc < r.top + r.height / 2) { antes = o; break; } }
        const actualSig = otros.find((o) => el.compareDocumentPosition(o) & Node.DOCUMENT_POSITION_FOLLOWING);
        if (antes !== actualSig) {
          const viejas = new Map(otros.map((o) => [o, o.getBoundingClientRect().top]));
          if (antes) cont.insertBefore(el, antes); else otros[otros.length - 1].after(el);
          otros.forEach((o) => {
            const d = viejas.get(o) - o.getBoundingClientRect().top;
            if (!d) return;
            o.style.transition = "none"; o.style.transform = `translateY(${d}px)`;
            requestAnimationFrame(() => { o.style.transition = "transform .2s var(--suave)"; o.style.transform = ""; });
          });
        }
        colocar();
        raf = requestAnimationFrame(paso);
      };
      const mover = (e) => { ptrY = e.clientY; };
      const fin = () => {
        activo = false; cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", mover); window.removeEventListener("pointerup", fin); window.removeEventListener("pointercancel", fin);
        el.style.transition = "transform .2s var(--resorte)"; el.style.transform = "";
        setTimeout(() => { el.style.transition = ""; el.classList.remove("arrastrando"); }, 220);
        const hasta = lista().indexOf(el);
        if (hasta !== desde) alTerminar(desde, hasta);
      };
      window.addEventListener("pointermove", mover); window.addEventListener("pointerup", fin); window.addEventListener("pointercancel", fin);
      paso();
    });
  };

  /* ============ elegir el tipo de bloque ============ */

  const ICONO_TIPO = { amrap: "trend", emom: "clock", tabata: "bolt", fortime: "flag", circuito: "grid", intervalos: "swap", libre: "dumbbell" };

  UI.elegirTipoBloque = (alElegir) => {
    const hoja = UI.hoja({
      titulo: "¿Qué tipo de bloque?",
      html: `<div class="fx-tipos">${Object.values(TB).map((t) => `<button class="fx-tipo" data-tipo="${t.id}" style="--c:${t.color}"><span class="fx-tipo-ic">${UI.ic(ICONO_TIPO[t.id] || "dumbbell")}</span><b>${h(t.nombre)}</b><small>${h(t.desc)}</small></button>`).join("")}</div>`,
    });
    hoja.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-tipo]"); if (!b) return;
      hoja.cerrar(); setTimeout(() => alElegir(b.dataset.tipo), 120);
    });
  };

  /* ============ editor de bloque ============ */

  const CAMPOS = {
    amrap: [["minutos", "Duración (min)"]],
    emom: [["minutos", "Duración (min)"], ["cada", "Cada (seg)"], ["modo", "Ejercicios", [["alterna", "Alternar cada intervalo"], ["todos", "Todos en cada intervalo"]]]],
    tabata: [["rondas", "Rondas"], ["trabajo", "Trabajo (seg)"], ["descanso", "Descanso (seg)"], ["series", "Series"], ["descansoSerie", "Pausa entre series (seg)"]],
    fortime: [["rondas", "Rondas"], ["timeCap", "Time cap (min, 0 = sin límite)"], ["esquema", "Esquema (opcional)", null, "21-15-9"]],
    circuito: [["rondas", "Rondas"], ["trabajo", "Trabajo por estación (seg)"], ["descanso", "Descanso entre estaciones (seg)"], ["descansoRonda", "Pausa entre rondas (seg)"]],
    intervalos: [["series", "Series"], ["trabajo", "Trabajo (seg)"], ["descanso", "Descanso (seg)"]],
    libre: [],
  };

  UI.editarBloque = (plan, existente, tipo, { alGuardar, alEliminar, alDuplicar } = {}) => {
    const nuevo = !existente;
    const b = existente ? copiar(existente) : PF.nuevoBloque(tipo);
    if (nuevo) b.descansoDespues = 0;
    const abiertos = new Set();

    const camposHtml = () => (CAMPOS[b.tipo] || []).map(([k, etq, opc, ph]) => opc
      ? `<label class="campo"><span>${h(etq)}</span><select data-k="${k}">${opc.map(([v, t]) => `<option value="${v}" ${b[k] === v ? "selected" : ""}>${h(t)}</option>`).join("")}</select></label>`
      : `<label class="campo"><span>${h(etq)}</span><input data-k="${k}" ${k === "esquema" ? `placeholder="${ph || ""}" value="${h(b[k] ?? "")}"` : `inputmode="numeric" value="${h(b[k] ?? "")}"`}></label>`).join("");

    const ejHtml = (e, i) => `
      <div class="fx-ej" data-i="${i}">
        <div class="fx-ej-l1">
          <button class="grip" data-grip aria-label="Mantén y arrastra para reordenar">${UI.ic("grip")}</button>
          <input class="fx-nom" data-f="nombre" value="${h(e.nombre)}" placeholder="Ejercicio" autocomplete="off" autocapitalize="sentences">
          <button class="icono gris" data-del-ej aria-label="Quitar ejercicio">${UI.ic("x")}</button>
        </div>
        <div class="fx-sug"></div>
        <div class="fx-ej-l2">
          <label><span>${b.tipo === "libre" ? "Series × reps" : b.tipo === "tabata" || b.tipo === "circuito" ? "Reps / meta" : "Reps / distancia"}</span><input data-f="reps" value="${h(e.reps)}" placeholder="${b.tipo === "libre" ? "4×8" : "15"}"></label>
          <label><span>Carga</span><input data-f="carga" value="${h(e.carga)}" placeholder="20 kg"></label>
        </div>
        <div class="fx-eq">
          <div class="fx-eq-sel">${(e.equip || []).map((q) => `<span class="fx-chip on">${h(q)}</span>`).join("") || `<span class="fx-vacio">Sin equipamiento indicado</span>`}<button class="fx-eq-b" data-eq-toggle>${UI.ic(abiertos.has(e.id) ? "up" : "plus")}Equipo</button></div>
          <div class="fx-eq-lista ${abiertos.has(e.id) ? "abierta" : ""}">${D.EQUIPAMIENTO.map((q) => `<button class="fx-chip ${(e.equip || []).includes(q) ? "on" : ""}" data-eq="${h(q)}">${h(q)}</button>`).join("")}</div>
        </div>
        <input class="fx-nota" data-f="nota" value="${h(e.nota)}" placeholder="Nota (opcional): técnica, variante, escala…">
      </div>`;

    const tiposHtml = () => Object.values(TB).map((t) => `<button class="fx-mini ${b.tipo === t.id ? "on" : ""}" data-cambiar="${t.id}" style="--c:${t.color}">${h(t.nombre)}</button>`).join("");

    const cabHtml = () => {
      const t = TB[b.tipo], dur = PF.duracionBloque(b);
      return `<div class="fx-prev" style="--c:${t.color}"><span class="fx-tag">${h(PF.tituloBloque(b))}</span><span class="fx-prev-d">${h(PF.detalleBloque(b) || t.largo)}</span>${dur ? `<span class="fx-dur">~${Math.max(1, Math.round(dur / 60))} min</span>` : ""}</div>`;
    };

    const hoja = UI.hoja({
      titulo: nuevo ? "Nuevo bloque" : "Editar bloque", fija: true, clase: "fx-hoja",
      html: `
        <div id="fx-cab">${cabHtml()}</div>
        <div class="fx-minis" id="fx-minis">${tiposHtml()}</div>
        <div class="fx-campos" id="fx-campos">${camposHtml()}</div>
        <label class="campo"><span>Nombre del bloque (opcional)</span><input data-k="nombre" value="${h(b.nombre)}" placeholder="Ej.: WOD, Fuerza base, Finisher"></label>
        <div class="titulo-sec" style="margin-top:4px">Ejercicios<span class="der"><button class="btn chico suave" id="fx-add-ej">${UI.ic("plus")}Añadir</button></span></div>
        <div id="fx-ejs" class="fx-ejs-ed">${b.ejercicios.map(ejHtml).join("")}</div>
        <label class="campo"><span>Nota del bloque (opcional)</span><input data-k="nota" value="${h(b.nota)}" placeholder="Ej.: Escala el peso si no mantienes la técnica"></label>
        <label class="campo"><span>Descanso al terminar el bloque (seg, 0 = ninguno)</span><input data-k="descansoDespues" inputmode="numeric" value="${h(b.descansoDespues || 0)}"></label>
        ${nuevo ? "" : `<div class="dos-btn" style="margin-top:6px"><button class="btn" id="fx-dup">${UI.ic("copy")}Duplicar</button><button class="btn peligro" id="fx-del">${UI.ic("trash")}Eliminar</button></div>`}`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario fx-ok" id="fx-ok">${nuevo ? "Añadir bloque" : "Guardar"}</button>`,
    });
    const el = hoja.el, cont = $("#fx-ejs", el);

    const refrescarCab = () => { $("#fx-cab", el).innerHTML = cabHtml(); };
    const pintarEjs = (foco) => {
      cont.innerHTML = b.ejercicios.map(ejHtml).join("");
      if (foco !== undefined) { const i = cont.querySelectorAll(".fx-nom")[foco]; if (i) i.focus(); }
    };

    // campos generales
    el.addEventListener("input", (ev) => {
      const k = ev.target.dataset.k;
      if (k) {
        let v = ev.target.value;
        if (ev.target.tagName === "INPUT" && ev.target.inputMode === "numeric") v = Math.max(0, parseInt(v, 10) || 0);
        b[k] = v; refrescarCab(); return;
      }
      const f = ev.target.dataset.f;
      if (f) {
        const fila = ev.target.closest(".fx-ej"), e = b.ejercicios[+fila.dataset.i];
        e[f] = ev.target.value;
        if (f === "nombre") {
          const sug = UI.sugerirEjercicios(e.nombre);
          const cs = $(".fx-sug", fila);
          cs.innerHTML = sug.length ? `<div class="sugerencias">${sug.map((s, i) => `<button data-s="${i}">${h(s.n)}<small>${h(s.g)}</small></button>`).join("")}</div>` : "";
          cs.onclick = (c) => { const bt = c.target.closest("[data-s]"); if (!bt) return; e.nombre = sug[+bt.dataset.s].n; $(".fx-nom", fila).value = e.nombre; cs.innerHTML = ""; };
        }
      }
    });
    el.addEventListener("change", (ev) => { const k = ev.target.dataset.k; if (k && ev.target.tagName === "SELECT") { b[k] = ev.target.value; refrescarCab(); } });

    el.addEventListener("click", (ev) => {
      const cb = ev.target.closest("[data-cambiar]");
      if (cb) {
        const base = PF.nuevoBloque(cb.dataset.cambiar);
        const guardado = { nombre: b.nombre, nota: b.nota, descansoDespues: b.descansoDespues, ejercicios: b.ejercicios, id: b.id };
        Object.keys(b).forEach((k) => delete b[k]);
        Object.assign(b, base, guardado, { tipo: cb.dataset.cambiar });
        $("#fx-minis", el).innerHTML = tiposHtml(); $("#fx-campos", el).innerHTML = camposHtml(); refrescarCab(); pintarEjs();
        return;
      }
      if (ev.target.closest("#fx-add-ej")) { b.ejercicios.push(PF.nuevoEjFunc("")); pintarEjs(b.ejercicios.length - 1); cont.lastElementChild && cont.lastElementChild.scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
      const fila = ev.target.closest(".fx-ej");
      if (!fila) return;
      const i = +fila.dataset.i, e = b.ejercicios[i];
      if (ev.target.closest("[data-del-ej]")) {
        fila.classList.add("sale"); setTimeout(() => { b.ejercicios.splice(i, 1); pintarEjs(); refrescarCab(); }, 220); return;
      }
      if (ev.target.closest("[data-eq-toggle]")) { abiertos.has(e.id) ? abiertos.delete(e.id) : abiertos.add(e.id); pintarEjs(); return; }
      const q = ev.target.closest("[data-eq]");
      if (q) { const n = q.dataset.eq; e.equip = e.equip.includes(n) ? e.equip.filter((x) => x !== n) : [...e.equip, n]; pintarEjs(); }
    });

    UI.ordenable(cont, { item: ".fx-ej", grip: "[data-grip]", alTerminar: (d, a) => { const [x] = b.ejercicios.splice(d, 1); b.ejercicios.splice(a, 0, x); pintarEjs(); } });

    $("#fx-ok", el).addEventListener("click", () => {
      b.ejercicios = b.ejercicios.filter((e) => (e.nombre || "").trim());
      b.ejercicios.forEach((e) => { e.nombre = e.nombre.trim(); UI.recordarEjercicio(e.nombre); });
      if (!b.ejercicios.length && !(b.nombre || "").trim()) { UI.aviso("Añade al menos un ejercicio", { error: true }); return; }
      hoja.cerrar(); alGuardar && alGuardar(b);
    });
    if (!nuevo) {
      $("#fx-dup", el).addEventListener("click", () => { hoja.cerrar(); alDuplicar && alDuplicar(); });
      $("#fx-del", el).addEventListener("click", async () => {
        if (await UI.confirmar("Eliminar bloque", `¿Eliminar «${PF.tituloBloque(b)}»${b.nombre ? " (" + b.nombre + ")" : ""}?`, { si: "Eliminar", peligro: true })) { hoja.cerrar(); alEliminar && alEliminar(); }
      });
    }
    if (nuevo && !b.ejercicios.length) { b.ejercicios.push(PF.nuevoEjFunc("")); pintarEjs(); }
  };

  /* ============ pantalla del plan funcional ============ */

  const resumenEj = (e, plan) => {
    const eq = plan.opciones.equipo ? (e.equip || []).join(" · ") : "";
    return [e.carga, eq].filter(Boolean).join(" · ");
  };

  const tarjetaBloque = (plan, b, si, bi, ultimo) => {
    const t = TB[b.tipo], dur = PF.duracionBloque(b);
    return `
      <article class="fx-bl" data-bl="${bi}" style="--c:${t.color}">
        <button class="grip" data-grip aria-label="Mantén y arrastra para reordenar">${UI.ic("grip")}</button>
        <button class="fx-bl-cuerpo" data-edit-bl="${si}:${bi}">
          <span class="fx-bl-top"><span class="fx-tag">${h(PF.tituloBloque(b))}</span>${b.nombre ? `<b>${h(b.nombre)}</b>` : ""}${dur ? `<span class="fx-dur">~${Math.max(1, Math.round(dur / 60))} min</span>` : ""}</span>
          ${PF.detalleBloque(b) ? `<small class="fx-det">${h(PF.detalleBloque(b))}</small>` : ""}
          ${b.ejercicios.length ? `<ul class="fx-lista">${b.ejercicios.map((e, i) => `<li><span class="fx-r">${b.tipo === "emom" && b.modo === "alterna" && b.ejercicios.length > 1 ? "Min " + (i + 1) : h(e.reps || (b.tipo === "circuito" ? "Est. " + (i + 1) : "·"))}</span><span class="fx-n">${h(e.nombre)}</span><em>${h(resumenEj(e, plan))}</em></li>`).join("")}</ul>` : `<small class="fx-det">Sin ejercicios todavía</small>`}
          ${b.nota ? `<small class="fx-nota-b">${h(b.nota)}</small>` : ""}
        </button>
      </article>
      ${b.descansoDespues > 0 && !ultimo ? `<div class="fx-desc"><span>Descanso ${PF.fmtTiempo(b.descansoDespues)}</span></div>` : ""}`;
  };

  V.funcional = (r) => {
    const plan = Store.plan(r.id);
    if (!plan) return { titulo: "Plan", atras: "#/", html: `<div class="vacio"><h2>No se encontró el plan</h2></div>` };
    const cli = Store.cliente(plan.clienteId);
    UI.ctx = { cliente: cli, plan };
    const nBl = plan.sesiones.reduce((a, s) => a + s.bloques.length, 0);
    const min = plan.sesiones.reduce((a, s) => a + PF.duracionSesionMin(s), 0);

    const sesiones = plan.sesiones.map((s, si) => {
      const dm = PF.duracionSesionMin(s);
      return `
      <section class="fx-ses" style="--g:${si}" data-ses="${si}">
        <header class="fx-ses-cab">
          ${s.dia ? `<span class="fx-dia">${h(s.dia.slice(0, 3).toUpperCase())}</span>` : ""}
          <button class="fx-ses-t" data-edit-ses="${si}"><b>${h(s.nombre || "Sesión " + (si + 1))}</b><small>${[s.foco, `${s.bloques.length} ${s.bloques.length === 1 ? "bloque" : "bloques"}`, dm ? `≈ ${dm} min` : ""].filter(Boolean).map(h).join(" · ")}</small></button>
          ${s.bloques.length ? `<a class="icono" href="#/p/${plan.id}/entrenar/${si}" aria-label="Entrenar esta sesión" title="Entrenar">${UI.ic("play")}</a>` : ""}
          <button class="icono" data-menu-ses="${si}" aria-label="Más opciones">${UI.ic("dots")}</button>
        </header>
        ${s.calentamiento ? `<p class="fx-cal">${UI.ic("flame")}<span>${h(s.calentamiento)}</span></p>` : ""}
        <div class="fx-bloques">${s.bloques.map((b, bi) => tarjetaBloque(plan, b, si, bi, bi === s.bloques.length - 1)).join("")}</div>
        <button class="fx-add" data-add-bl="${si}">${UI.ic("plus")}Añadir bloque</button>
      </section>`;
    }).join("");

    const html = `
      <div class="fx">
        <div class="fx-hero">
          <div><small>Funcional e híbrido</small><b>${plan.sesiones.length} ${plan.sesiones.length === 1 ? "sesión" : "sesiones"} · ${nBl} ${nBl === 1 ? "bloque" : "bloques"}${min ? ` · ≈ ${min} min` : ""}</b></div>
          <span class="fx-hero-ic">${UI.ic("bolt")}</span>
        </div>
        <div class="tarjeta fx-datos">
          <label class="campo"><span>Nombre del plan</span><input data-b="p:titulo" value="${h(plan.titulo)}" placeholder="Ej.: Funcional híbrido · Octubre"></label>
          <label class="campo"><span>Notas para el cliente (salen en el PDF)</span><textarea data-b="p:notas" placeholder="Hidratación, horarios, recomendaciones…">${h(plan.notas)}</textarea></label>
        </div>
        ${sesiones || `<div class="vacio"><div class="ic fx-ic">${UI.ic("bolt")}</div><h2>Arma tu primera sesión</h2><p>Crea una sesión y combina bloques: AMRAP, EMOM, Tabata, For Time, circuitos o intervalos.</p></div>`}
        <button class="btn bloque fx-btn-ses" data-add-ses>${UI.ic("plus")}Añadir sesión</button>

        <div class="titulo-sec" id="fx-pdf">Exportar PDF</div>
        <div class="tarjeta fx-pdf">
          <div class="interruptores">
            <label class="interruptor"><span class="t"><b>Mostrar equipamiento</b><span>Lo que se necesita en cada ejercicio y por sesión</span></span><span class="sw"><input type="checkbox" data-sw="equipo" ${plan.opciones.equipo ? "checked" : ""}><i></i></span></label>
            <label class="interruptor"><span class="t"><b>Notas de ejercicios</b><span>Variantes, escalas y técnica</span></span><span class="sw"><input type="checkbox" data-sw="notas" ${plan.opciones.notas ? "checked" : ""}><i></i></span></label>
          </div>
          <p class="ayuda" id="pdf-info">Las sesiones se acomodan solas en A4 sin partir bloques.</p>
          <div class="dos-btn"><button class="btn" data-act="ver-pdf">${UI.ic("eye")}Ver PDF</button><button class="btn" data-act="descargar-pdf">${UI.ic("download")}Descargar</button></div>
          <button class="btn primario bloque fx-compartir" data-act="compartir" style="margin-top:10px">${UI.ic("share")}Compartir PDF</button>
        </div>
      </div>`;

    return {
      titulo: plan.titulo || "Plan funcional", sub: cli ? cli.nombre : "", atras: cli ? `#/c/${cli.id}` : "#/",
      acciones: `<button class="icono" data-act="menu-plan" aria-label="Más opciones">${UI.ic("dots")}</button>`,
      html,
      bind(el) {
        const re = () => UI.render(true);
        const nuevaSesion = () => UI.editarSesion(plan, null, (b) => {
          const s = PF.nuevaSesionFunc(b.nombre); Object.assign(s, { dia: b.dia, foco: b.foco, calentamiento: b.calentamiento });
          plan.sesiones.push(s); tocar(plan); re(); UI.aviso("Sesión creada · añade el primer bloque");
        });
        const addBloque = (si) => UI.elegirTipoBloque((tipo) => UI.editarBloque(plan, null, tipo, { alGuardar: (b) => { plan.sesiones[si].bloques.push(b); tocar(plan); re(); } }));
        const duplicarSes = (si) => {
          const c = copiar(plan.sesiones[si]); c.id = PF.id(); c.nombre = (c.nombre || "Sesión") + " (copia)";
          c.bloques.forEach((b) => { b.id = PF.id(); b.ejercicios.forEach((e) => (e.id = PF.id())); });
          plan.sesiones.splice(si + 1, 0, c); tocar(plan); re(); UI.aviso("Sesión duplicada");
        };
        const editarSes = (si) => {
          const s = plan.sesiones[si];
          UI.editarSesion(plan, s, (b) => { Object.assign(s, { nombre: b.nombre, dia: b.dia, foco: b.foco, calentamiento: b.calentamiento }); tocar(plan); re(); }, {
            duplicar: () => duplicarSes(si),
            eliminar: () => { plan.sesiones.splice(si, 1); tocar(plan); re(); },
          });
        };
        const mover = (si, d) => { const l = plan.sesiones, j = si + d; [l[si], l[j]] = [l[j], l[si]]; tocar(plan); re(); };

        el.addEventListener("click", (ev) => {
          if (ev.target.closest("[data-add-ses]")) return nuevaSesion();
          const ab = ev.target.closest("[data-add-bl]"); if (ab) return addBloque(+ab.dataset.addBl);
          const es = ev.target.closest("[data-edit-ses]"); if (es) return editarSes(+es.dataset.editSes);
          const eb = ev.target.closest("[data-edit-bl]");
          if (eb) {
            const [si, bi] = eb.dataset.editBl.split(":").map(Number), ses = plan.sesiones[si], bl = ses.bloques[bi];
            UI.editarBloque(plan, bl, bl.tipo, {
              alGuardar: (nb) => { ses.bloques[bi] = nb; tocar(plan); re(); },
              alEliminar: () => { ses.bloques.splice(bi, 1); tocar(plan); re(); UI.aviso("Bloque eliminado"); },
              alDuplicar: () => { const c = copiar(bl); c.id = PF.id(); c.ejercicios.forEach((e) => (e.id = PF.id())); ses.bloques.splice(bi + 1, 0, c); tocar(plan); re(); UI.aviso("Bloque duplicado"); },
            });
            return;
          }
          const ms = ev.target.closest("[data-menu-ses]");
          if (ms) {
            const si = +ms.dataset.menuSes, s = plan.sesiones[si];
            UI.menu(s.nombre || "Sesión", [
              { t: "Editar sesión", ic: "settings", f: () => editarSes(si) },
              { t: "Añadir bloque", ic: "plus", f: () => addBloque(si) },
              { t: "Duplicar sesión", ic: "copy", f: () => duplicarSes(si) },
              ...(si > 0 ? [{ t: "Mover arriba", ic: "up", f: () => mover(si, -1) }] : []),
              ...(si < plan.sesiones.length - 1 ? [{ t: "Mover abajo", ic: "down", f: () => mover(si, 1) }] : []),
              { t: "Eliminar sesión", ic: "trash", peligro: true, f: async () => { if (await UI.confirmar("Eliminar sesión", `¿Eliminar «${s.nombre}» con sus ${s.bloques.length} bloques?`, { si: "Eliminar", peligro: true })) { plan.sesiones.splice(si, 1); tocar(plan); re(); } } },
            ]);
          }
        });

        // reordenar bloques dentro de cada sesión
        $$(".fx-bloques", el).forEach((cont, si) => UI.ordenable(cont, {
          item: ".fx-bl", grip: "[data-grip]",
          alTerminar: (d, a) => { const l = plan.sesiones[si].bloques; const [x] = l.splice(d, 1); l.splice(a, 0, x); tocar(plan); re(); },
        }));
      },
    };
  };
})(window);
