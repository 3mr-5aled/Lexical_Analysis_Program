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

test('parameterizes marker IDs with idPrefix and computes dynamic viewBox for wide graphs', () => {
  const wideGraph = {
    states: [
      { id: '0', label: '0', isStart: true },
      { id: '1', label: '1' },
      { id: '2', label: '2' },
      { id: '3', label: '3' },
      { id: '4', label: '4' },
      { id: '5', label: '5' },
      { id: '6', label: '6' },
      { id: '7', label: '7' },
      { id: '8', label: '8' },
      { id: '9', label: '9', isAccept: true }
    ],
    transitions: [
      { from: '0', to: '1', symbol: 'a' },
      { from: '1', to: '2', symbol: 'a' },
      { from: '2', to: '3', symbol: 'a' },
      { from: '3', to: '4', symbol: 'a' },
      { from: '4', to: '5', symbol: 'a' },
      { from: '5', to: '6', symbol: 'a' },
      { from: '6', to: '7', symbol: 'a' },
      { from: '7', to: '8', symbol: 'a' },
      { from: '8', to: '9', symbol: 'a' }
    ],
    startState: '0',
    acceptStates: ['9']
  };

  const svg = GraphRenderer.createSvgString(wideGraph, { idPrefix: 'test-nfa', isDark: true, width: 800 });
  assert.ok(svg.includes('id="arrow-test-nfa-dark"'));
  assert.ok(svg.includes('url(#arrow-test-nfa-dark)'));
  
  // ViewBox should have width >= 1000 to cover 10 layers
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) \d+"/);
  assert.ok(viewBoxMatch !== null);
  const vbWidth = parseInt(viewBoxMatch[1], 10);
  assert.ok(vbWidth >= 1000, `Expected viewBox width >= 1000, got ${vbWidth}`);
});

test('positions trap state on dedicated lower sink row centered horizontally', () => {
  const states = [
    { id: 'd0', label: 'd0' },
    { id: 'd1', label: 'd1' },
    { id: 'd2', label: 'd2' },
    { id: 'd3', label: 'd3' },
    { id: 'Φ', label: 'Φ' }
  ];
  const transitions = [
    { from: 'd0', to: 'd1', symbol: 'a' },
    { from: 'd1', to: 'd2', symbol: 'b' },
    { from: 'd1', to: 'd3', symbol: 'c' },
    { from: 'd0', to: 'Φ', symbol: 'b' },
    { from: 'd2', to: 'Φ', symbol: 'c' },
    { from: 'd3', to: 'Φ', symbol: 'b' },
    { from: 'Φ', to: 'Φ', symbol: 'a, b, c' }
  ];
  const positions = GraphRenderer.computeLayout(states, transitions, 'd0', 900, 450);
  const trapPos = positions.get('Φ');
  assert.ok(trapPos, 'Trap state Φ should exist in positions');
  assert.equal(trapPos.isTrap, true);

  const regularPositions = states.filter(s => s.id !== 'Φ').map(s => positions.get(s.id));
  const regularX = regularPositions.map(p => p.x);
  const regularY = regularPositions.map(p => p.y);

  const minX = Math.min(...regularX);
  const maxX = Math.max(...regularX);
  const maxY = Math.max(...regularY);

  const expectedX = (minX + maxX) / 2;
  assert.ok(Math.abs(trapPos.x - expectedX) < 5, `Expected trap x to be near ${expectedX}, got ${trapPos.x}`);
  assert.ok(trapPos.y >= maxY + 100, `Expected trap y >= ${maxY + 100}, got ${trapPos.y}`);
});

test('assigns distinct angular fan-in ports on trap state perimeter for incoming edges', () => {
  const graphModel = {
    states: [
      { id: 'd0', label: 'd0', isStart: true },
      { id: 'd1', label: 'd1' },
      { id: 'd2', label: 'd2' },
      { id: 'd3', label: 'd3' },
      { id: 'Φ', label: 'Φ' }
    ],
    transitions: [
      { from: 'd0', to: 'd1', symbol: 'a' },
      { from: 'd1', to: 'd2', symbol: 'b' },
      { from: 'd1', to: 'd3', symbol: 'c' },
      { from: 'd0', to: 'Φ', symbol: 'b' },
      { from: 'd1', to: 'Φ', symbol: 'a' },
      { from: 'd2', to: 'Φ', symbol: 'c' },
      { from: 'd3', to: 'Φ', symbol: 'b' },
      { from: 'Φ', to: 'Φ', symbol: 'a, b, c' }
    ],
    startState: 'd0',
    acceptStates: ['d2']
  };

  const svg = GraphRenderer.createSvgString(graphModel, { isDark: true, width: 900, height: 450 });
  const edgeRegex = /<g class="edge">\s*<path d="([^"]+)"[^>]*dead-arrow[^>]*\/>/g;
  const matches = [...svg.matchAll(edgeRegex)];
  assert.equal(matches.length, 4, `Expected 4 incoming edges to Φ, found ${matches.length}`);

  const endpoints = matches.map(m => {
    const d = m[1];
    const parts = d.trim().split(/\s+/);
    const ey = parseFloat(parts[parts.length - 1]);
    const ex = parseFloat(parts[parts.length - 2]);
    return { ex, ey };
  });

  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      const dist = Math.hypot(endpoints[i].ex - endpoints[j].ex, endpoints[i].ey - endpoints[j].ey);
      assert.ok(dist >= 8, `Endpoints ${i} and ${j} too close (${dist}px): (${endpoints[i].ex}, ${endpoints[i].ey}) vs (${endpoints[j].ex}, ${endpoints[j].ey})`);
    }
  }

  const positions = GraphRenderer.computeLayout(graphModel.states, graphModel.transitions, 'd0', 900, 450);
  const trapY = positions.get('Φ').y;
  for (const ep of endpoints) {
    assert.ok(ep.ey < trapY, `Expected endpoint ey (${ep.ey}) to be on upper perimeter (above trap y ${trapY})`);
  }
});


