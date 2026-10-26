/* Modo "Entrenar": pantalla para dar la clase en vivo, con un cronómetro circular siempre a mano. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, Store = PF.Store, h = UI.h, $ = UI.$, $$ = UI.$$;
  const V = UI.vistas;

  UI.estado.entrenarPaso = UI.estado.entrenarPaso || {};

  const RADIO = 96, CIRC = 2 * Math.PI * RADIO;

  /* ---------- motor del cronómetro (vive fuera del render, no se reinicia al redibujar) ---------- */

  const Tmr = {
    fases: [{ etiqueta: "Temporizador", seg: 0, tipo: "neutro" }],
    idx: 0, seg: 0, modo: "parado", corriendo: false,
    esBloque: false, terminado: false, finMostrado: false,
    actx: null,
  };
  let intervaloId = null;
  let prepClave = null;

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
        else {
          Tmr.seg = 0; Tmr.corriendo = false; Tmr.modo = "parado";
          beepFinal();
          if (Tmr.esBloque) Tmr.terminado = true;
        }
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
    beep(220, 660); setTimeout(() => beep(260, 990), 260); setTimeout(() => beep(300, 1180), 520);
    try { navigator.vibrate && navigator.vibrate([0, 150, 90, 150, 90, 220]); } catch (e) { /* nada */ }
  }

  /* ---------- helpers para armar/cargar el cronómetro ---------- */

  function cargarFases(fases, esBloque) {
    Tmr.fases = fases.length ? fases : [{ etiqueta: "Temporizador", seg: 0, tipo: "neutro" }];
    Tmr.idx = 0; Tmr.seg = Tmr.fases[0].seg;
    Tmr.modo = Tmr.fases[0].seg > 0 ? "cuenta" : "crono";
    Tmr.corriendo = false; Tmr.esBloque = !!esBloque; Tmr.terminado = false; Tmr.finMostrado = false;
  }

  function setCuenta(seg, tipo = "descanso") {
    cargarFases([{ etiqueta: tipo === "descanso" ? "Descanso" : "Temporizador", seg, tipo }], false);
    Tmr.corriendo = seg > 0;
    pintarTmr();
  }
  function setCrono() {
    cargarFases([{ etiqueta: "Cronómetro", seg: 0, tipo: "neutro" }], false);
    Tmr.corriendo = true;
    pintarTmr();
  }

  const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, "0")}`; };

  /* ---------- confetti + pantalla de "terminaste" ---------- */

  const COLORES_CONF = ["#2F6BFF", "#17A673", "#F2603C", "#E5A00D", "#7C4DFF", "#19C3B0"];

  function dispararConfetti() {
    const cont = document.getElementById("ent-confetti");
    if (!cont) return;
    cont.innerHTML = "";
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("span");
      s.className = "conf-pieza";
      s.style.left = Math.random() * 100 + "%";
      s.style.background = COLORES_CONF[i % COLORES_CONF.length];
      s.style.animationDelay = (Math.random() * 0.35) + "s";
      s.style.animationDuration = (1.5 + Math.random() * 1.1) + "s";
      s.style.setProperty("--rot", (Math.random() * 520 - 260) + "deg");
      s.style.setProperty("--drift", (Math.random() * 160 - 80) + "px");
      if (Math.random() > 0.5) s.style.borderRadius = "50%";
      cont.appendChild(s);
    }
  }

  function pintarFin() {
    const ov = document.getElementById("ent-fin");
    if (!ov) return;
    if (Tmr.terminado) {
      ov.classList.add("on");
      if (!Tmr.finMostrado) { Tmr.finMostrado = true; dispararConfetti(); }
    } else {
      ov.classList.remove("on");
    }
  }

  function reiniciarTras(volverAIdx0) {
    Tmr.idx = 0; Tmr.seg = (Tmr.fases[0] && Tmr.fases[0].seg) || 0; Tmr.terminado = false; Tmr.finMostrado = false;
    if (volverAIdx0) Tmr.corriendo = false;
  }

  /* ---------- pintar en pantalla (solo toca el DOM, no vuelve a renderizar la vista) ---------- */

  function pintarTmr() {
    const elR = document.getElementById("tmr-reloj");
    if (!elR) { clearInterval(intervaloId); intervaloId = null; return; }
    elR.textContent = mmss(Tmr.seg);

    const faseAct = Tmr.fases[Tmr.idx] || {};
    const total = faseAct.seg || 0;
    const idle = !Tmr.corriendo && !Tmr.terminado && Tmr.idx === 0 && Tmr.seg === total;
    const pausado = !Tmr.corriendo && !Tmr.terminado && !idle;
    const tipo = idle || pausado ? "neutro" : (faseAct.tipo || "neutro");

    const pn = document.getElementById("tmr-pasos");
    if (pn) pn.textContent = Tmr.fases.length > 1 ? `Paso ${Tmr.idx + 1} / ${Tmr.fases.length}` : "";

    const est = document.getElementById("tmr-estado");
    if (est) {
      est.textContent = Tmr.terminado ? "¡Terminaste!"
        : idle ? "Comenzar"
        : pausado ? "Pausado"
        : tipo === "descanso" ? "Descanso"
        : tipo === "trabajo" ? "Trabajo"
        : Tmr.modo === "crono" ? "Cronómetro" : "Temporizador";
    }
    const sub = document.getElementById("tmr-etiqueta");
    if (sub) sub.textContent = !idle && !Tmr.terminado && Tmr.fases.length > 1 ? (faseAct.etiqueta || "") : "";

    const wrap = document.getElementById("tmr-circulo-wrap");
    if (wrap) { wrap.classList.remove("trabajo", "descanso", "neutro", "idle", "pausado", "terminado"); wrap.classList.add(Tmr.terminado ? "terminado" : idle ? "idle" : pausado ? "pausado" : tipo); }

    const anillo = document.getElementById("tmr-circ");
    if (anillo) {
      if (Tmr.modo === "crono") {
        anillo.style.strokeDasharray = `${CIRC} ${0}`;
        anillo.classList.toggle("pulso", Tmr.corriendo);
      } else {
        anillo.classList.remove("pulso");
        const frac = total ? Math.max(0, Math.min(1, Tmr.seg / total)) : 0;
        const arco = CIRC * frac;
        anillo.style.strokeDasharray = `${arco} ${CIRC - arco}`;
      }
    }

    const tg = document.getElementById("tmr-toggle");
    if (tg) tg.classList.toggle("corriendo", Tmr.corriendo);
    const ti = document.getElementById("tmr-ic");
    if (ti) ti.innerHTML = UI.ic(Tmr.corriendo ? "pause" : "play");

    pintarFin();
  }

  /* ---------- generar las fases automáticas de un bloque funcional ---------- */

  function fasesDeBloque(b) {
    const n = Math.max(1, (b.ejercicios || []).length);
    const F = [];
    const push = (etiqueta, seg, tipo) => { if (seg > 0) F.push({ etiqueta, seg, tipo }); };
    switch (b.tipo) {
      case "amrap": push("AMRAP", (b.minutos || 0) * 60, "trabajo"); break;
      case "emom": {
        const cada = b.cada || 60, total = Math.max(1, Math.round(((b.minutos || 0) * 60) / cada));
        for (let i = 0; i < total; i++) push(`Minuto ${i + 1} de ${total}`, cada, "trabajo");
        break;
      }
      case "tabata": {
        const series = b.series || 1, rondas = b.rondas || 0;
        for (let s = 0; s < series; s++) {
          for (let r = 0; r < rondas; r++) {
            push(`Serie ${s + 1} · Ronda ${r + 1}/${rondas}`, b.trabajo || 0, "trabajo");
            if (r < rondas - 1) push(`Serie ${s + 1} · Ronda ${r + 1}/${rondas}`, b.descanso || 0, "descanso");
          }
          if (s < series - 1) push("Pausa entre series", b.descansoSerie || 0, "descanso");
        }
        break;
      }
      case "fortime": if (b.timeCap) push(`FOR TIME · tope ${b.timeCap}'`, b.timeCap * 60, "trabajo"); break;
      case "circuito": {
        const rondas = b.rondas || 1;
        for (let r = 0; r < rondas; r++) {
          for (let e = 0; e < n; e++) {
            push(`Ronda ${r + 1}/${rondas} · Estación ${e + 1}/${n}`, b.trabajo || 0, "trabajo");
            push(`Ronda ${r + 1}/${rondas} · Descanso`, b.descanso || 0, "descanso");
          }
          if (r < rondas - 1 && b.descansoRonda) push("Pausa entre rondas", b.descansoRonda, "descanso");
        }
        break;
      }
      case "intervalos": {
        const series = b.series || 0;
        for (let s = 0; s < series; s++) {
          push(`Serie ${s + 1}/${series}`, b.trabajo || 0, "trabajo");
          if (s < series - 1) push(`Serie ${s + 1}/${series} · Descanso`, b.descanso || 0, "descanso");
        }
        break;
      }
      default: break;
    }
    return F;
  }

  /* prepara (sin arrancar) el cronómetro para el paso que se está mirando, sincronizado con sus tiempos */
  function prepararPaso(paso, esFunc, w) {
    if (esFunc) {
      const b = paso.b;
      if (b.tipo === "fortime" && !b.timeCap) { cargarFases([{ etiqueta: "FOR TIME", seg: 0, tipo: "trabajo" }], true); return; }
      cargarFases(fasesDeBloque(b), true);
    } else {
      const c = paso.e.sem[w - 1];
      if (c.d > 0) cargarFases([{ etiqueta: "Descanso", seg: c.d, tipo: "descanso" }], false);
      else cargarFases([{ etiqueta: "Temporizador", seg: 0, tipo: "neutro" }], false);
    }
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
        <div class="ent-filas">
          <div><b>${h(c.s)}</b><span>series</span></div>
          <div><b>${c.r === "" || c.r == null ? "–" : h(c.r)}</b><span>reps</span></div>
          ${c.d ? `<div><b>${h(c.d)}"</b><span>descanso</span></div>` : ""}
          ${pc ? `<div><b>${h(String(pc).replace(".", ","))}%</b><span>intensidad</span></div>` : ""}
          ${kg ? `<div><b>${h(kg)} kg</b><span>peso</span></div>` : ""}
          ${c.rpe ? `<div><b>${h(c.rpe)}</b><span>RPE</span></div>` : ""}
        </div>
        ${nota ? `<p class="ent-nota">${nota}</p>` : ""}
      </div>`;
  }

  function tarjetaBloqueEnt(b) {
    return `
      <div class="ent-card ent-func">
        <span class="pildora acento">${h(PF.tituloBloque(b))}</span>
        ${b.nombre ? `<h1>${h(b.nombre)}</h1>` : ""}
        ${PF.detalleBloque(b) ? `<p class="ent-nota">${h(PF.detalleBloque(b))}</p>` : ""}
        <ul class="ent-lista">${(b.ejercicios || []).map((e, i) => `<li><b>${h(e.reps || (b.tipo === "circuito" ? "Est. " + (i + 1) : "·"))}</b><span>${h(e.nombre || "Ejercicio")}</span>${e.carga ? `<em>${h(e.carga)}</em>` : ""}${e.equip && e.equip.length ? `<small>${h(e.equip.join(", "))}</small>` : ""}</li>`).join("") || `<li class="muted">Sin ejercicios cargados</li>`}</ul>
        ${b.nota ? `<p class="ent-nota">${h(b.nota)}</p>` : ""}
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
    const claveStep = clave + ":" + pasoIdx;

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

    const circulo = `
      <div class="ent-reloj-wrap" id="tmr-circulo-wrap">
        <svg class="ent-reloj-svg" viewBox="0 0 220 220">
          <circle class="pista" cx="110" cy="110" r="${RADIO}"></circle>
          <circle class="prog" id="tmr-circ" cx="110" cy="110" r="${RADIO}"></circle>
        </svg>
        <button class="ent-reloj-centro" id="tmr-toggle" data-tmr-toggle="1" aria-label="Iniciar o pausar el cronómetro">
          <span class="ent-reloj-estado" id="tmr-estado">Comenzar</span>
          <span class="ent-reloj-num" id="tmr-reloj">0:00</span>
          <span class="ent-reloj-etq" id="tmr-etiqueta"></span>
          <span class="ent-reloj-ic" id="tmr-ic">${UI.ic("play")}</span>
          <span class="ent-reloj-pasos" id="tmr-pasos"></span>
        </button>
      </div>`;

    const html = `
      <div class="ent-pantalla">
        ${cabecera}
        ${dots}
        <div class="ent-medio">
          <div class="ent-cuerpo-mini">${cuerpo}</div>
          ${circulo}
          <div class="ent-reloj-ctrl">
            <button data-tmr-ajuste="-15" class="btn chico">−15"</button>
            <button data-tmr-reset="1" class="btn chico" aria-label="Reiniciar">${UI.ic("refresh")}</button>
            <button data-tmr-ajuste="15" class="btn chico">+15"</button>
          </div>
          <div class="ent-tmr-chips">${chips}<button class="chip" data-tmr-crono="1">Cronómetro</button></div>
        </div>
        ${nav}
        <div class="ent-fin" id="ent-fin">
          <div class="ent-confetti" id="ent-confetti"></div>
          <div class="ent-fin-card">
            <span class="ent-fin-ic">${UI.ic("flag")}</span>
            <h2>¡Terminaste!</h2>
            <p>Bloque completado. Tocá en cualquier lado para continuar.</p>
          </div>
        </div>
      </div>`;

    return {
      titulo: ses.nombre || "Entrenar", atras: volver, html,
      bind(el) {
        if (total && prepClave !== claveStep) { prepararPaso(pasos[pasoIdx], esFunc, w); prepClave = claveStep; }
        iniciarIntervaloGlobal();
        pintarTmr();

        const irPaso = (n) => { UI.estado.entrenarPaso[clave] = Math.max(0, Math.min(total - 1, n)); UI.render(true); };
        $$("[data-ir-paso]", el).forEach((b) => b.addEventListener("click", () => irPaso(+b.dataset.irPaso)));
        $$("[data-paso-mov]", el).forEach((b) => b.addEventListener("click", () => irPaso(pasoIdx + +b.dataset.pasoMov)));

        $$("[data-tmr-chip]", el).forEach((b) => b.addEventListener("click", () => setCuenta(+b.dataset.tmrChip)));
        const cr = $("[data-tmr-crono]", el); if (cr) cr.addEventListener("click", setCrono);

        const tg = $("[data-tmr-toggle]", el);
        if (tg) tg.addEventListener("click", () => {
          if (Tmr.terminado) { reiniciarTras(false); Tmr.corriendo = true; }
          else Tmr.corriendo = !Tmr.corriendo;
          pintarTmr();
        });
        $$("[data-tmr-ajuste]", el).forEach((b) => b.addEventListener("click", () => { Tmr.seg = Math.max(0, Tmr.seg + +b.dataset.tmrAjuste); pintarTmr(); }));
        const rs = $("[data-tmr-reset]", el);
        if (rs) rs.addEventListener("click", () => { reiniciarTras(true); pintarTmr(); });

        const fin = $("#ent-fin", el);
        if (fin) fin.addEventListener("click", () => { reiniciarTras(true); pintarTmr(); });
      },
    };
  };
})(window);
