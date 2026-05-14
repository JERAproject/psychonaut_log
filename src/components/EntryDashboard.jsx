export function renderEntryDashboard(energy_pre, valence_pre, energy_post, valence_post) {
  function formatVal(v) {
    if (v === null || v === undefined) return null;
    return v > 0 ? `+${v}` : String(v);
  }

  function getBgColor(e, v) {
    if (e === null || v === null) return '#1a1a2e';
    const intensity = Math.abs(e) + Math.abs(v);
    if (intensity > 6) return 'rgba(239,68,68,0.15)';
    if (intensity > 4) return 'rgba(245,158,11,0.12)';
    if (intensity > 2) return 'rgba(34,197,94,0.10)';
    return '#1a1a2e';
  }

  const scale = 5;
  const gridSize = 240;
  const axisLength = 220;
  const centerX = gridSize / 2;
  const centerY = gridSize / 2;
  const unit = axisLength / (scale * 2);

  function toCanvasX(val) {
    return centerX + val * unit;
  }
  function toCanvasY(val) {
    return centerY - val * unit;
  }

  const preHas = energy_pre !== null && valence_pre !== null;
  const postHas = energy_post !== null && valence_post !== null;

  let html = `
    <div style="background:#0d0d1a;border-radius:12px;padding:1rem;margin-top:0.5rem;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
        <span style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Energia Vs Valencia</span>
        <div style="display:flex;gap:1rem;font-size:0.7rem;color:#9ca3af;">
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#60a5fa;display:inline-block;box-shadow:0 0 6px #60a5fa;"></span>Pre
          </span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:10px;height:10px;border-radius:50%;background:#8c25e0;display:inline-block;box-shadow:0 0 6px #8c25e0;"></span>Post
          </span>
          <span style="display:flex;align-items:center;gap:4px;">
            <span style="width:16px;height:2px;background:linear-gradient(90deg,rgba(96,165,250,0.4),rgba(244,114,182,0.4));display:inline-block;"></span>Cambio
          </span>
        </div>
      </div>

      <div style="display:flex;gap:1rem;align-items:flex-start;">
        <div style="position:relative;width:${gridSize}px;height:${gridSize}px;flex-shrink:0;">
          <svg width="${gridSize}" height="${gridSize}" style="overflow:visible;">
            <!-- Grid background -->
            <rect x="0" y="0" width="${gridSize}" height="${gridSize}" fill="#16162a" rx="8"/>
  `;

  // Grid lines
  for (let i = -scale; i <= scale; i++) {
    const x = toCanvasX(i);
    const y = toCanvasY(i);
    const isAxis = i === 0;
    html += `<line x1="${x}" y1="0" x2="${x}" y2="${gridSize}" stroke="${isAxis ? '#4b5563' : '#252540'}" stroke-width="${isAxis ? 1.5 : 0.5}" stroke-dasharray="${isAxis ? '' : '2,2'}"/>`;
    html += `<line x1="0" y1="${y}" x2="${gridSize}" y2="${y}" stroke="${isAxis ? '#4b5563' : '#252540'}" stroke-width="${isAxis ? 1.5 : 0.5}" stroke-dasharray="${isAxis ? '' : '2,2'}"/>`;
  }

  // Axis labels
  const labelStyle = 'font-size:9px;fill:#4b5563;font-family:monospace;';
  for (let i = -scale; i <= scale; i += scale / 2) {
    const xPos = toCanvasX(i);
    const yPos = toCanvasY(i);
    if (i !== 0) {
      html += `<text x="${xPos}" y="${centerY + 12}" text-anchor="middle" ${labelStyle}>${i}</text>`;
      html += `<text x="${centerX - 14}" y="${yPos + 4}" text-anchor="middle" ${labelStyle}>${i}</text>`;
    }
  }

  // Axis names
  html += `<text x="${centerX}" y="${gridSize - 4}" text-anchor="middle" style="font-size:9px;fill:#374151;font-family:monospace;">Valence</text>`;
  html += `<text x="10" y="14" style="font-size:9px;fill:#374151;font-family:monospace;">E</text>`;

  // Quadrant labels
  const quadStyle = 'font-size:8px;fill:#2a2a35;font-family:monospace;';
  html += `<text x="${centerX + 10}" y="${centerY - 10}" ${quadStyle}>++</text>`;
  html += `<text x="${centerX + 10}" y="${centerY + 18}" ${quadStyle}>+-</text>`;
  html += `<text x="${centerX - 25}" y="${centerY - 10}" ${quadStyle}>-+</text>`;
  html += `<text x="${centerX - 25}" y="${centerY + 18}" ${quadStyle}>--</text>`;

  // Arrow from pre to post
  if (preHas && postHas) {
    const x1 = toCanvasX(valence_pre);
    const y1 = toCanvasY(energy_pre);
    const x2 = toCanvasX(valence_post);
    const y2 = toCanvasY(energy_post);
    
    // Calculate arrow angle for marker
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;

    html += `
      <defs>
        <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(96,165,250,0.5)"/>
        </marker>
      </defs>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#prePostGrad)" stroke-width="2" stroke-dasharray="4,3" opacity="0.6"/>
      <polygon points="${x1},${y1} ${x1+8},${y1-4} ${x1+6},${y1+6}" fill="rgba(96,165,250,0.5)"/>
    `;
  }

  // Pre point
  if (preHas) {
    const px = toCanvasX(valence_pre);
    const py = toCanvasY(energy_pre);
    html += `
      <circle cx="${px}" cy="${py}" r="10" fill="rgba(96,165,250,0.15)"/>
      <circle cx="${px}" cy="${py}" r="6" fill="#60a5fa" opacity="0.9"/>
      <circle cx="${px}" cy="${py}" r="3" fill="#bfdbfe"/>
    `;
  }

  // Post point
  if (postHas) {
    const px = toCanvasX(valence_post);
    const py = toCanvasY(energy_post);
    html += `
      <circle cx="${px}" cy="${py}" r="10" fill="rgba(244,114,182,0.15)"/>
      <circle cx="${px}" cy="${py}" r="6" fill="#8c25e0" opacity="0.9"/>
      <circle cx="${px}" cy="${py}" r="3" fill="#fbcfe8"/>
    `;
  }

  html += `</svg>`;

  // Axis labels rotated
  html += `
          <div style="position:absolute;left:-18px;top:${centerY - 40}px;transform:rotate(-90deg);transform-origin:center;font-size:0.6rem;color:#374151;font-family:monospace;white-space:nowrap;">Energy</div>
        </div>

        <div style="display:flex;flex-direction:column;gap:0.5rem;min-width:100px;justify-content:center;">
  `;

  // Legend values
  if (preHas) {
    const eColor = energy_pre >= 0 ? '#22c55e' : '#ef4444';
    const vColor = valence_pre >= 0 ? '#22c55e' : '#ef4444';
    html += `
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
    html += `
      <div style="background:#16162a;border-radius:8px;padding:0.5rem;border:1px solid rgba(244,114,182,0.2);">
        <div style="font-size:0.65rem;color:#8c25e0;font-weight:600;margin-bottom:4px;">POST</div>
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
    html += `
      <div style="background:#0d0d1a;border-radius:8px;padding:0.5rem;border:1px solid #2a2a35;">
        <div style="font-size:0.65rem;color:#6b7280;font-weight:600;margin-bottom:4px;">DELTA</div>
        <div style="font-size:0.7rem;color:#9ca3af;">E: <span style="color:${dEColor};font-weight:600;">${dE > 0 ? '+' : ''}${dE}</span></div>
        <div style="font-size:0.7rem;color:#9ca3af;">V: <span style="color:${dVColor};font-weight:600;">${dV > 0 ? '+' : ''}${dV}</span></div>
      </div>
    `;
  }

  html += `
        </div>
      </div>
    </div>
  `;

  return html;
}