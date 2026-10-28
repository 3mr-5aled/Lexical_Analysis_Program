# Design Document: Dual-Hemisphere Radial Sink Routing Architecture

**Date**: 2026-10-26  
**Status**: Pending User Approval  
**Target Repository**: `E:\Compiler interactive html`  
**Files Touched**: `js/graph-renderer.js`, `js/bundle.js`

---

## 1. Intent & Why

To provide an unambiguous, human-readable graph visualization for all regular expressions (NFA, DFA, Minimized DFA) in the FCIS Compiler Interactive Visualizer. In complex DFAs, error transitions to the dead/trap state $\Phi$ currently cross language paths or run parallel underneath lower branches (as seen in `Screenshot 2026-10-26 163943.png`). This architecture guarantees that every transition line has its own dedicated, collision-free path so users can instantly identify which letter belongs to which line.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals

- **Dedicated Sink Row for Trap State $\Phi$**: Place $\Phi$ on a lower level below all active states, centered horizontally beneath the active graph.
- **Collision-Free Error Transitions**: Each dashed red transition to $\Phi$ routes directly downward or along an outer radial clearance lane, never cutting through nodes or running alongside solid language return loops.
- **Angular Entry Ports on $\Phi$**: Each incoming error transition targets a unique angular port on $\Phi$'s perimeter to prevent dashed lines from merging or overlapping at the sink node.
- **Lane-Clearance for Stacked States**: When a state is above another state (like $d_2$ above $d_3$), its dashed transition to $\Phi$ sweeps around the outer right/top boundary of the column so it never crosses the intermediate state or its transitions.
- **Preserve Clean Language Flow**: Solid forward language edges remain straight lines, and return loops arch cleanly on the outside (upper branches arch over the top; lower branches arch between the track and the sink zone).
- **Maintain Standalone Bundle & Test Integrity**: Rebuild `js/bundle.js` and ensure all 34 existing automated tests pass.

### Non-Goals

- Making the trap state $\Phi$ optional or hidden in DFA graphs (the user explicitly specified that $\Phi$ must always remain visible in DFAs).
- Adding drag-and-drop node editing (visualizer remains an interactive pan/zoom viewer without manual node movement).

### Anti-Goals

- Allowing any two transition lines (solid or dashed) to share the same Bézier arc or overlapping label position.
- Routing error transitions through the horizontal centerline where they interfere with main language paths.

---

## 3. Constraints

- Must remain pure SVG generation without heavy external graph libraries (must execute cleanly in both Node.js test environment and browser).
- Must preserve SVG `viewBox="0 0 ${width} ${height}"` pattern to satisfy existing test suite expectations.
- Must preserve dark/light theme color palette matching `interactive_dfa_studio_c_lexical_analyzer.html`.

---

## 4. Approaches Considered

### Approach 1: Dual-Hemisphere Radial Sink Routing _(Selected)_

- **Details**: $\Phi$ is positioned horizontally centered beneath all active states at $y = \text{maxTrackY} + 120$. Dashed error lines fan in from the left and right hemispheres into dedicated angular ports on $\Phi$'s perimeter. Stacked nodes use assigned clearance lanes.
- **Trade-off**: Requires analytical calculation of radial entry ports and clearance lanes, but yields clean, textbook-style automata curves with zero line collision.
- **Outcome**: **Selected by user**.

### Approach 2: Orthogonal Manhattan / Bus Routing

- **Details**: Error transitions drop straight down into a multi-lane horizontal bus below all states, then turn 90 degrees into $\Phi$.
- **Trade-off**: Right-angle wiring diagrams look unnatural for finite state automata and clash with the curved aesthetic of course slides.
- **Outcome**: Rejected.

---

## 5. Detailed Architecture & Implementation Specification

### 5.1 Trap State $\Phi$ Positioning (`computeLayout`)

- Find all regular (non-trap) states and group them into layers $0 \dots L_{\max}$.
- Identify the trap state $\Phi$ (`s.id === 'Φ'` or `s.id === 'trap'`).
- Compute the horizontal span of regular states: $x_{\min} = \min_{s \neq \Phi}(s.x)$, $x_{\max} = \max_{s \neq \Phi}(s.x)$.
- Compute the lowest vertical boundary of regular states: $y_{\max} = \max_{s \neq \Phi}(s.y)$.
- Assign $\Phi$ coordinates:
  $$x_\Phi = \frac{x_{\min} + x_{\max}}{2}$$
  $$y_\Phi = y_{\max} + 120$$
  $$\text{layer}_\Phi = \text{special sink layer}$$

### 5.2 Angular Fan-In Ports on $\Phi$

- For all states $S_{\text{trap}} = [s_1, s_2, \dots, s_k]$ that transition to $\Phi$:
  - Sort $S_{\text{trap}}$ primarily by their $x$-coordinate, and secondarily by $y$.
  - Assign each state an entry angle $\theta_i$ along the upper hemisphere of $\Phi$ ($180^\circ \dots 360^\circ$ / $-\pi \dots 0$):
    - Leftmost states enter between $-150^\circ$ and $-110^\circ$.
    - Central states enter between $-105^\circ$ and $-75^\circ$.
    - Rightmost states enter between $-70^\circ$ and $-30^\circ$.
  - Target point on $\Phi$'s perimeter:
    $$e_x = x_\Phi + (R_\Phi + 3) \cos(\theta_i)$$
    $$e_y = y_\Phi + (R_\Phi + 3) \sin(\theta_i)$$

### 5.3 Clearance Routing for Stacked States

- When state $s$ has a neighbor state $s_{\text{below}}$ in the same or adjacent column situated beneath it:
  - The Bézier control point for $s \to \Phi$ is pushed radially outward:
    $$\text{mid}_X = s.x + \text{clearanceOffsetX}$$
    $$\text{mid}_Y = \frac{s.y + y_\Phi}{2}$$
  - This routes the dashed line around the outside of the column, maintaining at least 35px clearance from intermediate states and their language transitions.

### 5.4 Regular Language Edges (Solid Lines)

- **Forward edges** ($p_1.x \le p_2.x$): Straight lines directly between state circle boundaries.
- **Return loops** ($p_1.x > p_2.x$):
  - Upper branch ($p_1.y < \text{centerY}$): Arches over the top ($y < \min(p_1.y, p_2.y)$).
  - Lower branch ($p_1.y \ge \text{centerY}$): Arches under the bottom of the lower track, within the buffer zone above $y_\Phi$.

### 5.5 ViewBox & Bounding Box

- Automatically compute the bounding box covering $x_{\min} \dots x_{\max}$ and $y_{\min} \dots (y_\Phi + R_\Phi + 40)$, adjusting $yShift$ if necessary so all coordinates remain positive within `viewBox="0 0 ${width} ${height}"`.

---

## 6. Verification Plan

1. **Unit & Integration Tests**: Run `npm test` to verify all 34 tests pass.
2. **Preset Verification**: Generate and inspect SVGs for all 8 course presets (`(ab|ac)*`, `(a|b)*a(a|b|ε)`, etc.) across NFA, DFA, and Minimized DFA.
3. **Visual Inspection**: Confirm that the clutter shown in `Screenshot 2026-10-26 163943.png` is replaced by clean radial fan-in to $\Phi$ with no overlapping dashed/solid lines.
