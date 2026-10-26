# Dual-Hemisphere Radial Sink Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a dedicated lower sink level for the trap state $\Phi$ with angular fan-in ports and outer radial clearance routing, eliminating all overlays between error lines and language transitions.

**Architecture:** The trap state $\Phi$ is positioned horizontally centered beneath all active states on a dedicated sink row. Transitions to $\Phi$ fan inward toward dedicated angular ports on $\Phi$'s upper perimeter, with stacked nodes routed through assigned clearance lanes around intermediate states, completely separating language paths from error paths.

**Tech Stack:** JavaScript (ES Modules, SVG geometry), Node.js test runner (`node:test`).

**Spec:** `docs/superpowers/specs/2026-10-26-dual-hemisphere-sink-routing-design.md`

## Global Constraints

- Must remain pure SVG generation without external libraries.
- Must preserve SVG `viewBox="0 0 ${width} ${height}"` format.
- All 34 automated unit and integration tests must pass (`npm test`).
- Must rebuild `js/bundle.js` after modifications.

## Review Focus

- Minimized DFA with stacked nodes ($d_0, d_1, \Phi$) where $d_0 \to \Phi$ and $d_1 \to \Phi$ must not collide.
- Subset DFA for $(ab|ac)*$ with stacked nodes $d_2$ and $d_3$ where $d_2 \to \Phi$ sweeps around $d_3$ without intersecting $d_3$ or its solid return loop.
- Self-loops on $\Phi$ must arch cleanly on top or bottom of $\Phi$ without crossing incoming error lines.
- SVG bounding box must expand vertically to ensure $\Phi$ and all downward clearance arches are never cut off.
- Backward solid language loops (like $d_2 \to d_1$ over the top and $d_3 \to d_1$ under the bottom) must maintain unobstructed clearance.

---

### Task 1: Position Trap State $\Phi$ on Dedicated Lower Sink Row

**Files:**
- Modify: `js/graph-renderer.js:60-125`
- Test: `tests/graph-renderer.test.js`

**Interfaces:**
- Consumes: `GraphRenderer.computeLayout(states, transitions, startStateId, width, height)`
- Produces: `positions` Map containing `{ x, y, layer, isTrap }` where $\Phi$ has $x = \frac{x_{\min} + x_{\max}}{2}$ and $y = y_{\max} + 120$.

- [x] **Step 1: Write the failing test**
  Add a test in `tests/graph-renderer.test.js` asserting that for a graph containing trap state `'Φ'`, `positions.get('Φ').y` is at least 100px below all regular states and `positions.get('Φ').x` is horizontally centered between the minimum and maximum regular state $x$-coordinates.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test`
  Expected: FAIL (currently $\Phi$ is placed on the horizontal centerline $y = 225$).

- [x] **Step 3: Update `computeLayout` in `js/graph-renderer.js`**
  Separate regular states from trap states (`s.id === 'Φ'` or `s.id === 'trap'`). Calculate horizontal bounds $x_{\min}$ and $x_{\max}$ and lowest vertical bound $y_{\max}$ of regular states. Assign trap state position $x = (x_{\min} + x_{\max}) / 2$, $y = y_{\max} + 120$.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git add js/graph-renderer.js tests/graph-renderer.test.js
  git commit -m "feat: position trap state on dedicated lower sink row"
  ```

---

### Task 2: Implement Angular Fan-In Ports on $\Phi$'s Perimeter

**Files:**
- Modify: `js/graph-renderer.js:250-480`
- Test: `tests/graph-renderer.test.js`

**Interfaces:**
- Consumes: Trap state position from Task 1, list of transitions where `t.to === 'Φ'`
- Produces: Unique entry target $(e_x, e_y)$ on $\Phi$'s perimeter for each transition entering $\Phi$.

- [x] **Step 1: Write the failing test**
  Add a test verifying that when multiple states transition to $\Phi$, each edge entering $\Phi$ has a distinct endpoint $(e_x, e_y)$ along $\Phi$'s circumference.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test`
  Expected: FAIL

- [x] **Step 3: Implement angular port distribution in `createSvgString`**
  Collect all transitions targeting $\Phi$. Sort by source state $x$-coordinate. Map each to an angle $\theta \in [-150^\circ, -30^\circ]$. Calculate arrival point $e_x = x_\Phi + (R_\Phi + 3)\cos(\theta)$, $e_y = y_\Phi + (R_\Phi + 3)\sin(\theta)$.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git add js/graph-renderer.js tests/graph-renderer.test.js
  git commit -m "feat: assign distinct angular fan-in ports on trap state"
  ```

---

### Task 3: Radial Clearance Routing for Stacked States Entering $\Phi$

**Files:**
- Modify: `js/graph-renderer.js:330-490`
- Test: `tests/graph-renderer.test.js`

**Interfaces:**
- Consumes: State coordinates, neighbor column relationships
- Produces: Collision-free Bézier path for error transitions originating from upper stacked states (e.g. $d_2 \to \Phi$).

- [x] **Step 1: Write the failing test**
  Add a test with stacked states $d_2$ and $d_3$ asserting that the curve for $d_2 \to \Phi$ maintains at least 30px clearance from $d_3$ and does not intersect the path of $d_3 \to d_1$.

- [x] **Step 2: Run test to verify it fails**
  Run: `npm test`
  Expected: FAIL

- [x] **Step 3: Implement clearance lane routing in `createSvgString`**
  When routing an error transition from an upper state $s_u$ that has another state $s_b$ below it, route around the right/top of the column by offsetting the control point outward: $\text{mid}_x = s_u.x + 50$, $\text{mid}_y = (s_u.y + y_\Phi) / 2$.

- [x] **Step 4: Run test to verify it passes**
  Run: `npm test`
  Expected: PASS

- [x] **Step 5: Commit**
  ```bash
  git add js/graph-renderer.js tests/graph-renderer.test.js
  git commit -m "feat: route upper stacked error transitions via clearance lanes"
  ```

---

### Task 4: Dynamic SVG ViewBox Adjustment & Bundle Build

**Files:**
- Modify: `js/graph-renderer.js:280-370`
- Output: `js/bundle.js`
- Test: All tests in `tests/*.test.js`

**Interfaces:**
- Consumes: Final node and edge positions including sink level and clearance arches
- Produces: Updated SVG `viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}"` and regenerated bundle.

- [x] **Step 1: Update bounding box calculation**
  Ensure $y_\Phi + R_\Phi + 50$ is included in `maxObsY` so the sink level is completely framed with clean padding.

- [x] **Step 2: Rebuild bundle**
  Run: `node build.js`
  Expected: "Successfully created js/bundle.js"

- [x] **Step 3: Run complete test suite**
  Run: `npm test`
  Expected: All 34 tests pass.

- [x] **Step 4: Commit**
  ```bash
  git add js/graph-renderer.js js/bundle.js
  git commit -m "feat: dynamic viewBox framing and rebuild standalone bundle"
  ```
