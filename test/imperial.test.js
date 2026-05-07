// test/imperial.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIn, formatIn, toMetric, fromMetric } from '../src/imperial.js';

test('parseIn: feet only', () => assert.equal(parseIn("12'"), 144));
test('parseIn: inches only', () => assert.equal(parseIn('6"'), 6));
test('parseIn: feet and inches', () => assert.equal(parseIn("12' 6\""), 150));
test('parseIn: feet inches fraction', () => assert.equal(parseIn("12' 6 3/4\""), 150.75));
test('parseIn: fraction only', () => assert.equal(parseIn('3/4"'), 0.75));
test('parseIn: inches and fraction no feet', () => assert.equal(parseIn('6 3/4"'), 6.75));
test('parseIn: no quotes needed', () => assert.equal(parseIn('18'), 18));
test('parseIn: rejects negative', () => assert.throws(() => parseIn('-1')));

test('formatIn: whole feet', () => assert.equal(formatIn(144), "12' 0\""));
test('formatIn: feet and inches', () => assert.equal(formatIn(150), "12' 6\""));
test('formatIn: with fraction', () => assert.equal(formatIn(150.75), "12' 6 3/4\""));
test('formatIn: inches only', () => assert.equal(formatIn(6), '6"'));
test('formatIn: fraction only', () => assert.equal(formatIn(0.5), '1/2"'));

test('toMetric: inches to cm', () => assert.equal(toMetric(12), 30.48));
test('fromMetric: cm to inches', () => assert.equal(parseFloat(fromMetric(30.48).toFixed(4)), 12));
