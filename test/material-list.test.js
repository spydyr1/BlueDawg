// test/material-list.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMaterialList } from '../src/material-list.js';

test('buildMaterialList: counts full stones correctly', () => {
  const layout = {
    stones: [
      { x:0, y:0, w:18, h:24, clipped:false, clipPath:null, cutW:null, cutH:null },
      { x:18, y:0, w:18, h:24, clipped:false, clipPath:null, cutW:null, cutH:null },
      { x:36, y:0, w:12, h:18, clipped:false, clipPath:null, cutW:null, cutH:null },
    ],
    counts: { '18x24': 2, '12x18': 1 },
    totalCount: 3,
  };
  const list = buildMaterialList(layout);
  assert.equal(list.fullStones.find(s => s.size === '18x24').qty, 2);
  assert.equal(list.fullStones.find(s => s.size === '12x18').qty, 1);
  assert.equal(list.total.qty, 3);
});

test('buildMaterialList: cut stones appear in cut notes', () => {
  const layout = {
    stones: [
      { x:0, y:0, w:24, h:36, clipped:true,
        clipPath:[{x:0,y:0},{x:20,y:0},{x:20,y:36},{x:0,y:36}],
        cutW:20, cutH:36 },
    ],
    counts: { '24x36': 1 },
    totalCount: 1,
  };
  const list = buildMaterialList(layout);
  assert.equal(list.cutNotes.length, 1);
  assert.equal(list.cutNotes[0].orderSize, '24x36');
  // cutW=20" → formatIn(20) = "1' 8\"", cutH=36" → formatIn(36) = "3' 0\""
  assert.ok(list.cutNotes[0].cutDesc.includes("1' 8"));
});

test('buildMaterialList: total sqft correct', () => {
  const layout = {
    stones: [
      { x:0, y:0, w:24, h:24, clipped:false, clipPath:null, cutW:null, cutH:null },
    ],
    counts: { '24x24': 1 },
    totalCount: 1,
  };
  const list = buildMaterialList(layout);
  // 24x24 = 576 sq in = 4 sq ft
  assert.equal(list.total.sqft, 4);
});

test('buildMaterialList: consolidates duplicate cut notes', () => {
  const layout = {
    stones: [
      { x:0, y:0, w:24, h:36, clipped:true,
        clipPath:[{x:0,y:0},{x:20,y:0},{x:20,y:36},{x:0,y:36}],
        cutW:20, cutH:36 },
      { x:24, y:0, w:24, h:36, clipped:true,
        clipPath:[{x:24,y:0},{x:44,y:0},{x:44,y:36},{x:24,y:36}],
        cutW:20, cutH:36 },
    ],
    counts: { '24x36': 2 },
    totalCount: 2,
  };
  const list = buildMaterialList(layout);
  assert.equal(list.cutNotes.length, 1);
  assert.equal(list.cutNotes[0].qty, 2);
});
