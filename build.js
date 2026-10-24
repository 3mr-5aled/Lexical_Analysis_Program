// build.js - Bundles the modular automata scripts into a single standalone js/bundle.js
// so index.html works directly via file:// double-click in all browsers without CORS restrictions.
import fs from 'node:fs';
import path from 'node:path';

const files = [
  'regex-parser.js',
  'thompson.js',
  'subset-construction.js',
  'hopcroft-minimization.js',
  'string-simulator.js',
  'graph-renderer.js',
  'app.js'
];

let bundleContent = '/* Auto-generated bundle for standalone offline execution (file:// protocol) */\n';
bundleContent += '(function() {\n"use strict";\n\n';

for (const file of files) {
  const filePath = path.join('js', file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove import statements
  content = content.replace(/^import\s+.*?;?\s*$/gm, '');
  
  // Remove export keywords (e.g., 'export class X' -> 'class X', 'export default' -> '')
  content = content.replace(/^export\s+default\s+/gm, '');
  content = content.replace(/^export\s+/gm, '');
  
  bundleContent += `// ===== Source: ${file} =====\n`;
  bundleContent += content + '\n\n';
}

bundleContent += '})();\n';

fs.writeFileSync(path.join('js', 'bundle.js'), bundleContent, 'utf-8');
console.log('Successfully created js/bundle.js');
