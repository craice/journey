import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { loadCore } from './helpers/load-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
const { buildExample } = require(join(root, 'tools', 'build-examples.js'));
const { validateModel } = loadCore();

const template = readFileSync(join(root, 'template.html'), 'utf8');

test('replaces the artifact block with the given JSON', () => {
  const data = { type: 'blueprint', title: 'Replaced' };
  const html = buildExample(template, data);
  assert.match(html, /"title": "Replaced"/);
  assert.equal(html.match(/<script type="application\/json" id="artifact">/g).length, 1);
});

test('keeps the core and ui blocks intact', () => {
  const html = buildExample(template, { type: 'blueprint', title: 'X' });
  assert.match(html, /<script id="core">/);
  assert.match(html, /<script id="ui">/);
});

test('escapes any closing script tag hidden in the data', () => {
  const html = buildExample(template, { type: 'blueprint', title: '</script><b>x' });
  assert.doesNotMatch(html, /<\/script><b>x/);
});

test('every committed example source is a valid model', () => {
  ['blueprint-onboarding', 'journey-onboarding'].forEach((name) => {
    const data = JSON.parse(readFileSync(join(root, 'examples', 'src', `${name}.json`), 'utf8'));
    const { ok, errors } = validateModel(data);
    assert.equal(ok, true, `${name}: ${errors.join(' | ')}`);
  });
});

test('the committed example HTML matches a fresh build', () => {
  ['blueprint-onboarding', 'journey-onboarding'].forEach((name) => {
    const data = JSON.parse(readFileSync(join(root, 'examples', 'src', `${name}.json`), 'utf8'));
    const committed = readFileSync(join(root, 'examples', `${name}.html`), 'utf8');
    assert.equal(committed, buildExample(template, data), `${name} is stale — run node tools/build-examples.js`);
  });
});
