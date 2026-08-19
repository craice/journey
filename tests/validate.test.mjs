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

test('the loader preserves undefined-valued keys across the realm boundary', () => {
  const model = minimal();
  model.title = undefined;
  const { ok, errors } = validateModel(model);
  assert.equal(ok, false);
  assert.match(errors[0], /title/);
});
