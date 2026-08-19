import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = join(here, '..', '..', 'template.html');

/**
 * Evaluates JavaScript source in an isolated vm context and returns realm-bridged functions.
 * Guards against DOM access and wraps function returns to fix cross-realm prototype mismatches.
 */
export function loadCoreSource(source) {
  if (/\bdocument\.|\bwindow\./.test(source)) {
    throw new Error('The core block must not touch the DOM');
  }
  const context = vm.createContext({ console });
  vm.runInContext(source, context, { filename: 'core' });

  // Wrap functions to rebuild their return values in this realm. Values built inside the vm
  // carry that realm's prototypes, which assert/strict's deepStrictEqual rejects. structuredClone
  // rebuilds them in this realm without JSON's lossiness (which drops undefined keys, NaNs, etc).
  const wrapped = {};
  for (const key in context) {
    if (typeof context[key] === 'function') {
      wrapped[key] = (...args) => {
        const result = context[key](...args);
        return structuredClone(result);
      };
    }
  }
  return wrapped;
}

/** Evaluates the <script id="core"> block of template.html in a fresh context. */
export function loadCore() {
  const html = readFileSync(TEMPLATE, 'utf8');
  const match = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('No <script id="core"> block found in template.html');
  return loadCoreSource(match[1]);
}
