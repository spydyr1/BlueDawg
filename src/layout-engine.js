// src/layout-engine.js
import { polygonArea, clipPolygonToPolygon, pointInPolygon } from './geometry.js';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Joint gap between stones (1/4 inch) */
const JOINT = 0.25;

/** Minimum area (sq in) for a cut piece to be kept */
const MIN_CUT_AREA = 206;

/** Maximum continuous straight seam length (inches — 5 feet) */
const MAX_SEAM = 60;

/** Maximum fraction any single size may represent */
const MAX_SIZE_PCT = 0.20;

// ─── Stone sizes ─────────────────────────────────────────────────────────────

/**
 * 11 unique physical stone sizes (w ≤ h).
 * Constraints: dimensions in {12,18,24,30,36}", min(w,h) ≤ 24", max ≤ 36",
 * no 12×12.
 */
export const SIZES = [
  { w: 12, h: 18 },
  { w: 12, h: 24 },
  { w: 12, h: 30 },
  { w: 12, h: 36 },
  { w: 18, h: 18 },
  { w: 18, h: 24 },
  { w: 18, h: 30 },
  { w: 18, h: 36 },
  { w: 24, h: 24 },
  { w: 24, h: 30 },
  { w: 24, h: 36 },
];

// Valid row heights (the shorter axis of any stone)
const ROW_HEIGHTS = [12, 18, 24];

/**
 * For a given row height H, return all valid stone lengths (the dimension
 * placed along the X axis).  A stone is usable in a row of height H when
 * one of its dimensions equals H and the other forms a valid pairing.
 */
function lengthsForHeight(H) {
  const lengths = new Set();
  for (const s of SIZES) {
    if (s.h === H) lengths.add(s.w); // stone in natural orientation
    if (s.w === H) lengths.add(s.h); // stone rotated 90°
  }
  return [...lengths].sort((a, b) => a - b);
}

// ─── Canonical size key ───────────────────────────────────────────────────────

function sizeKey(w, h) {
  const lo = Math.min(w, h), hi = Math.max(w, h);
  return `${lo}x${hi}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Layout rules ─────────────────────────────────────────────────────────────

/**
 * Ensure that placing `candidate` would not create a point where four stone
 * corners meet.  Returns true if placement is allowed.
 *
 * Four-corner check: for each corner of the candidate, count how many already-
 * placed stones share that exact corner.  If any existing corner already has
 * ≥ 2 stones sharing it (so adding the candidate makes 3+ including itself =
 * four-corner intersection), return false.
 */
export function checkNoFourCorners(placed, candidate) {
  const corners = s => [
    { x: s.x,       y: s.y       },
    { x: s.x + s.w, y: s.y       },
    { x: s.x,       y: s.y + s.h },
    { x: s.x + s.w, y: s.y + s.h },
  ];

  const candCorners = corners(candidate);
  for (const pt of candCorners) {
    // How many placed stones share this corner point?
    let sharedCount = 0;
    const TOL = JOINT + 0.1; // corners within a joint-width count as the same junction
    for (const s of placed) {
      if (corners(s).some(c => Math.abs(c.x - pt.x) < TOL && Math.abs(c.y - pt.y) < TOL)) {
        sharedCount++;
      }
    }
    // candidate itself is 1; if sharedCount >= 3, total = 4 corners meeting
    if (sharedCount >= 3) return false;
  }
  return true;
}

/**
 * Ensure no horizontal seam line (shared horizontal edge) extends longer than
 * `maxLen` inches.  Returns true if placement is allowed.
 *
 * A "seam" here is any Y-coordinate where multiple stones have a horizontal
 * edge.  We only check the candidate's top and bottom edges.
 */
export function checkSeamLength(placed, candidate, maxLen = MAX_SEAM) {
  for (const seamY of [candidate.y, candidate.y + candidate.h]) {
    // Collect all stones (placed + candidate) that have a horizontal edge at seamY
    const atSeam = [...placed, candidate].filter(s =>
      Math.abs(s.y - seamY) < 0.01 || Math.abs(s.y + s.h - seamY) < 0.01
    );
    if (atSeam.length < 2) continue;

    const intervals = atSeam.map(s => [s.x, s.x + s.w]).sort((a, b) => a[0] - b[0]);
    // Merge touching/overlapping intervals; check the longest single contiguous run.
    // Two intervals are contiguous if separated by ≤ one joint gap.
    let maxRun = 0, segStart = intervals[0][0], segEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
      const [a, b] = intervals[i];
      if (a > segEnd + JOINT + 0.1) {
        maxRun = Math.max(maxRun, segEnd - segStart);
        segStart = a; segEnd = b;
      } else {
        segEnd = Math.max(segEnd, b);
      }
    }
    maxRun = Math.max(maxRun, segEnd - segStart);
    if (maxRun > maxLen + 0.01) return false;
  }
  return true;
}

/**
 * Check that placing the candidate stone would not extend a continuous
 * vertical seam through more than 2 consecutive rows.
 *
 * Returns true if placement is allowed.
 */
export function checkContinuousSeam(placed, candidate) {
  // Check each vertical edge of the candidate
  for (const seamX of [candidate.x, candidate.x + candidate.w]) {
    // Stones on both sides of this vertical line
    const aligned = placed.filter(s =>
      Math.abs(s.x - seamX) < 0.01 || Math.abs(s.x + s.w - seamX) < 0.01
    );
    if (!aligned.length) continue;

    // Add candidate to list and sort by y
    const all = [...aligned, candidate].sort((a, b) => a.y - b.y);
    let run = 1;
    for (let i = 1; i < all.length; i++) {
      const gap = all[i].y - (all[i - 1].y + all[i - 1].h);
      if (Math.abs(gap) < JOINT + 0.1) {
        run++;
        if (run >= 3) return false;
      } else {
        run = 1;
      }
    }
  }
  return true;
}

// ─── Stone clipping ───────────────────────────────────────────────────────────

function stoneToPolygon(s) {
  return [
    { x: s.x,       y: s.y       },
    { x: s.x + s.w, y: s.y       },
    { x: s.x + s.w, y: s.y + s.h },
    { x: s.x,       y: s.y + s.h },
  ];
}

/**
 * Clip a stone rectangle against the boundary polygon.
 * Returns an enriched stone object, or null if the cut piece is too small.
 */
function clipStone(stone, boundary) {
  const stonePoly = stoneToPolygon(stone);
  const clipped = clipPolygonToPolygon(stonePoly, boundary);
  if (!clipped || clipped.length < 3) return null;

  const clippedArea = polygonArea(clipped);
  if (clippedArea < MIN_CUT_AREA) return null;

  const origArea = stone.w * stone.h;
  const isFullyInside = Math.abs(clippedArea - origArea) < 0.5;

  if (isFullyInside) {
    return { ...stone, clipped: false, clipPath: null, cutW: null, cutH: null };
  }

  const xs = clipped.map(p => p.x);
  const ys = clipped.map(p => p.y);
  const cutW = Math.max(...xs) - Math.min(...xs);
  const cutH = Math.max(...ys) - Math.min(...ys);

  return {
    ...stone,
    clipped: true,
    clipPath: clipped,
    cutW: Math.round(cutW * 100) / 100,
    cutH: Math.round(cutH * 100) / 100,
  };
}

// ─── Placement validation ─────────────────────────────────────────────────────

function isValidPlacement(placed, candidate, counts, totalCount, lastKey) {
  const key = sizeKey(candidate.w, candidate.h);

  // Rule: no two adjacent same-size stones in the same row
  if (lastKey && lastKey === key) return false;

  // Rule: no single size > 20% of total
  if (totalCount > 4) {
    const newCount = (counts[key] || 0) + 1;
    if (newCount / (totalCount + 1) > MAX_SIZE_PCT + 0.01) return false;
  }

  // Rule: no four corners meeting
  if (!checkNoFourCorners(placed, candidate)) return false;

  // Rule: no seam > 5 feet
  if (!checkSeamLength(placed, candidate)) return false;

  // Rule: no continuous vertical seam through more than 2 consecutive rows
  if (!checkContinuousSeam(placed, candidate)) return false;

  return true;
}

// ─── Row filler ──────────────────────────────────────────────────────────────

/**
 * Fill one horizontal row of the layout.
 * Uses three passes to ensure complete coverage:
 *   1. Full rules — prefer quality placements
 *   2. Relaxed rules — drop seam/corner checks, keep no-adjacent-same-size
 *   3. Force-place — ignore all rules, just fill the gap
 * Only advances without placing when the position is truly outside the boundary.
 *
 * Returns the updated totalCount.
 */
function fillRow(y, rowH, minX, maxX, placed, stones, counts, totalCount, boundary) {
  const lengths = lengthsForHeight(rowH);
  const sortedLens = [...lengths].sort((a, b) => a - b); // smallest first for fallback
  let x = minX;
  let lastKey = null;

  while (x < maxX) {
    let placed_stone = false;

    // Pass 1 — all rules
    for (const len of shuffle(lengths)) {
      const candidate = { x, y, w: len, h: rowH };
      if (!isValidPlacement(placed, candidate, counts, totalCount, lastKey)) continue;
      const result = clipStone(candidate, boundary);
      if (!result) continue;
      const key = sizeKey(len, rowH);
      stones.push(result); placed.push(candidate);
      counts[key] = (counts[key] || 0) + 1;
      totalCount++; lastKey = key;
      x += len + JOINT;
      placed_stone = true;
      break;
    }

    // Pass 2 — relax seam/corner rules, keep no-adjacent-same-size
    if (!placed_stone) {
      for (const len of shuffle(lengths)) {
        const candidate = { x, y, w: len, h: rowH };
        const key = sizeKey(len, rowH);
        if (key === lastKey) continue;
        const result = clipStone(candidate, boundary);
        if (!result) continue;
        stones.push(result); placed.push(candidate);
        counts[key] = (counts[key] || 0) + 1;
        totalCount++; lastKey = key;
        x += len + JOINT;
        placed_stone = true;
        break;
      }
    }

    // Pass 3 — force-place: use smallest stone that overlaps boundary at all
    if (!placed_stone) {
      for (const len of sortedLens) {
        const candidate = { x, y, w: len, h: rowH };
        const result = clipStone(candidate, boundary);
        if (!result) continue;
        const key = sizeKey(len, rowH);
        stones.push(result); placed.push(candidate);
        counts[key] = (counts[key] || 0) + 1;
        totalCount++; lastKey = key;
        x += len + JOINT;
        placed_stone = true;
        break;
      }
    }

    // Nothing clips at this position — outside boundary, advance
    if (!placed_stone) x += sortedLens[0] + JOINT;
  }

  return totalCount;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a stone layout for the given polygon.
 *
 * @param {object} polygon  - { vertices: [{x,y},...] }
 * @param {string} pattern  - 'random' | 'bond-h' | 'bond-v'
 * @returns {{ stones, counts, totalCount }}
 */
export function generateLayout(polygon, pattern) {
  if (pattern === 'bond-v') {
    return _generateBondV(polygon);
  }
  if (pattern === 'bond-h') {
    return _generateBond(polygon);
  }
  return _generateRandom(polygon);
}

// ─── Pattern implementations ──────────────────────────────────────────────────

function _bbox(vertices) {
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  };
}

function _generateRandom(polygon) {
  const { vertices } = polygon;
  const { minX, maxX, minY, maxY } = _bbox(vertices);

  const stones = [];
  const placed = [];
  const counts = {};
  let totalCount = 0;

  let y = minY;
  let prevRowH = -1;

  while (y < maxY) {
    const hOptions = ROW_HEIGHTS.filter(h => h !== prevRowH);
    const rowH = hOptions[Math.floor(Math.random() * hOptions.length)];
    prevRowH = rowH;

    totalCount = fillRow(y, rowH, minX, maxX, placed, stones, counts, totalCount, vertices);
    y += rowH + JOINT;
  }

  return { stones, counts, totalCount };
}

function _generateBond(polygon) {
  const { vertices } = polygon;
  const { minX, maxX, minY, maxY } = _bbox(vertices);

  const stones = [];
  const placed = [];
  const counts = {};
  let totalCount = 0;

  let y = minY;
  let prevRowH = -1;
  let rowIndex = 0;

  while (y < maxY) {
    const hOptions = ROW_HEIGHTS.filter(h => h !== prevRowH);
    const rowH = hOptions[Math.floor(Math.random() * hOptions.length)];
    prevRowH = rowH;

    // Running bond: offset every other row by a fixed 9" (half of 18" nominal stone length)
    const offset = rowIndex % 2 === 0 ? 0 : 9; // 9" = standard bond offset (half of 18" nominal)

    totalCount = fillRow(
      y, rowH, minX - offset, maxX,
      placed, stones, counts, totalCount, vertices
    );
    y += rowH + JOINT;
    rowIndex++;
  }

  return { stones, counts, totalCount };
}

function _generateBondV(polygon) {
  // Transpose coordinates (swap x↔y), run horizontal bond, then transpose back.
  // Transposing reverses the polygon winding order, so we reverse the vertex
  // array to restore CCW orientation expected by the Sutherland-Hodgman clipper.
  const transposed = {
    ...polygon,
    vertices: polygon.vertices.map(v => ({ x: v.y, y: v.x })).reverse(),
  };

  const layout = _generateBond(transposed);

  layout.stones = layout.stones.map(s => ({
    x: s.y, y: s.x, w: s.h, h: s.w,
    clipped: s.clipped,
    clipPath: s.clipPath ? s.clipPath.map(p => ({ x: p.y, y: p.x })) : null,
    cutW: s.cutH,
    cutH: s.cutW,
  }));

  return layout;
}
