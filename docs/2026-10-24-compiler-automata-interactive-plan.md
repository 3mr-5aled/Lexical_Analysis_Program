# Interactive Compiler Automata Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, offline, interactive web application that converts regular expressions into NFAs (Thompson), DFAs (Subset Construction), and Minimized DFAs (Hopcroft), with step-by-step equivalence and transition tables, on-demand collapsible card rendering, dark/light theme, and a string simulator.

**Architecture:** Pure client-side modular web application (vanilla ES6+ and SVG, zero dependencies, zero build step required to run). Computation runs in milliseconds; SVG graphs render lazily on-demand when their accordion card is expanded. Unit tested via Node's native test runner (`node --test`).

**Tech Stack:** HTML5, CSS3 (variables for dark/light themes), JavaScript ES6+ (modules/browser classes), SVG for graph visualization, Node.js built-in `node:test` runner.

**Spec:** `E:/Compiler interactive html/docs/2026-10-24-compiler-automata-interactive-design.md`

## Global Constraints

- Standalone offline execution: opens directly via file path or simple server with zero NPM build requirement.
- Epsilon representation: accepts `ε`, `@`, and `\e`. Characters `a..z` and `A..Z` remain literal alphabet characters.
- Dead state $\Phi$: modeled as an explicit row `Φ | Φ | ... | Φ`, participating in $0$-Equivalence alongside non-accepting states.
- Thompson Plus ($A^+$): single-copy loopback ($s_{out, A} \xrightarrow{\varepsilon} s_{in, A}$ and $s_{out, A} \xrightarrow{\varepsilon} s_{out, +}$).
- State naming: DFA states named $d_0, d_1, d_2, \dots$. Minimized states named with their group set (e.g., $\{d_0, d_2\}$).
- Lazy rendering: graph SVGs only compute and render when their accordion section is open or opened.

## Review Focus

1. **Unbalanced or Malformed Regexes (e.g. `(a|b*`, `a||b`, `*a`):** Must display an inline user-friendly syntax error banner without crashing the application.
2. **Empty String Inputs / Pure Epsilon Regex (`ε`):** Automata must correctly identify start as accept state without infinite loops in $\varepsilon$-closure.
3. **Regex with Disconnected or Dead Paths:** Subset construction must correctly route missing transitions to $\Phi$ rather than dropping columns.
4. **Already Minimized DFAs (e.g. `a` or `ab`):** Hopcroft algorithm must terminate gracefully at round 1 ($1\text{-Equivalence} = 0\text{-Equivalence}$) without duplicate splits.
5. **String Simulator on Trapped or Invalid Symbols:** Must immediately classify characters outside the alphabet as Rejected with a clear explanation rather than throwing an exception.

---

### Task 1: Regex Parser & Postfix Converter

**Files:**
- Create: `E:/Compiler interactive html/js/regex-parser.js`
- Create: `E:/Compiler interactive html/tests/regex-parser.test.js`

**Interfaces:**
- Consumes: Raw regular expression string.
- Produces: `RegexParser.parse(regex: string) -> { tokens: string[], postfix: string[], alphabet: string[], error: string|null }`

- [ ] **Step 1: Write failing tests for regex parser**

```javascript
// E:/Compiler interactive html/tests/regex-parser.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';

test('parses simple concatenation and inserts explicit concat operator', () => {
  const result = RegexParser.parse('ab');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', 'b', '.']);
  assert.deepEqual(result.alphabet, ['a', 'b']);
});

test('handles union and kleene star with precedence', () => {
  const result = RegexParser.parse('(a|b)*a');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', 'b', '|', '*', 'a', '.']);
});

test('handles epsilon symbols and plus operator', () => {
  const result = RegexParser.parse('a+ε');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', '+', 'ε', '.']);
  assert.deepEqual(result.alphabet, ['a']); // epsilon excluded from alphabet
});

test('reports syntax error on unmatched parenthesis', () => {
  const result = RegexParser.parse('(a|b');
  assert.ok(result.error !== null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "E:/Compiler interactive html/tests/regex-parser.test.js"`  
Expected: FAIL (Cannot find module '../js/regex-parser.js')

- [ ] **Step 3: Implement `RegexParser` in `js/regex-parser.js`**

Implement lexing, implicit concatenation insertion (`.`), and Shunting-Yard conversion with operator precedence (`(`: 1, `|`: 2, `.`: 3, `*`, `+`, `?`: 4). Disambiguate `ε`, `@`, `\e` as epsilon token.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "E:/Compiler interactive html/tests/regex-parser.test.js"`  
Expected: All 4 tests PASS.

---

### Task 2: Thompson's Construction (RE $\to$ NFA)

**Files:**
- Create: `E:/Compiler interactive html/js/thompson.js`
- Create: `E:/Compiler interactive html/tests/thompson.test.js`

**Interfaces:**
- Consumes: `postfix: string[]` from Task 1.
- Produces: `Thompson.build(postfix: string[]) -> { states: number[], startState: number, acceptStates: number[], transitions: Array<{from: number, to: number, symbol: string}> }`

- [ ] **Step 1: Write failing tests for Thompson construction**

```javascript
// E:/Compiler interactive html/tests/thompson.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';

test('constructs NFA for single character', () => {
  const parsed = RegexParser.parse('a');
  const nfa = Thompson.build(parsed.postfix);
  assert.equal(nfa.transitions.length, 1);
  assert.equal(nfa.transitions[0].symbol, 'a');
  assert.equal(nfa.startState, nfa.transitions[0].from);
  assert.ok(nfa.acceptStates.includes(nfa.transitions[0].to));
});

test('constructs NFA for concatenation a.b', () => {
  const parsed = RegexParser.parse('ab');
  const nfa = Thompson.build(parsed.postfix);
  // accept of a connects to start of b via epsilon
  const eps = nfa.transitions.filter(t => t.symbol === 'ε');
  assert.ok(eps.length >= 1);
});

test('constructs NFA for union a|b', () => {
  const parsed = RegexParser.parse('a|b');
  const nfa = Thompson.build(parsed.postfix);
  // new start branches to 2 starts via epsilon, 2 accepts branch to new accept via epsilon
  const eps = nfa.transitions.filter(t => t.symbol === 'ε');
  assert.equal(eps.length, 4);
});

test('constructs NFA for (ab|ac)* matching Lab 4 state structure', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  assert.ok(nfa.states.length > 0);
  assert.ok(nfa.acceptStates.length === 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "E:/Compiler interactive html/tests/thompson.test.js"`  
Expected: FAIL (Cannot find module '../js/thompson.js')

- [ ] **Step 3: Implement `Thompson` in `js/thompson.js`**

Implement stack-based Thompson evaluation for literals, `ε`, `.`, `|`, `*`, `+`, `?`. Implement clean state re-indexing ($0, 1, 2\dots$) so the start state is 0 and accept states are clearly identified.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "E:/Compiler interactive html/tests/thompson.test.js"`  
Expected: All 4 tests PASS.

---

### Task 3: Subset Construction (NFA $\to$ DFA) & Intermediate Table

**Files:**
- Create: `E:/Compiler interactive html/js/subset-construction.js`
- Create: `E:/Compiler interactive html/tests/subset.test.js`

**Interfaces:**
- Consumes: NFA from Task 2, alphabet from Task 1.
- Produces: `SubsetConstruction.convert(nfa, alphabet) -> { intermediateTable: Array<{symbol: string, appears: number, goesTo: number[]}>, dfa: { states: Array<{id: string, nfaStates: number[], isStart: boolean, isAccept: boolean}>, alphabet: string[], transitions: Record<string, Record<string, string>>, trapState: string } }`

- [ ] **Step 1: Write failing tests for Subset Construction**

```javascript
// E:/Compiler interactive html/tests/subset.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';
import { SubsetConstruction } from '../js/subset-construction.js';

test('computes epsilon closure and intermediate table for (ab|ac)*', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  const result = SubsetConstruction.convert(nfa, parsed.alphabet);
  
  assert.ok(result.intermediateTable.length > 0);
  // Verify start state d0 exists and is marked
  const start = result.dfa.states.find(s => s.isStart);
  assert.ok(start !== undefined);
  assert.equal(start.id, 'd0');
  
  // Verify trap state Φ is present
  assert.ok(result.dfa.states.some(s => s.id === 'Φ'));
});

test('generates correct DFA transition rows for (a|b)*a', () => {
  const parsed = RegexParser.parse('(a|b)*a');
  const nfa = Thompson.build(parsed.postfix);
  const result = SubsetConstruction.convert(nfa, parsed.alphabet);
  
  assert.ok(result.dfa.states.length >= 2);
  const acceptStates = result.dfa.states.filter(s => s.isAccept);
  assert.ok(acceptStates.length >= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "E:/Compiler interactive html/tests/subset.test.js"`  
Expected: FAIL (Cannot find module '../js/subset-construction.js')

- [ ] **Step 3: Implement `SubsetConstruction` in `js/subset-construction.js`**

Implement `epsilonClosure()`, intermediate "Sigma / Appears / Goes-to" table generation, and worklist subset algorithm. Name DFA states `d0`, `d1`, etc. Add explicit `Φ` dead state with transitions to `Φ` for undefined moves. Mark accept states (`*`) if any NFA state in the subset is in `nfa.acceptStates`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "E:/Compiler interactive html/tests/subset.test.js"`  
Expected: All tests PASS.

---

### Task 4: Hopcroft DFA Minimization & Equivalence Partitioning

**Files:**
- Create: `E:/Compiler interactive html/js/hopcroft-minimization.js`
- Create: `E:/Compiler interactive html/tests/hopcroft.test.js`

**Interfaces:**
- Consumes: DFA from Task 3.
- Produces: `HopcroftMinimizer.minimize(dfa) -> { equivalenceRounds: Array<{ round: number, partition: string[][], explanations: string[] }>, minimizedDfa: { states: Array<{id: string, originalStates: string[], isStart: boolean, isAccept: boolean}>, alphabet: string[], transitions: Record<string, Record<string, string>>, trapState: string } }`

- [ ] **Step 1: Write failing tests for Hopcroft Minimization**

```javascript
// E:/Compiler interactive html/tests/hopcroft.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';
import { SubsetConstruction } from '../js/subset-construction.js';
import { HopcroftMinimizer } from '../js/hopcroft-minimization.js';

test('partitions (ab|ac)* into 0-Equivalence, 1-Equivalence and produces minimized DFA', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const result = HopcroftMinimizer.minimize(dfa);
  
  assert.ok(result.equivalenceRounds.length >= 2);
  // Round 0 must have 2 groups: non-accepting (with Φ) and accepting
  assert.equal(result.equivalenceRounds[0].partition.length, 2);
  assert.ok(result.minimizedDfa.states.length <= dfa.states.length);
});

test('handles already-minimal DFA without infinite loop', () => {
  const parsed = RegexParser.parse('ab');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const result = HopcroftMinimizer.minimize(dfa);
  
  assert.ok(result.equivalenceRounds.length >= 1);
  assert.ok(result.minimizedDfa.states.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "E:/Compiler interactive html/tests/hopcroft.test.js"`  
Expected: FAIL (Cannot find module '../js/hopcroft-minimization.js')

- [ ] **Step 3: Implement `HopcroftMinimizer` in `js/hopcroft-minimization.js`**

Implement $0$-Equivalence grouping: Group 1 = Non-Accepting states (including $\Phi$), Group 2 = Accepting states. Implement iterative partition refinement ($1\text{-Equivalence}, 2\text{-Equivalence}\dots$). Track split reasons (e.g., "State $d_1$ splits because on input 'b' it transitions to Group 2 while $\Phi$ transitions to Group 1"). Synthesize the minimized transition table.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "E:/Compiler interactive html/tests/hopcroft.test.js"`  
Expected: All tests PASS.

---

### Task 5: String Simulator & Accepted/Rejected Generator

**Files:**
- Create: `E:/Compiler interactive html/js/string-simulator.js`
- Create: `E:/Compiler interactive html/tests/simulator.test.js`

**Interfaces:**
- Consumes: Minimized DFA, alphabet.
- Produces: 
  - `StringSimulator.simulate(dfa, inputString: string) -> { accepted: boolean, path: Array<{state: string, symbol: string, nextState: string}>, finalState: string, reason: string }`
  - `StringSimulator.generateExamples(dfa, maxAccepted: number = 3, maxRejected: number = 3) -> { accepted: string[], rejected: string[] }`

- [ ] **Step 1: Write failing tests for String Simulator**

```javascript
// E:/Compiler interactive html/tests/simulator.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';
import { SubsetConstruction } from '../js/subset-construction.js';
import { HopcroftMinimizer } from '../js/hopcroft-minimization.js';
import { StringSimulator } from '../js/string-simulator.js';

test('simulates strings on minimized DFA for a|abc*', () => {
  const parsed = RegexParser.parse('a|abc*');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const { minimizedDfa } = HopcroftMinimizer.minimize(dfa);
  
  assert.equal(StringSimulator.simulate(minimizedDfa, 'a').accepted, true);
  assert.equal(StringSimulator.simulate(minimizedDfa, 'ab').accepted, true);
  assert.equal(StringSimulator.simulate(minimizedDfa, 'abccc').accepted, true);
  assert.equal(StringSimulator.simulate(minimizedDfa, 'b').accepted, false);
  assert.equal(StringSimulator.simulate(minimizedDfa, 'ac').accepted, false);
});

test('generates at least 3 accepted and 3 rejected strings for non-trivial regex', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const { minimizedDfa } = HopcroftMinimizer.minimize(dfa);
  
  const examples = StringSimulator.generateExamples(minimizedDfa, 3, 3);
  assert.equal(examples.accepted.length, 3);
  assert.equal(examples.rejected.length, 3);
  for (const s of examples.accepted) {
    assert.equal(StringSimulator.simulate(minimizedDfa, s).accepted, true);
  }
  for (const s of examples.rejected) {
    assert.equal(StringSimulator.simulate(minimizedDfa, s).accepted, false);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test "E:/Compiler interactive html/tests/simulator.test.js"`  
Expected: FAIL (Cannot find module '../js/string-simulator.js')

- [ ] **Step 3: Implement `StringSimulator` in `js/string-simulator.js`**

Implement deterministic step-by-step trace on DFA. Implement BFS string generator to discover the shortest 3 accepted strings and shortest 3 rejected strings.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test "E:/Compiler interactive html/tests/simulator.test.js"`  
Expected: All tests PASS.

---

### Task 6: High-Performance SVG Graph Layout & Renderer

**Files:**
- Create: `E:/Compiler interactive html/js/graph-renderer.js`

**Interfaces:**
- Consumes: Graph model (states, transitions, startState, acceptStates, showTrapState: boolean).
- Produces: `GraphRenderer.render(containerElement, graphModel, options: { isDark: boolean }) -> { zoomIn(), zoomOut(), resetZoom(), destroy() }`

- [ ] **Step 1: Implement SVG Graph Renderer module**
  - Layered graph layout based on BFS distance from start state.
  - Generates SVG `<circle>` nodes with state labels.
  - Generates inner concentric circle for accept states.
  - Generates start arrow pointing to initial state.
  - Computes cubic Bezier curves (`<path>`) for forward, backward, and self-loop edges with arrow markers and text labels.
  - Implements interactive mouse drag-to-pan and mouse wheel / button zoom.
  - Implements clean, smooth theme color adaptation for dark and light modes.
- [ ] **Step 2: Verify graph rendering via headless script test**
  - Ensure SVG string generation produces valid XML elements (`<svg>`, `<path>`, `<circle>`, `<marker>`).

---

### Task 7: UI Shell, CSS Styling, Themes & App Controller

**Files:**
- Create: `E:/Compiler interactive html/index.html`
- Create: `E:/Compiler interactive html/css/style.css`
- Create: `E:/Compiler interactive html/js/app.js`

**Interfaces:**
- Connects UI user inputs with Tasks 1–6.
- Manages theme toggle, presets, collapsible cards, on-demand rendering guards, and simulator interactions.

- [ ] **Step 1: Build `index.html`**
  - Top header: Title, Dark/Light toggle, preset select, regex input, `[ + ε ]` button, `Analyze` button, `Expand/Collapse All` button.
  - 4 Collapsible Accordion Cards:
    - Card 1: Thompson's NFA (Graph SVG container + transition counts).
    - Card 2: Subset Construction (Intermediate Appears/Goes-to table + DFA transition table + DFA SVG graph).
    - Card 3: Hopcroft Minimization (Equivalence partition cards with split logs + Minimized table + Minimized SVG graph).
    - Card 4: String Simulator (Live string input with pass/fail badge + trace list + 3 accepted & 3 rejected tables).
- [ ] **Step 2: Build `css/style.css`**
  - CSS variables for `--bg-primary`, `--bg-card`, `--text-primary`, `--border-color`, `--accent-primary`, `--accent-success`, `--accent-danger`.
  - Dark mode and Light mode variable sets.
  - Card accordion animations and hover effects.
  - Tables: styled headers, borders, monospace state chips, scrollable tables.
- [ ] **Step 3: Build `js/app.js`**
  - **On-Demand Rendering Guard:** Listen to accordion card click. If a card is expanded and its SVG is dirty or unrendered, trigger `GraphRenderer.render()` immediately.
  - Wire preset dropdown to populate regex and trigger analysis.
  - Wire string simulation input to execute `StringSimulator.simulate()` in real-time on keyup.
  - Store Dark/Light theme in `localStorage`.
- [ ] **Step 4: Manual & Browser Verification**
  - Test all 7 presets:
    - `(ab|ac)*` (Lab 4 Ex 1)
    - `(a|b)*a(a|b|ε)` (Lab 4 Ex 2)
    - `(ba)+(a*b*|a*)` (Lab 4 Ex 3)
    - `a|abc*` (Lecture 4 Slide 47)
    - `(ab|c)*` (Lab 3 Ex 1)
    - `(a|b)*a` (Lab 3 Ex 2)
    - `a*b(a|b)*` (Lab 3 Self-Study)
  - Verify that opening each card renders its graph independently and without lag.
  - Verify dark/light toggle switches themes instantly.
