// src/material-list.js
import { formatIn } from './imperial.js';

export function buildMaterialList(layout) {
  const fullStoneMap = {};
  const rawCutNotes = [];

  layout.stones.forEach(stone => {
    const key = `${Math.min(stone.w, stone.h)}x${Math.max(stone.w, stone.h)}`;
    if (!fullStoneMap[key]) {
      fullStoneMap[key] = { size: key, w: Math.min(stone.w, stone.h),
        h: Math.max(stone.w, stone.h), qty: 0, sqin: 0 };
    }
    fullStoneMap[key].qty++;
    fullStoneMap[key].sqin += stone.w * stone.h;

    if (stone.clipped && stone.cutW != null && stone.cutH != null) {
      rawCutNotes.push({
        orderSize: key,
        cutDesc: `${formatIn(stone.cutW)} × ${formatIn(stone.cutH)}`,
        qty: 1,
      });
    }
  });

  // Consolidate duplicate cut notes
  const cutNotes = [];
  rawCutNotes.forEach(note => {
    const existing = cutNotes.find(n =>
      n.orderSize === note.orderSize && n.cutDesc === note.cutDesc);
    if (existing) existing.qty++;
    else cutNotes.push({ ...note });
  });

  const fullStones = Object.values(fullStoneMap)
    .sort((a, b) => (a.w * a.h) - (b.w * b.h));

  const totalQty = fullStones.reduce((s, r) => s + r.qty, 0);
  const totalSqin = fullStones.reduce((s, r) => s + r.sqin, 0);

  return {
    fullStones: fullStones.map(r => ({
      size: r.size,
      qty: r.qty,
      sqft: Math.round(r.sqin / 144 * 10) / 10,
    })),
    cutNotes,
    total: { qty: totalQty, sqft: Math.round(totalSqin / 144 * 10) / 10 },
  };
}

export function renderMaterialList(layout, tableContainer, notesContainer) {
  const list = buildMaterialList(layout);

  tableContainer.innerHTML = `
    <div style="font-weight:700;font-size:13px;letter-spacing:0.5px;color:#fff;margin-bottom:8px">
      MATERIAL LIST
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="color:#a0b4c8;border-bottom:1px solid #2e3f52">
          <th style="text-align:left;padding:3px 6px">Size</th>
          <th style="text-align:right;padding:3px 6px">Qty</th>
          <th style="text-align:right;padding:3px 6px">Sq Ft</th>
        </tr>
      </thead>
      <tbody>
        ${list.fullStones.map(r => `
          <tr style="border-bottom:1px solid #2a3848;color:#e8edf2">
            <td style="padding:3px 6px">${r.size.replace('x', '" × ')}"</td>
            <td style="text-align:right;padding:3px 6px">${r.qty}</td>
            <td style="text-align:right;padding:3px 6px;color:#a0c4ff">${r.sqft}</td>
          </tr>`).join('')}
        <tr style="border-top:2px solid #4a6fa5;font-weight:700;color:#fff">
          <td style="padding:4px 6px">Total</td>
          <td style="text-align:right;padding:4px 6px">${list.total.qty}</td>
          <td style="text-align:right;padding:4px 6px;color:#a0c4ff">${list.total.sqft}</td>
        </tr>
      </tbody>
    </table>
  `;

  if (list.cutNotes.length) {
    notesContainer.innerHTML = `
      <div style="margin-top:10px;padding:8px 10px;background:#2a3f2a;border-left:3px solid #27ae60;
                  border-radius:0 4px 4px 0;font-size:11px;color:#b8e8b8">
        <span style="color:#2ecc71;font-weight:700">CUT NOTES</span><br>
        ${list.cutNotes.map(n =>
          `${n.qty}× ${n.orderSize.replace('x','" × ')}" → cut to ${n.cutDesc}`
        ).join('<br>')}
      </div>
    `;
  } else {
    notesContainer.innerHTML = '';
  }
}
