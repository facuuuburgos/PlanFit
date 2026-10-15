/* Escritor de PDF mínimo, vectorial y sin dependencias.
   - Origen de coordenadas arriba a la izquierda, unidades en puntos (A4 = 595.28 x 841.89).
   - Tipografías estándar de PDF (Helvetica), con medidas reales para ajustar el texto.
   - Formas, líneas, degradados, imágenes JPEG, recorte, transparencia y enlaces. */
(function (root) {
  "use strict";

  /* ---------- codificación (WinAnsi / cp1252) ---------- */

  const CP1252 = {
    0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133, 0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137,
    0x0160: 138, 0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146, 0x201C: 147, 0x201D: 148, 0x2022: 149,
    0x2013: 150, 0x2014: 151, 0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156, 0x017E: 158, 0x0178: 159,
  };

  const SUSTITUTOS = { "→": ">", "←": "<", "≥": ">=", "≤": "<=", "≈": "~", "✓": "v", "✔": "v", "−": "-", " ": " ", " ": " ", "​": "" };

  // Devuelve una cadena donde cada carácter es un byte de WinAnsi.
  function aWinAnsi(texto) {
    let r = "";

    for (const ch of String(texto ?? "")) {
      const c = ch.codePointAt(0);

      if (SUSTITUTOS[ch] !== undefined) r += SUSTITUTOS[ch];
      else if (c === 10 || c === 13 || c === 9) r += " ";
      else if (c >= 32 && c <= 126) r += ch;
      else if (c >= 160 && c <= 255) r += ch;
      else if (CP1252[c]) r += String.fromCharCode(CP1252[c]);
      else r += "?";
    }

    return r;
  }

  const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  /* ---------- medidas de Helvetica (milésimas de em) ---------- */

  const A_R = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
    667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
    556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
  const A_B = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
    722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
    556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

  // Letras con acento: tienen el ancho de la letra base.
  const BASE = {};
  "ÀÁÂÃÄÅ=A,ÇC,ÈÉÊË=E,ÌÍÎÏ=I,Ñ=N,ÒÓÔÕÖØ=O,ÙÚÛÜ=U,ÝŸ=Y,àáâãäå=a,ç=c,èéêë=e,ìíîï=i,ñ=n,òóôõöø=o,ùúûü=u,ýÿ=y".split(",").forEach((g) => {
    const [letras, base] = g.includes("=") ? g.split("=") : [g.slice(0, -1), g.slice(-1)];
    for (const l of letras) BASE[l] = base;
  });

  const ESPECIALES = {
    "¿": [556, 611], "¡": [333, 333], "°": [400, 400], "·": [278, 278], "×": [584, 584], "–": [556, 556], "—": [1000, 1000],
    "•": [350, 350], "…": [1000, 1000], "‘": [222, 278], "’": [222, 278], "“": [333, 500], "”": [333, 500], "€": [556, 556],
    "ª": [370, 370], "º": [365, 365], "½": [834, 834], "¼": [834, 834], "¾": [834, 834], "±": [584, 584], "÷": [584, 584],
    "®": [737, 737], "©": [737, 737], "™": [1000, 1000], "ß": [611, 611], "Æ": [1000, 1000], "æ": [889, 889], "Œ": [1000, 1000], "œ": [944, 944],
  };

  function anchoCaracter(ch, negrita) {
    const c = ch.charCodeAt(0);
    const tabla = negrita ? A_B : A_R;
    if (c >= 32 && c <= 126) return tabla[c - 32];
    if (BASE[ch]) return tabla[BASE[ch].charCodeAt(0) - 32];
    if (ESPECIALES[ch]) return ESPECIALES[ch][negrita ? 1 : 0];
    return 556;
  }

  // "r" regular, "b" negrita, "i" cursiva, "bi" negrita cursiva
  function anchoTexto(texto, tam, fuente = "r", espaciado = 0) {
    const s = aWinAnsiUno(texto);
    let w = 0;
    const neg = fuente === "b" || fuente === "bi";
    for (const ch of s) w += anchoCaracter(ch, neg);
    return (w / 1000) * tam + espaciado * s.length;
  }

  // Misma conversión que se usa al escribir, pero conservando caracteres Unicode para medir.
  // (Para medir solo importa el ancho; los caracteres no soportados se miden como "?")
  function aWinAnsiUno(texto) { return aWinAnsi(texto); }

  /* ---------- colores ---------- */

  function rgb(c) {
    if (Array.isArray(c)) return c;
    let h = String(c || "#000000").replace("#", "");
    if (h.length === 3) h = h.split("").map((x) => x + x).join("");
    const n = parseInt(h, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  const colorOps = (c, trazo) => { const [r, g, b] = rgb(c); return `${f2(r)} ${f2(g)} ${f2(b)} ${trazo ? "RG" : "rg"}`; };

  function mezclar(c1, c2, t) {
    const a = rgb(c1), b = rgb(c2);
    return a.map((v, i) => v + (b[i] - v) * t);
  }
  function aHex(c) { return "#" + rgb(c).map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join(""); }

  /* ---------- páginas ---------- */

  class Pagina {
    constructor(doc, ancho, alto) {
      this.doc = doc;
      this.w = ancho;
      this.h = alto;
      this.ops = [];
      this.gs = new Map();       // opacidad -> nombre
      this.imagenes = new Map(); // id -> nombre
      this.sombreados = [];      // [{nombre, datos}]
      this.enlaces = [];
    }

    Y(y) { return f2(this.h - y); }

    save() { this.ops.push("q"); return this; }
    restore() { this.ops.push("Q"); return this; }

    alpha(a) {
      let nombre = this.gs.get(a);
      if (!nombre) { nombre = "G" + (this.gs.size + 1); this.gs.set(a, nombre); }
      this.ops.push(`/${nombre} gs`);
      return this;
    }

    _ruta(x, y, w, h, r) {
      const o = [];
      if (!r) { o.push(`${f2(x)} ${this.Y(y + h)} ${f2(w)} ${f2(h)} re`); return o.join("\n"); }
      r = Math.min(r, w / 2, h / 2);
      const k = r * 0.5523, X = (v) => f2(v), Yy = (v) => this.Y(v);
      o.push(`${X(x + r)} ${Yy(y)} m`);
      o.push(`${X(x + w - r)} ${Yy(y)} l`);
      o.push(`${X(x + w - r + k)} ${Yy(y)} ${X(x + w)} ${Yy(y + r - k)} ${X(x + w)} ${Yy(y + r)} c`);
      o.push(`${X(x + w)} ${Yy(y + h - r)} l`);
      o.push(`${X(x + w)} ${Yy(y + h - r + k)} ${X(x + w - r + k)} ${Yy(y + h)} ${X(x + w - r)} ${Yy(y + h)} c`);
      o.push(`${X(x + r)} ${Yy(y + h)} l`);
      o.push(`${X(x + r - k)} ${Yy(y + h)} ${X(x)} ${Yy(y + h - r + k)} ${X(x)} ${Yy(y + h - r)} c`);
      o.push(`${X(x)} ${Yy(y + r)} l`);
      o.push(`${X(x)} ${Yy(y + r - k)} ${X(x + r - k)} ${Yy(y)} ${X(x + r)} ${Yy(y)} c h`);
      return o.join("\n");
    }

    // opciones: fill, stroke, lw, r (radio), dash, alpha
    rect(x, y, w, h, op = {}) {
      this.ops.push("q");
      if (op.alpha !== undefined) this.alpha(op.alpha);
      if (op.fill) this.ops.push(colorOps(op.fill));
      if (op.stroke) { this.ops.push(colorOps(op.stroke, true)); this.ops.push(`${f2(op.lw || 1)} w`); }
      if (op.dash) this.ops.push(`[${op.dash.join(" ")}] 0 d`);
      this.ops.push(this._ruta(x, y, w, h, op.r || 0));
      this.ops.push(op.fill && op.stroke ? "B" : op.fill ? "f" : "S");
      this.ops.push("Q");
      return this;
    }

    circle(cx, cy, r, op = {}) {
      return this.rect(cx - r, cy - r, r * 2, r * 2, { ...op, r });
    }

    line(x1, y1, x2, y2, op = {}) {
      this.ops.push("q");
      if (op.alpha !== undefined) this.alpha(op.alpha);
      this.ops.push(colorOps(op.color || "#000", true));
      this.ops.push(`${f2(op.lw || 1)} w`);
      if (op.cap) this.ops.push(`${op.cap} J`);
      if (op.dash) this.ops.push(`[${op.dash.join(" ")}] 0 d`);
      this.ops.push(`${f2(x1)} ${this.Y(y1)} m ${f2(x2)} ${this.Y(y2)} l S`);
      this.ops.push("Q");
      return this;
    }

    // puntos: [[x,y],...]
    poligono(puntos, op = {}) {
      if (puntos.length < 2) return this;
      this.ops.push("q");
      if (op.alpha !== undefined) this.alpha(op.alpha);
      if (op.fill) this.ops.push(colorOps(op.fill));
      if (op.stroke) { this.ops.push(colorOps(op.stroke, true)); this.ops.push(`${f2(op.lw || 1)} w 1 j 1 J`); }
      if (op.dash) this.ops.push(`[${op.dash.join(" ")}] 0 d`);
      const [p0, ...resto] = puntos;
      let s = `${f2(p0[0])} ${this.Y(p0[1])} m `;
      for (const p of resto) s += `${f2(p[0])} ${this.Y(p[1])} l `;
      if (op.cerrar || op.fill) s += "h";
      this.ops.push(s);
      this.ops.push(op.fill && op.stroke ? "B" : op.fill ? "f" : "S");
      this.ops.push("Q");
      return this;
    }

    clipRect(x, y, w, h, r = 0) {
      this.ops.push(this._ruta(x, y, w, h, r));
      this.ops.push("W n");
      return this;
    }

    // Degradado lineal dentro de un rectángulo (opcionalmente redondeado). dir: "h" (izq→der), "v" (arriba→abajo) o "d" (diagonal)
    degradado(x, y, w, h, c1, c2, dir = "h", r = 0) {
      const nombre = "S" + (this.sombreados.length + 1);
      let coords;
      if (dir === "v") coords = [x, this.h - y, x, this.h - (y + h)];
      else if (dir === "d") coords = [x, this.h - y, x + w, this.h - (y + h)];
      else coords = [x, this.h - y, x + w, this.h - y];
      this.sombreados.push({ nombre, coords, c1: rgb(c1), c2: rgb(c2) });
      this.ops.push("q");
      this.ops.push(this._ruta(x, y, w, h, r));
      this.ops.push("W n");
      this.ops.push(`/${nombre} sh`);
      this.ops.push("Q");
      return this;
    }

    // op: size, font (r/b/i/bi), color, align (left/center/right), spacing, alpha
    // (x,y) es la parte superior del texto; devuelve el ancho dibujado.
    text(texto, x, y, op = {}) {
      const tam = op.size || 10;
      const fuente = op.font || "r";
      const t = aWinAnsi(texto);
      if (!t) return 0;
      const sp = op.spacing || 0;
      const w = anchoTexto(texto, tam, fuente, sp);
      let px = x;
      if (op.align === "center") px = x - w / 2;
      else if (op.align === "right") px = x - w;
      const base = y + tam * 0.8; // línea base aproximada

      this.doc._usarFuente(fuente);
      this.ops.push("q");
      if (op.alpha !== undefined) this.alpha(op.alpha);
      this.ops.push(colorOps(op.color || "#000"));
      this.ops.push(`BT /F${this.doc._idFuente(fuente)} ${f2(tam)} Tf ${sp ? f2(sp) + " Tc " : ""}${f2(px)} ${this.Y(base)} Td (${esc(t)}) Tj ET`);
      this.ops.push("Q");

      if (op.subrayado) this.line(px, base + tam * 0.12, px + w, base + tam * 0.12, { color: op.color || "#000", lw: Math.max(0.5, tam / 16) });

      return w;
    }

    medir(texto, tam, fuente = "r", sp = 0) { return anchoTexto(texto, tam, fuente, sp); }

    // Parte el texto en líneas que caben en `ancho`.
    lineas(texto, ancho, tam, fuente = "r") {
      const salida = [];

      for (const parrafo of String(texto ?? "").split(/\r?\n/)) {
        if (!parrafo.trim()) { salida.push(""); continue; }
        let actual = "";

        for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
          const prueba = actual ? actual + " " + palabra : palabra;

          if (anchoTexto(prueba, tam, fuente) <= ancho) { actual = prueba; continue; }

          if (actual) { salida.push(actual); actual = ""; }

          // palabra más larga que la línea: se corta
          let resto = palabra;
          while (anchoTexto(resto, tam, fuente) > ancho && resto.length > 1) {
            let n = resto.length - 1;
            while (n > 1 && anchoTexto(resto.slice(0, n), tam, fuente) > ancho) n--;
            salida.push(resto.slice(0, n));
            resto = resto.slice(n);
          }
          actual = resto;
        }

        salida.push(actual);
      }

      return salida;
    }

    // Texto con saltos de línea automáticos. Devuelve la altura usada. op: size, font, color, lh (interlineado), align, maxLines
    bloque(texto, x, y, ancho, op = {}) {
      const tam = op.size || 10;
      const lh = op.lh || tam * 1.35;
      let ls = this.lineas(texto, ancho, tam, op.font || "r");

      if (op.maxLines && ls.length > op.maxLines) {
        ls = ls.slice(0, op.maxLines);
        let u = ls[ls.length - 1];
        while (u.length > 1 && anchoTexto(u + "…", tam, op.font || "r") > ancho) u = u.slice(0, -1);
        ls[ls.length - 1] = u.replace(/\s+$/, "") + "…";
      }

      ls.forEach((l, i) => {
        const px = op.align === "center" ? x + ancho / 2 : op.align === "right" ? x + ancho : x;
        this.text(l, px, y + i * lh, op);
      });

      return ls.length * lh;
    }

    alturaBloque(texto, ancho, tam, fuente = "r", lh = null, maxLines = 0) {
      let n = this.lineas(texto, ancho, tam, fuente).length;
      if (maxLines) n = Math.min(n, maxLines);
      return n * (lh || tam * 1.35);
    }

    // Imagen JPEG previamente registrada con doc.imagen(). Se ajusta al rectángulo (cover) o se estira.
    imagen(img, x, y, w, h, op = {}) {
      let nombre = this.imagenes.get(img.id);
      if (!nombre) { nombre = "I" + (this.imagenes.size + 1); this.imagenes.set(img.id, nombre); }

      this.ops.push("q");
      if (op.r) { this.ops.push(this._ruta(x, y, w, h, op.r)); this.ops.push("W n"); }
      else if (op.recorte !== false) { this.ops.push(`${f2(x)} ${this.Y(y + h)} ${f2(w)} ${f2(h)} re W n`); }

      let dw = w, dh = h, dx = x, dy = y;
      if (op.modo === "cover" || op.modo === "contain") {
        const ra = img.w / img.h, rb = w / h;
        const cubrir = op.modo === "cover";
        if ((ra > rb) === cubrir) { dh = h; dw = h * ra; } else { dw = w; dh = w / ra; }
        dx = x + (w - dw) / 2;
        dy = y + (h - dh) / 2;
      }

      this.ops.push(`${f2(dw)} 0 0 ${f2(dh)} ${f2(dx)} ${this.Y(dy + dh)} cm /${nombre} Do`);
      this.ops.push("Q");
      return this;
    }

    enlace(x, y, w, h, url) { this.enlaces.push({ x, y, w, h, url }); return this; }
  }

  /* ---------- documento ---------- */

  class Documento {
    constructor(info = {}) {
      this.info = info;
      this.paginas = [];
      this.fuentes = { r: false, b: false, i: false, bi: false };
      this.imgs = [];
    }

    _usarFuente(f) { this.fuentes[f] = true; }
    _idFuente(f) { return { r: 1, b: 2, i: 3, bi: 4 }[f]; }

    nuevaPagina(ancho = 595.28, alto = 841.89) {
      const p = new Pagina(this, ancho, alto);
      this.paginas.push(p);
      return p;
    }

    // data: Uint8Array con un JPEG
    imagen(datos) {
      const dim = leerJPEG(datos);
      const img = { id: this.imgs.length + 1, datos, ...dim };
      this.imgs.push(img);
      return img;
    }

    construir() {
      const partes = [];
      const offsets = [];
      let largo = 0;
      const enc = (s) => { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
      const poner = (u) => { partes.push(u); largo += u.length; };
      const ponerTxt = (s) => poner(enc(s));
      let n = 0;
      const nuevoId = () => ++n;

      // reservar ids
      const idCatalogo = nuevoId(), idPaginas = nuevoId(), idInfo = nuevoId();
      const idFuente = {};
      for (const f of ["r", "b", "i", "bi"]) idFuente[f] = nuevoId();
      const idImg = this.imgs.map(() => nuevoId());

      const objetos = []; // {id, cuerpo: string | {dict, datos}}
      const nombresFuente = { r: "Helvetica", b: "Helvetica-Bold", i: "Helvetica-Oblique", bi: "Helvetica-BoldOblique" };

      for (const f of ["r", "b", "i", "bi"]) {
        objetos.push({ id: idFuente[f], cuerpo: `<< /Type /Font /Subtype /Type1 /BaseFont /${nombresFuente[f]} /Encoding /WinAnsiEncoding >>` });
      }

      this.imgs.forEach((im, i) => {
        objetos.push({
          id: idImg[i],
          dict: `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /${im.comp === 1 ? "DeviceGray" : im.comp === 4 ? "DeviceCMYK" : "DeviceRGB"} /BitsPerComponent 8 /Filter /DCTDecode${im.comp === 4 ? " /Decode [1 0 1 0 1 0 1 0]" : ""} /Length ${im.datos.length} >>`,
          datos: im.datos,
        });
      });

      const idsPagina = [];

      for (const p of this.paginas) {
        const idContenido = nuevoId(), idPag = nuevoId();
        idsPagina.push(idPag);

        const contenido = enc(p.ops.join("\n"));
        objetos.push({ id: idContenido, dict: `<< /Length ${contenido.length} >>`, datos: contenido });

        // recursos
        let rec = "<< /Font << " + ["r", "b", "i", "bi"].map((f) => `/F${this._idFuente(f)} ${idFuente[f]} 0 R`).join(" ") + " >>";

        if (p.imagenes.size) rec += " /XObject << " + [...p.imagenes].map(([id, nombre]) => `/${nombre} ${idImg[id - 1]} 0 R`).join(" ") + " >>";

        if (p.gs.size) rec += " /ExtGState << " + [...p.gs].map(([a, nombre]) => `/${nombre} << /ca ${a} /CA ${a} >>`).join(" ") + " >>";

        if (p.sombreados.length) {
          const refs = [];
          for (const s of p.sombreados) {
            const idSh = nuevoId();
            objetos.push({
              id: idSh,
              cuerpo: `<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${s.coords.map(f2).join(" ")}] /Function << /FunctionType 2 /Domain [0 1] /C0 [${s.c1.map(f2).join(" ")}] /C1 [${s.c2.map(f2).join(" ")}] /N 1 >> /Extend [true true] >>`,
            });
            refs.push(`/${s.nombre} ${idSh} 0 R`);
          }
          rec += " /Shading << " + refs.join(" ") + " >>";
        }

        rec += " >>";

        let anots = "";
        if (p.enlaces.length) {
          const ids = [];
          for (const e of p.enlaces) {
            const idA = nuevoId();
            ids.push(`${idA} 0 R`);
            objetos.push({
              id: idA,
              cuerpo: `<< /Type /Annot /Subtype /Link /Rect [${f2(e.x)} ${f2(p.h - e.y - e.h)} ${f2(e.x + e.w)} ${f2(p.h - e.y)}] /Border [0 0 0] /A << /S /URI /URI (${esc(aWinAnsi(e.url))}) >> >>`,
            });
          }
          anots = ` /Annots [${ids.join(" ")}]`;
        }

        objetos.push({
          id: idPag,
          cuerpo: `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${f2(p.w)} ${f2(p.h)}] /Resources ${rec} /Contents ${idContenido} 0 R${anots} >>`,
        });
      }

      const utf16 = (s) => "<FEFF" + Array.from(String(s || "")).map((c) => c.codePointAt(0).toString(16).padStart(4, "0")).join("") + ">";
      objetos.push({ id: idCatalogo, cuerpo: `<< /Type /Catalog /Pages ${idPaginas} 0 R >>` });
      objetos.push({ id: idPaginas, cuerpo: `<< /Type /Pages /Kids [${idsPagina.map((i) => i + " 0 R").join(" ")}] /Count ${idsPagina.length} >>` });
      objetos.push({
        id: idInfo,
        cuerpo: `<< /Title ${utf16(this.info.titulo)} /Author ${utf16(this.info.autor)} /Creator ${utf16("PlanFit")} /Producer ${utf16("PlanFit")} >>`,
      });

      objetos.sort((a, b) => a.id - b.id);

      ponerTxt("%PDF-1.4\n%âãÏÓ\n");

      for (const o of objetos) {
        offsets[o.id] = largo;
        if (o.cuerpo !== undefined) ponerTxt(`${o.id} 0 obj\n${o.cuerpo}\nendobj\n`);
        else { ponerTxt(`${o.id} 0 obj\n${o.dict}\nstream\n`); poner(o.datos); ponerTxt("\nendstream\nendobj\n"); }
      }

      const xref = largo;
      let x = `xref\n0 ${n + 1}\n0000000000 65535 f \n`;
      for (let i = 1; i <= n; i++) x += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
      x += `trailer\n<< /Size ${n + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      ponerTxt(x);

      const total = new Uint8Array(largo);
      let pos = 0;
      for (const u of partes) { total.set(u, pos); pos += u.length; }
      return total;
    }
  }

  function leerJPEG(d) {
    if (d[0] !== 0xFF || d[1] !== 0xD8) throw new Error("La imagen no es JPEG.");
    let i = 2;
    while (i < d.length) {
      if (d[i] !== 0xFF) { i++; continue; }
      const m = d[i + 1];
      const largo = (d[i + 2] << 8) | d[i + 3];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { h: (d[i + 5] << 8) | d[i + 6], w: (d[i + 7] << 8) | d[i + 8], comp: d[i + 9] };
      }
      i += 2 + largo;
    }
    throw new Error("No se pudo leer el tamaño de la imagen.");
  }

  function dataURLaBytes(url) {
    const b64 = url.split(",")[1] || "";
    if (typeof atob === "function") {
      const bin = atob(b64);
      const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u;
    }
    return Uint8Array.from(Buffer.from(b64, "base64"));
  }

  root.PDFLib = { Documento, anchoTexto, aWinAnsi, mezclar, aHex, rgb, dataURLaBytes };
})(typeof window !== "undefined" ? window : globalThis);
