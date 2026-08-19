import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';

const { buildLayout } = loadCore();

const model = () => ({
  type: 'blueprint',
  title: 'Onboarding',
  steps: [
    { id: 'discover', label: 'Discovers' },
    { id: 'signup', label: 'Signs up' },
    { id: 'pay', label: 'Pays' }
  ],
  lanes: [
    {
      id: 'actions', label: 'User actions', kind: 'cards',
      cells: [{ step: 'pay', text: 'Scans the QR code' }, { step: 'discover', text: 'Opens the link' }]
    },
    {
      id: 'backstage', label: 'Backstage', kind: 'cards',
      cells: [
        { step: 'signup', text: 'Validates CPF', ref: 'api/users.ts:88', span: 2 },
        { step: 'discover', text: 'No tracking', flag: 'gap', note: 'Nothing logs the visit' }
      ]
    }
  ],
  dividers: [{ after: 'actions', label: 'Line of interaction' }]
});

test('maps steps to columns in declaration order', () => {
  const layout = buildLayout(model());
  assert.deepEqual(layout.columns.map((column) => column.id), ['discover', 'signup', 'pay']);
});

test('sorts cells by column regardless of declaration order', () => {
  const layout = buildLayout(model());
  assert.deepEqual(layout.rows[0].cells.map((cell) => cell.step), ['discover', 'pay']);
});

test('resolves colStart as a 1-based column and defaults colSpan to 1', () => {
  const layout = buildLayout(model());
  const [opens, scans] = layout.rows[0].cells;
  assert.equal(opens.colStart, 1);
  assert.equal(opens.colSpan, 1);
  assert.equal(scans.colStart, 3);
});

test('carries span through as colSpan', () => {
  const layout = buildLayout(model());
  const validates = layout.rows[1].cells.find((cell) => cell.step === 'signup');
  assert.equal(validates.colStart, 2);
  assert.equal(validates.colSpan, 2);
});

test('carries ref, note, flag and pinned through untouched', () => {
  const layout = buildLayout(model());
  const gap = layout.rows[1].cells.find((cell) => cell.step === 'discover');
  assert.equal(gap.flag, 'gap');
  assert.equal(gap.note, 'Nothing logs the visit');
  const validates = layout.rows[1].cells.find((cell) => cell.step === 'signup');
  assert.equal(validates.ref, 'api/users.ts:88');
  assert.equal(validates.pinned, false);
});

test('gives every cell a stable lane:step key', () => {
  const layout = buildLayout(model());
  assert.equal(layout.rows[1].cells[0].key, 'backstage:discover');
});

test('resolves a divider to the index of the row it follows', () => {
  const layout = buildLayout(model());
  assert.deepEqual(layout.dividers, [{ afterRowIndex: 0, label: 'Line of interaction' }]);
});

test('keeps an emotion cell score and its label', () => {
  const data = model();
  data.type = 'journey';
  data.lanes.push({
    id: 'emotion', label: 'Emotion', kind: 'emotion',
    cells: [{ step: 'pay', score: -3, label: 'Anxious', flag: 'gap' }]
  });
  const row = buildLayout(data).rows[2];
  assert.equal(row.kind, 'emotion');
  assert.equal(row.cells[0].score, -3);
  assert.equal(row.cells[0].scoreLabel, 'Anxious');
});

test('returns empty rows for a lane with no cells', () => {
  const data = model();
  data.lanes[0].cells = [];
  assert.deepEqual(buildLayout(data).rows[0].cells, []);
});
