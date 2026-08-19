import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCoreSource } from './helpers/load-core.mjs';

test('the realm bridge preserves undefined-valued keys', () => {
  const { probe } = loadCoreSource('function probe() { return { missing: undefined, present: "value" }; }');
  assert.deepStrictEqual(probe(), { missing: undefined, present: "value" });
});

test('the realm bridge preserves NaN', () => {
  const { probe } = loadCoreSource('function probe() { return { score: NaN, list: [1, 2] }; }');
  const result = probe();
  assert.ok(Number.isNaN(result.score));
  assert.deepStrictEqual(result.list, [1, 2]);
});

test('the realm bridge preserves Infinity', () => {
  const { probe } = loadCoreSource('function probe() { return { max: Infinity, min: -Infinity }; }');
  assert.deepStrictEqual(probe(), { max: Infinity, min: -Infinity });
});

test('the DOM guard rejects source containing document.', () => {
  assert.throws(
    () => loadCoreSource('function bad() { return document.body; }'),
    /must not touch the DOM/
  );
});

test('the DOM guard rejects source containing window.', () => {
  assert.throws(
    () => loadCoreSource('function bad() { return window.location; }'),
    /must not touch the DOM/
  );
});
