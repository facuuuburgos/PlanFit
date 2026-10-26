/* Modo "Entrenar": pantalla para dar la clase en vivo, con un cronómetro siempre a mano. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  const V = UI.vistas;

  UI.estado.entrenarPaso = UI.estado.entrenarPaso || {};

  /* ---------- motor del cronómetro (vive fuera del render, no se reinicia al redibujar) ---------- */

  const Tmr = { fases: [{ etiqueta: "Temporizador", seg: 0 }], idx: 0, seg: 0, modo: "parado", corriendo: false, actx: null };
  let intervaloId = null;

  function iniciarIntervaloGlobal() {
    if (intervaloId) return;
    intervaloId = setInterval(tickTmr, 1000);
  }

  function tickTmr() {
    if (!document.getElementById("tmr-reloj")) { clearInterval(intervaloId); intervaloId = null; return; }
    if (!Tmr.corriendo) return;
    if (Tmr.modo === "crono") { Tmr.seg++; pintarTmr(); return; }
    if (Tmr.modo === "cuenta") {
      Tmr.seg--;
      if (Tmr.seg <= 0) {
        if (Tmr.idx < Tmr.fases.length - 1) { beep(); Tmr.idx++; Tmr.seg = Tmr.fases[Tmr.idx].seg; }
        else { Tmr.seg = 0; Tmr.corriendo = false; Tmr.modo = "parado"; beepFinal(); }
      }
      pintarTmr();
    }
  }

  function beep(ms = 150, freq = 880) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = Tmr.actx || (Tmr.actx = new Ctx());
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.22, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
      o.start(); o.stop(ctx.currentTime + ms / 1000);
    } catch (e) { /* sin audio disponible */ }
    try { navigator.vibrate && navigator.vibrate(120); } catch (e) { /* nada */ }
  }
  function beepFinal() {
    beep(220, 660); setTimeout(() => beep(260, 990), 260);
    try { navigator.vibrate && navigator.vibrate([0, 150, 90, 150]); } catch (e) { /* nada */ }
  }

  function setCuenta(seg) {
    Tmr.fases = [{ etiqueta: "Temporizador", seg }]; Tmr.idx = 0; Tmr.seg = seg; Tmr.modo = "cuenta"; Tmr.corriendo = seg > 0;
    pintarTmr();
  }
  function setCrono() {
    Tmr.fases = [{ etiqueta: "Cronómetro", seg: 0 }]; Tmr.idx = 0; Tmr.seg = 0; Tmr.modo = "crono"; Tmr.corriendo = true;
    pintarTmr();
  }
  function setFases(fases) {
    Tmr.fases = fases.length ? fases : [{ etiqueta: "Manual", seg: 0 }]; Tmr.idx = 0; Tmr.seg = Tmr.fases[0].seg; Tmr.modo = "cuenta"; Tmr.corriendo = true;
    pintarTmr();
  }

  const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, "0")}`; };

  function pintarTmr() {
    const elR = document.getElementById("tmr-reloj");
    if (!elR) { clearInterval(intervaloId); intervaloId = null; return; }
    elR.textContent = mmss(Tmr.seg);
    const fe = document.getElementById("tmr-fase");
    if (fe) fe.textContent = (Tmr.fases[Tmr.idx] && Tmr.fases[Tmr.idx].etiqueta) || "Temporizador";
    const pn = document.getElementById("tmr-pasos");
    if (pn) pn.textContent = Tmr.fases.length > 1 ? `Paso ${Tmr.idx + 1} / ${Tmr.fases.length}` : "";
    const pr = document.getElementById("tmr-prog");
    if (pr) {
      const total = (Tmr.fases[Tmr.idx] && Tmr.fases[Tmr.idx].seg) || 0;
      const pct = Tmr.modo === "cuenta" && total ? Math.max(0, Math.min(100, (1 - Tmr.seg / total) * 100)) : Tmr.modo === "crono" ? 100 : 0;
      pr.style.width = pct + "%";
    }
    const tg = document.getElementById("tmr-toggle");
    if (tg) tg.innerHTML = UI.ic(Tmr.corriendo ? "pause" : "play");
    const barra = document.getElementById("tmr-barra");
    if (barra) barra.classList.toggle("activo", Tmr.corriendo);
  }

  /* ---------- generar las fases automáticas de un bloque funcional ---------- */

  function fasesDeBloque(b) {
    const n = Math.max(1, (b.ejercicios || []).length);
    const F = [];
    const push = (etiqueta, seg) => { if (seg > 0) F.push({ etiqueta, seg }); };
    switch (b.tipo) {
      case "amrap": push("AMRAP", (b.minutos || 0) * 60); break;
      case "emom": {
        const cada = b.cada || 60, total = Math.max(1, Math.round(((b.minutos || 0) * 60) / cada));
        for (let i = 0; i < total; i++) push(`Minuto ${i + 1} de ${total}`, cada);
        break;
      }
      case "tabata": {
        const series = b.series || 1, rondas = b.rondas || 0;
        for (let s = 0; s < series; s++) {
          for (let r = 0; r < rondas; r++) {
            push(`Serie ${s + 1} · Ronda ${r + 1}/${rondas} · Trabajo`, b.trabajo || 0);
            if (r < rondas - 1) push(`Serie ${s + 1} · Ronda ${r + 1}/${rondas} · Descanso`, b.descanso || 0);
          }
          if (s < series - 1) push("Pausa entre series", b.descansoSerie || 0);
        }
        break;
      }
      case "fortime": if (b.timeCap) push(`FOR TIME · tope ${b.timeCap}'`, b.timeCap * 60); break;
      case "circuito": {
        const rondas = b.rondas || 1;
        for (let r = 0; r < rondas; r++) {
          for (let e = 0; e < n; e++) {
            push(`Ronda ${r + 1}/${rondas} · Estación ${e + 1}/${n}`, b.trabajo || 0);
            push(`Ronda ${r + 1}/${rondas} · Descanso`, b.descanso || 0);
          }
          if (r < rondas - 1 && b.descansoRonda) push("Pausa entre rondas", b.descansoRonda);
        }
        break;
      }
      case "intervalos": {
        const series = b.series || 0;
        for (let s = 0; s < series; s++) {
          push(`Serie ${s + 1}/${series} · Trabajo`, b.trabajo || 0);
          if (s < series - 1) push(`Serie ${s + 1}/${series} · Descanso`, b.descanso || 0);
        }
        break;
      }
      default: break;
    }
    return F;
  }

  function iniciarBloque(b) {
    if (b.tipo === "fortime" && !b.timeCap) { setCrono(); return; }
    const F = fasesDeBloque(b);
    if (!F.length) { setCrono(); return; }
    setFases(F);
  }

  /* ---------- tarjetas de cada paso ---------- */

  function tarjetaEjercicio(plan, p, w) {
    const e = p.e, c = e.sem[w - 1];
    const kg = plan.opciones.kg ? PF.kgDe(e, w) : null;
    const pc = PF.num(c.i);
    const nota = [e.tempo ? "Tempo " + h(e.tempo) : "", e.rm ? "Máx. " + h(e.rm) + " kg" : "", e.nota ? h(e.nota) : ""].filter(Boolean).join(" · ");
    return `
      <div class="ent-card">
        ${e.super ? `<span class="pildora">${h(e.super)}</span>` : ""}
        <h1>${h(e.nombre || "Ejercicio")}</h1>
        <div class="ent-grande">${h(c.s)}<small>series</small></div>
        <div class="ent-filas">
          <div><b>${c.r === "" || c.r == null ? "–" : h(c.r)}</b><span>reps</span></div>
          ${c.d ? `<div><b>${h(c.d)}"</b><span>descanso</span></div>` : ""}
          ${pc ? `<div><b>${h(String(pc).replace(".", ","))}%</b><span>intensidad</span></div>` : ""}
          ${kg ? `<div><b>${h(kg)} kg</b><span>peso</span></div>` : ""}
          ${c.rpe ? `<div><b>${h(c.rpe)}</b><span>RPE</span></div>` : ""}
        </div>
        ${nota ? `<p class="ent-nota">${nota}</p>` : ""}
        ${c.d ? `<button class="btn primario bloque" data-tmr-chip="${c.d}">${UI.ic("clock")}Iniciar descanso de ${h(c.d)}"</button>` : ""}
      </div>`;
  }

  function tarjetaBloqueEnt(b) {
    const dur = PF.duracionBloque(b);
    return `
      <div class="ent-card ent-func">
        <span class="pildora acento">${h(PF.tituloBloque(b))}</span>
        ${b.nombre ? `<h1>${h(b.nombre)}</h1>` : ""}
        ${PF.detalleBloque(b) ? `<p class="ent-nota">${h(PF.detalleBloque(b))}</p>` : ""}
        <ul class="ent-lista">${(b.ejercicios || []).map((e, i) => `<li><b>${h(e.reps || (b.tipo === "circuito" ? "Est. " + (i + 1) : "·"))}</b><span>${h(e.nombre || "Ejercicio")}</span>${e.carga ? `<em>${h(e.carga)}</em>` : ""}${e.equip && e.equip.length ? `<small>${h(e.equip.join(", "))}</small>` : ""}</li>`).join("") || `<li class="muted">Sin ejercicios cargados</li>`}</ul>
        ${b.nota ? `<p class="ent-nota">${h(b.nota)}</p>` : ""}
        <button class="btn primario bloque" data-tmr-usar-bloque="1">${UI.ic("clock")}${dur ? "Iniciar bloque (" + PF.fmtTiempo(dur) + ")" : "Iniciar bloque"}</button>
        ${b.descansoDespues ? `<button class="btn bloque" data-tmr-chip="${b.descansoDespues}">${UI.ic("clock")}Descanso después (${PF.fmtTiempo(b.descansoDespues)})</button>` : ""}
      </div>`;
  }

  /* ---------- vista principal ---------- */

  V.entrenar = (r) => {
    const plan = Store.plan(r.id);
    if (!plan) return { titulo: "Entrenar", atras: "#/", html: `<div class="vacio"><h2>No se encontró el plan</h2></div>` };
    const cli = Store.cliente(plan.clienteId);
    const esFunc = plan.tipo === "funcional";
    const volver = `#/p/${plan.id}`;
    const si = Math.max(0, Math.min(plan.sesiones.length - 1, r.si || 0));
    const ses = plan.sesiones[si];
    if (!ses) return { titulo: "Entrenar", atras: volver, html: `<div class="vacio"><h2>No hay sesión para entrenar</h2></div>` };
    UI.ctx = { cliente: cli, plan };

    let pasos, w = null;
    if (esFunc) {
      pasos = ses.bloques.map((b, bi) => ({ tipo: "bloque", b, bi }));
    } else {
      w = Math.max(1, Math.min(plan.semanas, UI.estado.semanaVista[plan.id] || PF.semanaActual(plan)));
      pasos = ses.ejercicios.map((e, ei) => ({ tipo: "ej", e, ei })).filter((p) => PF.activo(p.e, w));
    }

    const clave = plan.id + ":" + si;
    const total = pasos.length;
    const pasoIdx = total ? Math.max(0, Math.min(total - 1, UI.estado.entrenarPaso[clave] || 0)) : 0;

    const subt = [cli ? cli.nombre : "", ses.foco, esFunc ? "" : `Semana ${w}`].filter(Boolean).join(" · ");

    const cabecera = `
      <div class="ent-top">
        <a class="icono" href="${volver}" aria-label="Salir del modo entrenar">${UI.ic("x")}</a>
        <div class="ent-top-t"><b>${h(ses.nombre || "Sesión " + (si + 1))}</b><span>${h(subt)}</span></div>
        <span class="ent-top-n">${total ? `${pasoIdx + 1} / ${total}` : ""}</span>
      </div>`;

    const dots = total > 1 ? `<div class="ent-dots">${pasos.map((_, i) => `<button class="${i === pasoIdx ? "on" : ""}" data-ir-paso="${i}" aria-label="Ir al paso ${i + 1}"></button>`).join("")}</div>` : "";

    const cuerpo = !total
      ? `<div class="ent-card"><p class="ent-nota">Esta sesión no tiene ${esFunc ? "bloques" : "ejercicios"} para entrenar${esFunc ? "" : " en la semana " + w}.</p></div>`
      : (esFunc ? tarjetaBloqueEnt(pasos[pasoIdx].b) : tarjetaEjercicio(plan, pasos[pasoIdx], w));

    const nav = total ? `
      <div class="ent-nav">
        <button class="btn" data-paso-mov="-1" ${pasoIdx <= 0 ? "disabled" : ""}>${UI.ic("left")}Anterior</button>
        ${pasoIdx < total - 1 ? `<button class="btn primario" data-paso-mov="1">Siguiente${UI.ic("right")}</button>` : `<a class="btn primario" href="${volver}">${UI.ic("check")}Finalizar</a>`}
      </div>` : `<div class="ent-nav"><a class="btn primario" href="${volver}">${UI.ic("left")}Volver al plan</a></div>`;

    const chips = [15, 30, 45, 60, 90, 120].map((s) => `<button class="chip" data-tmr-chip="${s}">${s}"</button>`).join("");

    const html = `
      <div class="ent-pantalla">
        ${cabecera}
        ${dots}
        <div class="ent-cuerpo">${cuerpo}</div>
        ${nav}
        <div class="ent-tmr" id="tmr-barra">
          <div class="ent-tmr-barra"><div id="tmr-prog"></div></div>
          <div class="ent-tmr-fila">
            <div class="ent-tmr-info"><span id="tmr-fase">Temporizador</span><span id="tmr-pasos"></span></div>
            <div id="tmr-reloj" class="ent-tmr-reloj">0:00</div>
          </div>
          <div class="ent-tmr-ctrl">
            <button data-tmr-ajuste="-15" class="btn chico">−15"</button>
            <button id="tmr-toggle" data-tmr-toggle="1" class="ent-tmr-play" aria-label="Iniciar o pausar">${UI.ic("play")}</button>
            <button data-tmr-ajuste="15" class="btn chico">+15"</button>
            <button data-tmr-reset="1" class="btn chico" aria-label="Reiniciar">${UI.ic("refresh")}</button>
          </div>
          <div class="ent-tmr-chips">${chips}<button class="chip" data-tmr-crono="1">Cronómetro</button></div>
        </div>
      </div>`;

    return {
      titulo: ses.nombre || "Entrenar", atras: volver, html,
      bind(el) {
        iniciarIntervaloGlobal();
        pintarTmr();

        const irPaso = (n) => { UI.estado.entrenarPaso[clave] = Math.max(0, Math.min(total - 1, n)); UI.render(true); };
        $$("[data-ir-paso]", el).forEach((b) => b.addEventListener("click", () => irPaso(+b.dataset.irPaso)));
        $$("[data-paso-mov]", el).forEach((b) => b.addEventListener("click", () => irPaso(pasoIdx + +b.dataset.pasoMov)));

        $$("[data-tmr-chip]", el).forEach((b) => b.addEventListener("click", () => setCuenta(+b.dataset.tmrChip)));
        const cr = $("[data-tmr-crono]", el); if (cr) cr.addEventListener("click", setCrono);
        const ub = $("[data-tmr-usar-bloque]", el);
        if (ub && pasos[pasoIdx]) ub.addEventListener("click", () => iniciarBloque(pasos[pasoIdx].b));
        const tg = $("[data-tmr-toggle]", el);
        if (tg) tg.addEventListener("click", () => {
          if (Tmr.modo === "parado") setCrono();
          else { Tmr.corriendo = !Tmr.corriendo; pintarTmr(); }
        });
        $$("[data-tmr-ajuste]", el).forEach((b) => b.addEventListener("click", () => { Tmr.seg = Math.max(0, Tmr.seg + +b.dataset.tmrAjuste); pintarTmr(); }));
        const rs = $("[data-tmr-reset]", el);
        if (rs) rs.addEventListener("click", () => { Tmr.idx = 0; Tmr.seg = (Tmr.fases[0] && Tmr.fases[0].seg) || 0; Tmr.corriendo = false; pintarTmr(); });
      },
    };
  };
})(window);
