// src/geometry.js

export function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polygonArea(pts) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function polygonPerimeter(pts) {
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    p += dist(pts[i], pts[(i + 1) % pts.length]);
  }
  return p;
}

// Ray-casting algorithm
export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (((yi > pt.y) !== (yj > pt.y)) &&
        pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function segmentsIntersect(p1, p2, p3, p4) {
  const d1 = _dir(p3, p4, p1), d2 = _dir(p3, p4, p2);
  const d3 = _dir(p1, p2, p3), d4 = _dir(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function _dir(a, b, c) {
  return (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
}

// Sutherland-Hodgman polygon clipping
export function clipPolygonToPolygon(subjectPoly, clipPoly) {
  let output = [...subjectPoly];
  for (let i = 0; i < clipPoly.length; i++) {
    if (!output.length) return [];
    const input = output;
    output = [];
    const edgeA = clipPoly[i];
    const edgeB = clipPoly[(i + 1) % clipPoly.length];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const curIn = _inside(cur, edgeA, edgeB);
      const prevIn = _inside(prev, edgeA, edgeB);
      if (curIn) {
        if (!prevIn) output.push(_intersect(prev, cur, edgeA, edgeB));
        output.push(cur);
      } else if (prevIn) {
        output.push(_intersect(prev, cur, edgeA, edgeB));
      }
    }
  }
  return output;
}

function _inside(p, a, b) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

function _intersect(a, b, c, d) {
  const A1 = b.y - a.y, B1 = a.x - b.x, C1 = A1 * a.x + B1 * a.y;
  const A2 = d.y - c.y, B2 = c.x - d.x, C2 = A2 * c.x + B2 * c.y;
  const det = A1 * B2 - A2 * B1;
  return { x: (C1 * B2 - C2 * B1) / det, y: (A1 * C2 - A2 * C1) / det };
}

// Compute fillet arc for a polygon corner.
// Returns { center, radius, startAngle, endAngle, p1, p2 }
// where p1/p2 are the tangent points replacing the corner vertex.
export function filletCorner(prev, corner, next, radius) {
  const d1 = dist(prev, corner), d2 = dist(corner, next);
  const u1 = { x: (prev.x - corner.x) / d1, y: (prev.y - corner.y) / d1 };
  const u2 = { x: (next.x - corner.x) / d2, y: (next.y - corner.y) / d2 };
  const dot = u1.x * u2.x + u1.y * u2.y;
  const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
  const t = radius / Math.tan(angle / 2);
  const p1 = { x: corner.x + u1.x * t, y: corner.y + u1.y * t };
  const p2 = { x: corner.x + u2.x * t, y: corner.y + u2.y * t };
  const bisect = { x: u1.x + u2.x, y: u1.y + u2.y };
  const bLen = Math.hypot(bisect.x, bisect.y);
  const center = {
    x: corner.x + (bisect.x / bLen) * (radius / Math.sin(angle / 2)),
    y: corner.y + (bisect.y / bLen) * (radius / Math.sin(angle / 2)),
  };
  const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
  const endAngle = Math.atan2(p2.y - center.y, p2.x - center.x);
  return { center, radius, startAngle, endAngle, p1, p2 };
}
