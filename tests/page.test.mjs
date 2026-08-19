import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = readFileSync(join(root, 'index.html'), 'utf8');

test('the landing page pulls no subresource from another host', () => {
  // Links to GitHub are fine — they are navigation. What must never appear is a
  // script, stylesheet, image, font or frame loaded from somewhere else: the
  // page has to render from this repository alone, exactly like the artifacts do.
  const subresources = [...page.matchAll(/<(?:script|link|img|iframe|source)\b[^>]*?\b(?:src|href)="([^"]+)"/gi)]
    .map((match) => match[1])
    .filter((url) => !/^https:\/\/github\.com\//.test(url));

  const external = subresources.filter((url) => /^(?:https?:)?\/\//.test(url));
  assert.deepEqual(external, [], `external subresources: ${external.join(', ')}`);
});

test('every artifact the page embeds or links to exists in the repository', () => {
  const targets = [...page.matchAll(/(?:src|href)="((?:examples|template)[^"]*\.html)"/g)]
    .map((match) => match[1]);

  assert.ok(targets.length >= 2, 'the page should embed both example artifacts');
  targets.forEach((target) => {
    assert.ok(existsSync(join(root, target)), `${target} is referenced by index.html but missing`);
  });
});

test('the page embeds the artifacts as live files rather than screenshots', () => {
  // The whole argument of the page is that you are looking at the real output,
  // so a regression to <img> would quietly hollow it out.
  assert.match(page, /<iframe[^>]+examples\/blueprint-onboarding\.html/);
  assert.match(page, /<iframe[^>]+examples\/journey-onboarding\.html/);
  assert.doesNotMatch(page, /<img\b/i);
});
