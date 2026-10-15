/* Diseño del PDF del plan de entrenamiento. Usa PDFLib (pdf-lib.js) y los cálculos de PF (store.js). */
(function (root) {
  "use strict";

  const { Documento, mezclar, aHex, dataURLaBytes } = root.PDFLib;
  const PF = root.PF;

  const PW = 595.28, PH = 841.89, M = 40, CW = PW - 2 * M;
  const LIMITE = PH - 56;          // hasta dónde llega el contenido
  const TINTA = "#17181C", GRIS = "#6E6C67", GRIS2 = "#A09E98", LINEA = "#E0DDD5", FONDO = "#EFECE6", BLANCO = "#FBFAF7", PAPEL = "#F7F5F0";
  const AMBAR = "#9A5B2E", AMBAR_FONDO = "#F4E6DA";

  // tonos apagados y cálidos (look "papel"): se desatura un poco el color de la fase antes de aclararlo u oscurecerlo
  const apagar = (c) => mezclar(c, "#8F8C84", 0.32);
  const tinte = (c, t) => aHex(mezclar(apagar(c), "#F8F6F0", t));       // t=0 color apagado, t=1 papel claro
  const oscuro = (c, t) => aHex(mezclar(apagar(c), "#14161A", t));

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
    else if (alcance === "rango" || alcance === "fase") {
      const a = Math.max(1, Math.min(plan.semanas, op.desde || 1)), b = Math.max(a, Math.min(plan.semanas, op.hasta || a));
      semanas = Array.from({ length: b - a + 1 }, (_, i) => a + i);
    } else semanas = [Math.max(1, Math.min(plan.semanas, op.semana || actual))];

    // La gráfica resalta el tramo del plan que incluye este PDF (si no es el plan completo)
    const parcial = semanas.length < plan.semanas;
    const incDesde = semanas[0], incHasta = semanas[semanas.length - 1];
    const marcada = -1;

    const doc = new Documento({
      titulo: `${plan.titulo}${cliente.nombre ? " - " + cliente.nombre : ""}`,
      autor: ent.nombre || "PlanFit",
    });

    let logo = null;
    try { if (ent.logo) logo = doc.imagen(dataURLaBytes(ent.logo)); } catch (e) { logo = null; }

    const S = { doc, p: null, y: 0, plan, cliente, ent, acento, opciones, semanas, marcada, logo, paginasCabecera: [] };

    /* ============ utilidades de página ============ */

    function nuevaPagina(rotulo) {
      const p = doc.nuevaPagina(PW, PH);
      S.p = p;
      p.rect(0, 0, PW, PH, { fill: PAPEL });
      S.y = M;
      if (rotulo) {
        p.text(rotulo, M, 26, { size: 7.5, font: "b", color: GRIS2, spacing: 1.6 });
        p.text((cliente.nombre || plan.titulo || "").toUpperCase(), PW - M, 26, { size: 7.5, font: "b", color: GRIS2, align: "right", spacing: 1.2 });
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
      p.rect(M, y + 2, 11, 2.4, { fill: acento, r: 1.2 });
      p.text(texto.toUpperCase(), M + 18, y, { size: 8.5, font: "b", color: TINTA, spacing: 1.6 });
      if (sub) p.text(sub, PW - M, y + 0.5, { size: 8.5, color: GRIS2, align: "right" });
      return y + 24;
    }

    /* ============ PORTADA ============ */

    function portada() {
      const p = nuevaPagina(null);
      S.rotuloActual = "PLAN DE ENTRENAMIENTO";
      const fases = PF.rangosFases(plan);

      // marca del entrenador
      let tx = M;
      if (logo) { p.imagen(logo, M, 34, 30, 30, { modo: "contain", r: 6 }); tx = M + 40; }
      p.text((ent.nombre || "Entrenador personal").toUpperCase(), tx, logo ? 40 : 38, { size: 8, font: "b", color: TINTA, spacing: 1.4 });
      const cont = [ent.contacto, ent.web].filter(Boolean).join("   ·   ");
      if (cont) p.text(cont, tx, logo ? 53 : 52, { size: 8, color: GRIS });
      p.text("PLAN DE ENTRENAMIENTO", PW - M, 38, { size: 7.5, font: "b", color: GRIS2, align: "right", spacing: 1.6 });

      // título
      const tituloPlan = plan.titulo || "Plan de entrenamiento";
      let y = 104;
      p.bloque(tituloPlan, M, y, CW, { size: 32, font: "b", color: TINTA, lh: 36, maxLines: 2 });
      y += Math.min(2, p.lineas(tituloPlan, CW, 32, "b").length) * 36 + 6;
      if (cliente.nombre) { p.text(`Preparado para ${cliente.nombre}`, M, y, { size: 14, color: TINTA }); y += 24; }
      const fin = PF.sumarDias(plan.inicio, plan.semanas * 7 - 1);
      p.text(`${PF.fechaLarga(plan.inicio)}   —   ${PF.fechaLarga(fin)}`, M, y, { size: 9.5, color: GRIS });
      y += 28;

      // ---- datos ----
      const meses = Math.round((plan.semanas / 4.345) * 10) / 10;
      const tiles = [
        ["EDAD", cliente.edad ? `${cliente.edad} años` : "—"],
        ["ALTURA", cliente.altura ? `${String(cliente.altura).replace(".", ",")} cm` : "—"],
        ["PESO", cliente.peso ? `${String(cliente.peso).replace(".", ",")} kg` : "—"],
        ["DURACIÓN", `${plan.semanas} sem`],
      ];
      const gap = 10, tw = (CW - gap * 3) / 4;
      tiles.forEach((t, i) => {
        const x = M + i * (tw + gap);
        p.rect(x, y, tw, 56, { fill: FONDO, r: 12 });
        p.text(t[0], x + 13, y + 12, { size: 6.5, font: "b", color: GRIS, spacing: 1.3 });
        p.text(t[1], x + 13, y + 27, { size: 15.5, color: TINTA });
        if (i === 3 && plan.semanas >= 6) p.text(`≈ ${String(meses).replace(".", ",")} meses`, x + 13, y + 45, { size: 7.5, color: GRIS });
      });
      y += 56 + 12;

      const colW = (CW - gap) / 2;
      const objetivos = cliente.objetivos || "—";
      const hayLes = !!cliente.lesiones;
      const lesiones = cliente.lesiones || "Sin lesiones ni limitaciones indicadas";
      const hO = p.alturaBloque(objetivos, colW - 30, 9.5, "r", 13);
      const hL = p.alturaBloque(lesiones, colW - 30, 9.5, "r", 13);
      const hc = Math.max(62, 36 + Math.max(hO, hL));

      p.rect(M, y, colW, hc, { fill: FONDO, r: 12 });
      p.text("OBJETIVOS", M + 15, y + 14, { size: 6.8, font: "b", color: GRIS, spacing: 1.3 });
      p.bloque(objetivos, M + 15, y + 31, colW - 30, { size: 9.5, color: TINTA, lh: 13 });

      const x2 = M + colW + gap;
      p.rect(x2, y, colW, hc, { fill: hayLes ? AMBAR_FONDO : FONDO, r: 12 });
      p.text("LESIONES Y LIMITACIONES", x2 + 15, y + 14, { size: 6.8, font: "b", color: hayLes ? AMBAR : GRIS, spacing: 1.3 });
      p.bloque(lesiones, x2 + 15, y + 31, colW - 30, { size: 9.5, color: hayLes ? TINTA : GRIS2, lh: 13 });
      y += hc + 28;

      // ---- gráfica ----
      y = titulo("Mapa del plan", y, `${plan.semanas} semanas`);
      y = dibujarMapa(p, M, y, CW);
      y += 24;

      // ---- fases ----
      if (fases.length) {
        asegurar(70, "PLAN DE ENTRENAMIENTO");
        if (S.y !== undefined && S.p !== p) y = S.y;
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
      const altoTotal = pad + (parcial ? 30 : 4) /*tramo del PDF*/ + 30 /*fases*/ + 16 /*semanas*/ + (n >= 8 ? 14 : 0) + (hayDatos ? altoGraf + 8 : 0) + 30 /*leyenda*/;

      p.rect(x, y, w, altoTotal, { fill: BLANCO, stroke: LINEA, lw: 0.8, r: 14 });

      // pastilla "estás aquí"
      const yPast = y + pad;
      const yFases = yPast + (parcial ? 30 : 4);

      // barras de fase (pastel)
      rangos.forEach((r) => {
        const x0 = gx + (r.desde - 1) * xw, ancho = (r.hasta - r.desde + 1) * xw - 3;
        p.rect(x0, yFases, ancho, 26, { fill: tinte(r.fase.color, 0.74), r: 8 });
        const t = r.fase.nombre;
        const tam = ancho > 70 ? 8.5 : 7.2;
        let txt = t;
        while (txt.length > 2 && p.medir(txt, tam, "b") > ancho - 8) txt = txt.slice(0, -1);
        if (txt !== t) txt = txt.replace(/\s+$/, "") + "…";
        p.text(txt, x0 + ancho / 2, yFases + (26 - tam) / 2 - 0.5, { size: tam, font: "b", color: oscuro(r.fase.color, 0.5), align: "center" });
      });

      // semanas sin fase
      const cubiertas = rangos.length ? rangos[rangos.length - 1].hasta : 0;
      if (cubiertas < n) p.rect(gx + cubiertas * xw, yFases, (n - cubiertas) * xw - 2.5, 26, { fill: FONDO, r: 8 });

      // zona gráfica
      let yPie;
      const yGraf = yFases + 26 + 8;

      if (hayDatos) {
        // bandas suaves por fase
        rangos.forEach((r) => {
          p.rect(gx + (r.desde - 1) * xw, yGraf, (r.hasta - r.desde + 1) * xw, altoGraf, { fill: tinte(r.fase.color, 0.92) });
        });

        const maxS = Math.max(4, ...curva.map((c) => c.series));
        const maxSeries = Math.ceil(maxS / 4) * 4;
        const maxInt = hayInt ? Math.max(100, Math.ceil(Math.max(...curva.map((c) => c.intensidad || 0)) / 10) * 10) : 100;

        // rejilla
        for (let k = 0; k <= 4; k++) {
          const yy = yGraf + altoGraf - (altoGraf * k) / 4;
          p.line(gx, yy, gx + gw, yy, { color: k === 0 ? "#CFCBC2" : "#FFFFFF", lw: k === 0 ? 0.8 : 0.9 });
          if (hayInt) p.text(`${Math.round((maxInt * k) / 4)}`, gx - 5, yy - 3.5, { size: 6.5, color: GRIS2, align: "right" });
          p.text(`${Math.round((maxSeries * k) / 4)}`, gx + gw + 5, yy - 3.5, { size: 6.5, color: GRIS2 });
        }

        // tramo incluido en este PDF
        if (parcial) p.rect(gx + (incDesde - 1) * xw, yGraf - 3, (incHasta - incDesde + 1) * xw, altoGraf + 3, { fill: TINTA, alpha: 0.07, r: 3 });

        // barras de volumen
        curva.forEach((c) => {
          if (!c.series) return;
          const bw = Math.max(2, xw * 0.56);
          const bh = (c.series / maxSeries) * altoGraf;
          const fase = PF.faseDeSemana(plan, c.w);
          const col = fase ? fase.fase.color : GRIS2;
          p.rect(gx + (c.w - 0.5) * xw - bw / 2, yGraf + altoGraf - bh, bw, bh, { fill: tinte(col, c.descarga ? 0.84 : 0.72), r: Math.min(3, bw / 3) });
        });

        // línea de intensidad (cada tramo con el tono de su fase)
        if (hayInt) {
          const pts = curva.filter((c) => c.intensidad).map((c) => ({ x: gx + (c.w - 0.5) * xw, y: yGraf + altoGraf - (c.intensidad / maxInt) * altoGraf, w: c.w }));
          const tono = (w) => { const f = PF.faseDeSemana(plan, w); return f ? oscuro(f.fase.color, 0.3) : TINTA; };
          for (let k = 1; k < pts.length; k++) p.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, { color: tono(pts[k].w), lw: 1.7 });
          const rp = n > 30 ? 1.2 : 2.2;
          pts.forEach((q) => { p.circle(q.x, q.y, rp + 1, { fill: BLANCO }); p.circle(q.x, q.y, rp, { fill: tono(q.w) }); });
        }

        yPie = yGraf + altoGraf;
      } else {
        yPie = yFases + 26 + 8;
      }

      // etiqueta + corchete del tramo que incluye este PDF
      if (parcial) {
        const x0 = gx + (incDesde - 1) * xw + 1, x1 = gx + incHasta * xw - 1, mx = (x0 + x1) / 2;
        const txt = incDesde === incHasta ? `ESTE PDF · SEMANA ${incDesde}` : `ESTE PDF · SEMANAS ${incDesde}–${incHasta}`;
        const tw2 = p.medir(txt, 7.2, "b", 0.7) + 18;
        const px = Math.max(x + 6, Math.min(x + w - 6 - tw2, mx - tw2 / 2));
        p.rect(px, yPast, tw2, 16, { fill: "#E6E2D9", r: 8 });
        p.text(txt, px + tw2 / 2, yPast + 4.4, { size: 7.2, font: "b", color: TINTA, align: "center", spacing: 0.7 });
        p.line(x0, yPast + 22, x1, yPast + 22, { color: GRIS, lw: 1.3 });
        p.line(x0, yPast + 22, x0, yPast + 27, { color: GRIS, lw: 1.3 });
        p.line(x1, yPast + 22, x1, yPast + 27, { color: GRIS, lw: 1.3 });
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
        if (curva[wk - 1].descarga) p.poligono([[cx - 3, yPie + 17], [cx + 3, yPie + 17], [cx, yPie + 12.5]], { fill: GRIS2 });
      }
      let yy = yPie + 16;

      // meses
      if (n >= 8) {
        const totalMeses = Math.ceil(n / 4.345);
        for (let m = 1; m <= totalMeses; m++) {
          const a = (m - 1) * 4.345, b = Math.min(n, m * 4.345);
          const cx = gx + ((a + b) / 2) * xw;
          if (b - a < 2.2) continue;
          p.line(gx + a * xw + 2, yy + 2, gx + b * xw - 2, yy + 2, { color: "#D6D2C8", lw: 0.8 });
          p.text(`Mes ${m}`, cx, yy + 5, { size: 6.8, color: GRIS2, align: "center" });
        }
        yy += 16;
      }

      // leyenda
      const ly = yy + 8;
      let lx = x + pad + 22;
      if (hayDatos) {
        p.rect(lx, ly + 1.5, 9, 6, { fill: "#D9D5CB", r: 2 });
        lx += 14; lx += p.text("Series por semana", lx, ly, { size: 7.5, color: GRIS }) + 14;
        if (hayInt) {
          p.line(lx, ly + 4.5, lx + 14, ly + 4.5, { color: GRIS, lw: 1.7 }); p.circle(lx + 7, ly + 4.5, 2.4, { fill: GRIS });
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
        const alturas = par.map((r) => 58 + (r.fase.objetivo ? p.alturaBloque(r.fase.objetivo, cw - 32, 8.5, "r", 11.5, 4) + 2 : 0));
        const h = Math.max(...alturas);
        if (y + h > LIMITE) { nuevaPagina("PLAN DE ENTRENAMIENTO"); p = S.p; y = S.y; }

        par.forEach((r, k) => {
          const cx = x + k * (cw + gap);
          p.rect(cx, y, cw, h, { fill: tinte(r.fase.color, 0.82), r: 12 });
          p.text(r.fase.nombre, cx + 16, y + 14, { size: 11, font: "b", color: TINTA });
          const m1 = PF.mesDeSemana(r.desde), m2 = PF.mesDeSemana(r.hasta);
          const sem = r.desde === r.hasta ? `Semana ${r.desde}` : `Semanas ${r.desde}–${r.hasta}`;
          const meta = [sem, `${r.hasta - r.desde + 1} sem`, plan.semanas >= 8 ? (m1 === m2 ? `Mes ${m1}` : `Meses ${m1}–${m2}`) : ""].filter(Boolean).join("   ·   ");
          p.text(meta, cx + 16, y + 31, { size: 7.8, color: oscuro(r.fase.color, 0.55) });
          if (r.fase.objetivo) p.bloque(r.fase.objetivo, cx + 16, y + 50, cw - 32, { size: 8.5, color: oscuro(r.fase.color, 0.62), lh: 11.5, maxLines: 4 });
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

      p.text("PLAN DE ENTRENAMIENTO", M, 34, { size: 7.5, font: "b", color: GRIS2, spacing: 1.6 });
      p.text((cliente.nombre || "").toUpperCase(), PW - M, 34, { size: 7.5, font: "b", color: GRIS2, align: "right", spacing: 1.2 });

      p.text(`Semana ${w}`, M, 54, { size: 34, font: "b", color: TINTA });
      const nombreFase = info ? info.fase.nombre : "";
      let y = 98;
      if (nombreFase) {
        p.text(nombreFase, M, y, { size: 19, color: TINTA });
        if (desc) {
          const t = "DESCARGA", nx = M + p.medir(nombreFase, 19, "r") + 14;
          const tw = p.medir(t, 6.8, "b", 1) + 16;
          p.rect(nx, y + 3, tw, 15, { fill: tinte(color, 0.78), r: 7.5 });
          p.text(t, nx + tw / 2, y + 7.3, { size: 6.8, font: "b", color: oscuro(color, 0.5), align: "center", spacing: 1 });
        }
        y += 28;
      } else if (desc) { p.text("Semana de descarga", M, y, { size: 14, color: TINTA }); y += 24; }
      p.text(`${nombreFechaSemana(w)}   ·   Semana ${w} de ${plan.semanas}`, M, y, { size: 10, color: GRIS });
      y += 22;

      // barra del plan (fina): muestra dónde estás
      const gap = 1.6, sw = (CW - gap * (plan.semanas - 1)) / plan.semanas;
      for (let k = 1; k <= plan.semanas; k++) {
        const f = PF.faseDeSemana(plan, k);
        const col = f ? f.fase.color : "#CFCBC2";
        const es = k === w;
        p.rect(M + (k - 1) * (sw + gap), es ? y - 1.5 : y, sw, es ? 6 : 3, { fill: es ? oscuro(col, 0.25) : tinte(col, 0.45), r: Math.min(1.6, sw / 2) });
      }
      y += 22;

      const nota = plan.semInfo[w - 1] && plan.semInfo[w - 1].nota;
      if (nota) {
        const h = p.alturaBloque(nota, CW - 32, 9.5, "i", 13);
        p.rect(M, y, CW, h + 20, { fill: FONDO, r: 12 });
        p.bloque(nota, M + 16, y + 10, CW - 32, { size: 9.5, font: "i", color: TINTA, lh: 13 });
        y += h + 20 + 14;
      }

      S.rotuloActual = `SEMANA ${w}`;
      S.y = y;
      return { color };
    }

    // columnas de la tabla de ejercicios
    function columnas() {
      const c = [{ id: "n", w: 32, t: "" }];
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
      const hNom = p.alturaBloque(PF.nombreEn(e, w) || "Ejercicio", cEj.w - 10, 10, "b", 12.5);
      const hNota = nota ? p.alturaBloque(nota, cEj.w - 10, 8, "r", 10.5) + 1 : 0;
      const h = Math.max(30, hNom + hNota + 14);

      return { h, dibujar(yy) {
        // número en círculo / etiqueta de superserie
        const lab = e.super ? String(e.super).toUpperCase().slice(0, 3) : String(idx + 1);
        const ccx = cols[0].x + 11, ccy = yy + h / 2;
        if (e.super) {
          p.rect(ccx - 11, ccy - 8.5, 22, 17, { fill: tinte(color, 0.78), r: 8.5 });
          p.text(lab, ccx, ccy - 3.5, { size: 7.5, font: "b", color: oscuro(color, 0.5), align: "center" });
        } else {
          p.circle(ccx, ccy, 9.5, { fill: FONDO });
          p.text(lab, ccx, ccy - 4, { size: 8.5, color: GRIS, align: "center" });
        }

        const top = yy + (h - hNom - hNota) / 2;
        p.bloque(PF.nombreEn(e, w) || "Ejercicio", cEj.x, top, cEj.w - 10, { size: 10, color: TINTA, lh: 12.5 });
        if (nota) p.bloque(nota, cEj.x, top + hNom + 1, cEj.w - 10, { size: 8, color: GRIS, lh: 10.5 });

        const cy = yy + h / 2 - 6;
        const cen = (col, txt, o = {}) => p.text(txt, col.x + col.w / 2, o.y ?? cy, { size: o.size || 11, font: o.font || "r", color: o.color || TINTA, align: "center" });

        for (const col of cols) {
          if (col.id === "s") cen(col, String(celda.s ?? ""));
          else if (col.id === "r") cen(col, String(celda.r ?? ""));
          else if (col.id === "d") cen(col, fmtDesc(celda.d), { size: 10.5 });
          else if (col.id === "i") {
            const pc = fmtPct(celda), kg = opciones.kg ? PF.kgDe(e, w) : null;
            if (pc && kg) { cen(col, pc, { y: yy + h / 2 - 11 }); cen(col, `${String(kg).replace(".", ",")} kg`, { y: yy + h / 2 + 2, size: 8, color: GRIS }); }
            else if (pc) cen(col, pc);
            else cen(col, "–", { color: "#C8C4BA" });
          } else if (col.id === "rpe") {
            const v = celda.rpe;
            if (v) cen(col, String(v)); else cen(col, "–", { color: "#C8C4BA" });
          } else if (col.id === "reg") {
            p.line(col.x + 8, yy + h - 11, col.x + col.w - 8, yy + h - 11, { color: "#CFCBC2", lw: 0.7 });
          }
        }

        p.line(M + 4, yy + h, PW - M - 4, yy + h, { color: LINEA, lw: 0.6 });
      } };
    }

    function cabeceraTabla(p, cols, y) {
      for (const col of cols) {
        if (!col.t) continue;
        if (col.a === "center") p.text(col.t, col.x + col.w / 2, y + 6, { size: 6.5, font: "b", color: GRIS, align: "center", spacing: 1 });
        else p.text(col.t, col.x, y + 6, { size: 6.5, font: "b", color: GRIS, spacing: 1 });
      }
      p.line(M + 4, y + 20, PW - M - 4, y + 20, { color: "#D6D2C8", lw: 0.8 });
      return y + 22;
    }

    function sesion(sesCompleta, idxSesion, w, color) {
      // solo los ejercicios que aparecen en esta semana; si la sesión no tiene ninguno, no se imprime
      const ejsSemana = sesCompleta.ejercicios.filter((e) => PF.activo(e, w));
      if (!ejsSemana.length) return;
      const ses = Object.assign({}, sesCompleta, { ejercicios: ejsSemana });
      const cols = columnas();
      const total = ses.ejercicios.reduce((a, e) => a + (+((e.sem[w - 1] || {}).s) || 0), 0);

      asegurar(120, `SEMANA ${w}`);
      let p = S.p, y = S.y;

      const dia = ses.dia ? DIAS_CORTOS[ses.dia] || String(ses.dia).slice(0, 3).toUpperCase() : "";
      const calTxt = ses.calentamiento ? "Calentamiento: " + ses.calentamiento : "";
      const hCal = calTxt ? p.alturaBloque(calTxt, CW - 150, 8.5, "r", 11.5) : 0;
      const base = ses.foco ? 44 : 31;
      const hHead = Math.max(base + (hCal ? hCal + 2 : 0) + 10, 42);

      p.rect(M, y, CW, hHead, { fill: tinte(color, 0.82), r: 12 });
      let tx = M + 16;
      if (dia) {
        const dw = p.medir(dia, 6.8, "b", 1) + 14;
        p.rect(M + 14, y + 10, dw, 15, { fill: "#FFFFFF", alpha: 0.6, r: 7.5 });
        p.text(dia, M + 14 + dw / 2, y + 14.3, { size: 6.8, font: "b", color: oscuro(color, 0.5), align: "center", spacing: 1 });
        tx = M + 14 + dw + 10;
      }
      let nombre = (ses.nombre || `Sesión ${idxSesion + 1}`).toUpperCase();
      const maxN = PW - M - 110 - tx;
      while (nombre.length > 3 && p.medir(nombre, 11.5, "b", 1.2) > maxN) nombre = nombre.slice(0, -1);
      p.text(nombre, tx, y + 12, { size: 11.5, font: "b", color: TINTA, spacing: 1.2 });
      if (ses.foco) p.text(ses.foco, M + 16, y + 31, { size: 8.5, color: oscuro(color, 0.55) });
      p.text(`${ses.ejercicios.length} ${ses.ejercicios.length === 1 ? "ejercicio" : "ejercicios"}`, PW - M - 16, y + 11, { size: 8, color: oscuro(color, 0.55), align: "right" });
      p.text(`${total} series`, PW - M - 16, y + 23, { size: 8, color: oscuro(color, 0.55), align: "right" });
      if (calTxt) p.bloque(calTxt, M + 16, y + base - 2, CW - 150, { size: 8.5, color: oscuro(color, 0.55), lh: 11.5 });
      y += hHead + 8;

      if (!ses.ejercicios.length) {
        p.text("Sesión sin ejercicios", M + 14, y + 4, { size: 9, font: "i", color: GRIS2 });
        S.y = y + 30;
        return;
      }

      y = cabeceraTabla(p, cols, y);

      ses.ejercicios.forEach((e, k) => {
        const fila = filaEjercicio(p, cols, e, k, w, 0, false, color);

        if (y + fila.h > LIMITE) {
          nuevaPagina(`SEMANA ${w}`);
          p = S.p;
          p.text(`${(ses.nombre || "Sesión " + (idxSesion + 1)).toUpperCase()}  (continuación)`, M, S.y, { size: 8, font: "b", color: GRIS, spacing: 1 });
          y = cabeceraTabla(p, cols, S.y + 14);
        }

        const f2 = filaEjercicio(p, cols, e, k, w, y, false, color);
        f2.dibujar(y);
        y += f2.h;
      });

      S.y = y + 24;
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
        const lista = ses.ejercicios.filter((e) => semanas.some((w) => PF.activo(e, w)));
        if (!lista.length) return;
        const porBloque = 6;

        for (let b = 0; b < semanas.length; b += porBloque) {
          const bloque = semanas.slice(b, b + porBloque);
          const nameW = 150, cw = (CW - nameW) / porBloque;
          const listaB = lista.filter((e) => bloque.some((w) => PF.activo(e, w)));
          if (!listaB.length) continue;

          asegurar(120, "EVOLUCIÓN DEL PLAN");
          let p = S.p, yy = S.y;

          p.text(`${ses.nombre || "Sesión " + (si + 1)}`, M, yy, { size: 11.5, font: "b", color: TINTA });
          if (semanas.length > porBloque) p.text(`semanas ${bloque[0]}–${bloque[bloque.length - 1]}`, PW - M, yy + 2, { size: 8, color: GRIS2, align: "right" });
          yy += 20;

          const cabecera = (pp, y0) => {
            pp.rect(M, y0, CW, 34, { fill: FONDO, r: 10 });
            pp.text("EJERCICIO", M + 10, y0 + 18, { size: 6.8, font: "b", color: GRIS2, spacing: 0.7 });
            bloque.forEach((w, i) => {
              const x = M + nameW + i * cw;
              const f = PF.faseDeSemana(plan, w);
              pp.rect(x + 4, y0 + 4, cw - 8, 3.5, { fill: f ? f.fase.color : "#CFCBC2", r: 1.7 });
              const es = w === marcada;
              if (es) pp.rect(x + 2, y0 + 1, cw - 4, 32, { fill: TINTA, alpha: 0.07, r: 7 });
              pp.text(`S${w}`, x + cw / 2, y0 + 12, { size: 9, font: "b", color: es ? TINTA : GRIS, align: "center" });
              const dsc = plan.semInfo[w - 1] && plan.semInfo[w - 1].descarga;
              pp.text(dsc ? "descarga" : PF.fechaCorta(PF.fechaSemana(plan, w)).slice(0, 5), x + cw / 2, y0 + 23, { size: 6.5, color: GRIS2, align: "center" });
            });
            return y0 + 38;
          };

          yy = cabecera(p, yy);

          // un ejercicio con variantes se reparte en una fila por nombre efectivo
          const filasB = [];
          listaB.forEach((e) => {
            const nombres = [...new Set(bloque.filter((w) => PF.activo(e, w)).map((w) => PF.nombreEn(e, w)))];
            nombres.forEach((nm) => filasB.push({ e, nm }));
          });

          filasB.forEach(({ e, nm }, k) => {
            const hNom = p.alturaBloque(nm || "Ejercicio", nameW - 14, 9, "b", 11.5, 2);
            const h = Math.max(32, hNom + 12);

            if (yy + h > LIMITE) {
              nuevaPagina("EVOLUCIÓN DEL PLAN");
              p = S.p;
              p.text(`${ses.nombre || "Sesión " + (si + 1)} (continuación)`, M, S.y, { size: 9, font: "b", color: GRIS });
              yy = cabecera(p, S.y + 16);
            }

            p.bloque(nm || "Ejercicio", M + 10, yy + (h - hNom) / 2, nameW - 14, { size: 9, font: "b", color: TINTA, lh: 11.5, maxLines: 2 });

            bloque.forEach((w, i) => {
              const c = e.sem[w - 1];
              if (!c) return;
              const x = M + nameW + i * cw + cw / 2;
              if (!PF.activo(e, w) || PF.nombreEn(e, w) !== nm) { p.text("—", x, yy + h / 2 - 5, { size: 9, color: "#CFCBC2", align: "center" }); return; }
              const prev = PF.activo(e, w - 1) && PF.nombreEn(e, w - 1) === nm ? e.sem[w - 2] : null;   // si el ejercicio recién aparece, no se marca como cambio
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
        p.rect(M, yy, CW, 22, { fill: FONDO, r: 8 });
        cols.forEach((c, i) => p.text(c.t, c.x + 8, yy + 8, { size: 6.5, font: "b", color: GRIS2, spacing: 0.6 }));
        return yy + 24;
      };

      let p = S.p;
      y = cab(p, y);

      const lista = alcance === "completo" ? semanas : semanas;
      lista.forEach((w, k) => {
        const h = 26;
        if (y + h > LIMITE) { nuevaPagina("SEGUIMIENTO"); p = S.p; y = cab(p, S.y); }
        const f = PF.faseDeSemana(plan, w);
                p.rect(cols[0].x + 8, y + 10, 4, 8, { fill: f ? f.fase.color : "#CFCBC2", r: 2 });
        p.text(`Sem ${w}`, cols[0].x + 17, y + 10, { size: 9, font: "b", color: TINTA });
        p.text(PF.fechaCorta(PF.fechaSemana(plan, w)).slice(0, 5), cols[1].x + 8, y + 10, { size: 8.5, color: GRIS });
        cols.slice(2).forEach((c) => p.line(c.x + 8, y + h - 7, c.x + c.w - 10, y + h - 7, { color: "#CFCBC2", lw: 0.7 }));
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
      glos.push(["Series × Reps", "Series y repeticiones."]);
      glos.push(["Desc.", "Descanso entre series (90\" = 90 seg)."]);
      if (opciones.pct) glos.push(["Int. %", "% de tu máximo" + (opciones.kg ? " y kilos aprox." : ".")]);
      if (opciones.rpe) glos.push(["RPE", "Esfuerzo de 1 a 10 (8 = quedan ~2 reps)."]);
      if (opciones.tempo) glos.push(["Tempo", "Bajada–pausa–subida–pausa (seg)."]);
      if (opciones.registro) glos.push(["Mi carga", "Anota el peso que usaste."]);

      const filasG = Math.ceil(glos.length / 2);
      const hG = 38 + filasG * 18;
      const hR = rec.length ? 14 + rec.reduce((a, t) => a + S.p.alturaBloque(t, CW - 52, 9, "r", 12.5) + 5, 0) + 6 : 0;
      const hN = notas ? 34 + S.p.alturaBloque(notas, CW - 32, 9.5, "r", 13) : 0;

      if (!notas && !rec.length && S.y + hG + 20 > LIMITE) nuevaPagina("CÓMO LEER TU PLAN");
      else if ((notas || rec.length) && S.y + Math.min(hN + hR + 40, 200) > LIMITE) nuevaPagina("NOTAS");
      let p = S.p, y = S.y;

      if (notas) {
        y = titulo("Notas del entrenador", y);
        p.rect(M, y - 4, CW, hN - 22, { fill: FONDO, r: 12 });
        p.bloque(notas, M + 16, y + 8, CW - 32, { size: 9.5, color: TINTA, lh: 13 });
        y += hN - 22 + 22;
      }

      if (rec.length) {
        if (y + hR + 30 > LIMITE) { nuevaPagina("NOTAS"); p = S.p; y = S.y; }
        y = titulo("Recomendaciones", y);
        p.rect(M, y - 4, CW, hR, { fill: FONDO, r: 12 });
        let yy = y + 8;
        rec.forEach((t) => {
          p.circle(M + 20, yy + 5, 2, { fill: acento });
          const h = p.bloque(t, M + 32, yy, CW - 52, { size: 9, color: TINTA, lh: 12.5 });
          yy += h + 5;
        });
        y += hR + 22;
      }

      if (y + hG > LIMITE) { nuevaPagina("CÓMO LEER TU PLAN"); p = S.p; y = S.y; }
      y = titulo("Cómo leer tu plan", y);
      const cw2 = (CW - 24) / 2;
      glos.forEach((g, i) => {
        const col = i % 2, fila = Math.floor(i / 2);
        const gx = M + 4 + col * (cw2 + 24), gy = y + fila * 18;
        p.text(g[0], gx, gy, { size: 8.5, font: "b", color: TINTA });
        p.text(g[1], gx + 62, gy, { size: 8, color: GRIS });
      });
      y += filasG * 18 + 6;

      // contacto discreto
      const contactos = [ent.contacto, ent.web].filter(Boolean);
      if (contactos.length && y + 40 < LIMITE) {
        y += 8;
        p.line(M, y, PW - M, y, { color: LINEA, lw: 0.7 });
        let cx = M;
        p.text((ent.nombre || "").toUpperCase(), cx, y + 12, { size: 7.5, font: "b", color: GRIS, spacing: 1.3 });
        let rx = PW - M;
        [...contactos].reverse().forEach((c) => {
          const tw = p.text(c, rx, y + 12, { size: 8.5, color: TINTA, align: "right" });
          const url = esEnlace(c);
          if (url) p.enlace(rx - tw, y + 12, tw, 11, url);
          rx -= tw + 16;
        });
      }
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
      p.line(M, PH - 40, PW - M, PH - 40, { color: LINEA, lw: 0.6 });
      p.text(`${ent.nombre || "PlanFit"}${cliente.nombre ? "  ·  " + cliente.nombre : ""}`, M, PH - 30, { size: 7.5, color: GRIS2 });
      p.text(`${i + 1} / ${total}`, PW - M, PH - 30, { size: 7.5, color: GRIS2, align: "right" });
    });

    return doc.construir();
  }

  root.PlanPDF = { generar };
})(typeof window !== "undefined" ? window : globalThis);
