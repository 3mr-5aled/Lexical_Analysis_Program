/**
 * GraphRenderer
 * High-performance standalone SVG directed graph layout and renderer for finite state automata.
 * Visual design matches interactive_dfa_studio_c_lexical_analyzer:
 * - Crisp state circles with color-coded semantic types (Start: Sky Blue, Accept: Emerald Double-Circle, Dead/Trap: Rose, Regular: Slate)
 * - Prominent, bold directed transition paths (3.2px) with distinct arrowhead markers
 * - Sleek rounded transition label pills with drop shadows and JetBrains Mono typography
 * - High-arch cubic Bezier self-loops
 * - Fully distinct opposing bidirectional transitions (two separate independent curves with individual arrows and labels)
 * - Concentric obstacle-avoiding edge routing:
 *     * Multi-layer feedback loops arch cleanly OVER THE TOP of intermediate states
 *     * Multi-layer forward bypass edges arch cleanly UNDER THE BOTTOM of intermediate states
 *     * Straight horizontal/diagonal lines for adjacent steps with zero overlay
 * - Prominent "start" indicator arrow
 * - Canvas radial dot-grid background
 * - Pure visualizer (cannot be edited): interactive pan & zoom without altering layout
 */
export class GraphRenderer {
  /**
   * Computes layout coordinates (x, y) for each state in the graph.
   * Uses DAG longest-path layering with cycle back-edge detection and
   * barycentric sorting to maintain clean parallel tracks without line crossings.
   * @param {Array<{id: string, isStart?: boolean, isAccept?: boolean}>} states
   * @param {Array<{from: string, to: string, symbol: string}>} transitions
   * @param {string} startStateId
   * @param {number} width
   * @param {number} height
   * @returns {Map<string, {x: number, y: number, layer: number}>}
   */
  static computeLayout(states, transitions, startStateId, width = 900, height = 450) {
    if (!states || states.length === 0) return new Map();

    const isTrapState = (id) => id === 'Φ' || id === 'trap' || id.toLowerCase().includes('trap') || id.toLowerCase().includes('dead');
    const regularStates = states.filter(s => !isTrapState(s.id));
    const trapStates = states.filter(s => isTrapState(s.id));

    // If only trap states exist:
    if (regularStates.length === 0) {
      const positions = new Map();
      trapStates.forEach(s => positions.set(s.id, { x: width / 2, y: height / 2, layer: 0, isTrap: true }));
      return positions;
    }

    const adj = new Map();
    for (const s of regularStates) adj.set(s.id, []);
    for (const t of transitions) {
      if (adj.has(t.from) && adj.has(t.to)) {
        adj.get(t.from).push(t.to);
      }
    }

    // 1. Detect cycle back-edges using DFS from startStateId
    const visited = new Set();
    const inStack = new Set();
    const backEdges = new Set();

    function dfsCycle(u) {
      visited.add(u);
      inStack.add(u);
      for (const v of adj.get(u) || []) {
        if (v === u || inStack.has(v)) {
          backEdges.add(`${u}->${v}`);
        } else if (!visited.has(v)) {
          dfsCycle(v);
        }
      }
      inStack.delete(u);
    }

    const actualStart = regularStates.find(s => s.id === startStateId)?.id || regularStates[0].id;
    if (adj.has(actualStart)) {
      dfsCycle(actualStart);
    }
    for (const s of regularStates) {
      if (!visited.has(s.id)) dfsCycle(s.id);
    }

    // 2. Build forward DAG excluding back-edges and self-loops
    const dagAdj = new Map();
    const inDegree = new Map();
    for (const s of regularStates) {
      dagAdj.set(s.id, []);
      inDegree.set(s.id, 0);
    }
    for (const t of transitions) {
      const k = `${t.from}->${t.to}`;
      if (dagAdj.has(t.from) && dagAdj.has(t.to) && !backEdges.has(k) && t.from !== t.to) {
        dagAdj.get(t.from).push(t.to);
        inDegree.set(t.to, (inDegree.get(t.to) || 0) + 1);
      }
    }

    // 3. Topological Sort on Forward DAG
    const q = [];
    for (const s of regularStates) {
      if (inDegree.get(s.id) === 0) q.push(s.id);
    }
    const topo = [];
    const degCopy = new Map(inDegree);
    while (q.length > 0) {
      const u = q.shift();
      topo.push(u);
      for (const v of dagAdj.get(u) || []) {
        degCopy.set(v, degCopy.get(v) - 1);
        if (degCopy.get(v) === 0) q.push(v);
      }
    }

    // 4. Longest-Path Layering
    const layers = new Map();
    for (const s of regularStates) layers.set(s.id, 0);

    for (const u of topo) {
      const curL = layers.get(u) || 0;
      for (const v of dagAdj.get(u) || []) {
        if (layers.get(v) < curL + 1) {
          layers.set(v, curL + 1);
        }
      }
    }

    // 5. Assign layers for unvisited states
    let maxLayer = 0;
    for (const l of layers.values()) {
      if (l > maxLayer) maxLayer = l;
    }

    for (const s of regularStates) {
      if (!layers.has(s.id)) {
        layers.set(s.id, maxLayer + 1);
      }
    }

    let finalMaxLayer = 0;
    for (const l of layers.values()) {
      if (l > finalMaxLayer) finalMaxLayer = l;
    }

    // 6. Group states by layer
    const layerGroups = Array.from({ length: finalMaxLayer + 1 }, () => []);
    for (const [id, layer] of layers.entries()) {
      layerGroups[layer].push(id);
    }
    const nonEmptyGroups = layerGroups.filter(g => g.length > 0);
    const numLayers = nonEmptyGroups.length;

    // 7. Barycentric sorting to align tracks and prevent crossing edges
    for (let l = 1; l < numLayers; l++) {
      const prevGroup = nonEmptyGroups[l - 1];
      const prevRank = new Map(prevGroup.map((id, idx) => [id, idx]));
      nonEmptyGroups[l].sort((a, b) => {
        const predsA = transitions.filter(t => t.to === a && prevRank.has(t.from)).map(t => prevRank.get(t.from));
        const predsB = transitions.filter(t => t.to === b && prevRank.has(t.from)).map(t => prevRank.get(t.from));
        const avgA = predsA.length ? (predsA.reduce((s, x) => s + x, 0) / predsA.length) : 0;
        const avgB = predsB.length ? (predsB.reduce((s, x) => s + x, 0) / predsB.length) : 0;
        return avgA - avgB;
      });
    }

    // 8. Calculate physical (x, y) coordinates for regular states
    const positions = new Map();
    const startX = 90;
    const availableWidth = Math.max(width - 180, numLayers * 140);
    const xStep = numLayers > 1 ? availableWidth / (numLayers - 1) : 0;
    const centerY = height / 2;

    for (let l = 0; l < numLayers; l++) {
      const group = nonEmptyGroups[l];
      const count = group.length;
      const x = startX + l * xStep;

      const ySpacing = Math.min(105, (height - 130) / Math.max(1, count));
      for (let i = 0; i < count; i++) {
        const id = group[i];
        const yOffset = (i - (count - 1) / 2) * ySpacing;
        const y = centerY + yOffset;
        positions.set(id, { x, y, layer: l, isTrap: false });
      }
    }

    // 9. Position trap states on dedicated lower sink row
    if (trapStates.length > 0) {
      const regularPositions = regularStates.map(s => positions.get(s.id)).filter(Boolean);
      const minX = Math.min(...regularPositions.map(p => p.x));
      const maxX = Math.max(...regularPositions.map(p => p.x));
      const maxY = Math.max(...regularPositions.map(p => p.y));
      const trapCenterX = (minX + maxX) / 2;
      const trapY = maxY + 120;

      trapStates.forEach((s, idx) => {
        const xOffset = (idx - (trapStates.length - 1) / 2) * 80;
        positions.set(s.id, {
          x: trapCenterX + xOffset,
          y: trapY,
          layer: numLayers,
          isTrap: true
        });
      });
    }

    return positions;
  }

  /**
   * Generates pure SVG string representing the graph.
   * Visual aesthetics matching interactive_dfa_studio_c_lexical_analyzer.html.
   * Features:
   * - Fully distinct bidirectional transitions: p1 -> p2 on one line, p2 -> p1 on a separate line
   * - Obstacle-avoiding edge routing where loopbacks arch over the top
   *   and long bypasses arch under the bottom, preventing all line overlaps
   * - Dynamic node radius & scaling font so composite labels ({d0, d2, d3}) fit cleanly
   * @param {{ states: Array<{id: string, label?: string, isStart?: boolean, isAccept?: boolean}>, transitions: Array<{from: string, to: string, symbol: string}>, startState: string, acceptStates: string[] }} graphModel
   * @param {{ isDark?: boolean, width?: number, height?: number, idPrefix?: string }} options
   * @returns {string}
   */
  static createSvgString(graphModel, options = {}) {
    const isDark = options.isDark !== false;
    const width = options.width || 900;
    const height = options.height || 450;
    const centerY = height / 2;
    const idPrefix = options.idPrefix || 'g' + Math.floor(Math.random() * 10000);
    const R = 28; // base node radius
    const isTrapState = (id) => id === 'Φ' || id === 'trap' || (typeof id === 'string' && (id.toLowerCase().includes('trap') || id.toLowerCase().includes('dead')));

    const states = graphModel.states || [];
    const rawTransitions = graphModel.transitions || [];
    const startStateId = graphModel.startState || (states.find(s => s.isStart)?.id) || (states[0]?.id);
    const acceptStateIds = new Set(graphModel.acceptStates || states.filter(s => s.isAccept).map(s => s.id));

    // Combine duplicate edges between same pair
    const edgeMap = new Map();
    for (const t of rawTransitions) {
      const key = `${t.from}->${t.to}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { from: t.from, to: t.to, symbols: [] });
      }
      edgeMap.get(key).symbols.push(t.symbol);
    }

    const transitions = Array.from(edgeMap.values()).map(e => ({
      from: e.from,
      to: e.to,
      symbol: Array.from(new Set(e.symbols)).sort().join(', ')
    }));

    const positions = GraphRenderer.computeLayout(states, transitions, startStateId, width, height);

    // Compute dynamic node radius per state so composite labels fit cleanly inside
    for (const state of states) {
      const label = state.label || state.id;
      const nodeR = Math.max(R, Math.min(38, Math.round(label.length * 2.8 + 2)));
      const pos = positions.get(state.id);
      if (pos) {
        pos.r = nodeR;
      }
    }

    // Dynamic width calculation
    let maxX = 0;
    for (const pos of positions.values()) {
      if (pos.x > maxX) maxX = pos.x;
    }
    const viewBoxWidth = Math.max(width, maxX + 110);

    // Theme palette
    const themeKey = isDark ? 'dark' : 'light';
    const markerId = `arrow-${idPrefix}-${themeKey}`;
    const startMarkerId = `start-arrow-${idPrefix}-${themeKey}`;
    const deadMarkerId = `dead-arrow-${idPrefix}-${themeKey}`;
    const shadowId = `shadow-${idPrefix}`;

    const bg = isDark ? '#111827' : '#ffffff';
    const gridDot = isDark ? '#374151' : '#cbd5e1';

    // State Colors
    const regularNodeFill = isDark ? '#1e293b' : '#ffffff';
    const regularNodeStroke = isDark ? '#64748b' : '#334155';

    const startNodeFill = isDark ? '#0c4a6e' : '#f0f9ff';
    const startNodeStroke = isDark ? '#38bdf8' : '#0284c7';
    const startArrowColor = isDark ? '#38bdf8' : '#0284c7';

    const acceptNodeFill = isDark ? '#064e3b' : '#ecfdf5';
    const acceptNodeStroke = isDark ? '#34d399' : '#059669';

    const trapNodeFill = isDark ? '#4c0519' : '#fff1f2';
    const trapNodeStroke = isDark ? '#f43f5e' : '#e11d48';

    // Transition Colors
    const edgeStroke = isDark ? '#94a3b8' : '#1e293b';
    const edgeDeadStroke = isDark ? '#f43f5e' : '#e11d48';
    const edgePillFill = isDark ? '#1e293b' : '#ffffff';
    const edgePillStroke = isDark ? '#64748b' : '#475569';
    const edgeTextFill = isDark ? '#f8fafc' : '#0f172a';
    const stateTextFill = isDark ? '#f8fafc' : '#0f172a';

    // Edge Classification & Obstacle Avoidance Routing
    const existingPairs = new Set(transitions.map(t => `${t.from}->${t.to}`));
    const selfLoops = [];
    const trapEdges = [];
    const backwardEdges = [];
    const bypassEdges = [];
    const regularEdges = [];

    for (const t of transitions) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      if (!p1 || !p2) continue;

      if (t.from === t.to) {
        selfLoops.push(t);
      } else if (p2.isTrap || isTrapState(t.to)) {
        trapEdges.push(t);
      } else {
        const isAdjacent = Math.abs(p1.layer - p2.layer) <= 1;
        const hasReverse = existingPairs.has(`${t.to}->${t.from}`);

        if (hasReverse && isAdjacent) {
          // Bidirectional adjacent pair: each direction must have its own distinct curved line
          regularEdges.push(t);
        } else if (p2.layer < p1.layer && !isAdjacent) {
          // Backward multi-layer loop (e.g. 10 -> 1 looping back over top)
          backwardEdges.push(t);
        } else if (p2.layer > p1.layer && (p2.layer - p1.layer) > 1) {
          // Forward bypass skipping intermediate layers (e.g. 0 -> 11 bypassing under bottom)
          bypassEdges.push(t);
        } else {
          regularEdges.push(t);
        }
      }
    }

    // Calculate angular fan-in ports on trap state(s)
    const trapTargetPorts = new Map();
    const trapEdgesByTarget = new Map();
    for (const t of trapEdges) {
      if (!trapEdgesByTarget.has(t.to)) trapEdgesByTarget.set(t.to, []);
      trapEdgesByTarget.get(t.to).push(t);
    }

    for (const [targetId, edges] of trapEdgesByTarget.entries()) {
      const pTrap = positions.get(targetId);
      const rTrap = pTrap ? (pTrap.r || R) : R;
      const trapX = pTrap ? pTrap.x : width / 2;
      const trapY = pTrap ? pTrap.y : height;

      // Sort by source state x-coordinate and vertical position
      edges.sort((a, b) => {
        const p1a = positions.get(a.from);
        const p1b = positions.get(b.from);
        if (!p1a || !p1b) return 0;
        const calcKey = (p) => {
          const dx = p.x - trapX;
          const dy = trapY - p.y;
          if (dx < -10) return dx - dy * 0.15;
          if (dx > 10) return dx + dy * 0.15;
          return dx;
        };
        return calcKey(p1a) - calcKey(p1b);
      });

      const K = edges.length;
      const minAngle = -150 * Math.PI / 180;
      const maxAngle = -30 * Math.PI / 180;

      edges.forEach((t, i) => {
        const p1 = positions.get(t.from);
        const angle = K === 1
          ? Math.max(minAngle, Math.min(maxAngle, Math.atan2(p1.y - trapY, p1.x - trapX)))
          : minAngle + (i / (K - 1)) * (maxAngle - minAngle);

        const ex = trapX + (rTrap + 3) * Math.cos(angle);
        const ey = trapY + (rTrap + 3) * Math.sin(angle);
        trapTargetPorts.set(`${t.from}->${t.to}`, { ex, ey, angle });
      });
    }

    // Sort arches by span so they form concentric, non-overlapping bridges
    backwardEdges.sort((a, b) => {
      const p1a = positions.get(a.from), p2a = positions.get(a.to);
      const p1b = positions.get(b.from), p2b = positions.get(b.to);
      return (p1a.x - p2a.x) - (p1b.x - p2b.x);
    });

    bypassEdges.sort((a, b) => {
      const p1a = positions.get(a.from), p2a = positions.get(a.to);
      const p1b = positions.get(b.from), p2b = positions.get(b.to);
      return (p2a.x - p1a.x) - (p2b.x - p1b.x);
    });

    // Compute bounding box extents to ensure SVG height accommodates high/low arches
    let minObsY = height;
    let maxObsY = 0;
    for (const pos of positions.values()) {
      const r = pos.r || R;
      if (pos.y - r < minObsY) minObsY = pos.y - r;
      if (pos.y + r > maxObsY) maxObsY = pos.y + r;
    }

    // Assign arch apex Y coordinates
    backwardEdges.forEach((t, idx) => {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      let localMinY = Math.min(p1.y, p2.y);
      for (const pos of positions.values()) {
        if (pos.x >= Math.min(p1.x, p2.x) - 10 && pos.x <= Math.max(p1.x, p2.x) + 10) {
          if (pos.y < localMinY) localMinY = pos.y;
        }
      }
      t._archY = (localMinY - R) - 45 - (idx * 26) - (Math.abs(p1.layer - p2.layer) * 4);
      if (t._archY - 35 < minObsY) minObsY = t._archY - 35;
    });

    bypassEdges.forEach((t, idx) => {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      let localMaxY = Math.max(p1.y, p2.y);
      for (const pos of positions.values()) {
        if (pos.x >= Math.min(p1.x, p2.x) - 10 && pos.x <= Math.max(p1.x, p2.x) + 10) {
          if (pos.y > localMaxY) localMaxY = pos.y;
        }
      }
      t._archY = (localMaxY + R) + 45 + (idx * 26) + (Math.abs(p2.layer - p1.layer) * 4);
      if (t._archY + 35 > maxObsY) maxObsY = t._archY + 35;
    });

    for (const t of selfLoops) {
      const p = positions.get(t.from);
      const r = p?.r || R;
      if (p) {
        if (p.isTrap || isTrapState(t.from)) {
          if (p.y + r + 75 > maxObsY) maxObsY = p.y + r + 75;
        } else {
          if (p.y - r - 75 < minObsY) minObsY = p.y - r - 75;
        }
      }
    }

    // Account for bidirectional return arches in vertical extents
    for (const t of regularEdges) {
      if (existingPairs.has(`${t.to}->${t.from}`)) {
        const p1 = positions.get(t.from);
        const p2 = positions.get(t.to);
        if (p1 && p2 && p1.x > p2.x) {
          const isUpper = (p1.y < centerY) || (p1.y <= p2.y && p2.y <= centerY);
          if (isUpper) {
            const archY = Math.min(p1.y, p2.y) - 52;
            if (archY - 35 < minObsY) minObsY = archY - 35;
          } else {
            const archY = Math.max(p1.y, p2.y) + 52;
            if (archY + 35 > maxObsY) maxObsY = archY + 35;
          }
        }
      }
    }

    // Shift coordinates if arches extend near top boundary
    let yShift = 0;
    if (minObsY < 30) {
      yShift = Math.ceil(30 - minObsY);
    }
    const viewBoxHeight = Math.max(height, Math.ceil(maxObsY + yShift + 45));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" class="automata-svg" style="width:100%;height:100%;background-color:${bg};background-image:radial-gradient(${gridDot} 1.25px, transparent 1.25px);background-size:24px 24px;font-family:'JetBrains Mono',monospace;">
      <defs>
        <marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${edgeStroke}" />
        </marker>
        <marker id="${startMarkerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${startArrowColor}" />
        </marker>
        <marker id="${deadMarkerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${edgeDeadStroke}" />
        </marker>
        <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="${isDark ? '0.45' : '0.18'}" />
        </filter>
      </defs>
      <g class="graph-content" transform="translate(0, ${yShift})">`;

    // 1. Draw Start Indicator (Sky blue arrow + bold "start" label)
    if (startStateId && positions.has(startStateId)) {
      const pos = positions.get(startStateId);
      const r = pos.r || R;
      const startX = pos.x - r - 54;
      const targetX = pos.x - r - 3;
      svg += `
        <g class="start-indicator">
          <line x1="${startX}" y1="${pos.y}" x2="${targetX}" y2="${pos.y}" stroke="${startArrowColor}" stroke-width="3.6" marker-end="url(#${startMarkerId})" />
          <text x="${startX - 6}" y="${pos.y + 5}" fill="${startArrowColor}" font-size="13.5" font-weight="800" font-family="'JetBrains Mono', monospace" letter-spacing="0.02em" text-anchor="end">start</text>
        </g>`;
    }

    // Helper to render an edge with a styled pill label
    const renderEdgeMarkup = (pathD, labelX, labelY, symbol, isTrap, isSelfLoop = false) => {
      const stroke = isTrap ? edgeDeadStroke : edgeStroke;
      const marker = isTrap ? `url(#${deadMarkerId})` : `url(#${markerId})`;
      const strokeWidth = isTrap ? '2.8' : '3.2';
      const dashArray = isTrap ? 'stroke-dasharray="7,5"' : '';

      const pillW = Math.max(34, symbol.length * 8.6 + 20);
      const pillH = 25;

      return `
        <g class="edge${isSelfLoop ? ' self-loop' : ''}">
          <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" ${dashArray} marker-end="${marker}" />
          <rect x="${labelX - pillW / 2}" y="${labelY - pillH / 2}" width="${pillW}" height="${pillH}" rx="6.5" fill="${edgePillFill}" stroke="${edgePillStroke}" stroke-width="2.2" filter="url(#${shadowId})" />
          <text x="${labelX}" y="${labelY + 4.5}" fill="${edgeTextFill}" font-size="13" font-weight="800" font-family="'JetBrains Mono', monospace" letter-spacing="0.01em" text-anchor="middle">${symbol}</text>
        </g>`;
    };

    // 2. Draw Self-Loops (High Arch Cubic Bezier: Top for regular states, Bottom for trap states)
    for (const t of selfLoops) {
      const p1 = positions.get(t.from);
      const r = p1.r || R;
      const isToTrap = p1.isTrap || isTrapState(t.from);
      const spread = 0.45;

      if (isToTrap) {
        // Arches on bottom of trap state to keep upper perimeter clear for incoming error edges
        const sx = p1.x + r * Math.cos(Math.PI / 2 + spread);
        const sy = p1.y + r * Math.sin(Math.PI / 2 + spread);
        const ex = p1.x + (r + 3) * Math.cos(Math.PI / 2 - spread);
        const ey = p1.y + (r + 3) * Math.sin(Math.PI / 2 - spread);

        const ctrlX1 = p1.x - 30;
        const ctrlY1 = p1.y + r + 52;
        const ctrlX2 = p1.x + 30;
        const ctrlY2 = p1.y + r + 52;

        const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
        const labelX = p1.x;
        const labelY = p1.y + r + 60;

        svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, true, true);
      } else {
        const sx = p1.x + r * Math.cos(-Math.PI / 2 - spread);
        const sy = p1.y + r * Math.sin(-Math.PI / 2 - spread);
        const ex = p1.x + (r + 3) * Math.cos(-Math.PI / 2 + spread);
        const ey = p1.y + (r + 3) * Math.sin(-Math.PI / 2 + spread);

        const ctrlX1 = p1.x - 30;
        const ctrlY1 = p1.y - r - 52;
        const ctrlX2 = p1.x + 30;
        const ctrlY2 = p1.y - r - 52;

        const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
        const labelX = p1.x;
        const labelY = p1.y - r - 60;

        svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, false, true);
      }
    }

    // 3. Draw Backward Loops (Arches Over The Top of Intermediate States)
    for (const t of backwardEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const spanX = Math.abs(p1.x - p2.x);
      const archY = t._archY;

      // Leaves top of p1
      const sx = p1.x + r1 * Math.cos(-Math.PI * 0.45);
      const sy = p1.y + r1 * Math.sin(-Math.PI * 0.45);

      // Enters top of p2
      const ex = p2.x + (r2 + 3) * Math.cos(-Math.PI * 0.55);
      const ey = p2.y + (r2 + 3) * Math.sin(-Math.PI * 0.55);

      const ctrlX1 = sx - spanX * 0.14;
      const ctrlY1 = archY;
      const ctrlX2 = ex + spanX * 0.14;
      const ctrlY2 = archY;

      const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
      const labelX = (sx + ex) / 2;
      const labelY = archY - 14;

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 4. Draw Forward Bypass Edges (Arches Under The Bottom of Intermediate States)
    for (const t of bypassEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const spanX = Math.abs(p2.x - p1.x);
      const archY = t._archY;

      // Leaves bottom of p1
      const sx = p1.x + r1 * Math.cos(Math.PI * 0.45);
      const sy = p1.y + r1 * Math.sin(Math.PI * 0.45);

      // Enters bottom of p2
      const ex = p2.x - (r2 + 3) * Math.cos(Math.PI * 0.45);
      const ey = p2.y + (r2 + 3) * Math.sin(Math.PI * 0.45);

      const ctrlX1 = sx + spanX * 0.14;
      const ctrlY1 = archY;
      const ctrlX2 = ex - spanX * 0.14;
      const ctrlY2 = archY;

      const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
      const labelX = (sx + ex) / 2;
      const labelY = archY + 14;

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 5. Draw Regular & Adjacent Edges (Straight or Distinct Opposing Bidirectional Curves)
    for (const t of regularEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      const hasReverse = existingPairs.has(`${t.to}->${t.from}`);
      const isSameLayer = p1.layer === p2.layer;

      let pathD = '';
      let labelX = 0;
      let labelY = 0;

      if (hasReverse) {
        if (p1.x <= p2.x) {
          // Forward direction of a bidirectional pair (e.g. q1 -> q2 or q1 -> q4):
          // Rendered as a clean direct straight line!
          const ux = dx / dist;
          const uy = dy / dist;
          const sx = p1.x + r1 * ux;
          const sy = p1.y + r1 * uy;
          const ex = p2.x - (r2 + 3) * ux;
          const ey = p2.y - (r2 + 3) * uy;

          pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
          labelX = (sx + ex) / 2;
          labelY = (sy + ey) / 2;
        } else {
          // Return direction of a bidirectional pair (p1.x > p2.x, e.g. q2 -> q1 or q4 -> q1):
          // Arches gracefully around the OUTSIDE (matching interactive_dfa_studio):
          // Upper branch arches OVER THE TOP; lower branch arches UNDER THE BOTTOM.
          const spanX = Math.abs(p1.x - p2.x);
          const isUpper = (p1.y < centerY) || (p1.y <= p2.y && p2.y <= centerY);

          if (isUpper) {
            // Upper branch: arch OVER THE TOP
            const archY = Math.min(p1.y, p2.y) - 52;
            const sx = p1.x + r1 * Math.cos(-Math.PI * 0.45);
            const sy = p1.y + r1 * Math.sin(-Math.PI * 0.45);
            const ex = p2.x + (r2 + 3) * Math.cos(-Math.PI * 0.35);
            const ey = p2.y + (r2 + 3) * Math.sin(-Math.PI * 0.35);

            const ctrlX1 = sx - spanX * 0.15;
            const ctrlY1 = archY;
            const ctrlX2 = ex + spanX * 0.15;
            const ctrlY2 = archY;

            pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
            labelX = (sx + ex) / 2;
            labelY = archY - 14;
          } else {
            // Lower branch: arch UNDER THE BOTTOM
            const archY = Math.max(p1.y, p2.y) + 52;
            const sx = p1.x + r1 * Math.cos(Math.PI * 0.45);
            const sy = p1.y + r1 * Math.sin(Math.PI * 0.45);
            const ex = p2.x + (r2 + 3) * Math.cos(Math.PI * 0.35);
            const ey = p2.y + (r2 + 3) * Math.sin(Math.PI * 0.35);

            const ctrlX1 = sx - spanX * 0.15;
            const ctrlY1 = archY;
            const ctrlX2 = ex + spanX * 0.15;
            const ctrlY2 = archY;

            pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
            labelX = (sx + ex) / 2;
            labelY = archY + 14;
          }
        }
      } else if (isSameLayer) {
        // Vertical edges within the same column: curve right
        const curveOffset = 38;
        const midX = (p1.x + p2.x) / 2 + curveOffset;
        const midY = (p1.y + p2.y) / 2;

        const angleStart = Math.atan2(midY - p1.y, midX - p1.x);
        const sx = p1.x + r1 * Math.cos(angleStart);
        const sy = p1.y + r1 * Math.sin(angleStart);

        const angleEnd = Math.atan2(p2.y - midY, p2.x - midX);
        const ex = p2.x - (r2 + 3) * Math.cos(angleEnd);
        const ey = p2.y - (r2 + 3) * Math.sin(angleEnd);

        pathD = `M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`;
        labelX = midX;
        labelY = midY;
      } else {
        // Straight line between circumference boundaries
        const ux = dx / dist;
        const uy = dy / dist;
        const sx = p1.x + r1 * ux;
        const sy = p1.y + r1 * uy;
        const ex = p2.x - (r2 + 3) * ux;
        const ey = p2.y - (r2 + 3) * uy;

        pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
        labelX = (sx + ex) / 2;
        labelY = (sy + ey) / 2;
      }

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 6. Draw Trap Error Transitions (Dedicated angular fan-in ports on Φ)
    for (const t of trapEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const port = trapTargetPorts.get(`${t.from}->${t.to}`);
      const ex = port ? port.ex : p2.x;
      const ey = port ? port.ey : p2.y;

      // Check if p1 has states beneath it in the same column
      const belowStates = [];
      for (const [otherId, pos] of positions.entries()) {
        if (otherId !== t.from && !pos.isTrap && !isTrapState(otherId)) {
          if (Math.abs(pos.x - p1.x) <= 35 && pos.y > p1.y + 20) {
            belowStates.push(pos);
          }
        }
      }

      let pathD = '';
      let labelX = 0;
      let labelY = 0;

      if (belowStates.length > 0) {
        // Upper stacked state: route around the outside of the column via clearance lane
        const maxBelowY = Math.max(...belowStates.map(s => s.y));
        const maxColX = Math.max(p1.x, ...belowStates.map(s => s.x));
        const minColX = Math.min(p1.x, ...belowStates.map(s => s.x));

        if (p1.x >= p2.x) {
          // Route around the RIGHT side
          const sx = p1.x + r1;
          const sy = p1.y;
          const cx1 = maxColX + 70;
          const cy1 = p1.y + 20;
          const cx2 = maxColX + 70;
          const cy2 = maxBelowY + 40;

          pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
          labelX = cx1;
          labelY = (p1.y + maxBelowY) / 2;
        } else {
          // Route around the LEFT side
          const sx = p1.x - r1;
          const sy = p1.y;
          const cx1 = minColX - 70;
          const cy1 = p1.y + 20;
          const cx2 = minColX - 70;
          const cy2 = maxBelowY + 40;

          pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
          labelX = cx1;
          labelY = (p1.y + maxBelowY) / 2;
        }
      } else {
        // Direct straight line to dedicated angular port
        const angleStart = Math.atan2(ey - p1.y, ex - p1.x);
        const sx = p1.x + r1 * Math.cos(angleStart);
        const sy = p1.y + r1 * Math.sin(angleStart);

        pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
        labelX = (sx + ex) / 2;
        labelY = (sy + ey) / 2;
      }

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, true);
    }

    // 7. Draw Nodes (States) - Color-coded by semantic role with double circle for accept
    for (const state of states) {
      const pos = positions.get(state.id);
      if (!pos) continue;

      const r = pos.r || R;
      const isAccept = acceptStateIds.has(state.id);
      const isStart = state.id === startStateId;
      const isTrap = state.id === 'Φ' || state.id === 'trap' || state.id.toLowerCase().includes('trap') || state.id.toLowerCase().includes('dead');
      const label = state.label || state.id;

      let fill = regularNodeFill;
      let stroke = regularNodeStroke;

      if (isTrap) {
        fill = trapNodeFill;
        stroke = trapNodeStroke;
      } else if (isAccept) {
        fill = acceptNodeFill;
        stroke = acceptNodeStroke;
      } else if (isStart) {
        fill = startNodeFill;
        stroke = startNodeStroke;
      }

      const fontSize = label.length > 8 ? '9' : (label.length > 5 ? '10.5' : (label.length > 3 ? '12' : '13.5'));

      svg += `
        <g class="node" data-id="${state.id}" transform="translate(${pos.x}, ${pos.y})">
          <circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.4" filter="url(#${shadowId})" />`;

      if (isAccept) {
        svg += `
          <circle class="accept-inner" r="${r - 5.5}" fill="none" stroke="${stroke}" stroke-width="2.0" />`;
      }

      svg += `
          <text dy="4.0" fill="${stateTextFill}" font-size="${fontSize}" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">${label}</text>
        </g>`;
    }

    svg += `
      </g>
    </svg>`;

    return svg;
  }

  /**
   * Mounts an interactive SVG with pan and zoom capabilities inside a container element.
   * Pure visualizer (cannot be edited).
   * @param {HTMLElement} container
   * @param {Object} graphModel
   * @param {{ isDark?: boolean, idPrefix?: string }} options
   * @returns {{ zoomIn: Function, zoomOut: Function, resetZoom: Function, destroy: Function }}
   */
  static render(container, graphModel, options = {}) {
    if (!container) return null;

    const width = container.clientWidth || 800;
    const height = 400;

    const svgMarkup = GraphRenderer.createSvgString(graphModel, {
      ...options,
      width,
      height
    });

    container.innerHTML = `
      <div class="graph-wrapper" style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:8px;">
        <div class="graph-controls" style="position:absolute;top:10px;right:10px;display:flex;gap:6px;z-index:10;">
          <button class="btn-zoom-in" title="Zoom In" style="padding:4px 9px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-weight:bold;cursor:pointer;">+</button>
          <button class="btn-zoom-out" title="Zoom Out" style="padding:4px 9px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-weight:bold;cursor:pointer;">−</button>
          <button class="btn-zoom-reset" title="Reset View" style="padding:4px 10px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Reset</button>
        </div>
        <div class="svg-host" style="width:100%;height:100%;cursor:grab;">
          ${svgMarkup}
        </div>
      </div>
    `;

    const contentGroup = container.querySelector('.graph-content');
    const host = container.querySelector('.svg-host');

    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const updateTransform = () => {
      if (contentGroup) {
        contentGroup.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
      }
    };

    const zoomIn = () => {
      scale = Math.min(3.0, scale * 1.2);
      updateTransform();
    };

    const zoomOut = () => {
      scale = Math.max(0.3, scale / 1.2);
      updateTransform();
    };

    const resetZoom = () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    };

    container.querySelector('.btn-zoom-in')?.addEventListener('click', zoomIn);
    container.querySelector('.btn-zoom-out')?.addEventListener('click', zoomOut);
    container.querySelector('.btn-zoom-reset')?.addEventListener('click', resetZoom);

    const onMouseMove = (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        if (host) host.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    // Pan & Drag events: attach to window only while dragging
    const onMouseDown = (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      host.style.cursor = 'grabbing';
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    host?.addEventListener('mousedown', onMouseDown);

    // Wheel zoom
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.3, Math.min(3.0, scale * zoomFactor));
      updateTransform();
    };
    host?.addEventListener('wheel', onWheel, { passive: false });

    return {
      zoomIn,
      zoomOut,
      resetZoom,
      destroy: () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        host?.removeEventListener('mousedown', onMouseDown);
        host?.removeEventListener('wheel', onWheel);
        container.innerHTML = '';
      }
    };
  }
}
