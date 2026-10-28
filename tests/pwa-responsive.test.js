import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

test("PWA manifest, service worker, and mobile responsiveness", async () => {
  // 1. Validate manifest.webmanifest file
  const manifestPath = path.resolve("public/manifest.webmanifest");
  assert.ok(fs.existsSync(manifestPath), "manifest.webmanifest must exist");
  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  assert.equal(
    manifestJson.display,
    "standalone",
    "PWA display must be standalone"
  );
  assert.equal(
    manifestJson.short_name,
    "AutomataStudio",
    "Short name must be AutomataStudio"
  );
  assert.ok(
    manifestJson.name.includes("Visual Automata Studio"),
    "Full name must include Visual Automata Studio"
  );
  assert.ok(
    Array.isArray(manifestJson.icons) && manifestJson.icons.length >= 2,
    "Must define icons for PWA"
  );

  // 2. Validate sw.js Service Worker file
  const swPath = path.resolve("public/sw.js");
  assert.ok(fs.existsSync(swPath), "sw.js service worker must exist");
  const swCode = fs.readFileSync(swPath, "utf-8");
  assert.ok(
    /addEventListener\s*\(\s*['"]install['"]/.test(swCode),
    "SW must handle install event"
  );
  assert.ok(
    /addEventListener\s*\(\s*['"]activate['"]/.test(swCode),
    "SW must handle activate event"
  );
  assert.ok(
    /addEventListener\s*\(\s*['"]fetch['"]/.test(swCode),
    "SW must handle fetch event for offline capability"
  );

  // 3. Headless Browser Mobile Viewport Test
  const edgePath =
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const htmlPath = path.resolve("dist/index.html");

  if (!fs.existsSync(edgePath) || !fs.existsSync(htmlPath)) {
    return;
  }

  const port = 9345;
  const targetUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const tmpProfile = path.join(os.tmpdir(), `edge_test_pwa_${Date.now()}`);

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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true,
    });

    // Wait until document and nodes are loaded
    for (let i = 0; i < 25; i++) {
      const chk = await send("Runtime.evaluate", {
        expression: `!!document.querySelector('.state-node')`,
        returnByValue: true,
      });
      if (chk.result?.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // Check PWA meta tags in head
    const metaCheckExpr = `({
      manifest: !!document.querySelector('link[rel="manifest"]'),
      themeColor: !!document.querySelector('meta[name="theme-color"]'),
      appleMobile: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]')
    })`;
    const metaRes = await send("Runtime.evaluate", {
      expression: metaCheckExpr,
      returnByValue: true,
    });
    assert.deepEqual(
      metaRes.result?.result?.value,
      {
        manifest: true,
        themeColor: true,
        appleMobile: true,
      },
      "index.html must have PWA manifest and mobile meta tags"
    );

    // Verify canvas, toolbar, and debugger fit without horizontal window breakout
    const layoutCheckExpr = `({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasCanvas: !!document.querySelector('#dfaSvg'),
      hasToolbar: !!document.querySelector('#presetSelector'),
      hasDebugger: !!document.querySelector('#btnStepTape')
    })`;
    const layoutRes = await send("Runtime.evaluate", {
      expression: layoutCheckExpr,
      returnByValue: true,
    });
    const layout = layoutRes.result?.result?.value;
    assert.ok(layout.hasCanvas, "Canvas must render on mobile viewport");
    assert.ok(layout.hasToolbar, "Toolbar must render on mobile viewport");
    assert.ok(layout.hasDebugger, "Debugger must render on mobile viewport");
    assert.ok(
      layout.scrollWidth <= layout.clientWidth + 2,
      "Mobile layout must not exceed viewport width"
    );

    ws.close();
  } finally {
    cleanup();
  }
});
