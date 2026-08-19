'use strict';
/* Maintainer-only: regenerates examples/*.html from examples/src/*.json.
   Run from the repository root: node tools/build-examples.js */

const { readFileSync, writeFileSync, readdirSync } = require('node:fs');
const { join, basename } = require('node:path');

const ROOT = join(__dirname, '..');
const OPEN = '<script type="application/json" id="artifact">';
const CLOSE = '</script>';

/** Returns the template with its artifact block replaced by `data`. */
function buildExample(templateHtml, data) {
  const start = templateHtml.indexOf(OPEN);
  if (start === -1) throw new Error('No artifact block found in the template');
  const end = templateHtml.indexOf(CLOSE, start);
  if (end === -1) throw new Error('No closing </script> tag found for the artifact block');
  const json = JSON.stringify(data, null, 2).replace(/<\/script/gi, '<\\/script');
  return templateHtml.slice(0, start + OPEN.length) + '\n' + json + '\n' + templateHtml.slice(end);
}

function main() {
  const template = readFileSync(join(ROOT, 'template.html'), 'utf8');
  const sources = readdirSync(join(ROOT, 'examples', 'src')).filter((name) => name.endsWith('.json'));
  sources.forEach((name) => {
    const data = JSON.parse(readFileSync(join(ROOT, 'examples', 'src', name), 'utf8'));
    const target = join(ROOT, 'examples', basename(name, '.json') + '.html');
    writeFileSync(target, buildExample(template, data));
    process.stdout.write(`wrote ${target}\n`);
  });
}

if (require.main === module) main();
module.exports = { buildExample };
