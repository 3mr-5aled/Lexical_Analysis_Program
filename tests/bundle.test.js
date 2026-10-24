import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('js/bundle.js exists and is a valid standalone self-executing bundle', () => {
  const bundlePath = path.join('js', 'bundle.js');
  assert.ok(fs.existsSync(bundlePath), 'js/bundle.js must exist');
  
  const content = fs.readFileSync(bundlePath, 'utf-8');
  assert.ok(content.length > 5000, 'js/bundle.js must have content');
  
  // Must contain all core classes
  assert.ok(content.includes('class RegexParser'));
  assert.ok(content.includes('class Thompson'));
  assert.ok(content.includes('class SubsetConstruction'));
  assert.ok(content.includes('class HopcroftMinimizer'));
  assert.ok(content.includes('class StringSimulator'));
  assert.ok(content.includes('class GraphRenderer'));
  assert.ok(content.includes('class AutomataApp'));
  
  // Must NOT have unbundled ES module imports/exports that trigger CORS on file://
  assert.ok(!/^import\s+/m.test(content), 'bundle.js must not contain import statements');
  assert.ok(!/^export\s+/m.test(content), 'bundle.js must not contain export statements');
});
