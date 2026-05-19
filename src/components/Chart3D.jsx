export function render3DChart(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '<div style="text-align:center;color:#6b7280;padding:2rem;font-size:0.85rem;">No hay suficientes datos para mostrar el gráfico</div>';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
    } catch { return dateStr; }
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function getPointColor(ageRatio, isPost) {
    // Pre-práctica: violeta/magenta (270-290)
    // Post-práctica: azul/celeste (200-210)
    const baseH = isPost ? 210 : 280;
    const baseS = 100 * (0.15 + ageRatio * 0.85);
    const baseL = isPost ? 65 : 70;
    return hslToHex(baseH, baseS, baseL);
  }

  const W = 718;
  const H = 300;
  const padL = 48, padR = 30, padT = 20, padB = 28;
  const pw = W - padL - padR;
  const ph = H - padT - padB;

  const scaleE = 5;
  const scaleV = 5;

  function toSvgX(v) { return padL + (v + scaleV) / (scaleV * 2) * pw; }
  function toSvgY(e) { return padT + ph - (e + scaleE) / (scaleE * 2) * ph; }

  const totalEntries = data.length;

  let html = `
    <div class="chart-container" style="width:100%;overflow:hidden;position:relative;">
      <div class="chart-tt" style="position:absolute;display:none;background:#1a1a2e;border:1px solid #5b8ff9;border-radius:8px;padding:8px 12px;font-size:12px;color:#fefefe;pointer-events:none;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.5);max-width:250px;white-space:pre-wrap;"></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;max-width:100%;">
        <defs>
          <linearGradient id="legendGradPre" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#A855F7"/>
            <stop offset="100%" stop-color="#D8B4FE"/>
          </linearGradient>
          <linearGradient id="legendGradPost" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#3B82F6"/>
            <stop offset="100%" stop-color="#67E8F1"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${W}" height="${H}" fill="#0f0f1a" rx="8"/>
  `;

  // Grid
  for (let v = -scaleV; v <= scaleV; v++) {
    const x = toSvgX(v);
    html += `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${(padT + ph).toFixed(1)}" stroke="#1f2937" stroke-width="0.5"/>`;
    const label = v === 0 ? '0' : v > 0 ? `+${v}` : String(v);
    html += `<text x="${x.toFixed(1)}" y="${(padT + ph + 14).toFixed(1)}" text-anchor="middle" style="font-size:8px;fill:#4b5563;font-family:monospace;">${label}</text>`;
  }
  for (let e = -scaleE; e <= scaleE; e++) {
    const y = toSvgY(e);
    html += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#1f2937" stroke-width="0.5"/>`;
    if (e !== 0) {
      html += `<text x="${(padL - 6).toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="end" style="font-size:8px;fill:#4b5563;font-family:monospace;">${e > 0 ? '+' + e : e}</text>`;
    }
  }

  // Axis lines
  html += `
    <line x1="${padL}" y1="${toSvgY(0).toFixed(1)}" x2="${(padL + pw).toFixed(1)}" y2="${toSvgY(0).toFixed(1)}" stroke="#374151" stroke-width="1"/>
    <line x1="${toSvgX(0).toFixed(1)}" y1="${padT}" x2="${toSvgX(0).toFixed(1)}" y2="${(padT + ph).toFixed(1)}" stroke="#374151" stroke-width="1"/>
  `;

  // Axis labels
  html += `<text x="${(padL + pw / 2).toFixed(1)}" y="${(H - 4).toFixed(1)}" text-anchor="middle" style="font-size:9px;fill:#60a5fa;font-family:monospace;font-weight:600;">Valence</text>`;
  html += `<text x="12" y="${(padT + ph / 2).toFixed(1)}" text-anchor="middle" transform="rotate(-90,12,${(padT + ph / 2).toFixed(1)})" style="font-size:9px;fill:#60a5fa;font-family:monospace;font-weight:600;">Energy</text>`;

  // Data entries
  data.forEach((entry, idx) => {
    const ageRatio = totalEntries > 1 ? 1 - (idx / (totalEntries - 1)) : 0;

    const vPre = entry.valence_pre, ePre = entry.energy_pre;
    const vPost = entry.valence_post, ePost = entry.energy_post;

    const practiceLabels = {
      mindfulness: "Mindfulness",
      meditacion: "Meditación",
      visualizacion: "Visualización",
      respiracion: "Respiración",
      escritura: "Escritura",
      trataka: "Trataka",
      shambhavi: "Shambhavi",
      hypnosis: "Hipnosis",
      default: "Práctica"
    };
    const practiceName = practiceLabels[entry.tipo_practica] || practiceLabels.default || entry.tipo_practica;
    const dateStr = formatDate(entry.fecha);

    if (ePre != null && vPre != null) {
      const px = toSvgX(vPre), py = toSvgY(ePre);
      const col = getPointColor(ageRatio, false);
      const tipText = `${dateStr} - ${practiceName} (Pre) E:${ePre} V:${vPre}`;
      const link = `/journal?highlight=${entry.id}`;
      html += `
        <a href="${link}">
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="${col}" opacity="0.35" class="pt" title="${tipText}" />
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${col}" opacity="0.85" class="pt" title="${tipText}" />
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2" fill="#fff" opacity="0.9" class="pt" title="${tipText}" />
        </a>
      `;
    }

    if (ePost != null && vPost != null) {
      const px = toSvgX(vPost), py = toSvgY(ePost);
      const col = getPointColor(ageRatio, true);
      const tipText = `${dateStr} - ${practiceName} (Post) E:${ePost} V:${vPost}`;
      const link = `/journal?highlight=${entry.id}`;
      html += `
        <a href="${link}">
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="8" fill="${col}" opacity="0.35" class="pt" title="${tipText}" />
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5" fill="${col}" opacity="0.85" class="pt" title="${tipText}" />
          <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2" fill="#fff" opacity="0.9" class="pt" title="${tipText}" />
        </a>
      `;
    }

    if (ePre != null && vPre != null && ePost != null && vPost != null) {
      const x1 = toSvgX(vPre), y1 = toSvgY(ePre);
      const x2 = toSvgX(vPost), y2 = toSvgY(ePost);
      const colMid = getPointColor(ageRatio, false);
      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${colMid}" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.5"/>`;
    }
  });

  html += `
    </svg>
    <style>
      .journal-chart svg .pt, .chart-container svg .pt { cursor: pointer; }
      .journal-chart svg .pt:hover, .chart-container svg .pt:hover { opacity: 1 !important; }
      .journal-chart svg a, .chart-container svg a { cursor: pointer; }
      .journal-chart svg a:hover, .chart-container svg a:hover { opacity: 1 !important; }
      @media (max-width: 640px) {
        .journal-chart, .chart-container { min-height: 200px; }
      }
    </style>
    <script>
      (function() {
        var container = document.currentScript.parentElement;
        var tip = container.querySelector(".chart-tt");
        if (!tip) return;
        container.querySelectorAll(".pt").forEach(function(el) {
          el.addEventListener("mouseover", function(e) {
            var title = el.getAttribute("title");
            if (title) {
              tip.textContent = title;
              tip.style.display = "block";
            }
          });
          el.addEventListener("mousemove", function(e) {
            tip.style.left = (e.offsetX + 12) + "px";
            tip.style.top = (e.offsetY - 28) + "px";
          });
          el.addEventListener("mouseout", function() {
            tip.style.display = "none";
          });
        });
      })();
    </script>
  `;

  html += '</div>';
  return html;
}