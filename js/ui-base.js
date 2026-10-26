/* Utilidades de interfaz: iconos, hojas modales, avisos, confirmaciones. */
(function (root) {
  "use strict";

  const UI = (root.UI = {});

  UI.h = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  UI.$ = (sel, el = document) => el.querySelector(sel);
  UI.$$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  const P = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    grip: '<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    flag: '<path d="M5 22V4M5 4h11l-2 4 2 4H5"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.2-3.5-7C14.700 6.300 14 4 14 2c-3 2-6 5.500-6 9 0 1 .3 1.900 1 3-1.500-.3-3-1.500-3-3.500C4.500 12 5 13.500 5 15c0 4.200 3 7 7 7z"/>',
    book: '<path d="M4 19.500A2.500 2.500 0 0 1 6.500 17H20V3H6.500A2.500 2.500 0 0 0 4 5.500z"/><path d="M20 17v4H6.500a2.500 2.500 0 0 1 0-5"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/>',
    swap: '<path d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    pdf: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h5"/>',
    settings: '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrowdown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    dots: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    trend: '<path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    sparkle: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    drag: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    wand: '<path d="m15 4 5 5"/><path d="m3 21 12-12"/><path d="M18 2v3M21 5h-3M7 3v2M8 4H6M20 14v2M21 15h-2"/>',
    play: '<path d="M6 3.5v17l15-8.5z"/>',
    pause: '<rect x="5" y="4" width="5" height="16" rx="1.3"/><rect x="14" y="4" width="5" height="16" rx="1.3"/>',
  };

  UI.ic = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

  /* ---------- avisos ---------- */

  UI.aviso = (texto, op = {}) => {
    const cont = UI.$("#avisos");
    const el = document.createElement("div");
    el.className = "aviso" + (op.error ? " error" : "");
    el.innerHTML = `<span>${UI.h(texto)}</span>` + (op.accion ? `<button>${UI.h(op.accion)}</button>` : "");
    cont.appendChild(el);
    if (op.accion) el.querySelector("button").addEventListener("click", () => { op.alAccion && op.alAccion(); el.remove(); });
    setTimeout(() => el.remove(), op.ms || 3200);
  };

  /* ---------- hojas modales ---------- */

  const pila = [];

  // opciones: titulo, html, pie (html), clase, alCerrar, alAbrir(el)
  UI.hoja = (op) => {
    const fondo = document.createElement("div");
    fondo.className = "fondo";
    fondo.innerHTML = `
      <div class="hoja ${op.clase || ""}" role="dialog" aria-modal="true">
        ${op.titulo ? `<div class="hoja-cab"><h2>${UI.h(op.titulo)}</h2><button class="icono gris" data-cerrar aria-label="Cerrar">${UI.ic("x")}</button></div>` : ""}
        <div class="hoja-cuerpo">${op.html || ""}</div>
        ${op.pie ? `<div class="hoja-pie">${op.pie}</div>` : ""}
      </div>`;
    UI.$("#capa").appendChild(fondo);
    const h = { el: fondo, cuerpo: UI.$(".hoja-cuerpo", fondo), cerrar };

    function cerrar(valor) {
      if (h.cerrada) return;
      h.cerrada = true;
      fondo.classList.remove("on");
      const i = pila.indexOf(h);
      if (i >= 0) pila.splice(i, 1);
      setTimeout(() => fondo.remove(), 220);
      op.alCerrar && op.alCerrar(valor);
    }

    fondo.addEventListener("click", (e) => { if (e.target === fondo && !op.fija) cerrar(); });
    fondo.addEventListener("click", (e) => { if (e.target.closest("[data-cerrar]")) cerrar(); });
    pila.push(h);
    requestAnimationFrame(() => fondo.classList.add("on"));
    op.alAbrir && op.alAbrir(h);
    return h;
  };

  UI.cerrarTodas = () => { while (pila.length) pila[pila.length - 1].cerrar(); };
  UI.hayHoja = () => pila.length > 0;

  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && pila.length) pila[pila.length - 1].cerrar(); });

  UI.confirmar = (titulo, texto, op = {}) => new Promise((res) => {
    let hecho = false;
    const h = UI.hoja({
      titulo, clase: "dialogo", html: `<p>${UI.h(texto)}</p>`,
      pie: `<button class="btn" data-no>${UI.h(op.no || "Cancelar")}</button><button class="btn ${op.peligro ? "peligro lleno" : "primario"}" data-si>${UI.h(op.si || "Aceptar")}</button>`,
      alCerrar: () => { if (!hecho) res(false); },
    });
    UI.$("[data-no]", h.el).addEventListener("click", () => h.cerrar());
    UI.$("[data-si]", h.el).addEventListener("click", () => { hecho = true; res(true); h.cerrar(); });
  });

  UI.preguntar = (titulo, etiqueta, valor = "", op = {}) => new Promise((res) => {
    let hecho = false;
    const h = UI.hoja({
      titulo, clase: "dialogo",
      html: `<label class="campo"><span>${UI.h(etiqueta)}</span><input type="${op.tipo || "text"}" value="${UI.h(valor)}" ${op.inputmode ? `inputmode="${op.inputmode}"` : ""} autocomplete="off"></label>`,
      pie: `<button class="btn" data-no>Cancelar</button><button class="btn primario" data-si>${UI.h(op.si || "Guardar")}</button>`,
      alCerrar: () => { if (!hecho) res(null); },
      alAbrir: (hh) => setTimeout(() => { const i = UI.$("input", hh.el); i && (i.focus(), i.select()); }, 280),
    });
    const ok = () => { hecho = true; res(UI.$("input", h.el).value.trim()); h.cerrar(); };
    UI.$("[data-no]", h.el).addEventListener("click", () => h.cerrar());
    UI.$("[data-si]", h.el).addEventListener("click", ok);
    UI.$("input", h.el).addEventListener("keydown", (e) => { if (e.key === "Enter") ok(); });
  });

  // Menú de acciones: items [{t, ic, peligro, f}]
  UI.menu = (titulo, items) => {
    const h = UI.hoja({
      titulo, clase: "dialogo",
      html: items.map((it, i) => `<button class="fila ${it.peligro ? "peligro" : ""}" data-i="${i}" style="box-shadow:none;background:var(--card)">${UI.ic(it.ic || "dots")}<span class="t"><b ${it.peligro ? 'style="color:var(--peligro)"' : ""}>${UI.h(it.t)}</b></span></button>`).join(""),
    });
    h.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]");
      if (!b) return;
      h.cerrar();
      const it = items[+b.dataset.i];
      setTimeout(() => it.f && it.f(), 60);
    });
  };

  /* ---------- utilidades varias ---------- */

  UI.iniciales = (nombre) => (String(nombre || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();

  const COLORES_AV = ["#2F6BFF", "#7C4DFF", "#F2603C", "#16A085", "#E5A00D", "#D6336C", "#1F9BD1", "#5C7A29"];
  UI.colorAvatar = (texto) => { let n = 0; for (const c of String(texto || "")) n = (n * 31 + c.charCodeAt(0)) >>> 0; return COLORES_AV[n % COLORES_AV.length]; };

  UI.nombreArchivo = (txt) => String(txt || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  UI.debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

  UI.hexARGB = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  // Aplica el color de marca a toda la interfaz
  UI.aplicarColor = (hex) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex || "")) hex = "#2F6BFF";
    const r = document.documentElement.style;
    r.setProperty("--acento", hex);
    r.setProperty("--acento-suave", UI.hexARGB(hex, 0.13));
  };
})(window);
