// src/renderer.js
import { filletCorner } from './geometry.js';
import { formatIn } from './imperial.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 4; // pixels per inch — 1" = 4px at default zoom
    this.pan = { x: 40, y: 40 };
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width = this.canvas.clientWidth * devicePixelRatio;
    this.canvas.height = this.canvas.clientHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  // Convert real-world inches to canvas pixels
  toCanvas(x, y) {
    return { x: x * this.scale + this.pan.x, y: y * this.scale + this.pan.y };
  }

  // Convert canvas pixels to real-world inches
  toWorld(cx, cy) {
    return { x: (cx - this.pan.x) / this.scale, y: (cy - this.pan.y) / this.scale };
  }

  clear() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width / devicePixelRatio, height / devicePixelRatio);
    this._drawGrid();
  }

  _drawGrid() {
    const ctx = this.ctx;
    const w = this.canvas.width / devicePixelRatio;
    const h = this.canvas.height / devicePixelRatio;
    const step = 6 * this.scale; // 6 inches per grid cell
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 0.5;
    for (let x = this.pan.x % step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = this.pan.y % step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  drawPolygon(polygon, rubberPt = null) {
    const ctx = this.ctx;
    const { vertices, fillets } = polygon;
    if (!vertices.length) return;

    // Build path respecting fillets
    ctx.beginPath();
    this._buildPolygonPath(vertices, fillets, vertices.length >= 3);

    if (vertices.length >= 3) {
      ctx.fillStyle = 'rgba(176,196,222,0.12)';
      ctx.fill();
    }
    ctx.strokeStyle = '#4a6fa5';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rubber-band line to cursor
    if (rubberPt && vertices.length > 0) {
      const last = this.toCanvas(vertices[vertices.length - 1].x, vertices[vertices.length - 1].y);
      const cur = this.toCanvas(rubberPt.x, rubberPt.y);
      ctx.setLineDash([5, 3]);
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Corner dots and fillet arc labels
    vertices.forEach((v, i) => {
      const cp = this.toCanvas(v.x, v.y);
      const hasFillet = fillets[i] !== undefined;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, hasFillet ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = hasFillet ? '#f39c12' : '#4a6fa5';
      ctx.fill();
      if (hasFillet) {
        ctx.fillStyle = '#f39c12';
        ctx.font = '9px system-ui';
        ctx.fillText(`r=${formatIn(fillets[i])}`, cp.x + 7, cp.y - 5);
      }
    });

    // Edge dimension labels
    if (vertices.length >= 2) {
      this._drawEdgeLabels(vertices, fillets);
    }
  }

  _buildPolygonPath(vertices, fillets, closed) {
    const ctx = this.ctx;
    const n = vertices.length;
    let started = false;

    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const cur = vertices[i];
      const next = vertices[(i + 1) % n];
      const radius = fillets[i];

      const arc = (radius && closed) ? filletCorner(prev, cur, next, radius) : null;
      if (arc) {
        const p1c = this.toCanvas(arc.p1.x, arc.p1.y);
        const cc = this.toCanvas(arc.center.x, arc.center.y);
        if (!started) { ctx.moveTo(p1c.x, p1c.y); started = true; }
        else ctx.lineTo(p1c.x, p1c.y);
        ctx.arc(cc.x, cc.y, radius * this.scale, arc.startAngle, arc.endAngle,
          _isClockwise(prev, cur, next));
      } else {
        const cp = this.toCanvas(cur.x, cur.y);
        if (!started) { ctx.moveTo(cp.x, cp.y); started = true; }
        else ctx.lineTo(cp.x, cp.y);
      }
    }
    if (closed) ctx.closePath();
  }

  _drawEdgeLabels(vertices, fillets) {
    const ctx = this.ctx;
    const n = vertices.length;
    ctx.fillStyle = '#7faaff';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    for (let i = 0; i < n - 1; i++) {
      const a = vertices[i], b = vertices[i + 1];
      const mid = this.toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const dx = Math.sin(angle) * 14, dy = -Math.cos(angle) * 14;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      ctx.fillText(formatIn(d), mid.x + dx, mid.y + dy);
    }
    ctx.textAlign = 'left';
  }

  // Highlight a corner vertex (hover effect)
  highlightVertex(pt) {
    const cp = this.toCanvas(pt.x, pt.y);
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawLayout(layout, polygon) {
    const ctx = this.ctx;
    const stoneColors = ['#c8b89a','#d4c4a8','#bfaf97','#ccc0a4','#b8a890'];

    layout.stones.forEach((stone, i) => {
      const color = stoneColors[i % stoneColors.length];

      if (stone.clipped && stone.clipPath) {
        ctx.beginPath();
        stone.clipPath.forEach((pt, j) => {
          const p = this.toCanvas(pt.x, pt.y);
          j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#6b5d4f';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        this._drawCutIndicator(stone);
      } else {
        const cp = this.toCanvas(stone.x, stone.y);
        const cw = stone.w * this.scale, ch = stone.h * this.scale;
        ctx.fillStyle = color;
        ctx.fillRect(cp.x, cp.y, cw, ch);
        ctx.strokeStyle = '#6b5d4f';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(cp.x, cp.y, cw, ch);
      }
    });

    // Draw patio boundary on top
    ctx.save();
    ctx.strokeStyle = '#4a6fa5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this._buildPolygonPath(polygon.vertices, polygon.fillets, true);
    ctx.stroke();
    ctx.restore();
  }

  _drawCutIndicator(stone) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    stone.clipPath.forEach((pt, j) => {
      const p = this.toCanvas(pt.x, pt.y);
      j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    const midX = stone.clipPath.reduce((s, p) => s + p.x, 0) / stone.clipPath.length;
    const midY = stone.clipPath.reduce((s, p) => s + p.y, 0) / stone.clipPath.length;
    const cm = this.toCanvas(midX, midY);
    ctx.fillStyle = '#e74c3c';
    ctx.font = `${Math.max(8, this.scale * 1.5)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('cut', cm.x, cm.y);
    ctx.restore();
  }
}

function _isClockwise(prev, cur, next) {
  const cross = (cur.x - prev.x) * (next.y - prev.y) - (cur.y - prev.y) * (next.x - prev.x);
  return cross < 0;
}
