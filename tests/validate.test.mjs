import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';

const { validateModel } = loadCore();

const minimal = () => ({
  type: 'blueprint',
  title: 'Onboarding',
  steps: [{ id: 'discover', label: 'Discovers' }],
  lanes: [{ id: 'actions', label: 'User actions', kind: 'cards', cells: [] }]
});

test('accepts a minimal blueprint', () => {
  assert.deepEqual(validateModel(minimal()), { ok: true, errors: [] });
});

test('rejects a non-object model', () => {
  assert.equal(validateModel(null).ok, false);
  assert.match(validateModel(null).errors[0], /object/i);
});

test('rejects an unknown type and names the allowed ones', () => {
  const model = { ...minimal(), type: 'flow' };
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /"flow"/);
  assert.match(errors[0], /blueprint/);
  assert.match(errors[0], /journey/);
});

test('requires a non-empty title', () => {
  assert.equal(validateModel({ ...minimal(), title: '  ' }).ok, false);
});

test('requires at least one step and one lane', () => {
  assert.equal(validateModel({ ...minimal(), steps: [] }).ok, false);
  assert.equal(validateModel({ ...minimal(), lanes: [] }).ok, false);
});

test('rejects duplicate step ids', () => {
  const model = minimal();
  model.steps = [{ id: 'a', label: 'A' }, { id: 'a', label: 'A again' }];
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /duplicate step id "a"/i);
});

test('rejects duplicate lane ids', () => {
  const model = minimal();
  model.lanes = [
    { id: 'x', label: 'X', kind: 'cards', cells: [] },
    { id: 'x', label: 'X2', kind: 'cards', cells: [] }
  ];
  assert.equal(validateModel(model).ok, false);
});

test('rejects an unknown lane kind', () => {
  const model = minimal();
  model.lanes[0].kind = 'chart';
  assert.match(validateModel(model).errors[0], /kind "chart"/i);
});

test('collects every error rather than stopping at the first', () => {
  const { errors } = validateModel({ type: 'flow', title: '', steps: [], lanes: [] });
  assert.ok(errors.length >= 4, `expected several errors, got ${errors.length}`);
});

test('rejects undefined title', () => {
  const model = minimal();
  model.title = undefined;
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /title/);
});

const threeSteps = () => ({
  type: 'blueprint',
  title: 'Onboarding',
  steps: [
    { id: 'discover', label: 'Discovers' },
    { id: 'signup', label: 'Signs up' },
    { id: 'pay', label: 'Pays' }
  ],
  lanes: [{ id: 'backstage', label: 'Backstage', kind: 'cards', cells: [] }]
});

test('rejects a null cell instead of throwing', () => {
  const model = threeSteps();
  model.lanes[0].cells = [null];
  assert.doesNotThrow(() => validateModel(model));
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /must be an object/i);
});

test('rejects a non-object cell (string, number, array) instead of throwing', () => {
  [['not an object'], [42], [['array', 'is', 'not', 'an', 'object']]].forEach((cells) => {
    const model = threeSteps();
    model.lanes[0].cells = cells;
    assert.doesNotThrow(() => validateModel(model));
    assert.equal(validateModel(model).ok, false);
  });
});

test('rejects a cell pointing at an unknown step', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'checkout', text: 'Charges the card' }];
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /Unknown step "checkout" in lane "backstage"/);
});

test('requires text on a cards cell', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'signup', ref: 'api/users.ts:88' }];
  assert.match(validateModel(model).errors[0], /needs "text"/i);
});

test('rejects an unknown flag value', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'signup', text: 'Validates CPF', flag: 'todo' }];
  assert.match(validateModel(model).errors[0], /flag "todo"/i);
});

test('accepts gap and risk flags', () => {
  const model = threeSteps();
  model.lanes[0].cells = [
    { step: 'signup', text: 'No error state', flag: 'gap' },
    { step: 'pay', text: 'Empty catch', flag: 'risk' }
  ];
  assert.equal(validateModel(model).ok, true);
});

test('rejects a span running past the last step', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'signup', text: 'Long process', span: 3 }];
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /span/i);
});

test('rejects overlapping cells in the same lane', () => {
  const model = threeSteps();
  model.lanes[0].cells = [
    { step: 'discover', text: 'Spans two', span: 2 },
    { step: 'signup', text: 'Collides' }
  ];
  assert.match(validateModel(model).errors[0], /overlap/i);
});

test('allows the same step in different lanes', () => {
  const model = threeSteps();
  model.lanes.push({ id: 'front', label: 'Frontstage', kind: 'cards', cells: [] });
  model.lanes[0].cells = [{ step: 'signup', text: 'Validates CPF' }];
  model.lanes[1].cells = [{ step: 'signup', text: 'Shows the form' }];
  assert.equal(validateModel(model).ok, true);
});

test('rejects an emotion score outside -3..3 or non-integer', () => {
  const model = threeSteps();
  model.lanes[0] = {
    id: 'emotion', label: 'Emotion', kind: 'emotion',
    cells: [{ step: 'signup', score: 5 }]
  };
  assert.match(validateModel(model).errors[0], /score/i);

  model.lanes[0].cells = [{ step: 'signup', score: 1.5 }];
  assert.match(validateModel(model).errors[0], /score/i);
});

test('requires a journey to carry exactly one emotion lane', () => {
  const model = threeSteps();
  model.type = 'journey';
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /journey.*emotion lane/i);
});

test('rejects more than one emotion lane', () => {
  const model = threeSteps();
  model.lanes = [
    { id: 'e1', label: 'Emotion', kind: 'emotion', cells: [] },
    { id: 'e2', label: 'Mood', kind: 'emotion', cells: [] }
  ];
  assert.match(validateModel(model).errors[0], /one emotion lane/i);
});

test('rejects a divider pointing at an unknown lane', () => {
  const model = threeSteps();
  model.dividers = [{ after: 'frontstage', label: 'Line of interaction' }];
  assert.match(validateModel(model).errors[0], /Unknown lane "frontstage"/);
});

test('reports multiple overlaps in the same lane', () => {
  const model = threeSteps();
  model.lanes[0].cells = [
    { step: 'discover', text: 'A' },
    { step: 'discover', text: 'B', span: 2 },
    { step: 'signup', text: 'C' }
  ];
  const { errors } = validateModel(model);
  const overlapErrors = errors.filter(e => e.includes('overlap'));
  assert.ok(overlapErrors.length >= 2, `expected at least 2 overlap errors, got ${overlapErrors.length}`);
});

test('reports both unknown step and invalid flag in the same cell', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'unknown', text: 'Bad', flag: 'invalid' }];
  const { errors } = validateModel(model);
  const stepErrors = errors.filter(e => e.includes('Unknown step'));
  const flagErrors = errors.filter(e => e.includes('flag'));
  assert.ok(stepErrors.length > 0, 'expected step error');
  assert.ok(flagErrors.length > 0, 'expected flag error');
});

test('reports both out-of-bounds span and invalid flag in the same cell', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'signup', text: 'Bad', span: 10, flag: 'invalid' }];
  const { errors } = validateModel(model);
  const spanErrors = errors.filter(e => e.includes('span') && e.includes('past'));
  const flagErrors = errors.filter(e => e.includes('flag'));
  assert.ok(spanErrors.length > 0, 'expected span error');
  assert.ok(flagErrors.length > 0, 'expected flag error');
});

test('accepts a route on a cards cell', () => {
  const model = threeSteps();
  model.lanes[0].cells = [{ step: 'signup', text: 'Signup form', route: '/signup' }];
  assert.equal(validateModel(model).ok, true);
});
