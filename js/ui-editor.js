/* Hojas de edición: ejercicio (valores de esta semana, independiente del resto) y sesión. */
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

  /* ============ EJERCICIO ============ */

  // existente: ejercicio a editar (se trabaja sobre una copia) o null para crear. alGuardar(ej)
  // Los valores (series, reps, descanso, intensidad, rpe) pertenecen solo a esta semana: no afectan a otras.
  UI.editarEjercicio = (plan, existente, alGuardar, alEliminar) => {
    const borrador = existente ? JSON.parse(JSON.stringify(existente)) : PF.nuevoEjercicio("");
    const nuevo = !existente;
    const rpe = plan.opciones.rpe;

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

      <div class="titulo-sec" style="margin-top:6px">Valores de esta semana</div>
      <div class="cols3">
        <label class="campo"><span>Series</span><input id="e-s" inputmode="numeric" value="${h(borrador.s)}"></label>
        <label class="campo"><span>Repeticiones</span><input id="e-r" value="${h(borrador.r)}"></label>
        <label class="campo"><span>Descanso (s)</span><input id="e-d" inputmode="numeric" value="${h(borrador.d)}"></label>
      </div>
      <div class="cols2">
        <label class="campo"><span>Intensidad (%)</span><input id="e-i" inputmode="decimal" value="${h(borrador.i ?? "")}" placeholder="–"></label>
        ${rpe ? `<label class="campo"><span>RPE</span><input id="e-rpe" inputmode="decimal" value="${h(borrador.rpe ?? "")}" placeholder="–"></label>` : ""}
      </div>
      <p class="ayuda">Estos valores son solo de esta semana. Para que otra semana tenga lo mismo, usa «Copiar otra semana aquí» y luego ajusta lo que necesites.</p>
      ${nuevo ? "" : `<div class="espacio"></div><button class="btn peligro bloque" id="e-borrar">${UI.ic("trash")}Eliminar ejercicio</button>`}
    `;

    const hoja = UI.hoja({
      titulo: nuevo ? "Nuevo ejercicio" : "Editar ejercicio", html, fija: true,
      pie: `<button class="btn" data-cerrar>Cancelar</button><button class="btn primario" id="e-ok">${nuevo ? "Añadir" : "Guardar"}</button>`,
      alAbrir: (hh) => { if (nuevo) setTimeout(() => $("#e-nombre", hh.el).focus(), 300); },
    });
    const el = hoja.el;

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

    $("#e-s", el).addEventListener("input", (e) => { borrador.s = e.target.value === "" ? "" : Math.max(0, Math.round(PF.num(e.target.value) ?? 0)); });
    $("#e-r", el).addEventListener("input", (e) => { borrador.r = e.target.value; });
    $("#e-d", el).addEventListener("input", (e) => { borrador.d = e.target.value === "" ? "" : Math.max(0, Math.round(PF.num(e.target.value) ?? 0)); });
    $("#e-i", el).addEventListener("input", (e) => { borrador.i = PF.num(e.target.value); });
    const rpeInp = $("#e-rpe", el);
    if (rpeInp) rpeInp.addEventListener("input", (e) => { borrador.rpe = e.target.value; });

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
      if (borrador.s === "") borrador.s = 0;
      if (borrador.d === "") borrador.d = 0;
      UI.recordarEjercicio(borrador.nombre);
      hoja.cerrar();
      alGuardar(borrador);
    });
  };

  /* ============ SESIÓN ============ */

  UI.editarSesion = (plan, ses, alGuardar, acciones = {}) => {
    const nuevo = !ses;
    const b = ses ? { ...ses } : PF.nuevaSesion(`Día ${plan.sesiones.length + 1}`, plan.semanas);
    const totalEj = ses ? ses.semanas.reduce((a, wk) => a + wk.ejercicios.length, 0) : 0;

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
        if (await UI.confirmar("Eliminar sesión", `¿Eliminar «${ses.nombre}»${totalEj ? ` con sus ${totalEj} ejercicios (en todas las semanas)` : ""}?`, { si: "Eliminar", peligro: true })) { hoja.cerrar(); acciones.eliminar && acciones.eliminar(); }
      });
    }
  };
})(window);
