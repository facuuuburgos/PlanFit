/* Hojas de edición: ejercicio (con evolución semanal), progresión rápida y sesión. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, D = root.PF_DATA, h = UI.h, $ = UI.$, $$ = UI.$$;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  UI.sugerirEjercicios = (texto) => {
    const q = norm(texto).trim();
    if (q.length < 2) return [];
    const propios = (PF.Store.datos.ejerciciosPropios || []).map((n) => ({ n, g: "Mis ejercicios" }));
    const lib = [];
    for (const [g, lista] of Object.entries(D.BIBLIOTECA)) for (const n of lista) lib.push({ n, g });
    return [...propios, ...lib].filter((e) => norm(e.n).includes(q) && norm(e.n) !== q).slice(0, 6);
  };

  UI.recordarEjercicio = (nombre) => {
    const n = String(nombre || "").trim();
    if (!n) return;
    const existe = Object.values(D.BIBLIOTECA).some((l) => l.some((x) => norm(x) === norm(n)));
    const d = PF.Store.datos;
    if (!existe && !d.ejerciciosPropios.some((x) => norm(x) === norm(n))) { d.ejerciciosPropios.push(n); }
  };

  const CAMPOS = [
    { id: "s", nombre: "Series", mode: "numeric" },
    { id: "r", nombre: "Repeticiones", mode: "text" },
    { id: "d", nombre: "Descanso (segundos)", mode: "numeric" },
    { id: "i", nombre: "Intensidad (%)", mode: "decimal" },
    { id: "rpe", nombre: "RPE", mode: "decimal" },
  ];

  /* ============ EJERCICIO ============ */

  // existente: ejercicio a editar (se trabaja sobre una copia) o null para crear. alGuardar(ej)
  UI.editarEjercicio = (plan, existente, alGuardar, alEliminar) => {
    const borrador = existente ? JSON.parse(JSON.stringify(existente)) : PF.nuevoEjercicio("", plan.semanas);
    const nuevo = !existente;
    const n = plan.semanas;
    const rpe = plan.opciones.rpe;

    const filas = () => {
      let out = "";
      for (let w = 1; w <= n; w++) {
        const c = borrador.sem[w - 1];
        const f = PF.faseDeSemana(plan, w);
        const desc = plan.semInfo[w - 1] && plan.semInfo[w - 1].descarga;
        out += `<tr class="${desc ? "desc" : ""}" data-w="${w}">
          <td class="sem"><i class="punto" style="background:${f ? f.fase.color : "#C9D0DE"}"></i> S${w}</td>
          <td><input data-c="s" inputmode="numeric" value="${h(c.s)}"></td>
          <td><input data-c="r" inputmode="text" value="${h(c.r)}"></td>
          <td><input data-c="d" inputmode="numeric" value="${h(c.d)}"></td>
          <td><input data-c="i" inputmode="decimal" value="${h(c.i ?? "")}" placeholder="–"></td>
          ${rpe ? `<td><input data-c="rpe" inputmode="decimal" value="${h(c.rpe ?? "")}" placeholder="–"></td>` : ""}
          <td><button class="abajo" data-abajo="${w}" title="Copiar esta semana hacia abajo">${UI.ic("arrowdown")}</button></td>
        </tr>`;
      }
      return out;
    };

    const grupos = Object.keys(D.BIBLIOTECA);

    const html = `
      <label class="campo"><span>Nombre del ejercicio</span><input id="e-nombre" value="${h(borrador.nombre)}" placeholder="Ej.: Sentadilla trasera" autocomplete="off" autocapitalize="sentences"></label>
      <div id="e-sug"></div>
      <div class="cols3">
        <label class="campo"><span>Superserie</span><input id="e-super" value="${h(borrador.super)}" placeholder="A1, A2…" maxlength="3" autocapitalize="characters"></label>
        <label class="campo"><span>Tempo</span><input id="e-tempo" value="${h(borrador.tempo)}" placeholder="3-1-1" inputmode="text"></label>
        <label class="campo"><span>Máximo (kg)</span><input id="e-rm" value="${h(borrador.rm ?? "")}" placeholder="1RM" inputmode="decimal"></label>
      </div>
      <p class="ayuda">«Máximo» es la repetición máxima del cliente en este ejercicio. Si la indicas, el PDF muestra los kilos aproximados según el %.</p>
      <label class="campo"><span>Nota para el cliente (opcional)</span><input id="e-nota" value="${h(borrador.nota)}" placeholder="Ej.: Controla la bajada, profundidad hasta paralelo"></label>

      <div class="titulo-sec" style="margin-top:6px">Evolución semana a semana
        <span class="der"><button class="btn chico suave" id="e-prog">${UI.ic("wand")}Progresión rápida</button></span></div>
      <table class="tabla-sem">
        <thead><tr><th></th><th>Series</th><th>Reps</th><th>Desc. s</th><th>%</th>${rpe ? "<th>RPE</th>" : ""}<th></th></tr></thead>
        <tbody id="e-filas">${filas()}</tbody>
      </table>
      <p class="ayuda">Las filas en color cálido son semanas de descarga. La flecha ↓ copia esa semana hacia abajo hasta el final de la fase.</p>
      ${nuevo ? "" : `<div class="espacio"></div><button class="btn peligro bloque" id="e-borrar">${UI.ic("trash")}Eliminar ejercicio</button>`}
    `;

    const hoja = UI.hoja({
      titulo: nuevo ? "Nuevo ejercicio" : "Editar ejercicio", html, fija: true,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="e-ok">${nuevo ? "Añadir" : "Guardar"}</button>`,
      alAbrir: (hh) => { if (nuevo) setTimeout(() => $("#e-nombre", hh.el).focus(), 300); },
    });
    const el = hoja.el;

    const refrescarFilas = () => { $("#e-filas", el).innerHTML = filas(); };

    /* sugerencias */
    const nom = $("#e-nombre", el);
    nom.addEventListener("input", () => {
      borrador.nombre = nom.value;
      const sug = UI.sugerirEjercicios(nom.value);
      $("#e-sug", el).innerHTML = sug.length ? `<div class="sugerencias">${sug.map((s, i) => `<button data-s="${i}">${h(s.n)}<small>${h(s.g)}</small></button>`).join("")}</div>` : "";
      $("#e-sug", el).onclick = (e) => {
        const b = e.target.closest("[data-s]");
        if (!b) return;
        const s = sug[+b.dataset.s];
        nom.value = borrador.nombre = s.n;
        if (grupos.includes(s.g)) borrador.grupo = s.g;
        $("#e-sug", el).innerHTML = "";
      };
    });

    for (const [id, campo] of [["e-super", "super"], ["e-tempo", "tempo"], ["e-nota", "nota"]]) {
      $("#" + id, el).addEventListener("input", (e) => { borrador[campo] = e.target.value; });
    }
    $("#e-rm", el).addEventListener("input", (e) => { borrador.rm = PF.num(e.target.value); });

    /* tabla */
    $("#e-filas", el).addEventListener("input", (e) => {
      const inp = e.target.closest("input[data-c]");
      if (!inp) return;
      const w = +inp.closest("tr").dataset.w, campo = inp.dataset.c, c = borrador.sem[w - 1];
      if (campo === "s" || campo === "d") c[campo] = inp.value === "" ? "" : Math.max(0, Math.round(PF.num(inp.value) ?? 0));
      else if (campo === "i") c.i = PF.num(inp.value);
      else c[campo] = inp.value;
    });

    $("#e-filas", el).addEventListener("click", (e) => {
      const b = e.target.closest("[data-abajo]");
      if (!b) return;
      const w = +b.dataset.abajo;
      const info = PF.faseDeSemana(plan, w);
      const hasta = info ? info.hasta : n;
      for (let k = w + 1; k <= hasta; k++) borrador.sem[k - 1] = { ...borrador.sem[w - 1] };
      refrescarFilas();
      UI.aviso(hasta > w ? `Copiado a las semanas ${w + 1}–${hasta}` : "Es la última semana de la fase");
    });

    $("#e-prog", el).addEventListener("click", () => UI.progresionRapida(plan, borrador, refrescarFilas));

    const borrar = $("#e-borrar", el);
    if (borrar) borrar.addEventListener("click", async () => {
      if (await UI.confirmar("Eliminar ejercicio", `¿Eliminar «${borrador.nombre || "este ejercicio"}» de la sesión?`, { si: "Eliminar", peligro: true })) {
        hoja.cerrar(); alEliminar && alEliminar();
      }
    });

    $("#e-ok", el).addEventListener("click", () => {
      borrador.nombre = borrador.nombre.trim();
      if (!borrador.nombre) { UI.aviso("Escribe el nombre del ejercicio", { error: true }); $("#e-nombre", el).focus(); return; }
      borrador.super = String(borrador.super || "").trim().toUpperCase();
      for (const c of borrador.sem) { if (c.s === "") c.s = 0; if (c.d === "") c.d = 0; }
      UI.recordarEjercicio(borrador.nombre);
      hoja.cerrar();
      alGuardar(borrador);
    });
  };

  /* ============ PROGRESIÓN RÁPIDA ============ */

  UI.progresionRapida = (plan, ej, alAplicar) => {
    const n = plan.semanas;
    const opts = (sel) => Array.from({ length: n }, (_, i) => `<option value="${i + 1}" ${i + 1 === sel ? "selected" : ""}>Semana ${i + 1}</option>`).join("");

    const hoja = UI.hoja({
      titulo: "Progresión rápida", clase: "dialogo", fija: true,
      html: `
        <p>Rellena una columna de golpe: indica el valor de partida y cuánto cambia cada semana.</p>
        <label class="campo"><span>¿Qué quieres progresar?</span>
          <select id="p-campo">${CAMPOS.filter((c) => c.id !== "rpe" || plan.opciones.rpe).map((c) => `<option value="${c.id}" ${c.id === "i" ? "selected" : ""}>${c.nombre}</option>`).join("")}</select></label>
        <div class="cols2">
          <label class="campo"><span>Desde</span><select id="p-desde">${opts(1)}</select></label>
          <label class="campo"><span>Hasta</span><select id="p-hasta">${opts(n)}</select></label>
        </div>
        <div class="cols2">
          <label class="campo"><span>Valor inicial</span><input id="p-ini" inputmode="decimal"></label>
          <label class="campo"><span>Cambio por semana</span><input id="p-paso" inputmode="decimal" value="2.5"></label>
        </div>
        <p class="ayuda" id="p-prev"></p>`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="p-ok">Aplicar</button>`,
    });
    const el = hoja.el;
    const val = (id) => $("#" + id, el).value;

    const valorDe = () => { const c = val("p-campo"), w = +val("p-desde"); const v = ej.sem[w - 1][c]; return v === null || v === undefined ? "" : String(v); };

    const prev = () => {
      const c = val("p-campo"), d = +val("p-desde"), hh = +val("p-hasta");
      const ini = val("p-ini"), paso = PF.num(val("p-paso")) ?? 0;
      if (hh < d || ini === "") { $("#p-prev", el).textContent = ""; return; }
      const tmp = { sem: Array.from({ length: n }, () => ({ s: 0, r: "", d: 0, i: null, rpe: "" })) };
      PF.progresion(tmp, c, d, hh, ini, paso);
      const v = [d, Math.min(hh, d + 1), Math.min(hh, d + 2), hh].filter((x, i, a) => a.indexOf(x) === i).map((w) => `S${w}: ${c === "i" ? tmp.sem[w - 1][c] + "%" : tmp.sem[w - 1][c]}`);
      $("#p-prev", el).textContent = `Quedará así → ${v.join("  ·  ")}`;
    };

    const poner = () => { $("#p-ini", el).value = valorDe(); prev(); };
    $("#p-campo", el).addEventListener("change", () => {
      const c = val("p-campo");
      $("#p-paso", el).value = c === "i" ? "2.5" : c === "d" ? "0" : "1";
      poner();
    });
    $("#p-desde", el).addEventListener("change", poner);
    for (const id of ["p-hasta", "p-ini", "p-paso"]) $("#" + id, el).addEventListener("input", prev);
    $("#p-hasta", el).addEventListener("change", prev);
    poner();

    $("#p-ok", el).addEventListener("click", () => {
      const c = val("p-campo"), d = +val("p-desde"), hh = +val("p-hasta");
      if (hh < d) { UI.aviso("«Hasta» debe ser igual o mayor que «Desde»", { error: true }); return; }
      if (val("p-ini") === "") { UI.aviso("Indica el valor inicial", { error: true }); return; }
      PF.progresion(ej, c, d, hh, val("p-ini"), PF.num(val("p-paso")) ?? 0);
      hoja.cerrar();
      alAplicar();
      UI.aviso("Progresión aplicada");
    });
  };

  /* ============ SESIÓN ============ */

  UI.editarSesion = (plan, ses, alGuardar, acciones = {}) => {
    const nuevo = !ses;
    const b = ses ? { ...ses, ejercicios: ses.ejercicios } : PF.nuevaSesion(`Día ${plan.sesiones.length + 1}`);

    const hoja = UI.hoja({
      titulo: nuevo ? "Nueva sesión" : "Editar sesión", fija: true,
      html: `
        <label class="campo"><span>Nombre</span><input id="s-nombre" value="${h(b.nombre)}" placeholder="Ej.: Día 1 · Tren inferior"></label>
        <label class="campo"><span>Día de la semana (opcional)</span>
          <select id="s-dia"><option value="">Sin día fijo</option>${D.DIAS_SEMANA.map((d) => `<option ${d === b.dia ? "selected" : ""}>${d}</option>`).join("")}</select></label>
        <label class="campo"><span>Enfoque (opcional)</span><input id="s-foco" value="${h(b.foco)}" placeholder="Ej.: Sentadilla y cadena posterior"></label>
        <label class="campo"><span>Calentamiento (opcional)</span><textarea id="s-cal" placeholder="Ej.: 8 min de bici + movilidad de cadera + series de aproximación">${h(b.calentamiento)}</textarea></label>
        ${nuevo ? "" : `<div class="dos-btn"><button class="btn" id="s-dup">${UI.ic("copy")}Duplicar</button><button class="btn peligro" id="s-del">${UI.ic("trash")}Eliminar</button></div>`}`,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="s-ok">${nuevo ? "Crear" : "Guardar"}</button>`,
      alAbrir: (hh) => { if (nuevo) setTimeout(() => { const i = $("#s-nombre", hh.el); i.focus(); i.select(); }, 300); },
    });
    const el = hoja.el;

    $("#s-ok", el).addEventListener("click", () => {
      b.nombre = $("#s-nombre", el).value.trim() || `Día ${plan.sesiones.length + 1}`;
      b.dia = $("#s-dia", el).value;
      b.foco = $("#s-foco", el).value.trim();
      b.calentamiento = $("#s-cal", el).value.trim();
      hoja.cerrar();
      alGuardar(b);
    });
    if (!nuevo) {
      $("#s-dup", el).addEventListener("click", () => { hoja.cerrar(); acciones.duplicar && acciones.duplicar(); });
      $("#s-del", el).addEventListener("click", async () => {
        if (await UI.confirmar("Eliminar sesión", `¿Eliminar «${ses.nombre}» con sus ${ses.ejercicios.length} ejercicios?`, { si: "Eliminar", peligro: true })) { hoja.cerrar(); acciones.eliminar && acciones.eliminar(); }
      });
    }
  };
})(window);
