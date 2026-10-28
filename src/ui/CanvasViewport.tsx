import { useEffect, useRef, useState } from "preact/hooks";
import { GraphRenderer } from "../core/graph-renderer";

interface CanvasViewportProps {
  graphModel: {
    states: Array<{
      id: string;
      name?: string;
      label?: string;
      sub?: string;
      isStart?: boolean;
      isAccept?: boolean;
    }>;
    transitions: Array<{ from: string; to: string; symbol: string }>;
    startState: string;
    acceptStates: string[];
  };
  activeStateId?: string;
  stageTitle: string;
  isDark?: boolean;
  selectedItem?: { type: "state" | "edge"; id: string } | null;
  onSelectItem?: (item: { type: "state" | "edge"; id: string } | null) => void;
  onSyncModel?: (states: CanvasStateNode[], edges: CanvasEdge[]) => void;
  externalStates?: CanvasStateNode[];
  externalEdges?: CanvasEdge[];
  onCreateState?: (x?: number, y?: number) => void;
  onCreateTransition?: (from: string, to: string, symbol: string) => void;
}

interface CanvasStateNode {
  id: string;
  label: string;
  sub: string;
  isStart: boolean;
  isAccept: boolean;
  isTrap: boolean;
  x: number;
  y: number;
}

interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  curve: number;
  labelPos: number;
}

const STATE_RADIUS = 30;

export function CanvasViewport({
  graphModel,
  activeStateId,
  stageTitle,
  isDark = false,
  selectedItem,
  onSelectItem,
  onSyncModel,
  externalStates,
  externalEdges,
  onCreateState,
  onCreateTransition,
}: CanvasViewportProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportGroupRef = useRef<SVGGElement>(null);
  const edgesLayerRef = useRef<SVGGElement>(null);
  const nodesLayerRef = useRef<SVGGElement>(null);
  const zoomLevelTextRef = useRef<HTMLSpanElement>(null);

  // Transition quick-add modal state
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [modalFrom, setModalFrom] = useState("");
  const [modalTo, setModalTo] = useState("");
  const [modalSymbol, setModalSymbol] = useState("");

  // Canvas engine state in mutable refs for butter-smooth 60+ FPS direct DOM manipulation
  const statesRef = useRef<CanvasStateNode[]>([]);
  const edgesRef = useRef<CanvasEdge[]>([]);
  const selectedItemRef = useRef<{ type: "state" | "edge"; id: string } | null>(
    null
  );
  const prevGraphModelRef = useRef<any>(null);

  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const draggingStateIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const draggingCurveEdgeIdRef = useRef<string | null>(null);
  const draggingEdgeLabelIdRef = useRef<string | null>(null);
  const isSpacePressedRef = useRef(false);
  const rAFScheduledRef = useRef(false);

  const prevActiveStateIdRef = useRef<string | undefined>(undefined);

  const isTrapState = (id: string) =>
    id === "φ" ||
    id === "Φ" ||
    id === "trap" ||
    (typeof id === "string" &&
      (id.toLowerCase().includes("trap") || id.toLowerCase().includes("dead")));

  // Viewport transformation and synchronized dot grid
  const updateViewportTransform = () => {
    const vp = viewportGroupRef.current;
    const panX = panRef.current.x;
    const panY = panRef.current.y;
    const zoom = zoomRef.current;

    if (vp) {
      vp.setAttribute(
        "transform",
        `translate(${panX}, ${panY}) scale(${zoom})`
      );
    }

    if (zoomLevelTextRef.current) {
      zoomLevelTextRef.current.textContent = `${Math.round(zoom * 100)}%`;
    }

    const svgWrap = wrapperRef.current;
    if (svgWrap) {
      const gridSize = Math.max(8, 24 * zoom);
      const offsetX = ((panX % gridSize) + gridSize) % gridSize;
      const offsetY = ((panY % gridSize) + gridSize) % gridSize;
      svgWrap.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
      svgWrap.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    }
  };

  const getSvgPoint = (ev: MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = 920 / rect.width;
    const scaleY = 460 / rect.height;
    const rawX = (ev.clientX - rect.left) * scaleX;
    const rawY = (ev.clientY - rect.top) * scaleY;
    return {
      x: Math.round((rawX - panRef.current.x) / zoomRef.current),
      y: Math.round((rawY - panRef.current.y) / zoomRef.current),
    };
  };

  // Zoom to Fit: centers graph perfectly inside 920x460 viewBox with start arrow & loop clearance
  const zoomToFit = () => {
    const states = statesRef.current;
    if (!states || states.length === 0) {
      panRef.current.x = 0;
      panRef.current.y = 0;
      zoomRef.current = 1;
      updateViewportTransform();
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    states.forEach((s) => {
      const leftBound = s.isStart
        ? s.x - STATE_RADIUS - 80
        : s.x - STATE_RADIUS;
      const rightBound = s.x + STATE_RADIUS;
      const topBound = s.y - STATE_RADIUS - 40; // room for top self-loops
      const bottomBound = s.y + STATE_RADIUS + (s.sub ? 30 : 15);

      if (leftBound < minX) minX = leftBound;
      if (rightBound > maxX) maxX = rightBound;
      if (topBound < minY) minY = topBound;
      if (bottomBound > maxY) maxY = bottomBound;
    });

    const pad = 40;
    const width = Math.max(120, maxX - minX + pad * 2);
    const height = Math.max(120, maxY - minY + pad * 2);
    const zX = 920 / width;
    const zY = 460 / height;
    const zoom = Math.max(0.04, Math.min(1.35, Math.min(zX, zY)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    zoomRef.current = zoom;
    panRef.current.x = Math.round(460 - cx * zoom);
    panRef.current.y = Math.round(230 - cy * zoom);
    updateViewportTransform();
  };

  const handleZoomStep = (factor: number) => {
    const zoom = zoomRef.current;
    const newZoom = Math.max(0.04, Math.min(8.0, +(zoom * factor).toFixed(3)));
    panRef.current.x = Math.round(
      460 - (460 - panRef.current.x) * (newZoom / zoom)
    );
    panRef.current.y = Math.round(
      230 - (230 - panRef.current.y) * (newZoom / zoom)
    );
    zoomRef.current = newZoom;
    updateViewportTransform();
  };

  const selectItem = (item: { type: "state" | "edge"; id: string } | null) => {
    const isSame =
      (selectedItemRef.current === null && item === null) ||
      (selectedItemRef.current?.type === item?.type &&
        selectedItemRef.current?.id === item?.id);
    if (isSame) return;

    selectedItemRef.current = item;
    renderCanvasGraph();
    onSelectItem?.(item);
  };

  // Canvas graph rendering matching material/interactive_dfa_studio_c_lexical_analyzer.html exactly
  const renderCanvasGraph = () => {
    const edgesLayer = edgesLayerRef.current;
    const nodesLayer = nodesLayerRef.current;
    if (!edgesLayer || !nodesLayer) return;

    edgesLayer.innerHTML = "";
    nodesLayer.innerHTML = "";

    const states = statesRef.current;
    const edges = edgesRef.current;
    const selectedItem = selectedItemRef.current;
    const stateMap: Record<string, CanvasStateNode> = {};
    states.forEach((s) => {
      stateMap[s.id] = s;
    });

    // 1. Render Start State Arrow
    states
      .filter((s) => s.isStart)
      .forEach((s) => {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const x1 = s.x - STATE_RADIUS - 54;
        const x2 = s.x - STATE_RADIUS - 3;
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );
        line.setAttribute("x1", String(x1));
        line.setAttribute("y1", String(s.y));
        line.setAttribute("x2", String(x2));
        line.setAttribute("y2", String(s.y));
        line.setAttribute("stroke", isDark ? "#38bdf8" : "#0284c7");
        line.setAttribute("stroke-width", "3.6");
        line.setAttribute("marker-end", "url(#arrow-start)");
        g.appendChild(line);

        const txt = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        txt.setAttribute("x", String(x1 - 8));
        txt.setAttribute("y", String(s.y + 5));
        txt.setAttribute("text-anchor", "end");
        txt.setAttribute("fill", isDark ? "#38bdf8" : "#0284c7");
        txt.setAttribute("font-size", "13.5");
        txt.setAttribute("font-family", "JetBrains Mono, monospace");
        txt.setAttribute("font-weight", "800");
        txt.setAttribute("letter-spacing", "0.02em");
        txt.textContent = "start";
        g.appendChild(txt);
        edgesLayer.appendChild(g);
      });

    // 2. Render Edges
    edges.forEach((edge) => {
      const sFrom = stateMap[edge.from];
      const sTo = stateMap[edge.to];
      if (!sFrom || !sTo) return;

      const isSelected =
        selectedItem &&
        selectedItem.type === "edge" &&
        selectedItem.id === edge.id;
      const isSimActive =
        activeStateId &&
        activeStateId === edge.to &&
        prevActiveStateIdRef.current === edge.from;
      const isToTrap = sTo.isTrap;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "edge-group");
      g.dataset.edgeId = edge.id;

      const geom = GraphRenderer.getEdgeGeometry(
        { id: sFrom.id, x: sFrom.x, y: sFrom.y },
        { id: sTo.id, x: sTo.x, y: sTo.y },
        {
          curve: edge.curve,
          labelPos: edge.labelPos,
          stateRadius: STATE_RADIUS,
        }
      );
      if (!geom) return;

      const pathD = geom.pathD;
      const labelX = geom.labelX;
      const labelY = geom.labelY;

      let strokeColor = isDark ? "#cbd5e1" : "#1e293b";
      let markerUrl = "url(#arrow-normal)";
      let strokeWidth = "3.4";

      if (isSimActive) {
        strokeColor = isDark ? "#4ade80" : "#16a34a";
        markerUrl = "url(#arrow-active)";
        strokeWidth = "4.2";
      } else if (isSelected) {
        strokeColor = "#0284c7";
        markerUrl = "url(#arrow-selected)";
        strokeWidth = "3.8";
      } else if (isToTrap) {
        strokeColor = isDark ? "#fb7185" : "#e11d48";
        markerUrl = "url(#arrow-dead)";
        strokeWidth = "2.8";
      }

      // Transparent wide hit path for effortless curve dragging
      const hitPath = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      hitPath.setAttribute("d", pathD);
      hitPath.setAttribute("fill", "none");
      hitPath.setAttribute("stroke", "transparent");
      hitPath.setAttribute("stroke-width", "18");
      hitPath.setAttribute("class", "edge-hit-path");
      hitPath.style.cursor = "grab";
      hitPath.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        selectItem({ type: "edge", id: edge.id });
        draggingCurveEdgeIdRef.current = edge.id;
        hitPath.style.cursor = "grabbing";
        if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";
      });
      g.appendChild(hitPath);

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", strokeWidth);
      if (isToTrap && !isSelected && !isSimActive) {
        path.setAttribute("stroke-dasharray", "7,5");
      }
      path.setAttribute("marker-end", markerUrl);
      path.setAttribute("class", "edge-path");
      path.style.cursor = "grab";
      path.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        selectItem({ type: "edge", id: edge.id });
        draggingCurveEdgeIdRef.current = edge.id;
        path.style.cursor = "grabbing";
        if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";
      });
      path.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectItem({ type: "edge", id: edge.id });
      });
      g.appendChild(path);

      // Curve Control Handle & Stretch Guide Line (shown when edge is selected)
      if (isSelected) {
        const handleG = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        handleG.setAttribute("class", "curve-handle-group");

        if (!geom.isSelf) {
          const guideLine = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
          );
          guideLine.setAttribute("x1", String(geom.baseMidX));
          guideLine.setAttribute("y1", String(geom.baseMidY));
          guideLine.setAttribute("x2", String(geom.apexX));
          guideLine.setAttribute("y2", String(geom.apexY));
          guideLine.setAttribute("stroke", "#0284c7");
          guideLine.setAttribute("stroke-width", "1.6");
          guideLine.setAttribute("stroke-dasharray", "3,3");
          guideLine.setAttribute("opacity", "0.75");
          guideLine.setAttribute("pointer-events", "none");
          handleG.appendChild(guideLine);

          const baseAnchor = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
          );
          baseAnchor.setAttribute("cx", String(geom.baseMidX));
          baseAnchor.setAttribute("cy", String(geom.baseMidY));
          baseAnchor.setAttribute("r", "3.5");
          baseAnchor.setAttribute("fill", isDark ? "#64748b" : "#94a3b8");
          baseAnchor.setAttribute("pointer-events", "none");
          handleG.appendChild(baseAnchor);
        }

        const handleHit = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        handleHit.setAttribute("cx", String(geom.apexX));
        handleHit.setAttribute("cy", String(geom.apexY));
        handleHit.setAttribute("r", "16");
        handleHit.setAttribute("fill", "transparent");
        handleHit.style.cursor = "grab";
        handleG.appendChild(handleHit);

        const ring = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        ring.setAttribute("cx", String(geom.apexX));
        ring.setAttribute("cy", String(geom.apexY));
        ring.setAttribute("r", "10");
        ring.setAttribute("fill", "rgba(2, 132, 199, 0.2)");
        ring.setAttribute("stroke", "#0284c7");
        ring.setAttribute("stroke-width", "1");
        ring.setAttribute("stroke-opacity", "0.4");
        ring.setAttribute("pointer-events", "none");
        handleG.appendChild(ring);

        const dot = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        dot.setAttribute("cx", String(geom.apexX));
        dot.setAttribute("cy", String(geom.apexY));
        dot.setAttribute("r", "6");
        dot.setAttribute("fill", "#0284c7");
        dot.setAttribute("stroke", "#ffffff");
        dot.setAttribute("stroke-width", "2.2");
        dot.setAttribute("class", "curve-handle-dot");
        dot.style.cursor = "grab";
        handleG.appendChild(dot);

        // Tooltip pill (e.g. "+35px" or "Straight")
        const curVal = edge.curve || 0;
        const tipText =
          curVal === 0
            ? "0 (Straight)"
            : curVal > 0
              ? `+${curVal}px`
              : `${curVal}px`;
        const tipW = Math.max(34, tipText.length * 6.5 + 14);
        const tipH = 16;
        const tipY = geom.apexY - 16;

        const tipBg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        tipBg.setAttribute("x", String(geom.apexX - tipW / 2));
        tipBg.setAttribute("y", String(tipY - tipH / 2));
        tipBg.setAttribute("width", String(tipW));
        tipBg.setAttribute("height", String(tipH));
        tipBg.setAttribute("rx", "4");
        tipBg.setAttribute("fill", isDark ? "#0284c7" : "#0f172a");
        tipBg.setAttribute("opacity", "0.9");
        tipBg.setAttribute("pointer-events", "none");
        handleG.appendChild(tipBg);

        const tipTxt = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        tipTxt.setAttribute("x", String(geom.apexX));
        tipTxt.setAttribute("y", String(tipY + 3.5));
        tipTxt.setAttribute("text-anchor", "middle");
        tipTxt.setAttribute("fill", "#ffffff");
        tipTxt.setAttribute("font-size", "9.5");
        tipTxt.setAttribute("font-family", "JetBrains Mono, monospace");
        tipTxt.setAttribute("font-weight", "600");
        tipTxt.setAttribute("pointer-events", "none");
        tipTxt.textContent = tipText;
        handleG.appendChild(tipTxt);

        handleG.addEventListener("mousedown", (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          selectItem({ type: "edge", id: edge.id });
          draggingCurveEdgeIdRef.current = edge.id;
          dot.style.cursor = "grabbing";
          handleHit.style.cursor = "grabbing";
          if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";
        });

        g.appendChild(handleG);
      }

      // Movable Label Pill Group (Dead-centered mathematically in rect)
      const labelText = edge.label || "ε";
      const pillW = Math.max(34, labelText.length * 8.6 + 20);
      const pillH = 25;

      const labelG = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
      );
      labelG.setAttribute("class", "edge-label-group");

      const hitRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      hitRect.setAttribute("x", String(labelX - pillW / 2 - 4));
      hitRect.setAttribute("y", String(labelY - pillH / 2 - 4));
      hitRect.setAttribute("width", String(pillW + 8));
      hitRect.setAttribute("height", String(pillH + 8));
      hitRect.setAttribute("fill", "transparent");
      hitRect.setAttribute("cursor", "grab");
      labelG.appendChild(hitRect);

      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("x", String(labelX - pillW / 2));
      rect.setAttribute("y", String(labelY - pillH / 2));
      rect.setAttribute("width", String(pillW));
      rect.setAttribute("height", String(pillH));
      rect.setAttribute("rx", "6.5");
      rect.setAttribute(
        "fill",
        isSimActive
          ? isDark
            ? "#064e3b"
            : "#dcfce7"
          : isDark
            ? "#0f172a"
            : "#ffffff"
      );
      rect.setAttribute(
        "stroke",
        isSimActive
          ? isDark
            ? "#34d399"
            : "#16a34a"
          : isSelected
            ? "#0284c7"
            : isToTrap
              ? isDark
                ? "#fb7185"
                : "#f43f5e"
              : isDark
                ? "#475569"
                : "#cbd5e1"
      );
      rect.setAttribute(
        "stroke-width",
        isSelected || isSimActive ? "2.8" : "2.2"
      );
      rect.setAttribute("class", "edge-label-bg");
      labelG.appendChild(rect);

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      text.setAttribute("x", String(labelX));
      text.setAttribute("y", String(labelY + 4.5));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute(
        "fill",
        isSimActive
          ? isDark
            ? "#86efac"
            : "#15803d"
          : isToTrap
            ? isDark
              ? "#fda4af"
              : "#be123c"
            : isDark
              ? "#f8fafc"
              : "#0f172a"
      );
      text.setAttribute("font-size", "13.5");
      text.setAttribute("class", "edge-label-text");
      text.setAttribute("font-family", "JetBrains Mono, monospace");
      text.setAttribute("font-weight", "800");
      text.setAttribute("letter-spacing", "0.01em");
      text.setAttribute("pointer-events", "none");
      text.textContent = labelText;
      labelG.appendChild(text);

      labelG.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        ev.preventDefault();
        selectItem({ type: "edge", id: edge.id });
        draggingEdgeLabelIdRef.current = edge.id;
        labelG.style.cursor = "grabbing";
        hitRect.setAttribute("cursor", "grabbing");
        if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";
      });

      g.appendChild(labelG);

      g.addEventListener("click", (ev) => {
        ev.stopPropagation();
        selectItem({ type: "edge", id: edge.id });
      });

      edgesLayer.appendChild(g);
    });

    // 3. Render State Nodes
    states.forEach((state) => {
      const isSelected =
        selectedItem &&
        selectedItem.type === "state" &&
        selectedItem.id === state.id;
      const isSimCurrent = activeStateId === state.id;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute(
        "class",
        `state-node ${isSimCurrent ? "active-sim-state" : ""}`
      );
      g.setAttribute("transform", `translate(${state.x}, ${state.y})`);
      g.dataset.stateId = state.id;

      let fill = isDark ? "#1e293b" : "#ffffff";
      let stroke = isDark ? "#94a3b8" : "#334155";
      if (state.isTrap) {
        fill = isDark ? "#4c0519" : "#fff1f2";
        stroke = isDark ? "#f43f5e" : "#e11d48";
      } else if (state.isAccept) {
        fill = isDark ? "#064e3b" : "#ecfdf5";
        stroke = isDark ? "#34d399" : "#059669";
      } else if (state.isStart) {
        fill = isDark ? "#0c4a6e" : "#f0f9ff";
        stroke = isDark ? "#38bdf8" : "#0284c7";
      }

      if (isSelected) {
        stroke = "#0284c7";
      }
      if (isSimCurrent) {
        stroke = "#16a34a";
      }

      // Outer circle
      const outer = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      outer.setAttribute("r", String(STATE_RADIUS));
      outer.setAttribute("fill", fill);
      outer.setAttribute("stroke", stroke);
      outer.setAttribute(
        "stroke-width",
        isSelected || isSimCurrent ? "3.2" : "2.4"
      );
      outer.setAttribute("class", "state-outer");
      g.appendChild(outer);

      // Inner double circle for accepting states
      if (state.isAccept) {
        const inner = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "circle"
        );
        inner.setAttribute("r", String(STATE_RADIUS - 5.5));
        inner.setAttribute("fill", "none");
        inner.setAttribute(
          "stroke",
          isSimCurrent ? "#16a34a" : isDark ? "#34d399" : "#059669"
        );
        inner.setAttribute("stroke-width", "2");
        g.appendChild(inner);
      }

      // State ID / Name - mathematically and optically centered
      const label = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text"
      );
      label.setAttribute("y", state.sub ? "2" : "5");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute(
        "fill",
        state.isTrap
          ? isDark
            ? "#fda4af"
            : "#9f1239"
          : state.isStart
            ? isDark
              ? "#e0f2fe"
              : "#0369a1"
            : state.isAccept
              ? isDark
                ? "#d1fae5"
                : "#047857"
              : isDark
                ? "#f8fafc"
                : "#0f172a"
      );
      label.setAttribute("font-size", state.label.length > 3 ? "12" : "13.5");
      label.setAttribute("font-family", "JetBrains Mono, monospace");
      label.setAttribute("font-weight", "700");
      label.textContent = state.label;
      g.appendChild(label);

      // Sub-label below node (clean text floating at y=45, never obstructing node)
      if (state.sub) {
        const subPill = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        subPill.setAttribute("y", String(STATE_RADIUS + 15));
        subPill.setAttribute("text-anchor", "middle");
        subPill.setAttribute(
          "fill",
          state.isAccept
            ? isDark
              ? "#6ee7b7"
              : "#047857"
            : state.isTrap
              ? isDark
                ? "#fda4af"
                : "#be123c"
              : isDark
                ? "#94a3b8"
                : "#475569"
        );
        subPill.setAttribute("font-size", "11");
        subPill.setAttribute("font-weight", "500");
        subPill.textContent = state.sub;
        g.appendChild(subPill);
      }

      // Node mouse events for dragging
      g.addEventListener("mousedown", (ev) => {
        ev.stopPropagation();
        selectItem({ type: "state", id: state.id });
        draggingStateIdRef.current = state.id;
        const pt = getSvgPoint(ev);
        dragOffsetRef.current.x = pt.x - state.x;
        dragOffsetRef.current.y = pt.y - state.y;
      });

      nodesLayer.appendChild(g);
    });
  };

  // Seeding graph model and initial layout
  const initModelLayout = () => {
    if (!graphModel || !graphModel.states || graphModel.states.length === 0)
      return;

    const computed = GraphRenderer.computeLayout(
      graphModel.states,
      graphModel.transitions,
      graphModel.startState,
      920,
      460
    );

    const mergedTransitions = GraphRenderer.mergeTransitions(
      graphModel.transitions
    );

    statesRef.current = graphModel.states.map((s) => {
      const pos = computed.get(s.id) || { x: 460, y: 230 };
      const isStart = s.isStart || s.id === graphModel.startState;
      const isAccept = s.isAccept || graphModel.acceptStates?.includes(s.id);
      const isTrap = isTrapState(s.id);
      return {
        id: s.id,
        label:
          s.id === "Φ" || s.label === "Φ" || s.name === "Φ"
            ? "φ"
            : s.name || s.label || s.id,
        sub: s.sub || "",
        isStart,
        isAccept,
        isTrap,
        x: pos.x,
        y: pos.y,
      };
    });

    edgesRef.current = mergedTransitions.map((t) => {
      const id = `${t.from}->${t.to}`;
      const isSelf = t.from === t.to;
      const fromPos = computed.get(t.from) || { x: 460, y: 230 };
      const toPos = computed.get(t.to) || { x: 460, y: 230 };
      const dx = toPos.x - fromPos.x;
      const hasOpposite =
        !isSelf &&
        graphModel.transitions.some((o) => o.from === t.to && o.to === t.from);
      const isBackEdge = !isSelf && dx < -10;
      const isForwardBypass = !isSelf && !hasOpposite && dx > 240;

      let defaultCurve = 0;
      if (isSelf) {
        defaultCurve = isTrapState(t.from) ? 45 : -45;
      } else if (hasOpposite) {
        defaultCurve = 38;
      } else if (isBackEdge) {
        defaultCurve = -48;
      } else if (isForwardBypass) {
        defaultCurve = 45;
      }

      return {
        id,
        from: t.from,
        to: t.to,
        label: t.symbol || "ε",
        curve: defaultCurve,
        labelPos: 0.5,
      };
    });

    if (selectedItemRef.current !== null) {
      selectedItemRef.current = null;
      onSelectItem?.(null);
    }
    zoomToFit();
    renderCanvasGraph();
    onSyncModel?.(statesRef.current, edgesRef.current);
  };

  useEffect(() => {
    if (graphModel && graphModel !== prevGraphModelRef.current) {
      prevGraphModelRef.current = graphModel;
      initModelLayout();
    }
  }, [graphModel]);

  // Sync external model updates from InspectorCard (guarded against echo re-renders)
  useEffect(() => {
    if (
      externalStates &&
      externalStates.length > 0 &&
      externalStates !== statesRef.current
    ) {
      statesRef.current = externalStates;
      renderCanvasGraph();
    }
  }, [externalStates]);

  useEffect(() => {
    if (externalEdges && externalEdges !== edgesRef.current) {
      edgesRef.current = externalEdges;
      renderCanvasGraph();
    }
  }, [externalEdges]);

  // Sync external selection
  useEffect(() => {
    if (selectedItem !== undefined) {
      const isSame =
        (selectedItemRef.current === null && selectedItem === null) ||
        (selectedItemRef.current?.type === selectedItem?.type &&
          selectedItemRef.current?.id === selectedItem?.id);
      if (!isSame) {
        selectedItemRef.current = selectedItem;
        renderCanvasGraph();
      }
    }
  }, [selectedItem]);

  // Re-render when active state or dark mode changes
  useEffect(() => {
    renderCanvasGraph();
    prevActiveStateIdRef.current = activeStateId;
  }, [activeStateId, isDark]);

  // Set default selection when transition modal opens
  useEffect(() => {
    if (isTransitionModalOpen && statesRef.current.length > 0) {
      if (selectedItemRef.current && selectedItemRef.current.type === "state") {
        setModalFrom(selectedItemRef.current.id);
      } else if (
        !modalFrom ||
        !statesRef.current.some((s) => s.id === modalFrom)
      ) {
        setModalFrom(statesRef.current[0].id);
      }
      if (!modalTo || !statesRef.current.some((s) => s.id === modalTo)) {
        setModalTo(
          statesRef.current[Math.min(1, statesRef.current.length - 1)].id
        );
      }
    }
  }, [isTransitionModalOpen]);

  // Global mouse & keyboard events for fluid pan/zoom/drag
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      if (
        ev.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (document.activeElement as HTMLElement)?.tagName
        )
      ) {
        isSpacePressedRef.current = true;
        if (wrapperRef.current) wrapperRef.current.style.cursor = "grab";
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.code === "Space") {
        isSpacePressedRef.current = false;
        if (wrapperRef.current) wrapperRef.current.style.cursor = "";
      }
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (isPanningRef.current) {
        panRef.current.x = ev.clientX - panStartRef.current.x;
        panRef.current.y = ev.clientY - panStartRef.current.y;
        if (!rAFScheduledRef.current) {
          rAFScheduledRef.current = true;
          requestAnimationFrame(() => {
            rAFScheduledRef.current = false;
            updateViewportTransform();
          });
        }
      } else if (draggingStateIdRef.current) {
        const st = statesRef.current.find(
          (s) => s.id === draggingStateIdRef.current
        );
        if (st) {
          const pt = getSvgPoint(ev);
          st.x = Math.round(pt.x - dragOffsetRef.current.x);
          st.y = Math.round(pt.y - dragOffsetRef.current.y);
          if (!rAFScheduledRef.current) {
            rAFScheduledRef.current = true;
            requestAnimationFrame(() => {
              rAFScheduledRef.current = false;
              renderCanvasGraph();
            });
          }
        }
      } else if (draggingCurveEdgeIdRef.current) {
        const ed = edgesRef.current.find(
          (e) => e.id === draggingCurveEdgeIdRef.current
        );
        if (ed) {
          const sFrom = statesRef.current.find((s) => s.id === ed.from);
          const sTo = statesRef.current.find((s) => s.id === ed.to);
          if (sFrom && sTo) {
            const pt = getSvgPoint(ev);
            if (ed.from === ed.to) {
              const isBottom = ed.curve > 0;
              const dy = isBottom ? pt.y - sFrom.y : sFrom.y - pt.y;
              const rawHeight = Math.max(15, dy - STATE_RADIUS);
              const curveVal = Math.max(
                10,
                Math.min(
                  350,
                  Math.round(
                    (rawHeight - (isBottom ? 56 : 52)) /
                      (isBottom ? 0.38 : 0.35)
                  )
                )
              );
              ed.curve = isBottom ? curveVal : -curveVal;
            } else {
              const dx = sTo.x - sFrom.x;
              const dy = sTo.y - sFrom.y;
              const dist = Math.hypot(dx, dy) || 1;
              const nx = -dy / dist;
              const ny = dx / dist;
              const baseMidX = (sFrom.x + sTo.x) / 2;
              const baseMidY = (sFrom.y + sTo.y) / 2;
              const d = (pt.x - baseMidX) * nx + (pt.y - baseMidY) * ny;
              const newCurve = Math.round(d * 2);
              ed.curve = Math.max(-450, Math.min(450, newCurve));
            }
            if (!rAFScheduledRef.current) {
              rAFScheduledRef.current = true;
              requestAnimationFrame(() => {
                rAFScheduledRef.current = false;
                renderCanvasGraph();
              });
            }
          }
        }
      } else if (draggingEdgeLabelIdRef.current) {
        const ed = edgesRef.current.find(
          (e) => e.id === draggingEdgeLabelIdRef.current
        );
        if (ed) {
          const sFrom = statesRef.current.find((s) => s.id === ed.from);
          const sTo = statesRef.current.find((s) => s.id === ed.to);
          if (sFrom && sTo) {
            const pt = getSvgPoint(ev);
            const newT = GraphRenderer.computeClosestTOnEdge(
              { id: sFrom.id, x: sFrom.x, y: sFrom.y },
              { id: sTo.id, x: sTo.x, y: sTo.y },
              pt,
              { curve: ed.curve, stateRadius: STATE_RADIUS }
            );
            ed.labelPos = newT;
            if (!rAFScheduledRef.current) {
              rAFScheduledRef.current = true;
              requestAnimationFrame(() => {
                rAFScheduledRef.current = false;
                renderCanvasGraph();
              });
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      const hadDrag =
        draggingStateIdRef.current ||
        draggingCurveEdgeIdRef.current ||
        draggingEdgeLabelIdRef.current;
      draggingStateIdRef.current = null;
      draggingCurveEdgeIdRef.current = null;
      draggingEdgeLabelIdRef.current = null;
      isPanningRef.current = false;
      if (wrapperRef.current) {
        wrapperRef.current.style.cursor = isSpacePressedRef.current
          ? "grab"
          : "";
      }
      if (hadDrag) {
        const copyStates = [...statesRef.current];
        const copyEdges = [...edgesRef.current];
        statesRef.current = copyStates;
        edgesRef.current = copyEdges;
        onSyncModel?.(copyStates, copyEdges);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Anchored pointer wheel zoom
  const handleWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseSvgX = (ev.clientX - rect.left) * (920 / rect.width);
    const mouseSvgY = (ev.clientY - rect.top) * (460 / rect.height);

    const factor = ev.deltaY < 0 ? 1.15 : 0.8695;
    const zoom = zoomRef.current;
    const newZoom = Math.max(0.04, Math.min(8.0, +(zoom * factor).toFixed(3)));

    panRef.current.x =
      mouseSvgX - (mouseSvgX - panRef.current.x) * (newZoom / zoom);
    panRef.current.y =
      mouseSvgY - (mouseSvgY - panRef.current.y) * (newZoom / zoom);
    zoomRef.current = newZoom;
    updateViewportTransform();
  };

  const handleSvgMouseDown = (ev: MouseEvent) => {
    const isMiddleClick = ev.button === 1;
    const isSpacePan = isSpacePressedRef.current && ev.button === 0;
    const target = ev.target as SVGElement;
    const isBgClick =
      target === svgRef.current ||
      target.id === "edgesLayer" ||
      target.id === "nodesLayer" ||
      target.id === "viewportGroup";

    if (isMiddleClick || isSpacePan || isBgClick) {
      if (isBgClick && !isSpacePan && !isMiddleClick) {
        selectItem(null);
      }
      isPanningRef.current = true;
      panStartRef.current.x = ev.clientX - panRef.current.x;
      panStartRef.current.y = ev.clientY - panRef.current.y;
      if (wrapperRef.current) wrapperRef.current.style.cursor = "grabbing";
      ev.preventDefault();
    }
  };

  const handleSvgDoubleClick = (ev: MouseEvent) => {
    const target = ev.target as SVGElement;
    const isBgClick =
      target === svgRef.current ||
      target.id === "edgesLayer" ||
      target.id === "nodesLayer" ||
      target.id === "viewportGroup";
    if (!isBgClick) return;
    const pt = getSvgPoint(ev);
    onCreateState?.(pt.x, pt.y);
  };

  const handleCreateStateAtCenter = () => {
    const centerX = Math.round((460 - panRef.current.x) / zoomRef.current);
    const centerY = Math.round((230 - panRef.current.y) / zoomRef.current);
    onCreateState?.(centerX, centerY);
  };

  const handleResetLayout = () => {
    initModelLayout();
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col transition-colors">
      {/* Canvas Header Control Bar */}
      <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-700 dark:text-sky-400 mono">
            {stageTitle}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium hidden sm:inline">
            Drag states • Click edge to bend curve • Drag label pill along arc •
            Wheel to zoom
          </span>
        </div>

        {/* Creation & Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="btnAddState"
            onClick={handleCreateStateAtCenter}
            className="px-2.5 h-7 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 transition cursor-pointer"
            title="Add a new state at center (or double-click anywhere on canvas)"
          >
            <span>+ State</span>
          </button>
          <button
            type="button"
            id="btnAddTransition"
            onClick={() => setIsTransitionModalOpen(true)}
            className="px-2.5 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 font-bold text-[11px] shadow-2xs flex items-center gap-1 transition cursor-pointer"
            title="Create a transition between two states"
          >
            <span>+ Transition</span>
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
          <button
            type="button"
            onClick={zoomToFit}
            className="px-2.5 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-[11px] shadow-2xs transition cursor-pointer"
            title="Auto-fit entire diagram into canvas"
          >
            Fit View
          </button>
          <button
            type="button"
            onClick={handleResetLayout}
            className="px-2.5 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold text-[11px] shadow-2xs transition cursor-pointer"
            title="Reset to default collision-free academic layout"
          >
            ↺ Reset Layout
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5"></div>
          <button
            type="button"
            onClick={() => handleZoomStep(0.85)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold flex items-center justify-center text-sm shadow-2xs transition cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
          <span
            ref={zoomLevelTextRef}
            className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 w-12 text-center select-none"
          >
            100%
          </span>
          <button
            type="button"
            onClick={() => handleZoomStep(1.15)}
            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold flex items-center justify-center text-sm shadow-2xs transition cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>

      {/* SVG Diagram Container with Synchronized Dynamic Grid */}
      <div
        ref={wrapperRef}
        id="svgWrapper"
        onWheel={handleWheel}
        className={`relative w-full h-[500px] sm:h-[580px] ${
          isDark ? "canvas-bg-dark" : "canvas-bg"
        } overflow-hidden select-none transition-colors`}
      >
        <svg
          ref={svgRef}
          id="dfaSvg"
          className="w-full h-full block"
          viewBox="0 0 920 460"
          xmlns="http://www.w3.org/2000/svg"
          onMouseDown={handleSvgMouseDown}
          onDblClick={handleSvgDoubleClick}
        >
          <defs>
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 9 5 L 0 8.5 z"
                fill={isDark ? "#cbd5e1" : "#1e293b"}
              />
            </marker>
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0284c7" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 9 5 L 0 8.5 z"
                fill={isDark ? "#4ade80" : "#16a34a"}
              />
            </marker>
            <marker
              id="arrow-dead"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 9 5 L 0 8.5 z"
                fill={isDark ? "#fb7185" : "#e11d48"}
              />
            </marker>
            <marker
              id="arrow-start"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto"
            >
              <path
                d="M 0 1.5 L 9 5 L 0 8.5 z"
                fill={isDark ? "#38bdf8" : "#0284c7"}
              />
            </marker>
          </defs>
          <g ref={viewportGroupRef} id="viewportGroup">
            <g ref={edgesLayerRef} id="edgesLayer" />
            <g ref={nodesLayerRef} id="nodesLayer" />
          </g>
        </svg>

        {/* Legend Overlay (Bottom Left) */}
        <div className="absolute bottom-2.5 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200 dark:border-slate-800 shadow-xs rounded-lg px-3 py-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-700 dark:text-slate-200 pointer-events-none transition-colors">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-sky-600 dark:border-sky-500 bg-sky-50 dark:bg-sky-950 inline-block"></span>{" "}
            Start State
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950 inline-flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500"></span>
            </span>{" "}
            Accepting (Double Circle)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-rose-600 dark:border-rose-500 bg-rose-50 dark:bg-rose-950 inline-block"></span>{" "}
            Dead / Trap State (φ)
          </span>
        </div>

        {/* Quick Add Transition Floating Modal */}
        {isTransitionModalOpen && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs z-30 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-4 flex flex-col gap-3 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="text-sky-600 dark:text-sky-400">➔</span>{" "}
                  Create Transition
                </span>
                <button
                  type="button"
                  onClick={() => setIsTransitionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 text-sm cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    From State
                  </label>
                  <select
                    id="modalFromState"
                    value={modalFrom}
                    onChange={(e) =>
                      setModalFrom((e.target as HTMLSelectElement).value)
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono font-bold text-slate-900 dark:text-slate-100"
                  >
                    {statesRef.current.map((s) => (
                      <option key={`mfrom-${s.id}`} value={s.id}>
                        {s.label} {s.sub ? `(${s.sub})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    To State
                  </label>
                  <select
                    id="modalToState"
                    value={modalTo}
                    onChange={(e) =>
                      setModalTo((e.target as HTMLSelectElement).value)
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono font-bold text-slate-900 dark:text-slate-100"
                  >
                    {statesRef.current.map((s) => (
                      <option key={`mto-${s.id}`} value={s.id}>
                        {s.label} {s.sub ? `(${s.sub})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Transition Symbol (e.g. a, b, 0, 1, ε)
                </label>
                <input
                  id="modalTransitionSymbol"
                  type="text"
                  value={modalSymbol}
                  onInput={(e) =>
                    setModalSymbol((e.target as HTMLInputElement).value)
                  }
                  placeholder="e.g. a or ε"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransitionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btnSubmitModalTransition"
                  onClick={() => {
                    const from =
                      modalFrom ||
                      (statesRef.current[0] ? statesRef.current[0].id : "");
                    const to = modalTo || from;
                    if (from && to) {
                      onCreateTransition?.(from, to, modalSymbol.trim() || "ε");
                      setIsTransitionModalOpen(false);
                      setModalSymbol("");
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  Add Transition
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
