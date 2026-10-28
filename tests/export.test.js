import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

test("academic presets order and export options (SVG, PNG, JFLAP, code modal, watermark)", async () => {
  const edgePath =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const htmlPath = path.resolve("dist/index.html");

  if (!fs.existsSync(edgePath) || !fs.existsSync(htmlPath)) {
    assert.ok(
      true,
      "Skipping browser test in headless environment without Edge"
    );
    return;
  }

  const port = 9341;
  const targetUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const tmpProfile = path.join(os.tmpdir(), `edge_test_export_${Date.now()}`);

  const proc = spawn(edgePath, [
    "--headless",
    `--remote-debugging-port=${port}`,
    "--disable-gpu",
    "--no-sandbox",
    "--user-data-dir=" + tmpProfile,
    targetUrl,
  ]);

  let killed = false;
  function cleanup() {
    if (!killed) {
      killed = true;
      proc.kill();
      try {
        fs.rmSync(tmpProfile, { recursive: true, force: true });
      } catch {}
    }
  }

  try {
    let pageTab = null;
    for (let i = 0; i < 25; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json`);
        const tabs = await res.json();
        pageTab =
          tabs.find((t) => t.type === "page" && t.url.includes("index.html")) ||
          tabs.find((t) => t.type === "page");
        if (pageTab && pageTab.webSocketDebuggerUrl) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.ok(pageTab, "Browser tab must exist");

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.method === "Runtime.consoleAPICalled") {
        console.log(
          "BROWSER CONSOLE:",
          data.params.type,
          data.params.args.map((a) => a.value)
        );
      }
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    };

    function send(method, params = {}) {
      const id = msgId++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send("Runtime.enable");

    // Wait until document and nodes are loaded
    for (let i = 0; i < 25; i++) {
      const chk = await send("Runtime.evaluate", {
        expression: `!!document.querySelector('.state-node')`,
        returnByValue: true,
      });
      if (chk.result?.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // 1. Verify Academic Presets Order: Lec 3 -> Lab 3 -> Lec 4 -> Lab 4
    const presetListExpr = `Array.from(document.querySelectorAll('#presetSelector option')).map(o => ({ id: o.value, text: o.textContent }))`;
    const presetListRes = await send("Runtime.evaluate", {
      expression: presetListExpr,
      returnByValue: true,
    });
    const presets = presetListRes.result?.result?.value;
    assert.ok(
      Array.isArray(presets) && presets.length === 8,
      "Must have 8 FCIS academic course presets"
    );

    assert.equal(
      presets[0].id,
      "course-lec3-identifiers",
      "1st preset must be Lecture 3 Identifiers"
    );
    assert.ok(
      presets[0].text.startsWith("Lecture 3"),
      "Preset 1 must be Lecture 3"
    );

    assert.equal(
      presets[1].id,
      "course-lab3-ex1",
      "2nd preset must be Lab 3 Ex 1"
    );
    assert.ok(presets[1].text.startsWith("Lab 3"), "Preset 2 must be Lab 3");

    assert.equal(
      presets[2].id,
      "course-lab3-ex2",
      "3rd preset must be Lab 3 Ex 2"
    );
    assert.ok(presets[2].text.startsWith("Lab 3"), "Preset 3 must be Lab 3");

    assert.equal(
      presets[3].id,
      "course-lab3-selfstudy",
      "4th preset must be Lab 3 Self Study"
    );
    assert.ok(presets[3].text.startsWith("Lab 3"), "Preset 4 must be Lab 3");

    assert.equal(
      presets[4].id,
      "course-lec4-slide47",
      "5th preset must be Lecture 4 Slide 47"
    );
    assert.ok(
      presets[4].text.startsWith("Lecture 4"),
      "Preset 5 must be Lecture 4"
    );

    assert.equal(
      presets[5].id,
      "course-lab4-ex1",
      "6th preset must be Lab 4 Ex 1"
    );
    assert.ok(presets[5].text.startsWith("Lab 4"), "Preset 6 must be Lab 4");

    assert.equal(
      presets[6].id,
      "course-lab4-ex2",
      "7th preset must be Lab 4 Ex 2"
    );
    assert.ok(presets[6].text.startsWith("Lab 4"), "Preset 7 must be Lab 4");

    assert.equal(
      presets[7].id,
      "course-lab4-ex3",
      "8th preset must be Lab 4 Ex 3"
    );
    assert.ok(presets[7].text.startsWith("Lab 4"), "Preset 8 must be Lab 4");

    // Setup anchor interception in page to capture downloads
    await send("Runtime.evaluate", {
      expression: `
        window.__capturedDownloads = [];
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          if (this.download) {
            window.__capturedDownloads.push({
              download: this.download,
              href: this.href
            });
          }
          return origClick.apply(this, arguments);
        };
      `,
    });

    // Helper to reliably open export menu and click item
    async function clickExportItem(selector) {
      // If already open, close it or keep it open
      let item = await send("Runtime.evaluate", {
        expression: `!!document.querySelector('${selector}')`,
        returnByValue: true,
      });
      if (!item.result?.result?.value) {
        await send("Runtime.evaluate", {
          expression: `document.querySelector('#btnExportDropdown')?.click()`,
          returnByValue: true,
        });
        for (let i = 0; i < 20; i++) {
          item = await send("Runtime.evaluate", {
            expression: `!!document.querySelector('${selector}')`,
            returnByValue: true,
          });
          if (item.result?.result?.value) break;
          await new Promise((r) => setTimeout(r, 80));
        }
      }
      return send("Runtime.evaluate", {
        expression: `(() => { const b = document.querySelector('${selector}'); if (!b) return false; b.click(); return true; })()`,
        returnByValue: true,
      });
    }

    // 2. Test SVG Export with Preview Popup and Watermark
    const svgClickRes = await clickExportItem("#btnExportSvg");
    assert.equal(
      svgClickRes.result?.result?.value,
      true,
      "#btnExportSvg must be clickable"
    );

    await new Promise((r) => setTimeout(r, 200));

    // Verify preview modal opened
    const svgModalChk = await send("Runtime.evaluate", {
      expression: `!!document.querySelector('#exportPreviewModal #previewSvgContainer')`,
      returnByValue: true,
    });
    assert.equal(
      svgModalChk.result?.result?.value,
      true,
      "Export Preview Modal must open with SVG preview container"
    );

    // Confirm download in preview modal
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#btnConfirmDownload')?.click()`,
      returnByValue: true,
    });

    let svgDownload = null;
    for (let i = 0; i < 30; i++) {
      const res = await send("Runtime.evaluate", {
        expression: `(async () => {
          const item = window.__capturedDownloads.find(d => d.download.endsWith('.svg'));
          if (!item) return null;
          const r = await fetch(item.href);
          const text = await r.text();
          return { download: item.download, text };
        })()`,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.result?.result?.value) {
        svgDownload = res.result.result.value;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.ok(svgDownload, "SVG download must be captured");
    assert.ok(
      svgDownload.download.startsWith("automata_"),
      "Filename must be automata_*.svg"
    );
    assert.ok(svgDownload.text.includes("<svg"), "Markup must be valid SVG");
    assert.ok(
      svgDownload.text.includes('id="dfaSvg"'),
      "SVG must contain canvas root"
    );
    assert.ok(svgDownload.text.includes("viewBox="), "SVG must define viewBox");
    assert.ok(
      svgDownload.text.includes('id="exportWatermark"'),
      "Watermark group must exist in exported SVG"
    );
    assert.ok(
      svgDownload.text.includes("Automata Studio"),
      "Watermark must contain app name Automata Studio"
    );
    assert.ok(
      svgDownload.text.includes("data:image/png;base64,"),
      "Watermark must contain embedded logo image"
    );
    assert.ok(
      !svgDownload.text.includes("curve-handle-group"),
      "Exported SVG must not have curve handles"
    );
    assert.ok(
      !svgDownload.text.includes("edge-hit-path"),
      "Exported SVG must not have edge hit paths"
    );

    // 3. Test PNG Export with Preview Popup
    const pngClickRes = await clickExportItem("#btnExportPng");
    assert.equal(
      pngClickRes.result?.result?.value,
      true,
      "#btnExportPng must be clickable"
    );

    await new Promise((r) => setTimeout(r, 200));

    // Verify PNG preview modal opened
    const pngModalChk = await send("Runtime.evaluate", {
      expression: `!!document.querySelector('#exportPreviewModal #previewPngContainer')`,
      returnByValue: true,
    });
    assert.equal(
      pngModalChk.result?.result?.value,
      true,
      "Export Preview Modal must open with PNG preview container"
    );

    // Wait for PNG preview image to finish rendering
    for (let i = 0; i < 20; i++) {
      const imgChk = await send("Runtime.evaluate", {
        expression: `!!document.querySelector('#previewPngContainer img')`,
        returnByValue: true,
      });
      if (imgChk.result?.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // Confirm download in preview modal
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#btnConfirmDownload')?.click()`,
      returnByValue: true,
    });

    // Wait for PNG download capture
    let pngDownload = null;
    for (let i = 0; i < 30; i++) {
      const chkPng = await send("Runtime.evaluate", {
        expression: `window.__capturedDownloads.find(d => d.download.endsWith('.png')) || null`,
        returnByValue: true,
      });
      if (chkPng.result?.result?.value) {
        pngDownload = chkPng.result.result.value;
        break;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.ok(pngDownload, "PNG download must be captured");
    assert.ok(
      pngDownload.download.endsWith(".png"),
      "Filename must end with .png"
    );
    assert.ok(pngDownload.href.startsWith("blob:"), "PNG must be a blob URL");

    // 4. Test JFLAP (.jff) Export with Preview Popup
    const jflapClickRes = await clickExportItem("#btnExportJflap");
    assert.equal(
      jflapClickRes.result?.result?.value,
      true,
      "#btnExportJflap must be clickable"
    );
    await new Promise((r) => setTimeout(r, 200));

    // Confirm download in preview modal
    await send("Runtime.evaluate", {
      expression: `document.querySelector('#btnConfirmDownload')?.click()`,
      returnByValue: true,
    });

    let jflapDownload = null;
    for (let i = 0; i < 30; i++) {
      const res = await send("Runtime.evaluate", {
        expression: `(async () => {
          const item = window.__capturedDownloads.find(d => d.download.endsWith('.jff'));
          if (!item) return null;
          const r = await fetch(item.href);
          const text = await r.text();
          return { download: item.download, text };
        })()`,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.result?.result?.value) {
        jflapDownload = res.result.result.value;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    assert.ok(jflapDownload, "JFLAP download must be captured");
    assert.ok(
      jflapDownload.download.endsWith(".jff"),
      "Filename must end with .jff"
    );
    assert.ok(
      jflapDownload.text.includes("<structure>"),
      "JFLAP XML must contain structure tag"
    );
    assert.ok(
      jflapDownload.text.includes("<type>fa</type>"),
      "JFLAP XML must specify finite automaton"
    );
    assert.ok(
      jflapDownload.text.includes("<automaton>"),
      "JFLAP XML must contain automaton tag"
    );
    assert.ok(
      jflapDownload.text.includes('<state id="0"'),
      "JFLAP XML must contain state tags"
    );
    assert.ok(
      jflapDownload.text.includes("<x>"),
      "JFLAP XML must specify state x coordinates"
    );
    assert.ok(
      jflapDownload.text.includes("<y>"),
      "JFLAP XML must specify state y coordinates"
    );

    // 5. Test Export Code Modal (Mermaid and C#)
    const modalClickRes = await clickExportItem("#btnOpenCodeModal");
    assert.equal(
      modalClickRes.result?.result?.value,
      true,
      "#btnOpenCodeModal must be clickable"
    );
    await new Promise((r) => setTimeout(r, 300));

    const modalTextExpr = `document.querySelector('pre')?.textContent || ''`;
    const modalTextRes = await send("Runtime.evaluate", {
      expression: modalTextExpr,
      returnByValue: true,
    });
    const modalText = modalTextRes.result?.result?.value;
    assert.ok(
      modalText.includes("stateDiagram-v2"),
      "Mermaid code modal must show stateDiagram-v2"
    );
    assert.ok(
      modalText.includes("direction LR"),
      "Mermaid code modal must show direction LR"
    );

    // 6. Verify config file structure
    const configPath = path.resolve("src/config/export.config.ts");
    assert.ok(
      fs.existsSync(configPath),
      "src/config/export.config.ts must exist"
    );
    const configContent = fs.readFileSync(configPath, "utf-8");
    assert.ok(
      /watermark:\s*true/.test(configContent),
      "config must define watermark: true"
    );

    ws.close();
  } finally {
    cleanup();
  }
});
