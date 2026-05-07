// test/layout-engine.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SIZES,
  checkNoFourCorners,
  checkSeamLength,
  checkContinuousSeam,
  generateLayout,
} from '../src/layout-engine.js';

// ─── SIZES ──────────────────────────────────────────────────────────────────

test('SIZES has 11 entries', () => assert.equal(SIZES.length, 11));

test('SIZES excludes 12x12', () => {
  assert.ok(!SIZES.some(s => s.w === 12 && s.h === 12));
});

test('SIZES max dimension 36"', () => {
  SIZES.forEach(s => {
    assert.ok(s.w <= 36 && s.h <= 36, `${s.w}x${s.h} exceeds 36"`);
  });
});

test('SIZES one dimension <= 24"', () => {
  SIZES.forEach(s => {
    assert.ok(
      Math.min(s.w, s.h) <= 24,
      `${s.w}x${s.h} — min dimension > 24"`
    );
  });
});

test('SIZES all dimensions multiples of 6', () => {
  SIZES.forEach(s => {
    assert.ok(s.w % 6 === 0 && s.h % 6 === 0, `${s.w}x${s.h} not on 6" grid`);
  });
});

test('SIZES minimum dimension >= 12"', () => {
  SIZES.forEach(s => {
    assert.ok(s.w >= 12 && s.h >= 12, `${s.w}x${s.h} — dimension < 12"`);
  });
});

// ─── checkNoFourCorners ──────────────────────────────────────────────────────

test('checkNoFourCorners: detects 4-corner violation', () => {
  // Three stones already share the point (12,12); adding a 4th creates violation
  const placed = [
    { x: 0,  y: 0,  w: 12, h: 12 },
    { x: 12, y: 0,  w: 18, h: 12 },
    { x: 0,  y: 12, w: 12, h: 18 },
  ];
  const candidate = { x: 12, y: 12, w: 18, h: 18 };
  assert.ok(!checkNoFourCorners(placed, candidate));
});

test('checkNoFourCorners: no violation with staggered stones', () => {
  const placed = [{ x: 0, y: 0, w: 18, h: 12 }];
  const candidate = { x: 18, y: 0, w: 18, h: 12 };
  assert.ok(checkNoFourCorners(placed, candidate));
});

test('checkNoFourCorners: empty placed list always passes', () => {
  assert.ok(checkNoFourCorners([], { x: 0, y: 0, w: 18, h: 12 }));
});

// ─── checkSeamLength ─────────────────────────────────────────────────────────

test('checkSeamLength: detects horizontal seam > 60"', () => {
  // A wide stone below the candidate creates a shared seam line
  const placed = [{ x: 0, y: 0, w: 72, h: 12 }];
  // candidate top edge at y=12 (same as placed bottom edge) — seam spans 72"
  const candidate = { x: 0, y: 12, w: 36, h: 18 };
  assert.ok(!checkSeamLength(placed, candidate, 60));
});

test('checkSeamLength: seam exactly 60" is OK', () => {
  const placed = [{ x: 0, y: 0, w: 30, h: 12 }];
  const candidate = { x: 30, y: 0, w: 30, h: 12 };
  // seam at y=12 spans 60" total — acceptable
  assert.ok(checkSeamLength(placed, candidate, 60));
});

test('checkSeamLength: isolated stone always passes', () => {
  assert.ok(checkSeamLength([], { x: 0, y: 0, w: 36, h: 12 }));
});

// ─── checkContinuousSeam ─────────────────────────────────────────────────────

test('checkContinuousSeam: returns true for empty placed', () => {
  assert.ok(checkContinuousSeam([], { x: 0, y: 0, w: 18, h: 12 }));
});

test('checkContinuousSeam: single prior stone always passes', () => {
  const placed = [{ x: 0, y: 0, w: 18, h: 12 }];
  // candidate's left edge aligns with placed right edge (x=18)
  const candidate = { x: 0, y: 12, w: 18, h: 18 };
  assert.ok(checkContinuousSeam(placed, candidate));
});

// ─── generateLayout ──────────────────────────────────────────────────────────

const simplePoly = {
  vertices: [
    { x: 0, y: 0 }, { x: 120, y: 0 },
    { x: 120, y: 96 }, { x: 0, y: 96 },
  ],
};

test('generateLayout random: returns stones array', () => {
  const layout = generateLayout(simplePoly, 'random');
  assert.ok(Array.isArray(layout.stones));
  assert.ok(layout.stones.length > 0);
});

test('generateLayout random: totalCount matches stones length', () => {
  const layout = generateLayout(simplePoly, 'random');
  assert.equal(layout.stones.length, layout.totalCount);
});

test('generateLayout random: each stone has required fields', () => {
  const layout = generateLayout(simplePoly, 'random');
  for (const s of layout.stones) {
    assert.ok(typeof s.x === 'number', 'missing x');
    assert.ok(typeof s.y === 'number', 'missing y');
    assert.ok(typeof s.w === 'number', 'missing w');
    assert.ok(typeof s.h === 'number', 'missing h');
    assert.ok(typeof s.clipped === 'boolean', 'missing clipped');
  }
});

test('generateLayout random: no single size > 20% of total (with margin)', () => {
  const layout = generateLayout(simplePoly, 'random');
  if (layout.totalCount >= 10) {
    const max = Math.max(...Object.values(layout.counts));
    assert.ok(
      max / layout.totalCount <= 0.25,
      `size overrepresented: ${max}/${layout.totalCount}`
    );
  }
});

test('generateLayout random: all stone dimensions are valid', () => {
  const layout = generateLayout(simplePoly, 'random');
  const validDims = new Set([12, 18, 24, 30, 36]);
  for (const s of layout.stones) {
    assert.ok(validDims.has(s.w), `invalid width ${s.w}`);
    assert.ok(validDims.has(s.h), `invalid height ${s.h}`);
    assert.ok(Math.min(s.w, s.h) <= 24, `min dim > 24": ${s.w}x${s.h}`);
  }
});

test('generateLayout random: counts keys match canonical format', () => {
  const layout = generateLayout(simplePoly, 'random');
  const keyRe = /^\d+x\d+$/;
  for (const key of Object.keys(layout.counts)) {
    assert.ok(keyRe.test(key), `invalid key format: ${key}`);
  }
});

test('generateLayout bond-h: returns stones', () => {
  const layout = generateLayout(simplePoly, 'bond-h');
  assert.ok(layout.stones.length > 0);
});

test('generateLayout bond-v: returns stones', () => {
  const layout = generateLayout(simplePoly, 'bond-v');
  assert.ok(layout.stones.length > 0);
});

test('generateLayout: L-shaped polygon returns stones', () => {
  const lShape = {
    vertices: [
      { x: 0,  y: 0  }, { x: 72, y: 0  }, { x: 72, y: 48 },
      { x: 36, y: 48 }, { x: 36, y: 96 }, { x: 0,  y: 96 },
    ],
  };
  const layout = generateLayout(lShape, 'random');
  assert.ok(layout.stones.length > 0);
});

test('generateLayout: clipped stones have clipPath', () => {
  const layout = generateLayout(simplePoly, 'random');
  for (const s of layout.stones) {
    if (s.clipped) {
      assert.ok(Array.isArray(s.clipPath), 'clipped stone missing clipPath');
      assert.ok(s.clipPath.length >= 3, 'clipPath too short');
    } else {
      assert.ok(s.clipPath === null, 'unclipped stone should have null clipPath');
    }
  }
});
