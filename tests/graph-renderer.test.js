import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphRenderer } from '../js/graph-renderer.js';

test('creates valid SVG markup with nodes, arrows, and double circles', () => {
  const graphModel = {
    states: [
      { id: 'd0', label: 'd0', isStart: true, isAccept: false },
      { id: 'd1', label: 'd1', isStart: false, isAccept: true }
    ],
    transitions: [
      { from: 'd0', to: 'd1', symbol: 'a' },
      { from: 'd1', to: 'd1', symbol: 'b' } // self loop
    ],
    startState: 'd0',
    acceptStates: ['d1']
  };

  const svgString = GraphRenderer.createSvgString(graphModel, { isDark: true, width: 800, height: 400 });
  
  assert.ok(svgString.includes('<svg'));
  assert.ok(svgString.includes('</svg>'));
  assert.ok(svgString.includes('d0'));
  assert.ok(svgString.includes('d1'));
  // Contains arrow marker definition
  assert.ok(svgString.includes('<marker id="arrow'));
  // Contains double circle for accept state d1
  assert.ok(svgString.includes('class="accept-inner"'));
  // Contains transition label 'a' and 'b'
  assert.ok(svgString.includes('>a<'));
  assert.ok(svgString.includes('>b<'));
});

test('handles self-loops and bidirectional edges without throwing', () => {
  const graphModel = {
    states: [
      { id: '0', label: '0', isStart: true, isAccept: false },
      { id: '1', label: '1', isStart: false, isAccept: true }
    ],
    transitions: [
      { from: '0', to: '1', symbol: 'a' },
      { from: '1', to: '0', symbol: 'b' }, // reverse
      { from: '0', to: '0', symbol: 'c' }  // loop
    ],
    startState: '0',
    acceptStates: ['1']
  };

  const svgString = GraphRenderer.createSvgString(graphModel, { isDark: false });
  assert.ok(svgString.length > 500);
});
