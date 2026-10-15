/* Diseño del PDF del plan de entrenamiento. Usa PDFLib (pdf-lib.js) y los cálculos de PF (store.js). */
(function (root) {
  "use strict";

  const { Documento, mezclar, aHex, dataURLaBytes } = root.PDFLib;
  const PF = root.PF;

  const PW = 595.28, PH = 841.89, M = 40, CW = PW - 2 * M;
  const LIMITE = PH - 56;          // hasta dónde llega el contenido
  const TINTA = "#161B2E", GRIS = "#5E6779", GRIS2 = "#8A93A6", LINEA = "#E4E8F0", FONDO = "#F5F7FB", BLANCO = "#FFFFFF";
  const AMBAR = "#C77700", AMBAR_FONDO = "#FFF4E0";

  const tinte = (c, t) => aHex(mezclar(c, "#FFFFFF", t));       // t=0 color puro, t=1 blanco
  const oscuro = (c, t) => aHex(mezclar(c, "#0B1020", t));

  const DIAS_CORTOS = { "Lunes": "LUN", "Martes": "MAR", "Miércoles": "MIÉ", "Jueves": "JUE", "Viernes": "VIE", "Sábado": "SÁB", "Domingo": "DOM" };

  const fmtSR = (c) => `${c.s || 0}×${(c.r ?? "") === "" ? "-" : c.r}`;
  const fmtDesc = (seg) => {
    const n = PF.num(seg);
    if (n === null) return "";
    const t = Math.round(n);
    if (t < 60) return `${t}"`;
    const m = Math.floor(t / 60), r = t % 60;
    return r ? `${m}'${String(r).padStart(2, "0")}"` : `${m}'`;
  };
  const fmtPct = (c) => { const i = PF.num(c.i); return i ? `${String(i).replace(".", ",")}%` : ""; };

  function esEnlace(t) {
    t = String(t || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "mailto:" + t;
    if (/^(https?:\/\/|www\.)/i.test(t)) return /^https?:/i.test(t) ? t : "https://" + t;
    return null;
  }

  function generar(plan, cliente, ent, op = {}) {
    cliente = cliente || { nombre: "", edad: "", altura: "", peso: "", lesiones: "", objetivos: "" };
    ent = ent || {};

    const acento = /^#[0-9a-f]{6}$/i.test(ent.color || "") ? ent.color : "#2F6BFF";
    const opciones = Object.assign({ pct: true, kg: true, rpe: false, tempo: false, notas: true, registro: true, seguimiento: true, recomendaciones: true }, plan.opciones || {});
    const alcance = op.alcance || "semana";
    const actual = PF.semanaActual(plan);

    let semanas;
    if (alcance === "completo") semanas = Array.from({ length: plan.semanas }, (_, i) => i + 1);
    else if (alcance === "rango") {
      const a = Math.max(1, Math.min(plan.semanas, op.desde || 1)), b = Math.max(a, Math.min(plan.semanas, op.hasta || a));
      semanas = Array.from({ length: b - a + 1 }, (_, i) => a + i);
    } else semanas = [Math.max(1, Math.min(plan.semanas, op.semana || actual))];

    // Semana que se marca como "estás aquí" en la gráfica
    const marcada = alcance === "semana" ? semanas[0] : (alcance === "rango" ? semanas[0] : actual);

    const doc = new Documento({
      titulo: `${plan.titulo}${cliente.nombre ? " - " + cliente.nombre : ""}`,
      autor: ent.nombre || "PlanFit",
    });

    let logo = null;
    try { if (ent.logo) logo = doc.imagen(dataURLaBytes(ent.logo)); } catch (e) { logo = null; }

    const S = { doc, p: null, y: 0, plan, cliente, ent, acento, opciones, semanas, marcada, logo, paginasCabecera: [] };

    /* ============ utilidades de página ============ */

    function nuevaPagina(rotulo, fase) {
      const p = doc.nuevaPagina(PW, PH);
      S.p = p;
      S.pagCuerpo = true;
      S.y = M;

      // cabecera fina en páginas interiores
      if (rotulo) {
        p.text(rotulo, M, 24, { size: 8, font: "b", color: GRIS2, spacing: 0.9 });
        const t = `${cliente.nombre || plan.titulo}`;
        p.text(t, PW - M, 24, { size: 8, color: GRIS2, align: "right" });
        p.line(M, 38, PW - M, 38, { color: LINEA, lw: 0.7 });
        S.y = 54;
      }

      return p;
    }

    function asegurar(alto, rotulo) {
      if (S.y + alto > LIMITE) { nuevaPagina(rotulo || S.rotuloActual); return true; }
      return false;
    }

    function titulo(texto, y, sub) {
      const p = S.p;
      p.rect(M, y + 1, 3.2, 13, { fill: acento, r: 1.6 });
      p.text(texto.toUpperCase(), M + 11, y + 2, { size: 9.5, font: "b", color: TINTA, spacing: 1.1 });
      if (sub) p.text(sub, PW - M, y + 3, { size: 8.5, color: GRIS2, align: "right" });
      return y + 24;
    }

    /* ============ PORTADA ============ */

    function portada() {
      const p = nuevaPagina(null);
      S.rotuloActual = "PLAN DE ENTRENAMIENTO";

      const fases = PF.rangosFases(plan);
      const colorBanda = fases[0] ? mezclar(acento, "#0B1020", 0.0) : acento;
      p.degradado(0, 0, PW, 190, acento, oscuro(acento, 0.45), "d");
      // formas decorativas suaves
      p.circle(PW - 40, 20, 120, { fill: "#FFFFFF", alpha: 0.06 });
      p.circle(PW - 150, 190, 70, { fill: "#FFFFFF", alpha: 0.05 });

      let tx = M;
      if (logo) {
        p.rect(M, 32, 52, 52, { fill: "#FFFFFF", r: 12 });
        p.imagen(logo, M + 5, 37, 42, 42, { modo: "contain", r: 7 });
        tx = M + 66;
      }

      p.text(ent.nombre || "Entrenador personal", tx, logo ? 42 : 36, { size: 15, font: "b", color: "#FFFFFF" });
      const cont = [ent.contacto, ent.web].filter(Boolean).join("   ·   ");
      if (cont) p.text(cont, tx, logo ? 62 : 58, { size: 8.5, color: "#FFFFFF", alpha: 0.82 });

      p.text("PLAN DE ENTRENAMIENTO", PW - M, 38, { size: 8, font: "b", color: "#FFFFFF", align: "right", spacing: 1.6, alpha: 0.85 });

      p.bloque(plan.titulo || "Plan de entrenamiento", M, 106, CW, { size: 27, font: "b", color: "#FFFFFF", lh: 31, maxLines: 2 });
      const hT = Math.min(2, p.lineas(plan.titulo || "", CW, 27, "b").length) * 31;

      const quien = cliente.nombre ? `Preparado para ${cliente.nombre}` : "";
      if (quien) p.text(quien, M, 106 + hT + 4, { size: 12.5, color: "#FFFFFF", alpha: 0.92 });

      const fin = PF.sumarDias(plan.inicio, plan.semanas * 7 - 1);
      p.text(`${PF.fechaLarga(plan.inicio)}  –  ${PF.fechaLarga(fin)}`, M, 170, { size: 9, color: "#FFFFFF", alpha: 0.8 });

      // ---- tarjetas de datos ----
      let y = 208;
      const meses = Math.round((plan.semanas / 4.345) * 10) / 10;
      const tiles = [
        ["EDAD", cliente.edad ? `${cliente.edad} años` : "—"],
        ["ALTURA", cliente.altura ? `${String(cliente.altura).replace(".", ",")} cm` : "—"],
        ["PESO", cliente.peso ? `${String(cliente.peso).replace(".", ",")} kg` : "—"],
        ["DURACIÓN", `${plan.semanas} sem` + (plan.semanas >= 6 ? `  (≈ ${String(meses).replace(".", ",")} meses)` : "")],
      ];
      const gap = 10, tw = (CW - gap * 3) / 4;
      tiles.forEach((t, i) => {
        const x = M + i * (tw + gap);
        p.rect(x, y, tw, 52, { fill: FONDO, r: 10 });
        p.text(t[0], x + 12, y + 11, { size: 7, font: "b", color: GRIS2, spacing: 1 });
        const grande = i === 3 ? 12 : 15;
        p.text(t[1], x + 12, y + 25, { size: grande, font: "b", color: TINTA });
      });
      y += 52 + 12;

      const colW = (CW - gap) / 2;
      const objetivos = cliente.objetivos || "—";
      const lesiones = cliente.lesiones || "Sin lesiones ni limitaciones indicadas";
      const hO = p.alturaBloque(objetivos, colW - 28, 9.5, "r", 13);
      const hL = p.alturaBloque(lesiones, colW - 28, 9.5, "r", 13);
      const hc = Math.max(58, 34 + Math.max(hO, hL));

      p.rect(M, y, colW, hc, { fill: BLANCO, stroke: LINEA, lw: 1, r: 10 });
      p.text("OBJETIVOS", M + 14, y + 12, { size: 7.5, font: "b", color: acento, spacing: 1 });
      p.bloque(objetivos, M + 14, y + 28, colW - 28, { size: 9.5, color: TINTA, lh: 13 });

      const x2 = M + colW + gap;
      const hayLes = !!cliente.lesiones;
      p.rect(x2, y, colW, hc, { fill: hayLes ? AMBAR_FONDO : BLANCO, stroke: hayLes ? "#F2D49B" : LINEA, lw: 1, r: 10 });
      p.text("LESIONES Y LIMITACIONES", x2 + 14, y + 12, { size: 7.5, font: "b", color: hayLes ? AMBAR : GRIS2, spacing: 1 });
      p.bloque(lesiones, x2 + 14, y + 28, colW - 28, { size: 9.5, color: hayLes ? TINTA : GRIS2, lh: 13 });
      y += hc + 22;

      // ---- gráfica ----
      y = titulo("Mapa del plan", y, `${plan.semanas} semanas`);
      y = dibujarMapa(p, M, y, CW);
      y += 18;

      // ---- fases ----
      if (fases.length) {
        asegurar(60, "PLAN DE ENTRENAMIENTO");
        const pp = S.p;
        if (S.p !== p) y = S.y;
        y = titulo("Fases del plan", y);
        y = dibujarFases(S.p, M, y, CW);
      }

      S.y = y;
    }

    /* ---------- gráfica principal ---------- */

    function dibujarMapa(p, x, y, w) {
      const rangos = PF.rangosFases(plan);
      const n = plan.semanas;
      const curva = PF.curva(plan);
      const pad = 16;
      const gx = x + pad + 22, gw = w - pad * 2 - 22 - 22;   // zona de gráfica (con eje a ambos lados)
      const xw = gw / n;
      const top = y;

      const hayDatos = curva.some((c) => c.series > 0);
      const hayInt = curva.some((c) => c.intensidad);
      const altoGraf = hayDatos ? 112 : 24;
      const altoTotal = pad + 24 /*pastilla*/ + 30 /*fases*/ + 16 /*semanas*/ + (n >= 8 ? 14 : 0) + (hayDatos ? altoGraf + 8 : 0) + 30 /*leyenda*/;

      p.rect(x, y, w, altoTotal, { fill: BLANCO, stroke: LINEA, lw: 1, r: 12 });

      // pastilla "estás aquí"
      const yPast = y + pad;
      const yFases = yPast + 24;

      // barras de fase
      rangos.forEach((r) => {
        const x0 = gx + (r.desde - 1) * xw, ancho = (r.hasta - r.desde + 1) * xw - 2.5;
        p.rect(x0, yFases, ancho, 26, { fill: r.fase.color, r: 7 });
        const t = r.fase.nombre;
        const tam = ancho > 70 ? 9 : 7.5;
        let txt = t;
        while (txt.length > 2 && p.medir(txt, tam, "b") > ancho - 8) txt = txt.slice(0, -1);
        if (txt !== t) txt = txt.replace(/\s+$/, "") + "…";
        p.text(txt, x0 + ancho / 2, yFases + (26 - tam) / 2 - 0.5, { size: tam, font: "b", color: "#FFFFFF", align: "center" });
      });

      // semanas sin fase
      const cubiertas = rangos.length ? rangos[rangos.length - 1].hasta : 0;
      if (cubiertas < n) p.rect(gx + cubiertas * xw, yFases, (n - cubiertas) * xw - 2.5, 26, { fill: "#E4E8F0", r: 7 });

      // zona gráfica
      let yPie;
      const yGraf = yFases + 26 + 8;

      if (hayDatos) {
        // bandas suaves por fase
        rangos.forEach((r) => {
          p.rect(gx + (r.desde - 1) * xw, yGraf, (r.hasta - r.desde + 1) * xw, altoGraf, { fill: tinte(r.fase.color, 0.93) });
        });

        const maxS = Math.max(4, ...curva.map((c) => c.series));
        const maxSeries = Math.ceil(maxS / 4) * 4;
        const maxInt = hayInt ? Math.max(100, Math.ceil(Math.max(...curva.map((c) => c.intensidad || 0)) / 10) * 10) : 100;

        // rejilla
        for (let k = 0; k <= 4; k++) {
          const yy = yGraf + altoGraf - (altoGraf * k) / 4;
          p.line(gx, yy, gx + gw, yy, { color: k === 0 ? "#C9D0DE" : "#FFFFFF", lw: k === 0 ? 0.8 : 0.9 });
          if (hayInt) p.text(`${Math.round((maxInt * k) / 4)}`, gx - 5, yy - 3.5, { size: 6.5, color: GRIS2, align: "right" });
          p.text(`${Math.round((maxSeries * k) / 4)}`, gx + gw + 5, yy - 3.5, { size: 6.5, color: GRIS2 });
        }

        // columna de la semana marcada
        const mx = gx + (marcada - 0.5) * xw;
        p.rect(gx + (marcada - 1) * xw, yGraf - 3, xw, altoGraf + 3, { fill: TINTA, alpha: 0.07 });

        // barras de volumen
        curva.forEach((c) => {
          if (!c.series) return;
          const bw = Math.max(2, xw * 0.56);
          const bh = (c.series / maxSeries) * altoGraf;
          const fase = PF.faseDeSemana(plan, c.w);
          const col = fase ? fase.fase.color : GRIS2;
          p.rect(gx + (c.w - 0.5) * xw - bw / 2, yGraf + altoGraf - bh, bw, bh, { fill: tinte(col, c.descarga ? 0.62 : 0.38), r: Math.min(3, bw / 3) });
        });

        // línea de intensidad
        if (hayInt) {
          const pts = curva.filter((c) => c.intensidad).map((c) => [gx + (c.w - 0.5) * xw, yGraf + altoGraf - (c.intensidad / maxInt) * altoGraf]);
          p.poligono([[pts[0][0], yGraf + altoGraf], ...pts, [pts[pts.length - 1][0], yGraf + altoGraf]], { fill: TINTA, alpha: 0.06 });
          p.poligono(pts, { stroke: TINTA, lw: 1.8 });
          const rp = n > 30 ? 1.2 : 2.3;
          pts.forEach((q) => { p.circle(q[0], q[1], rp + 1, { fill: BLANCO }); p.circle(q[0], q[1], rp, { fill: TINTA }); });
        }

        // línea de la semana marcada
        p.line(mx, yFases + 26, mx, yGraf + altoGraf, { color: TINTA, lw: 1.3, dash: [3, 2.4] });
        yPie = yGraf + altoGraf;
      } else {
        const mx = gx + (marcada - 0.5) * xw;
        p.line(mx, yFases + 26, mx, yFases + 26 + 14, { color: TINTA, lw: 1.3, dash: [3, 2.4] });
        yPie = yFases + 26 + 8;
      }

      // pastilla de la semana marcada
      {
        const mx = gx + (marcada - 0.5) * xw;
        const txt = alcance === "semana" || alcance === "rango" ? `SEMANA ${marcada} · RUTINA ACTUAL` : `SEMANA ${marcada} · ESTÁS AQUÍ`;
        const tw2 = p.medir(txt, 7.5, "b", 0.7) + 18;
        const px = Math.max(x + 6, Math.min(x + w - 6 - tw2, mx - tw2 / 2));
        p.rect(px, yPast, tw2, 17, { fill: TINTA, r: 8.5 });
        p.text(txt, px + tw2 / 2, yPast + 4.6, { size: 7.5, font: "b", color: "#FFFFFF", align: "center", spacing: 0.7 });
        p.poligono([[mx - 4.5, yPast + 17], [mx + 4.5, yPast + 17], [mx, yPast + 22.5]], { fill: TINTA });
      }

      // eje de semanas
      const paso = n <= 14 ? 1 : n <= 28 ? 2 : n <= 40 ? 4 : 5;
      for (let wk = 1; wk <= n; wk++) {
        const cx = gx + (wk - 0.5) * xw;
        const es = wk === marcada;
        if (wk === 1 || wk === n || wk % paso === 0 || es) {
          // evita pegar etiquetas con la de la semana marcada
          if (!es && Math.abs(wk - marcada) * xw < 11) continue;
          p.text(String(wk), cx, yPie + 4, { size: es ? 8 : 7, font: es ? "b" : "r", color: es ? TINTA : GRIS2, align: "center" });
        }
        if (curva[wk - 1].descarga) p.poligono([[cx - 3, yPie + 17], [cx + 3, yPie + 17], [cx, yPie + 12.5]], { fill: GRIS });
      }
      let yy = yPie + 16;

      // meses
      if (n >= 8) {
        const totalMeses = Math.ceil(n / 4.345);
        for (let m = 1; m <= totalMeses; m++) {
          const a = (m - 1) * 4.345, b = Math.min(n, m * 4.345);
          const cx = gx + ((a + b) / 2) * xw;
          if (b - a < 2.2) continue;
          p.line(gx + a * xw + 2, yy + 2, gx + b * xw - 2, yy + 2, { color: LINEA, lw: 1 });
          p.text(`Mes ${m}`, cx, yy + 5, { size: 6.8, color: GRIS2, align: "center" });
        }
        yy += 16;
      }

      // leyenda
      const ly = yy + 8;
      let lx = x + pad + 22;
      if (hayDatos) {
        p.rect(lx, ly + 1.5, 9, 6, { fill: tinte(acento, 0.4), r: 2 });
        lx += 14; lx += p.text("Series por semana", lx, ly, { size: 7.5, color: GRIS }) + 14;
        if (hayInt) {
          p.line(lx, ly + 4.5, lx + 14, ly + 4.5, { color: TINTA, lw: 1.8 }); p.circle(lx + 7, ly + 4.5, 2.4, { fill: TINTA });
          lx += 20; lx += p.text("Intensidad media (% de tu máximo)", lx, ly, { size: 7.5, color: GRIS }) + 14;
        }
      }
      if (curva.some((c) => c.descarga)) {
        p.poligono([[lx, ly + 7], [lx + 6, ly + 7], [lx + 3, ly + 1.5]], { fill: GRIS });
        lx += 11; p.text("Semana de descarga", lx, ly, { size: 7.5, color: GRIS });
      }

      return top + altoTotal;
    }

    /* ---------- tarjetas de fases ---------- */

    function dibujarFases(p, x, y, w) {
      const rangos = PF.rangosFases(plan);
      const gap = 10;
      const cols = rangos.length <= 1 ? 1 : rangos.length === 2 ? 2 : 3;
      const cw = (w - gap * (cols - 1)) / cols;

      for (let i = 0; i < rangos.length; i += cols) {
        const par = rangos.slice(i, i + cols);
        const alturas = par.map((r) => 58 + (r.fase.objetivo ? p.alturaBloque(r.fase.objetivo, cw - 30, 8.5, "r", 11.5, 4) : 0));
        const h = Math.max(...alturas);

        if (y + h > LIMITE) { nuevaPagina("PLAN DE ENTRENAMIENTO"); p = S.p; y = S.y; }

        par.forEach((r, k) => {
          const cx = x + k * (cw + gap);
          p.rect(cx, y, cw, h, { fill: tinte(r.fase.color, 0.92), r: 10 });
          p.rect(cx, y, 5, h, { fill: r.fase.color, r: 2.5 });
          p.text(r.fase.nombre, cx + 16, y + 10, { size: 10.5, font: "b", color: TINTA });
          const m1 = PF.mesDeSemana(r.desde), m2 = PF.mesDeSemana(r.hasta);
          const sem = r.desde === r.hasta ? `Semana ${r.desde}` : `Semanas ${r.desde}–${r.hasta}`;
          p.text(`${sem}  ·  ${r.hasta - r.desde + 1} sem`, cx + 16, y + 25, { size: 8, color: oscuro(r.fase.color, 0.1) });
          if (plan.semanas >= 8) p.text(m1 === m2 ? `mes ${m1}` : `meses ${m1}–${m2}`, cx + 16, y + 36, { size: 7.5, color: GRIS2 });
          if (r.fase.objetivo) p.bloque(r.fase.objetivo, cx + 16, y + 52, cw - 30, { size: 8.5, color: GRIS, lh: 11.5, maxLines: 4 });
        });

        y += h + gap;
      }

      return y;
    }

    /* ============ PÁGINAS DE SEMANA ============ */

    function nombreFechaSemana(w) {
      const a = PF.fechaSemana(plan, w), b = PF.sumarDias(a, 6);
      return `${PF.fechaCorta(a).slice(0, 5)} al ${PF.fechaCorta(b).slice(0, 5)}`;
    }

    function cabeceraSemana(w) {
      const p = nuevaPagina(null);
      const info = PF.faseDeSemana(plan, w);
      const color = info ? info.fase.color : acento;
      const desc = plan.semInfo[w - 1] && plan.semInfo[w - 1].descarga;

      p.degradado(0, 0, PW, 96, color, oscuro(color, 0.4), "d");
      p.circle(PW - 30, 10, 90, { fill: "#FFFFFF", alpha: 0.06 });

      p.text("SEMANA", M, 24, { size: 8, font: "b", color: "#FFFFFF", spacing: 1.8, alpha: 0.85 });
      p.text(String(w), M, 36, { size: 40, font: "b", color: "#FFFFFF" });
      const nx = M + p.medir(String(w), 40, "b") + 16;

      p.text(info ? info.fase.nombre : "Plan de entrenamiento", nx, 36, { size: 16, font: "b", color: "#FFFFFF" });
      p.text(`${nombreFechaSemana(w)}   ·   semana ${w} de ${plan.semanas}`, nx, 58, { size: 9, color: "#FFFFFF", alpha: 0.85 });

      if (desc) {
        const t = "SEMANA DE DESCARGA";
        const tw = p.medir(t, 7, "b", 0.9) + 16;
        p.rect(nx, 74, tw, 15, { fill: "#FFFFFF", alpha: 0.22, r: 7.5 });
        p.text(t, nx + tw / 2, 78, { size: 7, font: "b", color: "#FFFFFF", align: "center", spacing: 0.9 });
      }

      p.text(cliente.nombre || "", PW - M, 28, { size: 10, font: "b", color: "#FFFFFF", align: "right" });
      p.text(ent.nombre || "", PW - M, 43, { size: 8.5, color: "#FFFFFF", align: "right", alpha: 0.8 });

      // minibarra del plan
      let y = 108;
      const gap = 1.6, sw = (CW - gap * (plan.semanas - 1)) / plan.semanas;
      for (let k = 1; k <= plan.semanas; k++) {
        const f = PF.faseDeSemana(plan, k);
        const col = f ? f.fase.color : "#C9D0DE";
        const es = k === w;
        p.rect(M + (k - 1) * (sw + gap), es ? y - 2 : y, sw, es ? 9 : 5, { fill: col, alpha: es ? 1 : 0.38, r: Math.min(2.5, sw / 2) });
      }
      p.text(`Tu progreso en el plan: semana ${w} de ${plan.semanas}`, M, y + 12, { size: 7.5, color: GRIS2 });

      const nota = plan.semInfo[w - 1] && plan.semInfo[w - 1].nota;
      y += 28;

      if (nota) {
        const h = p.alturaBloque(nota, CW - 32, 9.5, "i", 13);
        p.rect(M, y, CW, h + 18, { fill: tinte(color, 0.92), r: 9 });
        p.rect(M, y, 4, h + 18, { fill: color, r: 2 });
        p.bloque(nota, M + 16, y + 9, CW - 32, { size: 9.5, font: "i", color: TINTA, lh: 13 });
        y += h + 18 + 14;
      }

      S.rotuloActual = `SEMANA ${w}`;
      S.y = y;
      return { color };
    }

    // columnas de la tabla de ejercicios
    function columnas() {
      const c = [{ id: "n", w: 30, t: "" }];
      c.push({ id: "ej", w: 0, t: "EJERCICIO" });
      c.push({ id: "s", w: 38, t: "SERIES", a: "center" });
      c.push({ id: "r", w: 50, t: "REPS", a: "center" });
      c.push({ id: "d", w: 48, t: "DESC.", a: "center" });
      if (opciones.pct) c.push({ id: "i", w: opciones.kg ? 56 : 44, t: "INT.", a: "center" });
      if (opciones.rpe) c.push({ id: "rpe", w: 34, t: "RPE", a: "center" });
      if (opciones.registro) c.push({ id: "reg", w: 62, t: "MI CARGA", a: "center" });
      const fijo = c.reduce((a, k) => a + k.w, 0);
      c[1].w = CW - fijo - 12;
      let x = M + 8;
      c.forEach((k) => { k.x = x; x += k.w; });
      return c;
    }

    function filaEjercicio(p, cols, e, idx, w, y, zebra, color) {
      const celda = e.sem[w - 1] || PF.semanaVacia();
      const cEj = cols[1];
      const nota = [e.tempo ? `Tempo ${e.tempo}` : "", opciones.notas ? e.nota : ""].filter(Boolean).join("  ·  ");
      const hNom = p.alturaBloque(e.nombre || "Ejercicio", cEj.w - 10, 10, "b", 12.5);
      const hNota = nota ? p.alturaBloque(nota, cEj.w - 10, 8, "r", 10.5) + 1 : 0;
      const h = Math.max(30, hNom + hNota + 14);

      return { h, dibujar(yy) {
        if (zebra) p.rect(M, yy, CW, h, { fill: "#F8F9FC" });

        // etiqueta / número
        const lab = e.super ? String(e.super).toUpperCase().slice(0, 3) : String(idx + 1);
        if (e.super) {
          p.rect(cols[0].x + 1, yy + h / 2 - 9, 21, 18, { fill: tinte(color, 0.85), r: 5 });
          p.text(lab, cols[0].x + 11.5, yy + h / 2 - 4, { size: 8, font: "b", color: oscuro(color, 0.15), align: "center" });
        } else {
          p.text(lab, cols[0].x + 11.5, yy + h / 2 - 5, { size: 10, font: "b", color: GRIS2, align: "center" });
        }

        const top = yy + (h - hNom - hNota) / 2;
        p.bloque(e.nombre || "Ejercicio", cEj.x, top, cEj.w - 10, { size: 10, font: "b", color: TINTA, lh: 12.5 });
        if (nota) p.bloque(nota, cEj.x, top + hNom + 1, cEj.w - 10, { size: 8, color: GRIS, lh: 10.5 });

        const cy = yy + h / 2 - 6;
        const cen = (col, txt, o = {}) => p.text(txt, col.x + col.w / 2, o.y ?? cy, { size: o.size || 11, font: o.font || "b", color: o.color || TINTA, align: "center" });

        for (const col of cols) {
          if (col.id === "s") cen(col, String(celda.s ?? ""));
          else if (col.id === "r") cen(col, String(celda.r ?? ""));
          else if (col.id === "d") cen(col, fmtDesc(celda.d), { size: 10 });
          else if (col.id === "i") {
            const pc = fmtPct(celda), kg = opciones.kg ? PF.kgDe(e, w) : null;
            if (pc && kg) { cen(col, pc, { y: yy + h / 2 - 11 }); cen(col, `${String(kg).replace(".", ",")} kg`, { y: yy + h / 2 + 2, size: 8, font: "r", color: GRIS }); }
            else if (pc) cen(col, pc);
            else cen(col, "–", { color: "#C3CAD8", font: "r" });
          } else if (col.id === "rpe") {
            const v = celda.rpe;
            if (v) cen(col, String(v)); else cen(col, "–", { color: "#C3CAD8", font: "r" });
          } else if (col.id === "reg") {
            p.line(col.x + 8, yy + h - 9, col.x + col.w - 8, yy + h - 9, { color: "#C3CAD8", lw: 0.8 });
          }
        }

        p.line(M + 4, yy + h, PW - M - 4, yy + h, { color: LINEA, lw: 0.6 });
      } };
    }

    function cabeceraTabla(p, cols, y) {
      p.rect(M, y, CW, 20, { fill: FONDO, r: 6 });
      for (const col of cols) {
        if (!col.t) continue;
        if (col.a === "center") p.text(col.t, col.x + col.w / 2, y + 6.5, { size: 6.8, font: "b", color: GRIS2, align: "center", spacing: 0.7 });
        else p.text(col.t, col.x, y + 6.5, { size: 6.8, font: "b", color: GRIS2, spacing: 0.7 });
      }
      return y + 24;
    }

    function sesion(ses, idxSesion, w, color) {
      const cols = columnas();
      const total = ses.ejercicios.reduce((a, e) => a + (+((e.sem[w - 1] || {}).s) || 0), 0);

      // altura mínima: cabecera + tabla + primera fila
      asegurar(110, `SEMANA ${w}`);
      let p = S.p, y = S.y;

      const dia = ses.dia ? DIAS_CORTOS[ses.dia] || String(ses.dia).slice(0, 3).toUpperCase() : "";
      const hFoco = ses.foco ? 14 : 0;
      const hCal = ses.calentamiento ? p.alturaBloque("Calentamiento: " + ses.calentamiento, CW - 28, 8.5, "i", 11.5) + 6 : 0;
      const hHead = 36 + hFoco;

      p.rect(M, y, CW, hHead, { fill: tinte(color, 0.9), r: 10 });
      let tx = M + 14;
      if (dia) {
        const dw = p.medir(dia, 7.5, "b", 0.8) + 14;
        p.rect(M + 10, y + 9, dw, 18, { fill: color, r: 9 });
        p.text(dia, M + 10 + dw / 2, y + 14, { size: 7.5, font: "b", color: "#FFFFFF", align: "center", spacing: 0.8 });
        tx = M + 10 + dw + 10;
      }
      p.text(ses.nombre || `Sesión ${idxSesion + 1}`, tx, y + 11, { size: 13, font: "b", color: TINTA });
      p.text(`${ses.ejercicios.length} ejercicios  ·  ${total} series`, PW - M - 14, y + 14, { size: 8, color: oscuro(color, 0.2), align: "right" });
      if (ses.foco) p.text(ses.foco, tx, y + 29, { size: 8.5, color: GRIS });
      y += hHead + 4;

      if (hCal) {
        p.bloque("Calentamiento: " + ses.calentamiento, M + 14, y + 4, CW - 28, { size: 8.5, font: "i", color: GRIS, lh: 11.5 });
        y += hCal;
      }

      if (!ses.ejercicios.length) {
        p.text("Sesión sin ejercicios", M + 14, y + 10, { size: 9, font: "i", color: GRIS2 });
        S.y = y + 34;
        return;
      }

      y = cabeceraTabla(p, cols, y + 2);

      ses.ejercicios.forEach((e, k) => {
        const fila = filaEjercicio(p, cols, e, k, w, 0, k % 2 === 1, color);

        if (y + fila.h > LIMITE) {
          nuevaPagina(`SEMANA ${w}`);
          p = S.p;
          p.text(`${ses.nombre || "Sesión " + (idxSesion + 1)}  (continuación)`, M, S.y, { size: 9, font: "b", color: GRIS });
          y = cabeceraTabla(p, cols, S.y + 14);
        }

        const f2 = filaEjercicio(p, cols, e, k, w, y, k % 2 === 1, color);
        f2.dibujar(y);
        y += f2.h;
      });

      S.y = y + 20;
    }

    function paginaSemana(w) {
      const { color } = cabeceraSemana(w);
      plan.sesiones.forEach((s, i) => sesion(s, i, w, color));
    }

    /* ============ EVOLUCIÓN ============ */

    function evolucion() {
      if (semanas.length < 2) return;
      nuevaPagina("EVOLUCIÓN DEL PLAN");
      S.rotuloActual = "EVOLUCIÓN DEL PLAN";
      let y = titulo("Evolución semana a semana", S.y, "así progresa cada ejercicio");
      const p0 = S.p;
      p0.bloque("Cada celda muestra series × repeticiones" + (opciones.pct ? " y la intensidad" : "") + ". Los valores que cambian respecto a la semana anterior aparecen resaltados.", M, y - 6, CW, { size: 8.5, color: GRIS, lh: 11.5 });
      y += 20;
      S.y = y;

      plan.sesiones.forEach((ses, si) => {
        if (!ses.ejercicios.length) return;
        const porBloque = 6;

        for (let b = 0; b < semanas.length; b += porBloque) {
          const bloque = semanas.slice(b, b + porBloque);
          const nameW = 150, cw = (CW - nameW) / porBloque;

          asegurar(120, "EVOLUCIÓN DEL PLAN");
          let p = S.p, yy = S.y;

          p.text(`${ses.nombre || "Sesión " + (si + 1)}`, M, yy, { size: 11.5, font: "b", color: TINTA });
          if (semanas.length > porBloque) p.text(`semanas ${bloque[0]}–${bloque[bloque.length - 1]}`, PW - M, yy + 2, { size: 8, color: GRIS2, align: "right" });
          yy += 20;

          const cabecera = (pp, y0) => {
            pp.rect(M, y0, CW, 34, { fill: FONDO, r: 8 });
            pp.text("EJERCICIO", M + 10, y0 + 18, { size: 6.8, font: "b", color: GRIS2, spacing: 0.7 });
            bloque.forEach((w, i) => {
              const x = M + nameW + i * cw;
              const f = PF.faseDeSemana(plan, w);
              pp.rect(x + 4, y0 + 4, cw - 8, 3.5, { fill: f ? f.fase.color : "#C9D0DE", r: 1.7 });
              const es = w === marcada;
              if (es) pp.rect(x + 2, y0 + 1, cw - 4, 32, { fill: TINTA, alpha: 0.08, r: 6 });
              pp.text(`S${w}`, x + cw / 2, y0 + 12, { size: 9, font: "b", color: es ? TINTA : GRIS, align: "center" });
              const dsc = plan.semInfo[w - 1] && plan.semInfo[w - 1].descarga;
              pp.text(dsc ? "descarga" : PF.fechaCorta(PF.fechaSemana(plan, w)).slice(0, 5), x + cw / 2, y0 + 23, { size: 6.5, color: GRIS2, align: "center" });
            });
            return y0 + 38;
          };

          yy = cabecera(p, yy);

          ses.ejercicios.forEach((e, k) => {
            const hNom = p.alturaBloque(e.nombre || "Ejercicio", nameW - 14, 9, "b", 11.5, 2);
            const h = Math.max(32, hNom + 12);

            if (yy + h > LIMITE) {
              nuevaPagina("EVOLUCIÓN DEL PLAN");
              p = S.p;
              p.text(`${ses.nombre || "Sesión " + (si + 1)} (continuación)`, M, S.y, { size: 9, font: "b", color: GRIS });
              yy = cabecera(p, S.y + 16);
            }

            if (k % 2 === 1) p.rect(M, yy, CW, h, { fill: "#F8F9FC" });
            p.bloque(e.nombre || "Ejercicio", M + 10, yy + (h - hNom) / 2, nameW - 14, { size: 9, font: "b", color: TINTA, lh: 11.5, maxLines: 2 });

            bloque.forEach((w, i) => {
              const c = e.sem[w - 1];
              if (!c) return;
              const x = M + nameW + i * cw + cw / 2;
              const prev = e.sem[w - 2];
              const cambio = (campo) => prev && String(prev[campo] ?? "") !== String(c[campo] ?? "") && w !== semanas[0];
              const l1 = fmtSR(c);
              const cambia1 = cambio("s") || cambio("r");
              p.text(l1, x, yy + h / 2 - 11, { size: 9.5, font: "b", color: cambia1 ? acento : TINTA, align: "center" });

              const partes = [];
              const pc = fmtPct(c);
              if (opciones.pct && pc) partes.push({ t: pc, c: cambio("i") });
              const dd = fmtDesc(c.d);
              if (dd) partes.push({ t: dd, c: cambio("d") });
              const txt = partes.map((q) => q.t).join(" · ");
              const algunoCambia = partes.some((q) => q.c);
              p.text(txt, x, yy + h / 2 + 2, { size: 7.5, font: algunoCambia ? "b" : "r", color: algunoCambia ? acento : GRIS, align: "center" });
            });

            p.line(M + 4, yy + h, PW - M - 4, yy + h, { color: LINEA, lw: 0.6 });
            yy += h;
          });

          S.y = yy + 22;
        }
      });
    }

    /* ============ SEGUIMIENTO ============ */

    function seguimiento() {
      nuevaPagina("SEGUIMIENTO");
      S.rotuloActual = "SEGUIMIENTO";
      let y = titulo("Seguimiento semanal", S.y, "para completar a mano");
      S.p.bloque("Anota cómo te sientes cada semana. Es muy útil para ajustar el plan juntos.", M, y - 6, CW, { size: 8.5, color: GRIS, lh: 11.5 });
      y += 22;

      const cols = [
        { t: "SEMANA", w: 52 }, { t: "FECHA", w: 56 }, { t: "PESO (KG)", w: 62 }, { t: "ENERGÍA 1-5", w: 66 }, { t: "SUEÑO (H)", w: 58 }, { t: "MOLESTIAS / OBSERVACIONES", w: CW - 52 - 56 - 62 - 66 - 58 },
      ];
      let x = M;
      cols.forEach((c) => { c.x = x; x += c.w; });

      const cab = (p, yy) => {
        p.rect(M, yy, CW, 22, { fill: FONDO, r: 6 });
        cols.forEach((c, i) => p.text(c.t, c.x + 8, yy + 8, { size: 6.5, font: "b", color: GRIS2, spacing: 0.6 }));
        return yy + 24;
      };

      let p = S.p;
      y = cab(p, y);

      const lista = alcance === "completo" ? semanas : semanas;
      lista.forEach((w, k) => {
        const h = 28;
        if (y + h > LIMITE) { nuevaPagina("SEGUIMIENTO"); p = S.p; y = cab(p, S.y); }
        const f = PF.faseDeSemana(plan, w);
        if (k % 2 === 1) p.rect(M, y, CW, h, { fill: "#F8F9FC" });
        p.rect(cols[0].x + 8, y + 10, 4, 8, { fill: f ? f.fase.color : "#C9D0DE", r: 2 });
        p.text(`Sem ${w}`, cols[0].x + 17, y + 10, { size: 9, font: "b", color: TINTA });
        p.text(PF.fechaCorta(PF.fechaSemana(plan, w)).slice(0, 5), cols[1].x + 8, y + 10, { size: 8.5, color: GRIS });
        cols.slice(2).forEach((c) => p.line(c.x + 8, y + h - 7, c.x + c.w - 10, y + h - 7, { color: "#C3CAD8", lw: 0.7 }));
        p.line(M + 4, y + h, PW - M - 4, y + h, { color: LINEA, lw: 0.5 });
        y += h;
      });

      S.y = y + 14;
    }

    /* ============ GUÍA Y CIERRE ============ */

    function cierre() {
      const rec = (opciones.recomendaciones ? plan.recomendaciones : []).filter((t) => t && t.trim());
      const notas = (plan.notas || "").trim();

      const glos = [];
      glos.push(["Series × Reps", "Cuántas series haces y cuántas repeticiones en cada una."]);
      glos.push(["Desc.", "Descanso entre series. 90\" = 90 segundos, 2' = 2 minutos."]);
      if (opciones.pct) glos.push(["Int. (%)", "Porcentaje de tu repetición máxima (1RM)" + (opciones.kg ? ". Si lo conozco, te indico los kilos aproximados." : ".")]);
      if (opciones.rpe) glos.push(["RPE", "Esfuerzo percibido de 1 a 10. RPE 8 = te quedan unas 2 repeticiones."]);
      if (opciones.tempo) glos.push(["Tempo", "Bajada – pausa abajo – subida – pausa arriba, en segundos."]);
      if (opciones.registro) glos.push(["Mi carga", "Espacio para anotar el peso que usaste."]);

      let hG = 30 + glos.length * 17;
      let hR = rec.length ? 30 + rec.reduce((a, t) => a + S.p.alturaBloque(t, CW - 44, 9, "r", 12.5) + 5, 0) : 0;
      let hN = notas ? 30 + S.p.alturaBloque(notas, CW - 32, 9.5, "r", 13) : 0;

      const necesario = hG + hR + hN + 120;
      if (S.y + Math.min(necesario, 260) > LIMITE || !S.p) nuevaPagina("NOTAS");
      let p = S.p, y = S.y;

      if (notas) {
        y = titulo("Notas del entrenador", y);
        p.rect(M, y - 4, CW, hN - 20, { fill: BLANCO, stroke: LINEA, lw: 1, r: 10 });
        p.bloque(notas, M + 16, y + 8, CW - 32, { size: 9.5, color: TINTA, lh: 13 });
        y += hN - 20 + 18;
      }

      if (rec.length) {
        if (y + hR > LIMITE) { nuevaPagina("NOTAS"); p = S.p; y = S.y; }
        y = titulo("Recomendaciones", y);
        p.rect(M, y - 4, CW, hR - 20, { fill: FONDO, r: 10 });
        let yy = y + 8;
        rec.forEach((t) => {
          p.circle(M + 18, yy + 5, 2.4, { fill: acento });
          const h = p.bloque(t, M + 30, yy, CW - 44, { size: 9, color: TINTA, lh: 12.5 });
          yy += h + 5;
        });
        y += hR - 20 + 18;
      }

      if (y + hG > LIMITE) { nuevaPagina("NOTAS"); p = S.p; y = S.y; }
      y = titulo("Cómo leer tu plan", y);
      glos.forEach((g, i) => {
        p.text(g[0], M + 4, y + i * 17, { size: 9, font: "b", color: TINTA });
        p.text(g[1], M + 96, y + i * 17, { size: 9, color: GRIS });
      });
      y += glos.length * 17 + 14;

      // firma
      if (y + 56 > LIMITE) { nuevaPagina("NOTAS"); p = S.p; y = S.y; }
      p.rect(M, y, CW, 50, { fill: acento, r: 12 });
      let fx = M + 18;
      if (logo) { p.rect(M + 12, y + 9, 32, 32, { fill: "#FFFFFF", r: 8 }); p.imagen(logo, M + 15, y + 12, 26, 26, { modo: "contain", r: 5 }); fx = M + 56; }
      p.text(ent.nombre || "Tu entrenador", fx, y + 12, { size: 11.5, font: "b", color: "#FFFFFF" });
      p.text("Cualquier duda, escríbeme. ¡A entrenar!", fx, y + 28, { size: 8.5, color: "#FFFFFF", alpha: 0.88 });
      const contactos = [ent.contacto, ent.web].filter(Boolean);
      contactos.forEach((c, i) => {
        const tw = p.text(c, PW - M - 16, y + 12 + i * 14, { size: 9, font: "b", color: "#FFFFFF", align: "right" });
        const url = esEnlace(c);
        if (url) p.enlace(PW - M - 16 - tw, y + 12 + i * 14, tw, 11, url);
      });
    }

    /* ============ ORDEN DEL DOCUMENTO ============ */

    portada();

    if (plan.sesiones.some((s) => s.ejercicios.length)) {
      for (const w of semanas) paginaSemana(w);
      if (alcance !== "semana") evolucion();
    }

    if (semanas.length > 1 && opciones.seguimiento) seguimiento();
    cierre();

    // pie de página con numeración
    const total = doc.paginas.length;
    doc.paginas.forEach((p, i) => {
      if (i === 0) return;
      p.line(M, PH - 38, PW - M, PH - 38, { color: LINEA, lw: 0.6 });
      p.text(`${ent.nombre || "PlanFit"}${cliente.nombre ? "  ·  " + cliente.nombre : ""}`, M, PH - 30, { size: 7.5, color: GRIS2 });
      p.text(`${i + 1} / ${total}`, PW - M, PH - 30, { size: 7.5, color: GRIS2, align: "right" });
    });

    return doc.construir();
  }

  root.PlanPDF = { generar };
})(typeof window !== "undefined" ? window : globalThis);
