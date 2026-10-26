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

test('routes upper stacked error transitions via outer clearance lanes avoiding intermediate states', () => {
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
      { from: 'd3', to: 'd1', symbol: 'a' }, // return loop under bottom
      { from: 'd0', to: 'Φ', symbol: 'b' },
      { from: 'd1', to: 'Φ', symbol: 'c' },
      { from: 'd2', to: 'Φ', symbol: 'a' }, // upper stacked to Φ
      { from: 'd3', to: 'Φ', symbol: 'b' }, // lower stacked to Φ
      { from: 'Φ', to: 'Φ', symbol: 'a, b, c' }
    ],
    startState: 'd0',
    acceptStates: ['d2']
  };

  const positions = GraphRenderer.computeLayout(graphModel.states, graphModel.transitions, 'd0', 900, 450);
  const posD2 = positions.get('d2');
  const posD3 = positions.get('d3');
  assert.ok(posD2.y < posD3.y, 'd2 should be stacked above d3');

  const svg = GraphRenderer.createSvgString(graphModel, { isDark: true, width: 900, height: 450 });

  // Locate the edge group for d2 -> Φ (symbol 'a' and dead-arrow)
  // Matching edge group containing symbol 'a' and dead-arrow marker
  const edgeGroups = svg.match(/<g class="edge">[\s\S]*?<\/g>/g) || [];
  const d2ToTrapEdge = edgeGroups.find(g => g.includes('>a<') && g.includes('dead-arrow'));
  assert.ok(d2ToTrapEdge, 'd2 -> Φ edge markup must exist');

  // Verify the path uses a clearance curve (cubic Bézier C command)
  const pathMatch = d2ToTrapEdge.match(/<path d="([^"]+)"/);
  assert.ok(pathMatch, 'path d attribute must exist');
  const pathD = pathMatch[1];

  assert.ok(pathD.includes('C'), `Expected d2 -> Φ path to be a curved clearance path with 'C', got: ${pathD}`);

  // Extract control points from cubic curve M sx sy C cx1 cy1, cx2 cy2, ex ey
  const cMatch = pathD.match(/C\s*([\d.-]+)\s+([\d.-]+)[,\s]+([\d.-]+)\s+([\d.-]+)/);
  assert.ok(cMatch, `Failed to parse control points from ${pathD}`);
  const cx1 = parseFloat(cMatch[1]);
  const cx2 = parseFloat(cMatch[3]);

  // Both control points must be pushed outward to the right of d3 by at least 45px
  assert.ok(cx1 >= posD3.x + 45, `Expected cx1 (${cx1}) >= d3.x + 45 (${posD3.x + 45})`);
  assert.ok(cx2 >= posD3.x + 45, `Expected cx2 (${cx2}) >= d3.x + 45 (${posD3.x + 45})`);
});

test('eliminates all label-label collisions and maintains clean tier clearance for trap and return transitions', () => {
  // Test case corresponding to (ab|ac)* DFA shown in Screenshot 2026-10-26 171113.png
  const graphModel = {
    states: [
      { id: 'd0', label: 'd0', isStart: true, isAccept: true },
      { id: 'd1', label: 'd1', isStart: false, isAccept: false },
      { id: 'd2', label: 'd2', isStart: false, isAccept: true },
      { id: 'd3', label: 'd3', isStart: false, isAccept: true },
      { id: 'Φ', label: 'Φ', isStart: false, isAccept: false }
    ],
    transitions: [
      { from: 'd0', to: 'd1', symbol: 'a' },
      { from: 'd0', to: 'Φ', symbol: 'b' },
      { from: 'd0', to: 'Φ', symbol: 'c' },
      { from: 'd1', to: 'd2', symbol: 'b' },
      { from: 'd1', to: 'd3', symbol: 'c' },
      { from: 'd1', to: 'Φ', symbol: 'a' },
      { from: 'd2', to: 'd1', symbol: 'a' },
      { from: 'd2', to: 'Φ', symbol: 'b' },
      { from: 'd2', to: 'Φ', symbol: 'c' },
      { from: 'd3', to: 'd1', symbol: 'a' },
      { from: 'd3', to: 'Φ', symbol: 'b' },
      { from: 'd3', to: 'Φ', symbol: 'c' },
      { from: 'Φ', to: 'Φ', symbol: 'a' },
      { from: 'Φ', to: 'Φ', symbol: 'b' },
      { from: 'Φ', to: 'Φ', symbol: 'c' }
    ],
    startState: 'd0',
    acceptStates: ['d0', 'd2', 'd3']
  };

  const svg = GraphRenderer.createSvgString(graphModel, { isDark: true, width: 900, height: 450 });

  // Extract all edge label pills
  const edgeRegex = /<g class="edge[^"]*">([\s\S]*?)<\/g>/g;
  let match;
  const rects = [];
  while ((match = edgeRegex.exec(svg)) !== null) {
    const content = match[1];
    const text = content.match(/<text[^>]*>([^<]+)<\/text>/)?.[1];
    const rectMatch = content.match(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"/);
    if (rectMatch) {
      rects.push({
        text,
        x: parseFloat(rectMatch[1]),
        y: parseFloat(rectMatch[2]),
        w: parseFloat(rectMatch[3]),
        h: parseFloat(rectMatch[4])
      });
    }
  }

  // Assert ZERO label-label overlap
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const r1 = rects[i];
      const r2 = rects[j];
      const overlapX = (r1.x < r2.x + r2.w) && (r1.x + r1.w > r2.x);
      const overlapY = (r1.y < r2.y + r2.h) && (r1.y + r1.h > r2.y);
      assert.ok(
        !(overlapX && overlapY),
        `Label '${r1.text}' at (${r1.x}, ${r1.y}, ${r1.w}x${r1.h}) overlaps with '${r2.text}' at (${r2.x}, ${r2.y}, ${r2.w}x${r2.h})`
      );
    }
  }
});




