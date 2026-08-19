import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';

const { sparklinePoints } = loadCore();

const box = { width: 300, height: 60 };
const cells = [
  { key: 'e:a', colStart: 1, score: 3, flag: '' },
  { key: 'e:b', colStart: 2, score: 0, flag: '' },
  { key: 'e:c', colStart: 3, score: -3, flag: 'gap' }
];

test('places each point at the horizontal centre of its column', () => {
  const points = sparklinePoints(cells, 3, box);
  assert.deepEqual(points.map((point) => point.x), [50, 150, 250]);
});

test('maps score +3 to the top, 0 to the middle and -3 to the bottom', () => {
  const points = sparklinePoints(cells, 3, box);
  assert.deepEqual(points.map((point) => point.y), [0, 30, 60]);
});

test('honours colStart when a column has no cell', () => {
  const sparse = [{ key: 'e:c', colStart: 3, score: 1, flag: '' }];
  assert.equal(sparklinePoints(sparse, 3, box)[0].x, 250);
});

test('carries score, flag and key through to the point', () => {
  const point = sparklinePoints(cells, 3, box)[2];
  assert.equal(point.score, -3);
  assert.equal(point.flag, 'gap');
  assert.equal(point.key, 'e:c');
});

test('orders points by column even when cells arrive unordered', () => {
  const shuffled = [cells[2], cells[0], cells[1]];
  assert.deepEqual(sparklinePoints(shuffled, 3, box).map((point) => point.x), [50, 150, 250]);
});

test('returns an empty array for no cells or a zero-column grid', () => {
  assert.deepEqual(sparklinePoints([], 3, box), []);
  assert.deepEqual(sparklinePoints(cells, 0, box), []);
});

test('rounds coordinates to two decimals to keep the SVG readable', () => {
  const points = sparklinePoints([{ key: 'e:a', colStart: 1, score: 1, flag: '' }], 7, box);
  assert.equal(points[0].x, 21.43);
});
