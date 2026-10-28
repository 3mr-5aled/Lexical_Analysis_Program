import { config } from "../config/export.config";
import logoUrl from "../assets/logo.png";
import { GraphRenderer } from "./graph-renderer";

export interface CleanSvgResult {
  markup: string;
  width: number;
  height: number;
}

export interface ExportOptions {
  isDark?: boolean;
  graphModel?: any;
}

const STATE_RADIUS = 30;

/**
 * Trigger browser file download from Blob or string content.
 */
export function downloadBlob(
  content: BlobPart,
  filename: string,
  mimeType: string
): void {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Computes an analytical + DOM bounding box, clones the canvas SVG,
 * strips viewport pan/zoom transforms, removes interactive editor handles,
 * adds solid background, and injects logo + app name watermark if enabled in config.
 */
export function getCleanSvgMarkup(
  options: ExportOptions = {}
): CleanSvgResult | null {
  const origSvg = document.getElementById("dfaSvg") as SVGSVGElement | null;
  if (!origSvg) return null;

  const isDark = Boolean(options.isDark);
  const graphModel = options.graphModel;

  // 1. Gather States and Edges
  let states: any[] = graphModel?.states || [];
  let edges: any[] = graphModel?.transitions || graphModel?.edges || [];

  if (!states || states.length === 0) {
    // Read directly from DOM nodes
    const nodeEls = origSvg.querySelectorAll("#nodesLayer .state-node");
    const domStates: any[] = [];
    nodeEls.forEach((el) => {
      const tr = el.getAttribute("transform") || "";
      const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(tr);
      const isStart =
        el.querySelector('path[d*="M -30"]') !== null ||
        el.classList.contains("is-start");
      const isAccept = el.querySelectorAll("circle").length > 1;
      const textEl = el.querySelector("text");
      const subEl = el.querySelectorAll("text")[1];
      if (match) {
        domStates.push({
          id:
            (el as HTMLElement).dataset.stateId ||
            (textEl ? textEl.textContent : ""),
          label: textEl ? textEl.textContent : "",
          sub: subEl ? subEl.textContent : "",
          x: parseFloat(match[1]),
          y: parseFloat(match[2]),
          isStart,
          isAccept,
        });
      }
    });
    if (domStates.length > 0) {
      states = domStates;
    }
  }

  // 2. Analytical Bounding Box
  let aMinX = Infinity;
  let aMinY = Infinity;
  let aMaxX = -Infinity;
  let aMaxY = -Infinity;

  if (states.length > 0) {
    states.forEach((s) => {
      const sx = Number.isFinite(Number(s.x)) ? Number(s.x) : 0;
      const sy = Number.isFinite(Number(s.y)) ? Number(s.y) : 0;

      // Node circle
      aMinX = Math.min(aMinX, sx - STATE_RADIUS);
      aMaxX = Math.max(aMaxX, sx + STATE_RADIUS);
      aMinY = Math.min(aMinY, sy - STATE_RADIUS);
      aMaxY = Math.max(aMaxY, sy + STATE_RADIUS);

      // Sub-label text
      if (s.sub) {
        const subW = String(s.sub).length * 7.5 + 24;
        aMinX = Math.min(aMinX, sx - subW / 2);
        aMaxX = Math.max(aMaxX, sx + subW / 2);
        aMaxY = Math.max(aMaxY, sy + STATE_RADIUS + 26);
      }

      // Start state arrow and text ("start")
      if (s.isStart) {
        aMinX = Math.min(aMinX, sx - STATE_RADIUS - 105);
        aMinY = Math.min(aMinY, sy - 18);
        aMaxY = Math.max(aMaxY, sy + 18);
      }
    });

    edges.forEach((e) => {
      const sFrom = states.find((s) => s.id === e.from);
      const sTo = states.find((s) => s.id === e.to);
      if (!sFrom || !sTo) return;

      const sFromX = Number.isFinite(Number(sFrom.x)) ? Number(sFrom.x) : 0;
      const sFromY = Number.isFinite(Number(sFrom.y)) ? Number(sFrom.y) : 0;
      const sToX = Number.isFinite(Number(sTo.x)) ? Number(sTo.x) : 0;
      const sToY = Number.isFinite(Number(sTo.y)) ? Number(sTo.y) : 0;

      const labelStr = e.label || e.symbol || "";
      const pillW = Math.max(34, labelStr.length * 8.6 + 22);
      const pillH = 26;

      const geom = GraphRenderer.getEdgeGeometry(
        { id: sFrom.id, x: sFromX, y: sFromY },
        { id: sTo.id, x: sToX, y: sToY },
        {
          curve: Number(e.curve) || 0,
          labelPos: Number.isFinite(Number(e.labelPos))
            ? Number(e.labelPos)
            : 0.5,
          stateRadius: STATE_RADIUS,
        }
      );
      if (!geom) return;

      if (geom.isSelf) {
        const dir = e.curve && e.curve > 0 ? 1 : -1;
        const loopHeight =
          dir < 0
            ? 52 + Math.abs(e.curve || -45) * 0.35
            : 56 + Math.abs(e.curve || 45) * 0.38;
        const ctrlSpread = dir < 0 ? 32 : 34;

        if (dir < 0) {
          const topApexY = sFromY - (STATE_RADIUS + loopHeight);
          if (Number.isFinite(topApexY)) aMinY = Math.min(aMinY, topApexY - 14);
        } else {
          const bottomApexY = sFromY + (STATE_RADIUS + loopHeight);
          if (Number.isFinite(bottomApexY))
            aMaxY = Math.max(aMaxY, bottomApexY + 14);
        }
        if (Number.isFinite(sFromX)) {
          aMinX = Math.min(aMinX, sFromX - ctrlSpread - 14);
          aMaxX = Math.max(aMaxX, sFromX + ctrlSpread + 14);
        }
      } else {
        if (Number.isFinite(geom.midX)) {
          aMinX = Math.min(aMinX, geom.midX - 12);
          aMaxX = Math.max(aMaxX, geom.midX + 12);
        }
        if (Number.isFinite(geom.midY)) {
          aMinY = Math.min(aMinY, geom.midY - 12);
          aMaxY = Math.max(aMaxY, geom.midY + 12);
        }
      }

      // Envelope label pill
      if (Number.isFinite(geom.labelX)) {
        aMinX = Math.min(aMinX, geom.labelX - pillW / 2 - 10);
        aMaxX = Math.max(aMaxX, geom.labelX + pillW / 2 + 10);
      }
      if (Number.isFinite(geom.labelY)) {
        aMinY = Math.min(aMinY, geom.labelY - pillH / 2 - 10);
        aMaxY = Math.max(aMaxY, geom.labelY + pillH / 2 + 10);
      }
    });
  }

  // 3. Check Live Viewport Group BBox
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let bboxFound = false;

  const liveVp = origSvg.querySelector(
    "#viewportGroup"
  ) as SVGGraphicsElement | null;
  if (liveVp && typeof liveVp.getBBox === "function") {
    try {
      const bb = liveVp.getBBox();
      if (
        bb &&
        Number.isFinite(bb.width) &&
        bb.width > 0 &&
        Number.isFinite(bb.height) &&
        bb.height > 0
      ) {
        minX = bb.x;
        minY = bb.y;
        maxX = bb.x + bb.width;
        maxY = bb.y + bb.height;
        bboxFound = true;
      }
    } catch {
      bboxFound = false;
    }
  }

  if (
    bboxFound &&
    Number.isFinite(minX) &&
    Number.isFinite(maxX) &&
    Number.isFinite(minY) &&
    Number.isFinite(maxY)
  ) {
    if (Number.isFinite(aMinX)) minX = Math.min(minX, aMinX);
    if (Number.isFinite(aMinY)) minY = Math.min(minY, aMinY);
    if (Number.isFinite(aMaxX)) maxX = Math.max(maxX, aMaxX);
    if (Number.isFinite(aMaxY)) maxY = Math.max(maxY, aMaxY);
  } else if (
    Number.isFinite(aMinX) &&
    Number.isFinite(aMaxX) &&
    aMinX < aMaxX
  ) {
    minX = aMinX;
    minY = aMinY;
    maxX = aMaxX;
    maxY = aMaxY;
  } else {
    minX = 0;
    minY = 0;
    maxX = 920;
    maxY = 460;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || minX >= maxX) {
    minX = 0;
    maxX = 920;
  }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || minY >= maxY) {
    minY = 0;
    maxY = 460;
  }

  // 4. Margins & Padding
  const PADDING = 60;
  const paddingLeft = PADDING;
  const paddingTop = PADDING;
  const paddingRight = config.watermark ? Math.max(PADDING, 85) : PADDING;
  const paddingBottom = config.watermark ? Math.max(PADDING, 78) : PADDING;

  minX = Math.floor(minX - paddingLeft);
  minY = Math.floor(minY - paddingTop);
  maxX = Math.ceil(maxX + paddingRight);
  maxY = Math.ceil(maxY + paddingBottom);

  const width = Math.max(500, maxX - minX);
  const height = Math.max(340, maxY - minY);

  // 5. Clone and Clean SVG
  const clone = origSvg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

  // Strip viewport pan/zoom transform
  const vp = clone.querySelector("#viewportGroup");
  if (vp) vp.removeAttribute("transform");

  // Strip interactive handles & hit areas
  clone.querySelectorAll(".curve-handle-group").forEach((el) => el.remove());
  clone.querySelectorAll(".curve-handle-dot").forEach((el) => el.remove());
  clone.querySelectorAll(".edge-hit-path").forEach((el) => el.remove());
  clone
    .querySelectorAll('rect[fill="transparent"]')
    .forEach((el) => el.remove());

  // Solid background
  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bgRect.setAttribute("x", String(minX));
  bgRect.setAttribute("y", String(minY));
  bgRect.setAttribute("width", String(width));
  bgRect.setAttribute("height", String(height));
  bgRect.setAttribute("fill", isDark ? "#0b1120" : "#ffffff");
  clone.insertBefore(bgRect, clone.firstChild);

  // Embedded typography styles
  const defs = clone.querySelector("defs") || clone;
  const styleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style"
  );
  styleEl.textContent = `
    .edge-label-text { font-family: 'JetBrains Mono', monospace; font-weight: 800 !important; font-size: 13.5px; fill: ${isDark ? "#f8fafc" : "#0f172a"}; }
    .edge-label-bg { fill: ${isDark ? "#0f172a" : "#ffffff"}; stroke: ${isDark ? "#475569" : "#cbd5e1"}; stroke-width: 2.2px; }
  `;
  defs.appendChild(styleEl);

  // 6. Watermark (Controlled by config.watermark)
  if (config.watermark) {
    const wmWidth = 135;
    const wmHeight = 22;
    const wmX = minX + width - wmWidth - 18;
    const wmY = minY + height - wmHeight - 14;

    const wmGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wmGroup.setAttribute("id", "exportWatermark");
    wmGroup.setAttribute("opacity", "0.9");

    // Logo image [ logo ]
    const wmImg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "image"
    );
    wmImg.setAttribute("href", logoUrl);
    wmImg.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", logoUrl);
    wmImg.setAttribute("x", String(wmX));
    wmImg.setAttribute("y", String(wmY));
    wmImg.setAttribute("width", "20");
    wmImg.setAttribute("height", "20");
    wmImg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    wmGroup.appendChild(wmImg);

    // App name text [ + name of the app ]
    const wmText = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    wmText.setAttribute("x", String(wmX + 26));
    wmText.setAttribute("y", String(wmY + 14));
    wmText.setAttribute(
      "font-family",
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    );
    wmText.setAttribute("font-size", "11.5");
    wmText.setAttribute("font-weight", "600");
    wmText.setAttribute("letter-spacing", "0.02em");
    wmText.setAttribute("fill", isDark ? "#94a3b8" : "#64748b");
    wmText.textContent = "Automata Studio";
    wmGroup.appendChild(wmText);

    clone.appendChild(wmGroup);
  }

  return {
    markup: new XMLSerializer().serializeToString(clone),
    width,
    height,
  };
}

/**
 * Export Vector SVG File
 */
export function exportSvgFile(
  presetName: string,
  isDark: boolean,
  graphModel?: any
): void {
  const result = getCleanSvgMarkup({ isDark, graphModel });
  if (!result) return;
  const safeName = (presetName || "diagram").replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadBlob(
    result.markup,
    `automata_${safeName}.svg`,
    "image/svg+xml;charset=utf-8"
  );
}

/**
 * Export High-Resolution PNG File (renders offscreen canvas scaled 2x-3x)
 */
export function exportPngFile(
  presetName: string,
  isDark: boolean,
  graphModel?: any
): Promise<boolean> {
  return new Promise((resolve) => {
    const result = getCleanSvgMarkup({ isDark, graphModel });
    if (!result) {
      resolve(false);
      return;
    }

    const { markup, width, height } = result;
    const img = new Image();
    // Using inline data URI prevents canvas taint on file:/// standalone execution
    const dataUri =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(markup);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxDim = Math.max(width, height);
        const scale = Math.min(3, Math.max(2.0, 2600 / maxDim));
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);

        try {
          const dataUrl = canvas.toDataURL("image/png");
          const safeName = (presetName || "diagram").replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );
          // Convert dataURL to blob for clean download
          const binStr = atob(dataUrl.split(",")[1]);
          const u8Arr = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) {
            u8Arr[i] = binStr.charCodeAt(i);
          }
          const pngBlob = new Blob([u8Arr], { type: "image/png" });
          downloadBlob(pngBlob, `automata_${safeName}.png`, "image/png");
          resolve(true);
        } catch (toDataUrlErr: any) {
          console.error("toDataURL failed:", toDataUrlErr?.message);
          resolve(false);
        }
      } catch (err) {
        console.error("exportPngFile error in onload:", err);
        resolve(false);
      }
    };

    img.onerror = (e) => {
      console.error("exportPngFile img.onerror:", e);
      resolve(false);
    };

    img.src = dataUri;
  });
}

/**
 * Generate JFLAP XML string
 */
export function generateJflapXml(presetName: string, graphModel: any): string {
  const states: any[] = graphModel?.states || [];
  const edges: any[] = graphModel?.transitions || graphModel?.edges || [];

  const idMap: Record<string, number> = {};
  states.forEach((s, idx) => {
    idMap[s.id] = idx;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<structure>\n  <type>fa</type>\n  <automaton>\n`;
  states.forEach((s, idx) => {
    const sName = s.label || s.name || s.id;
    const x = Math.round(s.x !== undefined ? s.x : (idx % 4) * 160 + 100);
    const y = Math.round(
      s.y !== undefined ? s.y : Math.floor(idx / 4) * 140 + 100
    );
    xml += `    <state id="${idx}" name="${escapeXml(sName)}">\n`;
    xml += `      <x>${x}</x>\n      <y>${y}</y>\n`;
    if (s.isStart) xml += `      <initial/>\n`;
    if (s.isAccept) xml += `      <final/>\n`;
    xml += `    </state>\n`;
  });

  edges.forEach((e) => {
    const fromIdx = idMap[e.from];
    const toIdx = idMap[e.to];
    if (fromIdx === undefined || toIdx === undefined) return;
    const label = e.label || e.symbol || "ε";
    xml += `    <transition>\n`;
    xml += `      <from>${fromIdx}</from>\n`;
    xml += `      <to>${toIdx}</to>\n`;
    xml += `      <read>${escapeXml(label)}</read>\n`;
    xml += `    </transition>\n`;
  });

  xml += `  </automaton>\n</structure>\n`;
  return xml;
}

/**
 * Export JFLAP Diagram (.jff)
 */
export function exportJflapFile(presetName: string, graphModel: any): void {
  const xml = generateJflapXml(presetName, graphModel);
  const safeName = (presetName || "diagram").replace(/[^a-zA-Z0-9_-]/g, "_");
  downloadBlob(xml, `automata_${safeName}.jff`, "application/xml");
}

/**
 * Generate Mermaid Diagram State Machine Code
 */
export function generateMermaidCode(graphModel: any): string {
  const states: any[] = graphModel?.states || [];
  const edges: any[] = graphModel?.transitions || graphModel?.edges || [];
  if (!states || states.length === 0) return "// No states available";

  const startState = states.find((s) => s.isStart) || states[0];
  const acceptStates = states.filter((s) => s.isAccept);

  let m = `stateDiagram-v2\n  direction LR\n`;
  if (startState) {
    const sLabel = startState.label || startState.name || startState.id;
    m += `  [*] --> ${sLabel}\n`;
  }

  states.forEach((s) => {
    const sLabel = s.label || s.name || s.id;
    if (s.sub) {
      m += `  ${sLabel} : ${sLabel} (${s.sub})\n`;
    }
  });

  edges.forEach((e) => {
    const sf = states.find((s) => s.id === e.from);
    const st = states.find((s) => s.id === e.to);
    const sfLabel = sf ? sf.label || sf.name || sf.id : e.from;
    const stLabel = st ? st.label || st.name || st.id : e.to;
    const lbl = e.label || e.symbol || "ε";
    m += `  ${sfLabel} --> ${stLabel} : ${lbl}\n`;
  });

  acceptStates.forEach((s) => {
    const sLabel = s.label || s.name || s.id;
    m += `  ${sLabel} --> [*]\n`;
  });

  return m;
}

/**
 * Generate C# Explicit DFA State Machine Code
 */
export function generateCsharpCode(
  graphModel: any,
  presetName: string = "Automata"
): string {
  const states: any[] = graphModel?.states || [];
  const edges: any[] = graphModel?.transitions || graphModel?.edges || [];
  const safeName = (presetName || "Automata").replace(/[^a-zA-Z0-9_]/g, "_");
  const startState = states.find((s) => s.isStart) || states[0];
  const acceptStates = states.filter((s) => s.isAccept);

  let cs = `// Auto-generated Explicit DFA State Machine for ${presetName}\n`;
  cs += `public bool RunDfa_${safeName}(string lex)\n{\n`;
  cs += `    if (string.IsNullOrEmpty(lex)) return false;\n`;
  cs += `    string state = "${startState ? startState.label || startState.name || startState.id : "q0"}";\n\n`;
  cs += `    foreach (char c in lex)\n    {\n`;
  cs += `        switch (state)\n        {\n`;

  states.forEach((s) => {
    const sLabel = s.label || s.name || s.id;
    const outEdges = edges.filter((e) => e.from === s.id);
    cs += `            case "${sLabel}":\n`;
    if (outEdges.length === 0) {
      cs += `                return false;\n`;
    } else {
      outEdges.forEach((e, idx) => {
        const target = states.find((st) => st.id === e.to);
        const tLabel = target ? target.label || target.name || target.id : e.to;
        const prefix = idx === 0 ? "if" : "else if";
        const lbl = (e.label || e.symbol || "").replace(/"/g, '""');
        cs += `                ${prefix} (Matches(c, @"${lbl}")) state = "${tLabel}";\n`;
      });
      cs += `                else return false;\n                break;\n`;
    }
  });

  cs += `            default:\n                return false;\n        }\n    }\n\n`;
  const acceptCheck =
    acceptStates
      .map((s) => `state == "${s.label || s.name || s.id}"`)
      .join(" || ") || "false";
  cs += `    return ${acceptCheck};\n}\n\n`;
  cs += `private bool Matches(char c, string pattern)\n{\n`;
  cs += `    if (pattern == "a-z" || pattern == "letter") return char.IsLetter(c);\n`;
  cs += `    if (pattern == "0-9" || pattern == "digit") return char.IsDigit(c);\n`;
  cs += `    return pattern.Contains(c);\n}`;
  return cs;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
