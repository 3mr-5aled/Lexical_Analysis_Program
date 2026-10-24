/**
 * GraphRenderer
 * High-performance standalone SVG directed graph layout and renderer for finite state automata.
 * Features:
 * - BFS-layered layout with automatic rank ordering
 * - Curvature calculation for bidirectional edges and self-loops
 * - Concentric double-circles for accept states
 * - Start indicator arrow
 * - Interactive Pan & Zoom (drag-to-pan, wheel zoom, zoom controls)
 * - Seamless Dark and Light theme adaptation
 */
export class GraphRenderer {
  /**
   * Computes layout coordinates (x, y) for each state in the graph.
   * @param {Array<{id: string, isStart: boolean}>} states
   * @param {Array<{from: string, to: string, symbol: string}>} transitions
   * @param {string} startStateId
   * @param {number} width
   * @param {number} height
   * @returns {Map<string, {x: number, y: number, layer: number}>}
   */
  static computeLayout(states, transitions, startStateId, width = 900, height = 450) {
    const adj = new Map();
    for (const s of states) adj.set(s.id, []);
    for (const t of transitions) {
      if (adj.has(t.from)) adj.get(t.from).push(t.to);
    }

    // BFS layering
    const layers = new Map();
    const layerGroups = [];

    const queue = [];
    if (startStateId && adj.has(startStateId)) {
      layers.set(startStateId, 0);
      queue.push(startStateId);
    }

    while (queue.length > 0) {
      const u = queue.shift();
      const currLayer = layers.get(u);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!layers.has(v)) {
          layers.set(v, currLayer + 1);
          queue.push(v);
        }
      }
    }

    // Assign any unvisited states (e.g. Trap State Φ or disconnected components)
    let maxLayer = 0;
    for (const l of layers.values()) {
      if (l > maxLayer) maxLayer = l;
    }

    for (const s of states) {
      if (!layers.has(s.id)) {
        layers.set(s.id, maxLayer + 1);
      }
    }

    // Group states by layer
    for (const [id, layer] of layers.entries()) {
      while (layerGroups.length <= layer) layerGroups.push([]);
      layerGroups[layer].push(id);
    }

    const positions = new Map();
    const numLayers = layerGroups.length;
    const startX = 80;
    const availableWidth = Math.max(width - 160, numLayers * 120);
    const xStep = numLayers > 1 ? availableWidth / (numLayers - 1) : 0;
    const centerY = height / 2;

    for (let l = 0; l < numLayers; l++) {
      const group = layerGroups[l];
      const count = group.length;
      const x = startX + l * xStep;

      const ySpacing = Math.min(100, (height - 120) / Math.max(1, count));
      for (let i = 0; i < count; i++) {
        const id = group[i];
        const yOffset = (i - (count - 1) / 2) * ySpacing;
        const y = centerY + yOffset;
        positions.set(id, { x, y, layer: l });
      }
    }

    return positions;
  }

  /**
   * Generates pure SVG string representing the graph.
   * @param {{ states: Array<{id: string, label?: string, isStart?: boolean, isAccept?: boolean}>, transitions: Array<{from: string, to: string, symbol: string}>, startState: string, acceptStates: string[] }} graphModel
   * @param {{ isDark?: boolean, width?: number, height?: number }} options
   * @returns {string}
   */
  static createSvgString(graphModel, options = {}) {
    const isDark = options.isDark !== false;
    const width = options.width || 900;
    const height = options.height || 450;
    const R = 22; // node radius

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

    // Theme palette
    const bg = isDark ? '#111827' : '#ffffff';
    const nodeFill = isDark ? '#1f2937' : '#f9fafb';
    const nodeStroke = isDark ? '#60a5fa' : '#2563eb';
    const textFill = isDark ? '#f3f4f6' : '#1f2937';
    const edgeStroke = isDark ? '#9ca3af' : '#4b5563';
    const edgeTextFill = isDark ? '#e5e7eb' : '#111827';
    const edgeBg = isDark ? '#111827' : '#ffffff';
    const startArrowColor = isDark ? '#34d399' : '#059669';

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="automata-svg" style="width:100%;height:100%;background:${bg};font-family:system-ui,-apple-system,sans-serif;">
      <defs>
        <marker id="arrow-${isDark ? 'dark' : 'light'}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="${edgeStroke}" />
        </marker>
        <marker id="start-arrow-${isDark ? 'dark' : 'light'}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="${startArrowColor}" />
        </marker>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="${isDark ? '0.3' : '0.1'}" />
        </filter>
      </defs>
      <g class="graph-content">`;

    // 1. Draw Start Indicator
    if (startStateId && positions.has(startStateId)) {
      const pos = positions.get(startStateId);
      const startX = pos.x - 45;
      const targetX = pos.x - R - 2;
      svg += `
        <g class="start-indicator">
          <line x1="${startX}" y1="${pos.y}" x2="${targetX}" y2="${pos.y}" stroke="${startArrowColor}" stroke-width="2.5" marker-end="url(#start-arrow-${isDark ? 'dark' : 'light'})" />
          <text x="${startX - 6}" y="${pos.y + 4}" fill="${startArrowColor}" font-size="11" font-weight="bold" text-anchor="end">start</text>
        </g>`;
    }

    // 2. Draw Transitions (Edges)
    const existingPairs = new Set(transitions.map(t => `${t.from}->${t.to}`));

    for (const t of transitions) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      if (!p1 || !p2) continue;

      if (t.from === t.to) {
        // Self-loop
        const x = p1.x;
        const y = p1.y - R;
        const loopPath = `M ${x - 10} ${y + 2} C ${x - 30} ${y - 38}, ${x + 30} ${y - 38}, ${x + 10} ${y + 2}`;
        svg += `
          <g class="edge self-loop">
            <path d="${loopPath}" fill="none" stroke="${edgeStroke}" stroke-width="1.8" marker-end="url(#arrow-${isDark ? 'dark' : 'light'})" />
            <rect x="${x - 12}" y="${y - 48}" width="24" height="15" rx="3" fill="${edgeBg}" opacity="0.9" />
            <text x="${x}" y="${y - 37}" fill="${edgeTextFill}" font-size="11" font-weight="600" text-anchor="middle">${t.symbol}</text>
          </g>`;
      } else {
        // Between two distinct states
        const hasReverse = existingPairs.has(`${t.to}->${t.from}`);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) continue;

        // Normal unit vector
        const nx = -dy / dist;
        const ny = dx / dist;

        // Calculate curvature
        let curveOffset = 0;
        if (hasReverse) {
          curveOffset = 25; // Curve opposing directions
        } else if (Math.abs(p1.layer - p2.layer) > 1) {
          curveOffset = (p1.layer < p2.layer ? 35 : -35);
        }

        const midX = (p1.x + p2.x) / 2 + nx * curveOffset;
        const midY = (p1.y + p2.y) / 2 + ny * curveOffset;

        // Clip start and end points to radius R
        const angleStart = Math.atan2(midY - p1.y, midX - p1.x);
        const startPtX = p1.x + R * Math.cos(angleStart);
        const startPtY = p1.y + R * Math.sin(angleStart);

        const angleEnd = Math.atan2(p2.y - midY, p2.x - midX);
        const endPtX = p2.x - (R + 2) * Math.cos(angleEnd);
        const endPtY = p2.y - (R + 2) * Math.sin(angleEnd);

        const pathD = curveOffset === 0
          ? `M ${startPtX} ${startPtY} L ${endPtX} ${endPtY}`
          : `M ${startPtX} ${startPtY} Q ${midX} ${midY} ${endPtX} ${endPtY}`;

        // Label position
        const labelX = curveOffset === 0 ? (startPtX + endPtX) / 2 + nx * 10 : midX;
        const labelY = curveOffset === 0 ? (startPtY + endPtY) / 2 + ny * 10 : midY;

        svg += `
          <g class="edge">
            <path d="${pathD}" fill="none" stroke="${edgeStroke}" stroke-width="1.8" marker-end="url(#arrow-${isDark ? 'dark' : 'light'})" />
            <rect x="${labelX - 12}" y="${labelY - 9}" width="24" height="15" rx="3" fill="${edgeBg}" opacity="0.9" />
            <text x="${labelX}" y="${labelY + 2}" fill="${edgeTextFill}" font-size="11" font-weight="600" text-anchor="middle">${t.symbol}</text>
          </g>`;
      }
    }

    // 3. Draw Nodes (States)
    for (const state of states) {
      const pos = positions.get(state.id);
      if (!pos) continue;

      const isAccept = acceptStateIds.has(state.id);
      const isStart = state.id === startStateId;
      const label = state.label || state.id;

      svg += `
        <g class="node" data-id="${state.id}" transform="translate(${pos.x}, ${pos.y})">
          <circle r="${R}" fill="${nodeFill}" stroke="${nodeStroke}" stroke-width="2.2" filter="url(#shadow)" />`;

      if (isAccept) {
        svg += `
          <circle class="accept-inner" r="${R - 4}" fill="none" stroke="${nodeStroke}" stroke-width="1.6" />`;
      }

      svg += `
          <text dy="4" fill="${textFill}" font-size="${label.length > 5 ? '9' : '12'}" font-weight="bold" text-anchor="middle">${label}</text>
        </g>`;
    }

    svg += `
      </g>
    </svg>`;

    return svg;
  }

  /**
   * Mounts an interactive SVG with pan and zoom capabilities inside a container element.
   * @param {HTMLElement} container
   * @param {Object} graphModel
   * @param {{ isDark?: boolean }} options
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
          <button class="btn-zoom-in" title="Zoom In" style="padding:4px 8px;border-radius:4px;border:1px solid #6b7280;background:rgba(31,41,55,0.7);color:#fff;cursor:pointer;">+</button>
          <button class="btn-zoom-out" title="Zoom Out" style="padding:4px 8px;border-radius:4px;border:1px solid #6b7280;background:rgba(31,41,55,0.7);color:#fff;cursor:pointer;">−</button>
          <button class="btn-zoom-reset" title="Reset View" style="padding:4px 8px;border-radius:4px;border:1px solid #6b7280;background:rgba(31,41,55,0.7);color:#fff;cursor:pointer;">Reset</button>
        </div>
        <div class="svg-host" style="width:100%;height:100%;cursor:grab;">
          ${svgMarkup}
        </div>
      </div>
    `;

    const svgElement = container.querySelector('.automata-svg');
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

    // Pan & Drag events
    host?.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      host.style.cursor = 'grabbing';
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        if (host) host.style.cursor = 'grab';
      }
    });

    // Wheel zoom
    host?.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.3, Math.min(3.0, scale * zoomFactor));
      updateTransform();
    }, { passive: false });

    return {
      zoomIn,
      zoomOut,
      resetZoom,
      destroy: () => {
        container.innerHTML = '';
      }
    };
  }
}
