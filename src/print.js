// src/print.js
import { buildMaterialList } from './material-list.js';

export function printLayout(project, renderer) {
  // Render canvas at 3x resolution
  const src = renderer.canvas;
  const printCanvas = document.createElement('canvas');
  printCanvas.width = src.width * 3;
  printCanvas.height = src.height * 3;
  const pCtx = printCanvas.getContext('2d');
  pCtx.scale(3, 3);
  pCtx.drawImage(src, 0, 0, src.width / devicePixelRatio, src.height / devicePixelRatio);
  const imgData = printCanvas.toDataURL('image/png');

  const list = project.layout ? buildMaterialList(project.layout) : null;

  const win = window.open('', '_blank');
  if (!win) return; // popup blocked

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${_esc(project.name)} — BlueDawg</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; color: #1a1a2e; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
    img { max-width: 100%; border: 1px solid #ccc; }
    table { border-collapse: collapse; margin-top: 16px; font-size: 13px; min-width: 300px; }
    th { text-align: left; padding: 4px 10px; border-bottom: 2px solid #1a1a2e; }
    td { padding: 3px 10px; border-bottom: 1px solid #ddd; }
    .cut-notes { margin-top: 12px; padding: 8px 12px; background: #f0fff0;
      border-left: 3px solid #27ae60; font-size: 12px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${_esc(project.name)}</h1>
  <div class="meta">Generated ${new Date().toLocaleDateString()} · BlueDawg</div>
  <img src="${imgData}" alt="Layout">
  ${list ? `
  <table>
    <thead><tr><th>Size</th><th>Qty</th><th>Sq Ft</th></tr></thead>
    <tbody>
      ${list.fullStones.map(r => `
        <tr>
          <td>${_esc(r.size.replace('x', '" × '))}"</td>
          <td>${r.qty}</td>
          <td>${r.sqft}</td>
        </tr>`).join('')}
      <tr style="font-weight:700;border-top:2px solid #1a1a2e">
        <td>Total</td><td>${list.total.qty}</td><td>${list.total.sqft}</td>
      </tr>
    </tbody>
  </table>
  ${list.cutNotes.length ? `
  <div class="cut-notes">
    <strong>Cut Notes</strong><br>
    ${list.cutNotes.map(n =>
      `${n.qty}× ${_esc(n.orderSize.replace('x','" × '))}" → cut to ${_esc(n.cutDesc)}`
    ).join('<br>')}
  </div>` : ''}` : ''}
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
  win.document.close();
}

// Escape HTML entities to prevent XSS in the print window
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
