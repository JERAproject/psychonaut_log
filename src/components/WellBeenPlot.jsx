export const BIENESTAR_CATEGORIES = [
  "Logros",
  "Relaciones interpersonales",
  "Sentido vital",
  "Emociones agradables",
  "Entrega (flow)",
];

export const BIENESTAR_FIELDS = [
  "bienestar_logros",
  "bienestar_relaciones",
  "bienestar_sentido",
  "bienestar_emociones",
  "bienestar_entrega",
];

export const BIENESTAR_LEGEND = [
  "1 — Casi no tengo en mi vida",
  "2 — Tengo poco",
  "3 — Tengo moderadamente",
  "4 — Estoy conforme con este aspecto de mi vida",
  "5 — Siento que soy fuerte en este elemento",
];

function polarToCartesian(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function svgAngle(angleDeg) {
  return (((angleDeg - 90) % 360) + 360) % 360;
}

const AXES = [
  { label: "Sentido vital", angle: 0, field: "bienestar_sentido" },
  { label: "Relaciones", angle: 72, field: "bienestar_relaciones" },
  { label: "Logros", angle: 144, field: "bienestar_logros" },
  { label: "Entrega (flow)", angle: 216, field: "bienestar_entrega" },
  { label: "Emociones", angle: 288, field: "bienestar_emociones" },
];

const LEVELS = [0.20, 0.40, 0.60, 0.80, 1.00];

function isLeftFacing(angleDeg) {
  const sa = svgAngle(angleDeg);
  return sa > 90 && sa < 270;
}

function getLabelRotation(angleDeg) {
  if (isLeftFacing(angleDeg)) return svgAngle(angleDeg) + 180;
  return svgAngle(angleDeg);
}

function buildDataSeries(values, overlayEntries) {
  if (overlayEntries && overlayEntries.length > 0) {
    const series = [];
    overlayEntries.forEach((e) => {
      if (e.values && e.values.some((v) => v != null)) {
        series.push(e);
      }
    });
    series.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    return series;
  }
  if (values && values.some((v) => v !== null && v !== undefined)) {
    return [{ values, date: "" }];
  }
  return [];
}

function renderPolygon(svg, pts, fill, stroke, strokeWidth) {
  svg += `<polygon points="${pts.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
  return svg;
}

function renderMarkers(svg, cx, cy, maxR, values) {
  AXES.forEach((a, i) => {
    const val = values[i] != null ? values[i] : 0;
    const r = (Math.max(1, Math.min(5, val)) / 5) * maxR;
    const p = polarToCartesian(cx, cy, r, a.angle);
    svg += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="rgba(255,255,255,0.85)" stroke="#8b5cf6" stroke-width="1.2"/>`;
  });
  return svg;
}

export function renderWellbeingRadar(values, size = 280, overlayEntries = null) {
  const dataSeries = buildDataSeries(values, overlayEntries);
  const hasData = dataSeries.length > 0;
  const svgW = size;
  const svgH = size;
  const margin = 28;
  const viewBox = `${-margin} ${-margin} ${svgW + 2 * margin} ${svgH + 2 * margin}`;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const maxR = Math.min(cx, cy) * 0.60;

  const labelFontSize = Math.max(9, Math.min(13, size * 0.050));
  const numFontSize = Math.max(7, Math.min(11, size * 0.040));
  const tickSize = 2.5;
  const labelR = maxR * 0.75;
  const numOffset = 7;
  const labelPerp = 8;

  let svg = "";

  svg += `<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#0f0f1a" rx="6"/>`;

  // axis labels — drawn FIRST (underneath chart lines)
  AXES.forEach((a) => {
    const rad = (a.angle - 90) * (Math.PI / 180);
    const perpX = -Math.sin(rad);
    const perpY = Math.cos(rad);
    const p = polarToCartesian(cx, cy, labelR, a.angle);
    const ox = p.x - perpX * labelPerp;
    const oy = p.y - perpY * labelPerp;
    const rot = getLabelRotation(a.angle);
    svg += `<text x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot},${ox.toFixed(1)},${oy.toFixed(1)})" style="font-family:Inter,'SF Pro Display','Segoe UI',sans-serif;font-size:${labelFontSize}px;font-weight:500;letter-spacing:0.015em;fill:#6b7280;">${a.label}</text>`;
  });

  // grid rings
  for (let lv = 0; lv < LEVELS.length; lv++) {
    const r = LEVELS[lv] * maxR;
    const isOuter = lv === LEVELS.length - 1;
    const opacity = isOuter ? 0.12 : 0.04;
    const pts = AXES.map((a) => {
      const p = polarToCartesian(cx, cy, r, a.angle);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    svg += `<polygon points="${pts.join(" ")}" fill="none" stroke="rgba(139,92,246,${opacity})" stroke-width="${isOuter ? 0.6 : 0.3}"/>`;
  }

  // axis lines
  AXES.forEach((a) => {
    const tip = polarToCartesian(cx, cy, maxR, a.angle);
    svg += `<line x1="${cx}" y1="${cy}" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="rgba(139,92,246,0.06)" stroke-width="0.5"/>`;
  });

  // ticks + numbers
  AXES.forEach((a) => {
    const rad = (a.angle - 90) * (Math.PI / 180);
    const perpX = -Math.sin(rad);
    const perpY = Math.cos(rad);
    const rot = getLabelRotation(a.angle);

    LEVELS.forEach((lv, i) => {
      const r = lv * maxR;
      const pt = polarToCartesian(cx, cy, r, a.angle);
      const nx = pt.x + perpX * numOffset;
      const ny = pt.y + perpY * numOffset;

      svg += `<line x1="${(pt.x - perpX * tickSize).toFixed(1)}" y1="${(pt.y - perpY * tickSize).toFixed(1)}" x2="${(pt.x + perpX * tickSize).toFixed(1)}" y2="${(pt.y + perpY * tickSize).toFixed(1)}" stroke="#4a4a5a" stroke-width="0.5"/>`;

      const num = i + 1;
      svg += `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rot},${nx.toFixed(1)},${ny.toFixed(1)})" style="font-family:Inter,'SF Pro Display','Segoe UI',sans-serif;font-size:${numFontSize}px;font-weight:400;fill:#5a5a6a;">${num}</text>`;
    });
  });

  // data polygon(s)
  if (hasData) {
    const lastIdx = dataSeries.length - 1;
    dataSeries.forEach((entry, idx) => {
      const pts = AXES.map((a, i) => {
        const val = entry.values[i] != null ? entry.values[i] : 0;
        const r = (Math.max(1, Math.min(5, val)) / 5) * maxR;
        const p = polarToCartesian(cx, cy, r, a.angle);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });

      if (lastIdx === 0) {
        // single entry
        svg = renderPolygon(svg, pts, "rgba(139,92,246,0.08)", "#8b5cf6", "1.2");
        svg = renderMarkers(svg, cx, cy, maxR, entry.values);
      } else {
        // multiple entries — fade by recency
        const ratio = idx / lastIdx;
        const strokeOpacity = 0.12 + 0.88 * ratio;
        const fillOpacity = 0.01 + 0.07 * ratio;
        const sWidth = 0.4 + 0.8 * ratio;
        const strokeColor = `rgba(139,92,246,${strokeOpacity.toFixed(2)})`;
        const fillColor = `rgba(139,92,246,${fillOpacity.toFixed(2)})`;
        svg = renderPolygon(svg, pts, fillColor, strokeColor, sWidth.toFixed(1));

        if (idx === lastIdx) {
          svg = renderMarkers(svg, cx, cy, maxR, entry.values);
        }
      }
    });
  }

  return `<div style="background:#0f0f1a;border-radius:8px;width:100%;" role="figure" aria-label="Diagrama de Bienestar"><svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;overflow:visible;" role="img" aria-label="Gráfico radial de bienestar, cinco dimensiones">${svg}</svg></div>`;
}
