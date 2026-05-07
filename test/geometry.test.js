// test/geometry.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  polygonArea, polygonPerimeter, pointInPolygon,
  segmentsIntersect, clipPolygonToPolygon,
  filletCorner, dist
} from '../src/geometry.js';

const square = [{x:0,y:0},{x:12,y:0},{x:12,y:12},{x:0,y:12}];

test('polygonArea: square 12x12', () => assert.equal(polygonArea(square), 144));
test('polygonArea: rectangle', () => {
  const r = [{x:0,y:0},{x:24,y:0},{x:24,y:18},{x:0,y:18}];
  assert.equal(polygonArea(r), 432);
});
test('polygonPerimeter: square', () => assert.equal(polygonPerimeter(square), 48));

test('pointInPolygon: center inside', () => assert.ok(pointInPolygon({x:6,y:6}, square)));
test('pointInPolygon: outside', () => assert.ok(!pointInPolygon({x:20,y:20}, square)));

test('segmentsIntersect: crossing', () => {
  assert.ok(segmentsIntersect({x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}));
});
test('segmentsIntersect: parallel', () => {
  assert.ok(!segmentsIntersect({x:0,y:0},{x:10,y:0},{x:0,y:5},{x:10,y:5}));
});

test('clipPolygonToPolygon: rect fully inside', () => {
  const inner = [{x:2,y:2},{x:10,y:2},{x:10,y:10},{x:2,y:10}];
  const result = clipPolygonToPolygon(inner, square);
  assert.ok(result.length >= 4);
  // area should equal inner polygon area
  assert.ok(Math.abs(polygonArea(result) - polygonArea(inner)) < 0.01);
});
test('clipPolygonToPolygon: rect half outside', () => {
  const half = [{x:6,y:0},{x:18,y:0},{x:18,y:12},{x:6,y:12}];
  const result = clipPolygonToPolygon(half, square);
  assert.ok(Math.abs(polygonArea(result) - 72) < 0.01);
});

test('dist: pythagorean', () => assert.equal(dist({x:0,y:0},{x:3,y:4}), 5));
