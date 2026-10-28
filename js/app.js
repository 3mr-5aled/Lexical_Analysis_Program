/**
 * Application Controller (FCIS '26 Automata Visualizer)
 * Connects Regex Parser, Thompson NFA, Subset Construction, Hopcroft Minimization,
 * String Simulator, and High-Performance SVG Graph Renderer.
 * Features:
 * - On-demand lazy graph rendering (renders only when an accordion card is expanded)
 * - Light and Dark theme switching with localStorage persistence
 * - Real-time string simulation with step-by-step state trace
 * - Interactive preset selector for all course examples
 */

import { RegexParser } from "./regex-parser.js";
import { Thompson } from "./thompson.js";
import { SubsetConstruction } from "./subset-construction.js";
import { HopcroftMinimizer } from "./hopcroft-minimization.js";
import { StringSimulator } from "./string-simulator.js";
import { GraphRenderer } from "./graph-renderer.js";

class AutomataApp {
  constructor() {
    // Current computed pipeline data
    this.pipelineData = null;

    // Track which graphs have been rendered to prevent redundant redraws
    this.renderedState = {
      nfa: false,
      dfa: false,
      minDfa: false,
    };

    // Cache active graph renderer controllers for zoom/destroy
    this.graphControllers = {
      nfa: null,
      dfa: null,
      minDfa: null,
    };

    this.isDark = true;
    this.initElements();
    this.initTheme();
    this.bindEvents();

    // Auto-run with initial preset
    this.runPipeline();
  }

  initElements() {
    this.regexInput = document.getElementById("regex-input");
    this.btnConvert = document.getElementById("btn-convert");
    this.btnClear = document.getElementById("btn-clear");
    this.presetSelect = document.getElementById("preset-select");
    this.errorBanner = document.getElementById("error-banner");
    this.statusText = document.getElementById("status-text");
    this.themeToggleBtn = document.getElementById("theme-toggle-btn");
    this.themeIcon = document.getElementById("theme-icon");
    this.themeText = document.getElementById("theme-text");

    this.btnExpandAll = document.getElementById("btn-expand-all");
    this.btnCollapseAll = document.getElementById("btn-collapse-all");

    // Simulator elements
    this.simInput = document.getElementById("sim-input");
    this.simBadge = document.getElementById("sim-badge");
    this.simReasonText = document.getElementById("sim-reason-text");
    this.simTraceChips = document.getElementById("sim-trace-chips");
    this.acceptedExamplesList = document.getElementById(
      "accepted-examples-list"
    );
    this.rejectedExamplesList = document.getElementById(
      "rejected-examples-list"
    );
  }

  initTheme() {
    const savedTheme = localStorage.getItem("compiler_theme") || "dark";
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    if (this.themeIcon && this.themeText) {
      if (this.isDark) {
        this.themeIcon.textContent = "☀️";
        this.themeText.textContent = "Light Mode";
      } else {
        this.themeIcon.textContent = "🌙";
        this.themeText.textContent = "Dark Mode";
      }
    }
    localStorage.setItem("compiler_theme", theme);

    // Invalidate rendered graphs so visible ones re-render with new colors
    this.renderedState.nfa = false;
    this.renderedState.dfa = false;
    this.renderedState.minDfa = false;
    this.renderVisibleGraphs();
  }

  bindEvents() {
    // Theme toggle
    this.themeToggleBtn.addEventListener("click", () => {
      this.setTheme(this.isDark ? "light" : "dark");
    });

    // Preset dropdown
    this.presetSelect.addEventListener("change", (e) => {
      if (e.target.value) {
        this.regexInput.value = e.target.value;
        this.runPipeline();
      }
    });

    // Quick symbol chips
    document.querySelectorAll(".chip-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const insertText = e.currentTarget.getAttribute("data-insert");
        this.insertTextAtCursor(this.regexInput, insertText);
      });
    });

    // Convert & Analyze
    this.btnConvert.addEventListener("click", () => this.runPipeline());

    // Enter key in regex input
    this.regexInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.runPipeline();
      }
    });

    // Clear button
    this.btnClear.addEventListener("click", () => {
      this.regexInput.value = "";
      this.regexInput.focus();
      this.errorBanner.style.display = "none";
    });

    // Expand & Collapse All
    this.btnExpandAll.addEventListener("click", () => {
      document
        .querySelectorAll(".accordion-card")
        .forEach((card) => card.classList.add("open"));
      this.renderVisibleGraphs();
    });

    this.btnCollapseAll.addEventListener("click", () => {
      document
        .querySelectorAll(".accordion-card")
        .forEach((card) => card.classList.remove("open"));
    });

    // Accordion headers toggle & ON-DEMAND rendering
    document.querySelectorAll(".card-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        const cardId = header.getAttribute("data-target");
        const card = document.getElementById(cardId);
        if (!card) return;

        const isOpen = card.classList.toggle("open");
        if (isOpen) {
          // Card was opened: trigger on-demand rendering for its graph
          this.renderGraphForCard(cardId);
        }
      });
    });

    // String simulator real-time input
    this.simInput.addEventListener("input", () => {
      this.runSimulation();
    });
  }

  insertTextAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;
    input.value = current.substring(0, start) + text + current.substring(end);
    if (text === "()") {
      input.selectionStart = input.selectionEnd = start + 1;
    } else {
      input.selectionStart = input.selectionEnd = start + text.length;
    }
    input.focus();
  }

  showError(message) {
    this.errorBanner.textContent = `⚠️ Syntax Error: ${message}`;
    this.errorBanner.style.display = "block";
    this.statusText.textContent = `Conversion halted: ${message}`;
  }

  hideError() {
    this.errorBanner.style.display = "none";
  }

  /**
   * Main Pipeline Execution
   */
  runPipeline() {
    const rawRegex = this.regexInput.value;
    this.hideError();

    // 1. Parse Regular Expression
    const parseResult = RegexParser.parse(rawRegex);
    if (parseResult.error) {
      this.showError(parseResult.error);
      return;
    }

    try {
      // 2. Thompson NFA
      const nfa = Thompson.build(parseResult.postfix);

      // 3. Subset Construction
      const subsetResult = SubsetConstruction.convert(
        nfa,
        parseResult.alphabet
      );

      // 4. Hopcroft Minimization
      const minResult = HopcroftMinimizer.minimize(subsetResult.dfa);

      // 5. String Simulator Examples
      const simExamples = StringSimulator.generateExamples(
        minResult.minimizedDfa,
        3,
        3
      );

      this.pipelineData = {
        parsed: parseResult,
        nfa,
        subset: subsetResult,
        minimized: minResult,
        examples: simExamples,
      };

      // Reset render flags for lazy loading
      this.renderedState.nfa = false;
      this.renderedState.dfa = false;
      this.renderedState.minDfa = false;

      // Update Badges & Tables immediately (instant DOM updates)
      this.updateBadges();
      this.renderNfaTable();
      this.renderSubsetTables();
      this.renderHopcroftSteps();
      this.renderSimulatorExamples();
      this.runSimulation();

      // Render only graphs whose cards are currently open
      this.renderVisibleGraphs();

      this.statusText.textContent = `Pipeline computed successfully in <2ms! Alphabet: {${parseResult.alphabet.join(", ")}}`;
    } catch (err) {
      console.error(err);
      this.showError(
        err.message || "Error occurred during automata computation"
      );
    }
  }

  updateBadges() {
    const { nfa, subset, minimized } = this.pipelineData;
    document.getElementById("nfa-stats-badge").textContent =
      `${nfa.states.length} States • ${nfa.transitions.length} Trans`;
    document.getElementById("dfa-stats-badge").textContent =
      `${subset.dfa.states.length} States`;
    document.getElementById("min-stats-badge").textContent =
      `${minimized.minimizedDfa.states.length} States (${minimized.equivalenceRounds.length} Rounds)`;
  }

  /**
   * On-Demand Rendering: Checks if card is open and renders its graph if dirty
   */
  renderVisibleGraphs() {
    if (document.getElementById("card-nfa")?.classList.contains("open")) {
      this.renderGraphForCard("card-nfa");
    }
    if (document.getElementById("card-dfa")?.classList.contains("open")) {
      this.renderGraphForCard("card-dfa");
    }
    if (document.getElementById("card-hopcroft")?.classList.contains("open")) {
      this.renderGraphForCard("card-hopcroft");
    }
  }

  renderGraphForCard(cardId) {
    if (!this.pipelineData) return;

    if (cardId === "card-nfa" && !this.renderedState.nfa) {
      const container = document.getElementById("nfa-graph-viewport");
      const { nfa } = this.pipelineData;
      const graphModel = {
        states: nfa.states.map((id) => ({
          id: id.toString(),
          label: id.toString(),
          isStart: id === nfa.startState,
          isAccept: nfa.acceptStates.includes(id),
        })),
        transitions: nfa.transitions.map((t) => ({
          from: t.from.toString(),
          to: t.to.toString(),
          symbol: t.symbol,
        })),
        startState: nfa.startState.toString(),
        acceptStates: nfa.acceptStates.map((s) => s.toString()),
      };
      if (this.graphControllers.nfa) this.graphControllers.nfa.destroy();
      this.graphControllers.nfa = GraphRenderer.render(container, graphModel, {
        isDark: this.isDark,
        idPrefix: "nfa",
      });
      this.renderedState.nfa = true;
    } else if (cardId === "card-dfa" && !this.renderedState.dfa) {
      const container = document.getElementById("dfa-graph-viewport");
      const { dfa } = this.pipelineData.subset;

      // Extract transitions for graph
      const transitionsList = [];
      for (const [fromId, symMap] of Object.entries(dfa.transitions)) {
        for (const [sym, toId] of Object.entries(symMap)) {
          transitionsList.push({ from: fromId, to: toId, symbol: sym });
        }
      }

      const graphModel = {
        states: dfa.states.map((s) => ({
          id: s.id,
          label: s.id,
          isStart: s.isStart,
          isAccept: s.isAccept,
        })),
        transitions: transitionsList,
        startState: dfa.states.find((s) => s.isStart)?.id || "d0",
        acceptStates: dfa.states.filter((s) => s.isAccept).map((s) => s.id),
      };
      if (this.graphControllers.dfa) this.graphControllers.dfa.destroy();
      this.graphControllers.dfa = GraphRenderer.render(container, graphModel, {
        isDark: this.isDark,
        idPrefix: "dfa",
      });
      this.renderedState.dfa = true;
    } else if (cardId === "card-hopcroft" && !this.renderedState.minDfa) {
      const container = document.getElementById("min-dfa-graph-viewport");
      const { minimizedDfa } = this.pipelineData.minimized;

      const transitionsList = [];
      for (const [fromId, symMap] of Object.entries(minimizedDfa.transitions)) {
        for (const [sym, toId] of Object.entries(symMap)) {
          transitionsList.push({ from: fromId, to: toId, symbol: sym });
        }
      }

      const graphModel = {
        states: minimizedDfa.states.map((s) => ({
          id: s.id,
          label: s.label || s.id,
          isStart: s.isStart,
          isAccept: s.isAccept,
        })),
        transitions: transitionsList,
        startState: minimizedDfa.states.find((s) => s.isStart)?.id || "d0",
        acceptStates: minimizedDfa.states
          .filter((s) => s.isAccept)
          .map((s) => s.id),
      };
      if (this.graphControllers.minDfa) this.graphControllers.minDfa.destroy();
      this.graphControllers.minDfa = GraphRenderer.render(
        container,
        graphModel,
        { isDark: this.isDark, idPrefix: "min-dfa" }
      );
      this.renderedState.minDfa = true;
    }
  }

  /**
   * Renders NFA Transition Table
   */
  renderNfaTable() {
    const tbody = document.querySelector("#nfa-transition-table tbody");
    if (!tbody) return;
    const { nfa } = this.pipelineData;
    tbody.innerHTML = "";

    nfa.transitions.forEach((t) => {
      const tr = document.createElement("tr");
      const fromIsStart =
        t.from === nfa.startState ? '<span class="state-start">→</span> ' : "";
      const toIsAccept = nfa.acceptStates.includes(t.to)
        ? ' <span class="state-accept">*</span>'
        : "";
      tr.innerHTML = `
        <td>${fromIsStart}<span class="state-chip">${t.from}</span></td>
        <td><span style="font-weight:bold;color:${t.symbol === "ε" ? "var(--text-muted)" : "var(--accent-blue)"}">${t.symbol}</span></td>
        <td><span class="state-chip">${t.to}</span>${toIsAccept}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * Renders Subset Construction Tables
   */
  renderSubsetTables() {
    const { intermediateTable, dfa } = this.pipelineData.subset;

    // 1. Intermediate "Sigma | Appears | Goes to" Table (FCIS '26 Lab 4)
    const intBody = document.querySelector("#intermediate-table tbody");
    if (intBody) {
      intBody.innerHTML = "";
      if (intermediateTable.length === 0) {
        intBody.innerHTML =
          '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No transition appearances</td></tr>';
      } else {
        intermediateTable.forEach((row) => {
          const tr = document.createElement("tr");
          const acceptStar = row.isAccept
            ? ' <span class="state-accept">*</span>'
            : "";
          tr.innerHTML = `
            <td><span style="font-weight:bold;color:var(--accent-blue);">${row.symbol}</span></td>
            <td><span class="state-chip">${row.appears}</span></td>
            <td>{ ${row.goesTo.join(", ")} }${acceptStar}</td>
          `;
          intBody.appendChild(tr);
        });
      }
    }

    // 2. Full DFA Transition Table
    const thead = document.getElementById("dfa-table-head");
    const tbody = document.getElementById("dfa-table-body");
    if (!thead || !tbody) return;

    let headHtml = `
      <tr>
        <th>DFA State</th>
        <th>NFA State Subset</th>
    `;
    for (const sym of dfa.alphabet) {
      headHtml += `<th>δ(q, ${sym})</th>`;
    }
    headHtml += `</tr>`;
    thead.innerHTML = headHtml;

    tbody.innerHTML = "";
    dfa.states.forEach((state) => {
      const tr = document.createElement("tr");
      const startPrefix = state.isStart
        ? '<span class="state-start">→</span> '
        : "";
      const acceptSuffix = state.isAccept
        ? ' <span class="state-accept">*</span>'
        : "";

      let rowHtml = `
        <td>${startPrefix}<span class="state-chip ${state.id === dfa.trapState ? "state-trap" : ""}">${state.id}</span>${acceptSuffix}</td>
        <td>${state.id === dfa.trapState ? "φ" : `{ ${state.nfaStates.join(", ")} }`}${acceptSuffix}</td>
      `;

      for (const sym of dfa.alphabet) {
        const dest = dfa.transitions[state.id]?.[sym] || dfa.trapState;
        rowHtml += `<td><span class="state-chip ${dest === dfa.trapState ? "state-trap" : ""}">${dest}</span></td>`;
      }
      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  }

  /**
   * Renders Hopcroft Equivalence Partitioning Steps & Minimized Table
   */
  renderHopcroftSteps() {
    const { equivalenceRounds, minimizedDfa } = this.pipelineData.minimized;

    // Timeline Container
    const timeline = document.getElementById("equivalence-timeline");
    if (timeline) {
      timeline.innerHTML = "";
      equivalenceRounds.forEach((round) => {
        const card = document.createElement("div");
        card.className = "timeline-card";

        const partitionStr = round.partition
          .map((g) => `{ ${g.join(", ")} }`)
          .join("   ");

        let expList = "";
        round.explanations.forEach((exp) => {
          expList += `<li class="explanation-item"><span class="explanation-bullet">•</span> <span>${exp}</span></li>`;
        });

        card.innerHTML = `
          <div class="timeline-header">
            <span class="timeline-title">
              <span>🏷️</span> ${round.round}-Equivalence Round
            </span>
          </div>
          <div class="partition-box">${partitionStr}</div>
          <ul class="explanation-list">${expList}</ul>
        `;
        timeline.appendChild(card);
      });
    }

    // Minimized DFA Table
    const minThead = document.getElementById("min-dfa-table-head");
    const minTbody = document.getElementById("min-dfa-table-body");
    if (!minThead || !minTbody) return;

    let headHtml = `
      <tr>
        <th>Minimized State</th>
        <th>Original DFA States</th>
    `;
    for (const sym of minimizedDfa.alphabet) {
      headHtml += `<th>δ(q, ${sym})</th>`;
    }
    headHtml += `</tr>`;
    minThead.innerHTML = headHtml;

    minTbody.innerHTML = "";
    minimizedDfa.states.forEach((state) => {
      const tr = document.createElement("tr");
      const startPrefix = state.isStart
        ? '<span class="state-start">→</span> '
        : "";
      const acceptSuffix = state.isAccept
        ? ' <span class="state-accept">*</span>'
        : "";

      let rowHtml = `
        <td>${startPrefix}<span class="state-chip">${state.id}</span>${acceptSuffix}</td>
        <td>${state.originalStates.length > 1 ? `{ ${state.originalStates.join(", ")} }` : state.originalStates[0]}${acceptSuffix}</td>
      `;

      for (const sym of minimizedDfa.alphabet) {
        const dest =
          minimizedDfa.transitions[state.id]?.[sym] || minimizedDfa.trapState;
        rowHtml += `<td><span class="state-chip">${dest}</span></td>`;
      }
      tr.innerHTML = rowHtml;
      minTbody.appendChild(tr);
    });
  }

  /**
   * Renders Example Accepted & Rejected Strings (Lecture 4 Slide 47 Requirement)
   */
  renderSimulatorExamples() {
    const { examples } = this.pipelineData;
    if (!examples) return;

    const renderList = (container, list, isAccepted) => {
      container.innerHTML = "";
      if (list.length === 0) {
        container.innerHTML =
          '<div style="color:var(--text-muted);font-size:12px;">No examples available</div>';
        return;
      }
      list.forEach((str) => {
        const item = document.createElement("div");
        item.className = "example-item";
        const displayStr = str === "" ? "ε (empty string)" : `"${str}"`;
        item.innerHTML = `
          <span>${displayStr}</span>
          <button type="button" class="btn-try-string" data-string="${str}">Test</button>
        `;
        item.querySelector(".btn-try-string").addEventListener("click", (e) => {
          this.simInput.value = e.target.getAttribute("data-string");
          this.runSimulation();
        });
        container.appendChild(item);
      });
    };

    renderList(this.acceptedExamplesList, examples.accepted, true);
    renderList(this.rejectedExamplesList, examples.rejected, false);
  }

  /**
   * Runs the interactive string simulation
   */
  runSimulation() {
    if (!this.pipelineData) return;
    const { minimizedDfa } = this.pipelineData.minimized;
    const testStr = this.simInput.value;

    const result = StringSimulator.simulate(minimizedDfa, testStr);

    if (result.accepted) {
      this.simBadge.className = "sim-badge accepted";
      this.simBadge.textContent = "ACCEPTED ✓";
    } else {
      this.simBadge.className = "sim-badge rejected";
      this.simBadge.textContent = "REJECTED ✗";
    }

    this.simReasonText.textContent = result.reason;

    // Render path chips
    this.simTraceChips.innerHTML = "";
    if (result.path.length === 0) {
      const startState = minimizedDfa.states.find((s) => s.isStart)?.id || "d0";
      this.simTraceChips.innerHTML = `<span class="trace-state">${startState}</span>`;
      return;
    }

    result.path.forEach((step, idx) => {
      if (idx === 0) {
        const spanFrom = document.createElement("span");
        spanFrom.className = "trace-state";
        spanFrom.textContent = step.state;
        this.simTraceChips.appendChild(spanFrom);
      }

      const spanArrow = document.createElement("span");
      spanArrow.className = "trace-arrow";
      spanArrow.textContent = `—[${step.symbol}]→`;
      this.simTraceChips.appendChild(spanArrow);

      const spanTo = document.createElement("span");
      spanTo.className = "trace-state";
      spanTo.textContent = step.nextState;
      this.simTraceChips.appendChild(spanTo);
    });
  }
}

// Instantiate on window DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
  window.automataApp = new AutomataApp();
});
