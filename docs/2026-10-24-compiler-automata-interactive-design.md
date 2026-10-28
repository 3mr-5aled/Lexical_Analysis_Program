# Design Document: Interactive Compiler Automata Visualizer & Step-by-Step Solver

**Date:** 2026-10-24  
**Target Course / Standard:** FCIS '26 Compilers Theory (Lectures 1–4, Labs 1–4)  
**Deliverable:** Standalone Interactive Web Application (`index.html` with modern modular styling and scripts)

---

## 1. Intent & Purpose

Students and instructors in Compiler Theory need an interactive, fast, visual, and mathematically rigorous tool to convert Regular Expressions into finite automata and trace every step of the compiler scanning pipeline:

1. **Thompson's Construction** ($\text{RE} \to \text{NFA}$)
2. **Subset Construction** ($\text{NFA} \to \text{DFA}$) with the intermediate "Sigma / Appears / Goes-to" table and DFA transition table
3. **Hopcroft / Equivalence Partitioning Minimization** ($\text{DFA} \to \text{Minimized DFA}$) with step-by-step $k$-Equivalence partitions and split justifications
4. **Interactive String Simulator** showing accept/reject paths and automatic generation of 3 accepted & 3 rejected test strings

### Core User Requirements

- **Modular Separate Boxes:** Each algorithm/stage lives in its own collapsible box/accordion.
- **On-Demand (Lazy) Rendering:** When a user expands a specific box (e.g., Thompson NFA), it renders that specific graph and table instantly without lagging or rendering everything simultaneously.
- **Zero Lag / Fast:** Pure client-side execution in modern JavaScript (ES6+) and SVG.
- **Dark and Light Theme:** Polished, modern UI/UX with smooth theme toggle.
- **Academic Precision:** Strict conformance to FCIS '26 notation ($d_0, d_1\dots$, $\varepsilon$, $\Phi$, start arrows $\to$, accept asterisks `*`, and intermediate lookup tables).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals

- **Self-contained execution:** Zero backend, zero server calls, works 100% offline by opening `index.html` in any browser.
- **Step-by-step pedagogical clarity:** Every intermediate table and equivalence step is fully visible and explained so students can check lab and exam solutions.
- **High performance:** Pre-calculate data structures in milliseconds; only generate heavy SVG graphics when a section is opened.
- **Course Slide Presets:** One-click loading of exact course examples:
  - `(ab|ac)*` (Lab 4 Example 1)
  - `(a|b)*a(a|b|ε)` (Lab 4 Example 2)
  - `(ba)+(a*b*|a*)` (Lab 4 Example 3)
  - `a|abc*` (Lecture 4 Slide 47 Assignment)
  - `a*b(a|b)*` (Lab 3 Self-study)
  - `(ab|c)*` (Lab 3 Exercise 1)
  - `(a|b)*a` (Lab 3 Exercise 2)
  - `Letter(Letter|Digit)*` (Lab 2 / Lecture 3 token model)
- **Visuals:** Pan and zoom controls for SVG graphs, start arrows, double-circle accept states, clear curved transition labels.

### Non-Goals

- Generating full C#/C++ scanner compiler code (this tool focuses on interactive theory, automata generation, and step-by-step verification).
- Supporting arbitrary non-regular language constructs (like backreferences).

### Anti-Goals

- **No heavy framework overhead:** No sluggish loading, bloated frameworks, or node server requirements.
- **No monolithic page clutter:** Do not render all heavy graphs simultaneously into a single overwhelming page that causes layout reflows and lags.

---

## 3. Constraints & Conventions

- **Client Environment:** Modern evergreen desktop and mobile browsers (Chrome, Edge, Firefox, Safari).
- **Offline Capable:** All scripts, styles, and SVG graphics function without internet access.
- **FCIS '26 Standards:**
  - **Epsilon Notation:** Input accepts `ε`, `@`, and `\e`. A quick-insert `[ + ε ]` button is provided above the input field. Literal letters `a..z` and `A..Z` remain characters (e.g. `e` is literal character 'e').
  - **Dead State $\Phi$:** Modeled explicitly as row `Φ | Φ | ... | Φ`. Participates in $0$-Equivalence alongside non-accepting states. Splits from active states when transition destinations diverge (per Lab 4 Slide 17 & 18).
  - **Thompson $A^+$ Construction:** Single-copy loopback ($s_{out, A} \xrightarrow{\varepsilon} s_{in, A}$ and $s_{out, A} \xrightarrow{\varepsilon} s_{out, +}$) to match Lab 4 Slide 28 state sets.
  - **State Naming:** DFA states named $d_0, d_1, d_2, \dots$. Minimized states named with their constituent group (e.g. $\{d_0, d_2\}$).

---

## 4. Architectural Approaches & Selection

- **Approach 1 (Selected):** Standalone Web App with Pure-Client Modular Modules & Dedicated High-Performance SVG Graph Rendering.
  - _Why Selected:_ Instant start (<10ms), zero dependencies, lazy on-demand graph rendering per box, full control over themes, responsiveness, and FCIS table formats.
- **Approach 2 (Rejected):** Embedded Graphviz WASM Engine (`@hpcc-js/wasm`).
  - _Why Rejected:_ Large file footprint (~1.5MB), slower rendering initialization.
- **Approach 3 (Rejected):** Full React/Vue + Vite SPA project.
  - _Why Rejected:_ Requires Node.js build step, heavy `node_modules`, inconvenient for students needing a simple file to open directly.

---

## 5. Algorithmic Specifications

### 5.1 Regex Parser

- **Operators & Precedence:**
  1. Parentheses: `( )`
  2. Postfix: Kleene Star `*`, Plus `+`, Optional `?`
  3. Concatenation: explicit or implicit (e.g. `ab` $\to$ `a . b`)
  4. Alternation / Union: `|`
- **Parsing Strategy:**
  - Infix insertion of concatenation dots `.`
  - Shunting-yard algorithm to generate postfix tokens.
  - Evaluation of postfix expression into Thompson NFA fragments.

### 5.2 Thompson's Construction ($\text{RE} \to \text{NFA}$)

- Operates on a fragment stack:
  - **Literal $a$:** Start node $s_{in}$, end node $s_{out}$, edge $s_{in} \xrightarrow{a} s_{out}$.
  - **Empty $\varepsilon$:** Start node $s_{in}$, end node $s_{out}$, edge $s_{in} \xrightarrow{\varepsilon} s_{out}$.
  - **Concatenation $AB$:** Connects accept state of $A$ to start state of $B$ via an $\varepsilon$-transition ($s_{out, A} \xrightarrow{\varepsilon} s_{in, B}$).
  - **Alternation $A | B$:** New start $s_{in}$ with $\varepsilon$-edges to $s_{in, A}$ and $s_{in, B}$; new accept $s_{out}$ receiving $\varepsilon$-edges from $s_{out, A}$ and $s_{out, B}$.
  - **Kleene Star $A^\*$:** New start $s_{in}$ with $\varepsilon$-edges to $s_{in, A}$ and $s_{out}$; accept $s_{out, A}$ has $\varepsilon$-edges to $s_{in, A}$ and $s_{out}$.
  - **Plus $A^+$:** New start $s_{in}$ with $\varepsilon$-edge to $s_{in, A}$; accept $s_{out, A}$ has $\varepsilon$-edges to $s_{in, A}$ and $s_{out}$.
- Sequential numbering assigns distinct states $0, 1, 2, \dots$ preserving course slide topologies.

### 5.3 Subset Construction ($\text{NFA} \to \text{DFA}$)

1. **$\varepsilon$-Closure Calculation:**
   $$\varepsilon\text{-closure}(S) = S \cup \{ q \mid \exists p \in \varepsilon\text{-closure}(S) \text{ with } p \xrightarrow{\varepsilon} q \}$$
2. **Intermediate Lookup Table ("Sigma | Appears | Goes to"):**
   - For each input symbol $c \in \Sigma$:
     - Find each NFA state $q$ that has an outgoing edge on $c$.
     - Compute $\varepsilon\text{-closure}(\delta(q, c))$.
3. **DFA Exploration:**
   - Initial state $d_0 = \varepsilon\text{-closure}(\{s_{start}\})$.
   - For state $D$ and symbol $c$:
     $$U = \varepsilon\text{-closure}\left(\bigcup_{s \in D} \delta(s, c)\right)$$
     - If $U = \emptyset$, record $\delta(D, c) = \Phi$.
     - If $U \neq \emptyset$, if $U$ already exists as $d_i$, record transition $D \xrightarrow{c} d_i$; otherwise assign new ID $d_k$, record transition, and queue $d_k$.
4. **Transition Table Presentation:**
   - Columns: `DFA State`, `NFA State Set`, and transitions for each $c \in \Sigma$.
   - Marked start state $\to d_0$.
   - Marked accept states $d_i^*$ if $d_i \cap F_{NFA} \neq \emptyset$.
   - Explicit $\Phi$ row with transitions to $\Phi$.

### 5.4 Hopcroft Minimization ($\text{DFA} \to \text{Minimized DFA}$)

1. **Initial Partition $P_0$:**
   - Non-accepting states (including $\Phi$) vs. Accepting states:
     $$P_0 = \{ (Q_{DFA} \setminus F_{DFA}) \cup \{\Phi\}, F_{DFA} \}$$
2. **Refinement ($k$-Equivalence):**
   - In each round $k$:
     - For each group $G \in P_{k-1}$:
       - Two states $p, q \in G$ remain together iff for every $c \in \Sigma$, $\delta(p, c)$ and $\delta(q, c)$ fall into the same group in $P_{k-1}$.
       - Otherwise, split $G$ into consistent sub-groups.
     - Record step explanation: e.g., "Checking group $\{d_0, d_2\}$ on $a \implies d_1, d_1$ (group 2); on $b \implies d_2, d_2$ (group 1) $\implies$ stays together."
     - Terminate when $P_k = P_{k-1}$.
3. **Minimized Transition Table:**
   - Formulate merged state names and transitions.
   - Provide toggle to display or hide the dead state $\Phi$ in the final minimized graph.

### 5.5 String Simulator

- Simulates test strings on the Minimized DFA step-by-step.
- Visual token chip highlighting active states along the transition path.
- Automatic generator for 3 accepted and 3 rejected sample strings (matching Lecture 4 Slide 47).

---

## 6. UI / UX Design & Box Separation

### 6.1 Header & Control Toolbar

- **Title Banner:** "Compiler Theory: Regular Expression to Minimized DFA Pipeline".
- **Theme Switcher:** Dark / Light toggle button (persists in localStorage).
- **Preset Dropdown:** Instant selection of course examples.
- **Regex Input Field:** With live error helper and `[ + ε ]` symbol inserter.
- **Action Buttons:** `Convert / Analyze`, `Clear`, `Expand All / Collapse All`.

### 6.2 Modular Collapsible Boxes

Each box features an independent card header with state badge, toggle button, and content wrapper:

- **Box 1: Thompson NFA**
  - Interactive SVG diagram with start arrow, double circles, and curved labeled edges.
  - State & transition summary.
- **Box 2: Subset Construction (NFA $\to$ DFA)**
  - Table 1: Intermediate "Sigma | Appears | Goes to" table.
  - Table 2: Complete DFA transition table ($d_0, d_1\dots$ with $\to$, $*$, and $\Phi$).
  - DFA SVG diagram.
- **Box 3: Hopcroft DFA Minimization**
  - Equivalence Round Cards ($0$-Equivalence, $1$-Equivalence, ..., with split explanations).
  - Minimized DFA transition table.
  - Minimized DFA SVG diagram.
- **Box 4: String Simulator & Acceptance Verification**
  - Interactive string input with live pass/fail badge and transition trace.
  - Auto-generated list of 3 accepted and 3 rejected strings.

### 6.3 Lazy (On-Demand) Rendering Guard

- Graphs are only rendered when their containing box is opened or currently active.
- Opening a box checks if its SVG has been rendered; if not, it triggers the SVG layout engine immediately.
- Eliminates page reflow lag and guarantees smooth 60fps animations.

---

## 7. Implementation Artifacts & Files

The project will be built directly in `E:\Compiler interactive html`:

- `index.html`: Main structured HTML layout.
- `css/style.css`: Modern, clean CSS styling with CSS variables for dark and light themes, typography, cards, and tables.
- `js/regex-parser.js`: Shunting-yard parser, operator handling, validation.
- `js/thompson.js`: NFA construction, fragment stack, state numbering.
- `js/subset-construction.js`: $\varepsilon$-closure, Appears/Goes-to table, DFA subset table.
- `js/hopcroft-minimization.js`: Equivalence partitions, step log generator, minimized table.
- `js/graph-renderer.js`: High-performance SVG state machine graph renderer with auto-layout, curve calculation, start markers, and double circles.
- `js/string-simulator.js`: Execution trace and 3-accepted / 3-rejected generator.
- `js/app.js`: Main UI controller, event bindings, theme toggle, preset loader, on-demand lazy rendering manager.
