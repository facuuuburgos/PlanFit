/* Gráfica del plan en pantalla (SVG). Misma idea que la del PDF. */
(function (root) {
  "use strict";

  const UI = root.UI, PF = root.PF, h = UI.h;

  UI.grafica = (plan, marcada, ancho) => {
    const W = Math.max(290, Math.round(ancho || 640)), padI = 26, padD = 26;
    const n = plan.semanas;
    const gx = padI, gw = W - padI - padD, xw = gw / n;
    const rangos = PF.rangosFases(plan);
    const curva = PF.curva(plan);
    const hayDatos = curva.some((c) => c.series > 0);
    const hayInt = curva.some((c) => c.intensidad);
    const yFases = 34, altoG = hayDatos ? 120 : 0, yG = yFases + 34;
    const yPie = yG + altoG + (hayDatos ? 4 : 0);
    const alto = yPie + 26 + (n >= 8 ? 16 : 0) + 8;
    const o = [];

    o.push(`<svg class="grafica" viewBox="0 0 ${W} ${alto}" role="img" aria-label="Gráfica del plan de entrenamiento">`);

    // fases
    rangos.forEach((r) => {
      const x0 = gx + (r.desde - 1) * xw, ancho = (r.hasta - r.desde + 1) * xw - 3;
      o.push(`<rect x="${x0}" y="${yFases}" width="${ancho}" height="28" rx="8" fill="${r.fase.color}"/>`);
      let t = r.fase.nombre;
      const max = Math.floor((ancho - 10) / 6.2);
      if (t.length > max) t = max > 3 ? t.slice(0, max - 1) + "…" : "";
      if (t) o.push(`<text x="${x0 + ancho / 2}" y="${yFases + 18}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff">${h(t)}</text>`);
    });
    const cub = rangos.length ? rangos[rangos.length - 1].hasta : 0;
    if (cub < n) o.push(`<rect x="${gx + cub * xw}" y="${yFases}" width="${(n - cub) * xw - 3}" height="28" rx="8" fill="var(--relleno2)"/>`);

    if (hayDatos) {
      rangos.forEach((r) => o.push(`<rect x="${gx + (r.desde - 1) * xw}" y="${yG}" width="${(r.hasta - r.desde + 1) * xw}" height="${altoG}" fill="${r.fase.color}" opacity=".09"/>`));

      const maxS = Math.max(4, ...curva.map((c) => c.series));
      const maxSeries = Math.ceil(maxS / 4) * 4;
      const maxInt = hayInt ? Math.max(100, Math.ceil(Math.max(...curva.map((c) => c.intensidad || 0)) / 10) * 10) : 100;

      for (let k = 0; k <= 4; k++) {
        const yy = yG + altoG - (altoG * k) / 4;
        o.push(`<line x1="${gx}" x2="${gx + gw}" y1="${yy}" y2="${yy}" stroke="var(--linea)" stroke-width="${k === 0 ? 1.2 : 1}"/>`);
        if (hayInt) o.push(`<text x="${gx - 6}" y="${yy + 3.5}" text-anchor="end" font-size="9.5" fill="var(--txt3)">${Math.round((maxInt * k) / 4)}</text>`);
        o.push(`<text x="${gx + gw + 6}" y="${yy + 3.5}" font-size="9.5" fill="var(--txt3)">${Math.round((maxSeries * k) / 4)}</text>`);
      }

      o.push(`<rect x="${gx + (marcada - 1) * xw}" y="${yG - 3}" width="${xw}" height="${altoG + 3}" fill="var(--txt)" opacity=".08"/>`);

      curva.forEach((c) => {
        if (!c.series) return;
        const bw = Math.max(2, xw * 0.58), bh = (c.series / maxSeries) * altoG;
        const f = PF.faseDeSemana(plan, c.w);
        o.push(`<rect class="bv" style="--i:${c.w}" x="${gx + (c.w - 0.5) * xw - bw / 2}" y="${yG + altoG - bh}" width="${bw}" height="${bh}" rx="${Math.min(3, bw / 3)}" fill="${f ? f.fase.color : "#8A93A6"}" opacity="${c.descarga ? 0.3 : 0.5}"/>`);
      });

      if (hayInt) {
        const pts = curva.filter((c) => c.intensidad).map((c) => [gx + (c.w - 0.5) * xw, yG + altoG - (c.intensidad / maxInt) * altoG]);
        o.push(`<polyline pathLength="1" points="${pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="var(--txt)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>`);
        const rp = n > 30 ? 1.6 : 3;
        pts.forEach((p) => o.push(`<circle cx="${p[0]}" cy="${p[1]}" r="${rp}" fill="var(--card)" stroke="var(--txt)" stroke-width="1.6"/>`));
      }

      const mx = gx + (marcada - 0.5) * xw;
      o.push(`<line x1="${mx}" x2="${mx}" y1="${yFases + 28}" y2="${yG + altoG}" stroke="var(--txt)" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    } else {
      const mx = gx + (marcada - 0.5) * xw;
      o.push(`<line x1="${mx}" x2="${mx}" y1="${yFases + 28}" y2="${yFases + 44}" stroke="var(--txt)" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    }

    // pastilla
    {
      const mx = gx + (marcada - 0.5) * xw;
      const t = W < 420 ? `SEM. ${marcada} · AQUÍ` : `SEMANA ${marcada} · AQUÍ`;
      const tw = t.length * 6.6 + 20;
      const px = Math.max(4, Math.min(W - 4 - tw, mx - tw / 2));
      o.push(`<g class="aqui"><rect x="${px}" y="2" width="${tw}" height="20" rx="10" fill="var(--txt)"/></g>`);
      o.push(`<text x="${px + tw / 2}" y="16" text-anchor="middle" font-size="10" font-weight="800" letter-spacing=".5" fill="var(--card)">${t}</text>`);
      o.push(`<path d="M${mx - 5} 22 L${mx + 5} 22 L${mx} 29 Z" fill="var(--txt)"/>`);
    }

    // ejes
    const paso = n <= 14 ? 1 : n <= 28 ? 2 : n <= 40 ? 4 : 5;
    for (let w = 1; w <= n; w++) {
      const cx = gx + (w - 0.5) * xw, es = w === marcada;
      if (w === 1 || w === n || w % paso === 0 || es) {
        if (!es && Math.abs(w - marcada) * xw < 13) continue;
        o.push(`<text x="${cx}" y="${yPie + 14}" text-anchor="middle" font-size="${es ? 11 : 9.5}" font-weight="${es ? 800 : 500}" fill="${es ? "var(--txt)" : "var(--txt3)"}">${w}</text>`);
      }
      if (curva[w - 1].descarga) o.push(`<path d="M${cx - 3.5} ${yPie + 24} L${cx + 3.5} ${yPie + 24} L${cx} ${yPie + 18.5} Z" fill="var(--txt3)"/>`);
    }

    if (n >= 8) {
      const total = Math.ceil(n / 4.345);
      for (let m = 1; m <= total; m++) {
        const a = (m - 1) * 4.345, b = Math.min(n, m * 4.345);
        if (b - a < 2.2) continue;
        const yy = yPie + 34;
        o.push(`<line x1="${gx + a * xw + 2}" x2="${gx + b * xw - 2}" y1="${yy - 9}" y2="${yy - 9}" stroke="var(--linea)" stroke-width="1.4"/>`);
        o.push(`<text x="${gx + ((a + b) / 2) * xw}" y="${yy + 1}" text-anchor="middle" font-size="9.5" fill="var(--txt3)">Mes ${m}</text>`);
      }
    }

    o.push("</svg>");
    return o.join("");
  };

  UI.leyendaGrafica = (plan) => {
    const curva = PF.curva(plan);
    const hay = curva.some((c) => c.series > 0), int = curva.some((c) => c.intensidad);
    if (!hay) return `<p class="ayuda" style="margin:8px 2px 0">Cuando agregues ejercicios, aquí verás también las series por semana y la intensidad media.</p>`;
    return `<div class="peq muted" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px">
      <span><i class="punto" style="background:var(--acento);opacity:.5;border-radius:3px"></i> Series por semana</span>
      ${int ? `<span><i class="punto" style="background:var(--txt);height:3px;border-radius:2px;width:14px"></i> Intensidad media (% del máximo)</span>` : ""}
      ${curva.some((c) => c.descarga) ? `<span>▲ Semana de descarga</span>` : ""}
    </div>`;
  };
})(window);
