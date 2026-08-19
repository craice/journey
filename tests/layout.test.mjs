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

const { collectFlags } = loadCore();

const flagged = () => ({
  type: 'blueprint',
  title: 'Onboarding',
  steps: [
    { id: 'discover', label: 'Discovers' },
    { id: 'signup', label: 'Signs up' },
    { id: 'pay', label: 'Pays' }
  ],
  lanes: [
    {
      id: 'front', label: 'Frontstage', kind: 'cards',
      cells: [
        { step: 'pay', text: 'No error state', flag: 'gap', note: 'Webhook failure is silent' },
        { step: 'discover', text: 'Landing page', ref: 'app/page.tsx' }
      ]
    },
    {
      id: 'back', label: 'Backstage', kind: 'cards',
      cells: [{ step: 'signup', text: 'Empty catch', flag: 'risk' }]
    }
  ]
});

test('counts gaps and risks separately', () => {
  const summary = collectFlags(buildLayout(flagged()));
  assert.deepEqual(summary.counts, { gap: 1, risk: 1 });
});

test('lists only flagged cells, with lane and step labels resolved', () => {
  const summary = collectFlags(buildLayout(flagged()));
  assert.equal(summary.items.length, 2);
  assert.deepEqual(summary.items[0], {
    key: 'back:signup',
    flag: 'risk',
    laneLabel: 'Backstage',
    stepLabel: 'Signs up',
    text: 'Empty catch',
    note: ''
  });
});

test('orders items left to right, then top to bottom', () => {
  const summary = collectFlags(buildLayout(flagged()));
  assert.deepEqual(summary.items.map((item) => item.key), ['back:signup', 'front:pay']);
});

test('reports zero counts and no items when nothing is flagged', () => {
  const data = flagged();
  data.lanes.forEach((lane) => lane.cells.forEach((cell) => { delete cell.flag; }));
  const summary = collectFlags(buildLayout(data));
  assert.deepEqual(summary, { counts: { gap: 0, risk: 0 }, items: [] });
});

test('includes flagged emotion cells using their score label as text', () => {
  const data = flagged();
  data.lanes.push({
    id: 'emotion', label: 'Emotion', kind: 'emotion',
    cells: [{ step: 'pay', score: -3, label: 'Anxious', flag: 'gap' }]
  });
  const summary = collectFlags(buildLayout(data));
  const item = summary.items.find((entry) => entry.key === 'emotion:pay');
  assert.equal(item.text, 'Anxious');
  assert.equal(summary.counts.gap, 2);
});

test('formats score as text when flagged emotion cell has no label', () => {
  const data = flagged();
  data.lanes.push({
    id: 'emotion', label: 'Emotion', kind: 'emotion',
    cells: [{ step: 'pay', score: -3, flag: 'gap' }]
  });
  const summary = collectFlags(buildLayout(data));
  const item = summary.items.find((entry) => entry.key === 'emotion:pay');
  assert.equal(item.text, '-3');
});

test('formats zero score as text when flagged emotion cell has no label', () => {
  const data = flagged();
  data.lanes.push({
    id: 'emotion', label: 'Emotion', kind: 'emotion',
    cells: [{ step: 'pay', score: 0, flag: 'gap' }]
  });
  const summary = collectFlags(buildLayout(data));
  const item = summary.items.find((entry) => entry.key === 'emotion:pay');
  assert.equal(item.text, '0');
});

test('orders items by row when in the same column', () => {
  // Create data with two flagged cells in the same column
  const data = {
    type: 'blueprint',
    title: 'Test',
    steps: [
      { id: 'step1', label: 'Step 1' },
      { id: 'step2', label: 'Step 2' }
    ],
    lanes: [
      {
        id: 'lane1', label: 'Lane 1', kind: 'cards',
        cells: [{ step: 'step1', text: 'First', flag: 'gap' }]
      },
      {
        id: 'lane2', label: 'Lane 2', kind: 'cards',
        cells: [{ step: 'step1', text: 'Second', flag: 'risk' }]
      }
    ]
  };
  const summary = collectFlags(buildLayout(data));
  // Both items are in step1 (column 1), so row order should determine the order
  assert.deepEqual(summary.items.map((item) => item.key), ['lane1:step1', 'lane2:step1']);
});
