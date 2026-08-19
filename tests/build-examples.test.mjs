import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { createRequire } from 'node:module';
import { loadCore } from './helpers/load-core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
const { buildExample } = require(join(root, 'tools', 'build-examples.js'));
const { validateModel } = loadCore();

const template = readFileSync(join(root, 'template.html'), 'utf8');

// Discovered from examples/src/ rather than hardcoded, so a future third example
// can't be committed without this suite validating it and checking it's up to date.
const exampleNames = readdirSync(join(root, 'examples', 'src'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => basename(name, '.json'));

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
  exampleNames.forEach((name) => {
    const data = JSON.parse(readFileSync(join(root, 'examples', 'src', `${name}.json`), 'utf8'));
    const { ok, errors } = validateModel(data);
    assert.equal(ok, true, `${name}: ${errors.join(' | ')}`);
  });
});

test('the committed example HTML matches a fresh build', () => {
  exampleNames.forEach((name) => {
    const data = JSON.parse(readFileSync(join(root, 'examples', 'src', `${name}.json`), 'utf8'));
    const committed = readFileSync(join(root, 'examples', `${name}.html`), 'utf8');
    assert.equal(committed, buildExample(template, data), `${name} is stale — run node tools/build-examples.js`);
  });
});

test('the template ships with at least one committed example to validate', () => {
  assert.ok(exampleNames.length > 0, 'examples/src/ has no *.json sources');
});

test("the template's own default artifact block is a valid model", () => {
  const match = template.match(/<script type="application\/json" id="artifact">([\s\S]*?)<\/script>/);
  assert.ok(match, 'No <script type="application/json" id="artifact"> block found in template.html');
  const data = JSON.parse(match[1]);
  const { ok, errors } = validateModel(data);
  assert.equal(ok, true, `template.html's default artifact: ${errors.join(' | ')}`);
});
