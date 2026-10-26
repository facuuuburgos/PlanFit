/* PDF del módulo funcional e híbrido: sesiones con bloques (AMRAP, EMOM, Tabata, For Time, circuitos, intervalos, libres).
   Paginación inteligente: los bloques nunca se parten, las sesiones se mantienen enteras cuando es posible y el espaciado
   se compacta solo (3 niveles) para evitar hojas casi vacías. */
(function (root) {
  "use strict";

  const { Documento, mezclar, aHex, dataURLaBytes } = root.PDFLib;
  const PF = root.PF, D = root.PF_DATA;

  const PW = 595.28, PH = 841.89, M = 40, CW = PW - 2 * M;
  const LIMITE = PH - 56, TOPE = 54;
  const TINTA = "#17181C", GRIS = "#6E6C67", GRIS2 = "#A09E98", LINEA = "#E0DDD5", FONDO = "#EFECE6", BLANCO = "#FBFAF7", PAPEL = "#F7F5F0";
  const TURQUESA = "#19C3B0";
  const apagar = (c) => mezclar(c, "#8F8C84", 0.28);
  const tinte = (c, t) => aHex(mezclar(apagar(c), "#F8F6F0", t));
  const oscuro = (c, t) => aHex(mezclar(apagar(c), "#14161A", t));
  const DIAS_CORTOS = { "Lunes": "LUN", "Martes": "MAR", "Miércoles": "MIÉ", "Jueves": "JUE", "Viernes": "VIE", "Sábado": "SÁB", "Domingo": "DOM" };

  const NIVELES = [
    { fila: 21, pad: 8, bh: 9, gap: 12, gb: 8, fs: 10, sh: 12 },
    { fila: 18, pad: 6, bh: 7, gap: 9, gb: 6, fs: 9.5, sh: 9 },
    { fila: 16, pad: 4, bh: 5, gap: 6, gb: 4, fs: 9, sh: 6 },
  ];

  function esEnlace(t) {
    t = String(t || "").trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return "mailto:" + t;
    if (/^(https?:\/\/|www\.)/i.test(t)) return /^https?:/i.test(t) ? t : "https://" + t;
    return null;
  }

  function generar(plan, cliente, ent, op = {}) {
    cliente = cliente || { nombre: "", edad: "", altura: "", peso: "", lesiones: "", objetivos: "" };
    ent = ent || {};
    const opciones = Object.assign({ equipo: true, notas: true }, plan.opciones || {});
    const sesionesSel = Array.isArray(op.sesiones) && op.sesiones.length ? plan.sesiones.filter((s) => op.sesiones.includes(s.id)) : plan.sesiones;

    const doc = new Documento({ titulo: `${plan.titulo}${cliente.nombre ? " - " + cliente.nombre : ""}`, autor: ent.nombre || "PlanFit" });
    let logo = null;
    try { if (ent.logo) logo = doc.imagen(dataURLaBytes(ent.logo)); } catch (e) { logo = null; }

    const S = { p: null, y: 0 };
    let N = NIVELES[0];
    const NULO = () => doc.paginas[0] || null;

    function nuevaPagina(rotulo) {
      const p = doc.nuevaPagina(PW, PH);
      S.p = p;
      p.rect(0, 0, PW, PH, { fill: PAPEL });
      S.y = M;
      if (rotulo) {
        p.text(rotulo, M, 26, { size: 7.5, font: "b", color: GRIS2, spacing: 1.6 });
        p.text((cliente.nombre || plan.titulo || "").toUpperCase(), PW - M, 26, { size: 7.5, font: "b", color: GRIS2, align: "right", spacing: 1.2 });
        S.y = TOPE;
      }
      return p;
    }

    /* ---------- medición y dibujo de un bloque ---------- */

    function medirBloque(p, b, s) {
      const color = D.TIPOS_BLOQUE[b.tipo].color;
      const fs = N.fs;
      const detalle = PF.detalleBloque(b);
      const nota = b.nota ? String(b.nota) : "";
      const xRep = M + 18, wRep = 54, xNom = xRep + wRep + 4;
      const wEq = opciones.equipo ? 128 : 0;
      const wNom = M + CW - 12 - wEq - xNom - (wEq ? 6 : 0);
      const hCab = 30 + (detalle ? 12 : 0) + (nota ? p.alturaBloque(nota, CW - 44, 8.5, "i", 11) + 2 : 0);

      const filas = b.ejercicios.map((e, i) => {
        const hN = p.alturaBloque(e.nombre || "Ejercicio", wNom, fs, "b", fs + 2.5);
        const hNota = opciones.notas && e.nota ? p.alturaBloque(e.nota, wNom, 8, "i", 10) + 1 : 0;
        const eq = opciones.equipo ? (e.equip || []).join(" · ") : "";
        const hEq = eq ? p.alturaBloque(eq, wEq, 7.6, "r", 9.5) : 0;
        const h = Math.max(N.fila, Math.max(hN + hNota, hEq) + N.pad);
        let etiqueta = e.reps || "";
        if (b.tipo === "emom" && b.modo === "alterna" && b.ejercicios.length > 1) etiqueta = `MIN ${i + 1}` + (e.reps ? " · " + e.reps : "");
        else if (b.tipo === "circuito" || b.tipo === "tabata") etiqueta = e.reps || (b.tipo === "circuito" ? `Est. ${i + 1}` : "");
        const carga = e.carga ? String(e.carga) : "";
        return { e, h, hN, hNota, eq, hEq, etiqueta, carga };
      });
      const hDesc = b.descansoDespues > 0 ? 18 : 0;
      const hTot = hCab + filas.reduce((a, f) => a + f.h, 0) + (b.ejercicios.length ? 6 : 8);
      const dur = PF.duracionBloque(b);

      return {
        h: hTot, hDesc, alturaTotal: hTot + hDesc,
        dibujar(pp, y) {
          pp.rect(M, y, CW, hTot, { fill: BLANCO, stroke: LINEA, lw: 0.7, r: 10 });
          pp.rect(M, y + 6, 4, hTot - 12, { fill: tinte(color, 0.1), r: 2 });
          // insignia
          const titulo = PF.tituloBloque(b);
          const tw = pp.medir(titulo, 8, "b", 0.6) + 18;
          pp.rect(M + 14, y + 9, tw, 16, { fill: tinte(color, 0.78), r: 8 });
          pp.text(titulo, M + 14 + tw / 2, y + 13.6, { size: 8, font: "b", color: oscuro(color, 0.55), align: "center", spacing: 0.6 });
          let nx = M + 14 + tw + 10;
          if (b.nombre) pp.text(b.nombre, nx, y + 12, { size: 10.5, font: "b", color: TINTA });
          if (dur) pp.text(`~${Math.max(1, Math.round(dur / 60))} min`, M + CW - 14, y + 13, { size: 8.5, color: GRIS, align: "right" });
          let yy = y + 31;
          if (detalle) { pp.text(detalle, M + 14, yy - 2, { size: 8.5, color: GRIS }); yy += 12; }
          if (nota) { const hh = pp.bloque(nota, M + 14, yy - 2, CW - 44, { size: 8.5, font: "i", color: oscuro(color, 0.5), lh: 11 }); yy += hh + 2; }
          filas.forEach((f, i) => {
            if (i > 0) pp.line(M + 14, yy, M + CW - 14, yy, { color: "#EAE7DF", lw: 0.5 });
            const cy = yy + (f.h - (f.hN + f.hNota)) / 2;
            if (f.etiqueta) pp.text(f.etiqueta, xRep, cy + 0.5, { size: f.etiqueta.length > 9 ? 8.5 : N.fs, font: "b", color: oscuro(color, 0.5) });
            pp.bloque(f.e.nombre || "Ejercicio", xNom, cy, wNom, { size: fs, font: "b", color: TINTA, lh: fs + 2.5 });
            if (f.hNota) pp.bloque(f.e.nota, xNom, cy + f.hN + 1, wNom, { size: 8, font: "i", color: GRIS, lh: 10 });
            if (f.carga) pp.text(f.carga, xNom + wNom + (wEq ? 0 : 0), cy + 0.5, { size: 8.5, color: GRIS, align: "right" });
            if (f.eq) pp.bloque(f.eq, M + CW - 14 - wEq, yy + (f.h - f.hEq) / 2, wEq, { size: 7.6, color: GRIS2, lh: 9.5, align: "right" });
            yy += f.h;
          });
        },
        dibujarDescanso(pp, y) {
          const t = `DESCANSO ${PF.fmtTiempo(b.descansoDespues)}`;
          const w = pp.medir(t, 7.2, "b", 1) + 20;
          pp.rect(PW / 2 - w / 2, y + 2, w, 13, { fill: FONDO, r: 6.5 });
          pp.text(t, PW / 2, y + 5.2, { size: 7.2, font: "b", color: GRIS, align: "center", spacing: 1 });
        },
      };
    }

    /* ---------- sesión ---------- */

    function medirSesion(p, ses, idx) {
      const dia = ses.dia ? DIAS_CORTOS[ses.dia] || String(ses.dia).slice(0, 3).toUpperCase() : "";
      const cal = ses.calentamiento ? "Calentamiento: " + ses.calentamiento : "";
      const hCal = cal ? p.alturaBloque(cal, CW - 160, 8.5, "r", 11.5) : 0;
      const base = ses.foco ? 44 : 32;
      const hHead = Math.max(base + (hCal ? hCal + 2 : 0) + 8, 40);
      const bloques = ses.bloques.map((b) => medirBloque(p, b, ses));
      const equipo = [...new Set(ses.bloques.flatMap((b) => b.ejercicios.flatMap((e) => e.equip || [])))].filter((x) => x !== "Sin equipo");
      const eqTxt = opciones.equipo && equipo.length ? "Equipamiento: " + equipo.join(" · ") : "";
      const hEq = eqTxt ? p.alturaBloque(eqTxt, CW - 8, 8, "r", 10.5) + 6 : 0;
      const min = PF.duracionSesionMin(ses);
      const nb = ses.bloques.length;

      return {
        ses, idx, bloques, hHead, hEq, eqTxt,
        dibujarCabecera(pp, y, cont) {
          pp.rect(M, y, CW, hHead, { fill: tinte(TURQUESA, 0.8), r: 12 });
          let tx = M + 16;
          if (dia) {
            const dw = pp.medir(dia, 6.8, "b", 1) + 14;
            pp.rect(M + 14, y + 10, dw, 15, { fill: "#FFFFFF", alpha: 0.6, r: 7.5 });
            pp.text(dia, M + 14 + dw / 2, y + 14.3, { size: 6.8, font: "b", color: oscuro(TURQUESA, 0.5), align: "center", spacing: 1 });
            tx = M + 14 + dw + 10;
          }
          let nombre = (ses.nombre || `Sesión ${idx + 1}`).toUpperCase() + (cont ? "  (continuación)" : "");
          const maxN = PW - M - 120 - tx;
          while (nombre.length > 3 && pp.medir(nombre, 11.5, "b", 1.2) > maxN) nombre = nombre.slice(0, -1);
          pp.text(nombre, tx, y + 12, { size: 11.5, font: "b", color: TINTA, spacing: 1.2 });
          if (ses.foco) pp.text(ses.foco, M + 16, y + 31, { size: 8.5, color: oscuro(TURQUESA, 0.5) });
          pp.text(`${nb} ${nb === 1 ? "bloque" : "bloques"}`, PW - M - 16, y + 11, { size: 8, color: oscuro(TURQUESA, 0.5), align: "right" });
          if (min) pp.text(`≈ ${min} min`, PW - M - 16, y + 23, { size: 8, color: oscuro(TURQUESA, 0.5), align: "right" });
          if (cal) pp.bloque(cal, M + 16, y + (ses.foco ? 42 : 30), CW - 160, { size: 8.5, color: oscuro(TURQUESA, 0.5), lh: 11.5 });
        },
      };
    }

    /* ---------- portada compacta (primera página) ---------- */

    function medirPortada(p) {
      const datos = [];
      if (cliente.esGrupo) {
        if (cliente.participantes) datos.push(["PARTICIPANTES", cliente.participantes]);
      } else {
        if (cliente.edad) datos.push(["EDAD", `${cliente.edad} años`]);
        if (cliente.altura) datos.push(["ALTURA", `${cliente.altura} cm`]);
        if (cliente.peso) datos.push(["PESO", `${String(cliente.peso).replace(".", ",")} kg`]);
      }
      const obj = (cliente.objetivos || "").trim(), les = (cliente.lesiones || "").trim();
      const hObj = obj ? p.alturaBloque(obj, (CW - 12) / 2 - 24, 8.5, "r", 11.5) : 0;
      const hLes = les ? p.alturaBloque(les, (CW - 12) / 2 - 24, 8.5, "r", 11.5) : 0;
      const hNotas = Math.max(hObj, hLes);
      const hCajas = (obj || les) ? hNotas + 34 : 0;
      const hDatos = datos.length ? 46 : 0;
      return { datos, obj, les, hCajas, hDatos, h: 118 + hDatos + (hDatos ? 10 : 0) + hCajas + (hCajas ? 10 : 0) };
    }

    function dibujarPortada(p, pt) {
      let y = 28;
      let x = M;
      if (logo) { p.imagen(logo, M, 18, 30, 30, { modo: "contain", r: 6 }); x = M + 40; }
      p.text((ent.nombre || "Entrenador personal").toUpperCase(), x, logo ? 28 : 26, { size: 8, font: "b", color: TINTA, spacing: 1.4 });
      const contactos = [ent.contacto, ent.web].filter(Boolean);
      if (contactos.length) p.text(contactos.join("   ·   "), x, logo ? 41 : 38, { size: 8, color: GRIS });
      p.text("ENTRENAMIENTO FUNCIONAL", PW - M, 26, { size: 7.5, font: "b", color: TURQUESA, align: "right", spacing: 1.6 });
      y = 70;
      p.rect(M, y + 4, 28, 3.2, { fill: TURQUESA, r: 1.6 });
      p.text(plan.titulo || "Entrenamiento funcional", M, y + 14, { size: 26, font: "b", color: TINTA });
      y += 50;
      if (cliente.nombre) p.text(`Preparado para ${cliente.nombre}`, M, y, { size: 12.5, color: TINTA });
      y += 26;
      if (pt.datos.length) {
        const w = (CW - 10 * (pt.datos.length - 1)) / pt.datos.length;
        pt.datos.forEach(([k, v], i) => {
          const x0 = M + i * (w + 10);
          p.rect(x0, y, w, 38, { fill: FONDO, r: 10 });
          p.text(k, x0 + 12, y + 8, { size: 6.5, font: "b", color: GRIS2, spacing: 1 });
          p.text(v, x0 + 12, y + 20, { size: 11.5, font: "b", color: TINTA });
        });
        y += 48;
      }
      if (pt.obj || pt.les) {
        const w2 = (CW - 12) / 2;
        const caja = (x0, tit, txt, fill, col) => {
          p.rect(x0, y, w2, pt.hCajas, { fill, r: 10 });
          p.text(tit, x0 + 12, y + 10, { size: 6.5, font: "b", color: col, spacing: 1 });
          p.bloque(txt, x0 + 12, y + 24, w2 - 24, { size: 8.5, color: TINTA, lh: 11.5 });
        };
        if (pt.obj) caja(M, "OBJETIVOS", pt.obj, FONDO, GRIS2);
        if (pt.les) caja(M + (pt.obj ? w2 + 12 : 0), "LESIONES Y LIMITACIONES", pt.les, "#F4E6DA", "#9A5B2E");
        y += pt.hCajas + 10;
      }
      return y;
    }

    /* ---------- cierre ---------- */

    function medirCierre(p) {
      const notas = (plan.notas || "").trim();
      const hN = notas ? 26 + p.alturaBloque(notas, CW - 32, 9.5, "r", 13) + 14 : 0;
      const leyenda = "Descansa lo indicado entre bloques. Prioriza la técnica sobre la velocidad. Si algo duele, detente y avísame.";
      const contactos = [ent.contacto, ent.web].filter(Boolean);
      const hC = contactos.length ? 34 : 0;
      return { notas, hN, hC, contactos, h: hN + hC + 6 };
    }

    function dibujarCierre(p, y, cz) {
      if (cz.notas) {
        p.rect(M, y, 11, 2.4, { fill: TURQUESA, r: 1.2 });
        p.text("NOTAS DEL ENTRENADOR", M + 18, y - 2, { size: 8.5, font: "b", color: TINTA, spacing: 1.6 });
        const hh = p.alturaBloque(cz.notas, CW - 32, 9.5, "r", 13);
        p.rect(M, y + 14, CW, hh + 20, { fill: FONDO, r: 12 });
        p.bloque(cz.notas, M + 16, y + 24, CW - 32, { size: 9.5, color: TINTA, lh: 13 });
        y += hh + 20 + 14 + 8;
      }
      if (cz.contactos.length) {
        y += 6;
        p.line(M, y, PW - M, y, { color: LINEA, lw: 0.7 });
        p.text((ent.nombre || "").toUpperCase(), M, y + 12, { size: 7.5, font: "b", color: GRIS, spacing: 1.3 });
        let rx = PW - M;
        [...cz.contactos].reverse().forEach((c) => {
          const tw = p.text(c, rx, y + 12, { size: 8.5, color: TINTA, align: "right" });
          const url = esEnlace(c);
          if (url) p.enlace(rx - tw, y + 12, tw, 11, url);
          rx -= tw + 16;
        });
      }
    }

    /* ---------- planificación ---------- */

    // devuelve las páginas: [{ cabecera?, items:[{ses, desde, hasta, cont}], cierre?, y }]
    function planificar(p, pt, cz) {
      const sesiones = sesionesSel.map((s, i) => medirSesion(p, s, i)).filter((x) => x.bloques.length);
      const paginas = [{ portada: true, items: [], y: 28 + pt.h }];
      let pg = paginas[0];
      const nueva = () => { pg = { items: [], y: TOPE }; paginas.push(pg); };
      const hBloque = (ms, k) => ms.bloques[k].alturaTotal + N.gb;

      for (const ms of sesiones) {
        const n = ms.bloques.length;
        const altoRango = (d, h) => { let t = 0; for (let k = d; k < h; k++) t += hBloque(ms, k); return t; };
        const total = ms.hHead + N.sh + altoRango(0, n) + ms.hEq;
        const libre = () => LIMITE - pg.y;
        const capNueva = LIMITE - TOPE;
        if (total <= libre() + N.gb) { pg.items.push({ ms, d: 0, h: n, cab: true, pie: true }); pg.y += total + N.gap; continue; }
        let partir = false;
        if (total > capNueva) partir = true;
        else if (libre() > capNueva * 0.5 && ms.hHead + N.sh + hBloque(ms, 0) <= libre()) partir = true;
        if (!partir) { if (pg.items.length || pg.portada) nueva(); pg.items.push({ ms, d: 0, h: n, cab: true, pie: true }); pg.y += total + N.gap; continue; }
        let d = 0, primera = true;
        while (d < n) {
          const cab = ms.hHead + N.sh;
          let y = pg.y + cab, k = d;
          while (k < n && y + hBloque(ms, k) - N.gb <= LIMITE) { y += hBloque(ms, k); k++; }
          if (k - d < 1) {
            if (pg.y > TOPE + 0.1) { nueva(); continue; }
            k = d + 1; y = pg.y + cab + hBloque(ms, d);
          }
          if (k < n && n - k < 1) { /* nada */ }
          const ultimo = k >= n;
          pg.items.push({ ms, d, h: k, cab: true, cont: !primera, pie: ultimo });
          pg.y = y + (ultimo ? ms.hEq : 0) + N.gap; d = k; primera = false;
          if (d < n) nueva();
        }
      }
      // cierre
      if (cz.h) {
        if (pg.y - N.gap + cz.h > LIMITE && pg.items.length) nueva();
        pg.cierre = true; pg.yCierre = pg.y; pg.y += cz.h;
      }
      return paginas.filter((x) => x.portada || x.items.length || x.cierre);
    }

    /* ---------- construcción ---------- */

    nuevaPagina(null);
    const pMed = S.p;
    const pt = medirPortada(pMed);
    const cz = medirCierre(pMed);
    let mejor = null;
    for (const nivel of NIVELES) {
      N = nivel;
      const pags = planificar(pMed, pt, cz);
      if (!mejor || pags.length < mejor.pags.length) mejor = { nivel, pags };
      if (mejor.pags.length <= 1) break;
    }
    N = mejor.nivel;

    // se vuelve a medir con el nivel elegido (las alturas dependen del nivel)
    const paginas = planificar(pMed, pt, cz);
    paginas.forEach((pagina, i) => {
      const p = i === 0 ? S.p : nuevaPagina("ENTRENAMIENTO FUNCIONAL");
      let y;
      if (pagina.portada) y = dibujarPortada(p, pt);
      else y = TOPE;
      pagina.items.forEach((it) => {
        const ms = it.ms;
        ms.dibujarCabecera(p, y, it.cont);
        y += ms.hHead + N.sh;
        for (let k = it.d; k < it.h; k++) {
          const mb = ms.bloques[k];
          mb.dibujar(p, y);
          y += mb.h;
          if (mb.hDesc && k < ms.bloques.length - 1) { mb.dibujarDescanso(p, y); y += mb.hDesc; }
          y += N.gb;
        }
        if (it.pie && ms.eqTxt) {
          p.bloque(ms.eqTxt, M + 4, y, CW - 8, { size: 8, color: GRIS, lh: 10.5 });
          y += ms.hEq;
        }
        y += N.gap;
      });
      if (pagina.cierre) dibujarCierre(p, pagina.yCierre + 6, cz);
    });

    const total = doc.paginas.length;
    doc.paginas.forEach((p, i) => {
      if (total > 1 || true) {
        p.line(M, PH - 40, PW - M, PH - 40, { color: LINEA, lw: 0.6 });
        p.text(`${ent.nombre || "PlanFit"}${cliente.nombre ? "  ·  " + cliente.nombre : ""}`, M, PH - 30, { size: 7.5, color: GRIS2 });
        p.text(`${i + 1} / ${total}`, PW - M, PH - 30, { size: 7.5, color: GRIS2, align: "right" });
      }
    });

    return doc.construir();
  }

  root.PlanPDF = root.PlanPDF || {};
  root.PlanPDF.generarFuncional = generar;
})(typeof window !== "undefined" ? window : globalThis);
