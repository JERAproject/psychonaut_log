export function renderEntryDashboard(energy_pre, valence_pre, energy_post, valence_post, fecha) {
  function formatVal(v) {
    if (v === null || v === undefined) return null;
    return v > 0 ? `+${v}` : String(v);
  }

  const scale = 5;
  const W = 340;
  const H = 180;
  const padding = 30;
  const chartW = W - padding * 2;
  const chartH = H - padding * 2;
  const cx = padding + chartW / 2;
  const cy = padding + chartH / 2;

  function toX(val) {
    return padding + ((val + scale) / (scale * 2)) * chartW;
  }
  function toY(val) {
    return padding + ((scale - val) / (scale * 2)) * chartH;
  }

  const preHas = energy_pre !== null && valence_pre !== null;
  const postHas = energy_post !== null && valence_post !== null;

  let paths = '';
  const labelStyle = 'font-size:9px;fill:#4b5563;font-family:monospace;';

  // Grid lines
  for (let i = -scale; i <= scale; i++) {
    const x = toX(i);
    const y = toY(i);
    const isAxis = i === 0;
    paths += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${H - padding}" stroke="${isAxis ? '#374151' : '#1f2937'}" stroke-width="${isAxis ? 1.5 : 0.5}" stroke-dasharray="${isAxis ? '' : '3,3'}"/>`;
    paths += `<line x1="${padding}" y1="${y}" x2="${W - padding}" y2="${y}" stroke="${isAxis ? '#374151' : '#1f2937'}" stroke-width="${isAxis ? 1.5 : 0.5}" stroke-dasharray="${isAxis ? '' : '3,3'}"/>`;
  }

  // Tick labels
  for (let i = -scale; i <= scale; i += 2) {
    if (i !== 0) {
      paths += `<text x="${toX(i)}" y="${H - padding + 14}" text-anchor="middle" ${labelStyle}>${i}</text>`;
      paths += `<text x="${padding - 8}" y="${toY(i) + 4}" text-anchor="middle" ${labelStyle}>${i}</text>`;
    }
  }
  paths += `<text x="${cx}" y="${H - padding + 14}" text-anchor="middle" ${labelStyle}>0</text>`;
  paths += `<text x="${padding - 8}" y="${cy + 4}" text-anchor="middle" ${labelStyle}>0</text>`;

  // Axis names
  paths += `<text x="${cx}" y="${H - 8}" text-anchor="middle" style="font-size:10px;fill:#6b7280;font-family:monospace;font-weight:600;">Energy</text>`;
  paths += `<text x="${padding - 20}" y="${cy + 20}" text-anchor="middle" style="font-size:10px;fill:#6b7280;font-family:monospace;font-weight:600;writing-mode:vertical-rl;transform:rotate(180deg);">Valence</text>`;

  // Connection line
  if (preHas && postHas) {
    const x1 = toX(valence_pre);
    const y1 = toY(energy_pre);
    const x2 = toX(valence_post);
    const y2 = toY(energy_post);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const triSize = 8;
    const tx = x1 + (x2 - x1) * 0.85;
    const ty = y1 + (y2 - y1) * 0.85;
    const t1x = tx - triSize * Math.cos(angle - 0.4);
    const t1y = ty - triSize * Math.sin(angle - 0.4);
    const t2x = tx - triSize * Math.cos(angle + 0.4);
    const t2y = ty - triSize * Math.sin(angle + 0.4);
    paths += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(167,139,250,0.35)" stroke-width="2" stroke-dasharray="5,4"/>`;
    paths += `<polygon points="${x2},${y2} ${t1x.toFixed(1)},${t1y.toFixed(1)} ${t2x.toFixed(1)},${t2y.toFixed(1)}" fill="rgba(167,139,250,0.5)"/>`;
  }

  // Pre point
  if (preHas) {
    const px = toX(valence_pre);
    const py = toY(energy_pre);
    paths += `
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="12" fill="rgba(96,165,250,0.12)"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7" fill="#60a5fa" opacity="0.9"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="#bfdbfe"/>
      <text x="${(px + 12).toFixed(1)}" y="${(py - 8).toFixed(1)}" style="font-size:9px;fill:#60a5fa;font-family:monospace;font-weight:600;">PRE</text>
    `;
  }

  // Post point
  if (postHas) {
    const px = toX(valence_post);
    const py = toY(energy_post);
    paths += `
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="12" fill="rgba(244,114,182,0.12)"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="7" fill="#f472b6" opacity="0.9"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="#fbcfe8"/>
      <text x="${(px + 12).toFixed(1)}" y="${(py - 8).toFixed(1)}" style="font-size:9px;fill:#f472b6;font-family:monospace;font-weight:600;">POST</text>
    `;
  }

  // Panel info
  let infoHtml = '';
  if (preHas) {
    const eColor = energy_pre >= 0 ? '#22c55e' : '#ef4444';
    const vColor = valence_pre >= 0 ? '#22c55e' : '#ef4444';
    infoHtml += `
      <div style="background:#16162a;border-radius:8px;padding:0.5rem;border:1px solid rgba(96,165,250,0.2);">
        <div style="font-size:0.65rem;color:#60a5fa;font-weight:600;margin-bottom:4px;">PRE</div>
        <div style="font-size:0.7rem;color:#9ca3af;">E: <span style="color:${eColor};font-weight:600;">${formatVal(energy_pre)}</span></div>
        <div style="font-size:0.7rem;color:#9ca3af;">V: <span style="color:${vColor};font-weight:600;">${formatVal(valence_pre)}</span></div>
      </div>
    `;
  }
  if (postHas) {
    const eColor = energy_post >= 0 ? '#22c55e' : '#ef4444';
    const vColor = valence_post >= 0 ? '#22c55e' : '#ef4444';
    infoHtml += `
      <div style="background:#16162a;border-radius:8px;padding:0.5rem;border:1px solid rgba(244,114,182,0.2);">
        <div style="font-size:0.65rem;color:#f472b6;font-weight:600;margin-bottom:4px;">POST</div>
        <div style="font-size:0.7rem;color:#9ca3af;">E: <span style="color:${eColor};font-weight:600;">${formatVal(energy_post)}</span></div>
        <div style="font-size:0.7rem;color:#9ca3af;">V: <span style="color:${vColor};font-weight:600;">${formatVal(valence_post)}</span></div>
      </div>
    `;
  }
  if (preHas && postHas) {
    const dE = energy_post - energy_pre;
    const dV = valence_post - valence_pre;
    const dEColor = dE > 0 ? '#22c55e' : dE < 0 ? '#ef4444' : '#6b7280';
    const dVColor = dV > 0 ? '#22c55e' : dV < 0 ? '#ef4444' : '#6b7280';
    infoHtml += `
      <div style="background:#0d0d1a;border-radius:8px;padding:0.5rem;border:1px solid #2a2a35;">
        <div style="font-size:0.65rem;color:#a78bfa;font-weight:600;margin-bottom:4px;">Δ</div>
        <div style="font-size:0.7rem;color:#9ca3af;">E: <span style="color:${dEColor};font-weight:600;">${dE > 0 ? '+' : ''}${dE}</span></div>
        <div style="font-size:0.7rem;color:#9ca3af;">V: <span style="color:${dVColor};font-weight:600;">${dV > 0 ? '+' : ''}${dV}</span></div>
      </div>
    `;
  }

  return `
    <div style="background:#0d0d1a;border-radius:12px;padding:1rem;margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <span style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Energy × Valence</span>
        <div style="display:flex;gap:0.75rem;font-size:0.65rem;color:#9ca3af;">
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#60a5fa;"></span>Pre</span>
          <span style="display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:#f472b6;"></span>Post</span>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <svg width="${W}" height="${H}" style="overflow:visible;">
          <rect x="0" y="0" width="${W}" height="${H}" fill="#0f0f1a" rx="8"/>
          ${paths}
        </svg>
        <div style="display:flex;flex-direction:column;gap:0.4rem;min-width:80px;justify-content:center;">
          ${infoHtml}
        </div>
      </div>
    </div>
  `;
}