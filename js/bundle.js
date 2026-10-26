/* Auto-generated bundle for standalone offline execution (file:// protocol) */
(function() {
"use strict";

// ===== Source: regex-parser.js =====
/**
 * RegexParser
 * Parses regular expressions, inserts explicit concatenation operators (.),
 * and converts infix notation to postfix tokens via Shunting-Yard.
 * Supports standard symbols, ε (@, \e), |, *, +, ?, and parentheses.
 */
class RegexParser {
  static EPSILON = 'ε';

  static isEpsilon(token) {
    return token === 'ε' || token === 'ϵ' || token === '@' || token === '\\e';
  }

  static isOperator(char) {
    return char === '|' || char === '.' || char === '*' || char === '+' || char === '?' || char === '(' || char === ')';
  }

  static isPostfixOp(char) {
    return char === '*' || char === '+' || char === '?';
  }

  static precedence(op) {
    switch (op) {
      case '(':
        return 1;
      case '|':
        return 2;
      case '.':
        return 3;
      case '*':
      case '+':
      case '?':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Tokenizes and parses regular expression.
   * @param {string} rawRegex
   * @returns {{ tokens: string[], postfix: string[], alphabet: string[], error: string|null }}
   */
  static parse(rawRegex) {
    if (!rawRegex || typeof rawRegex !== 'string') {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression cannot be empty' };
    }

    const trimmed = rawRegex.trim();
    if (!trimmed) {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression cannot be empty' };
    }

    // Step 1: Lex raw string into initial tokens
    const rawTokens = [];
    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === 'e') {
        rawTokens.push(RegexParser.EPSILON);
        i += 2;
      } else if (ch === '@' || ch === 'ε' || ch === 'ϵ') {
        rawTokens.push(RegexParser.EPSILON);
        i++;
      } else {
        rawTokens.push(ch);
        i++;
      }
    }

    if (rawTokens.length === 0) {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression has no valid tokens' };
    }

    // Step 2: Validate basic syntax
    let parenCount = 0;
    for (let idx = 0; idx < rawTokens.length; idx++) {
      const token = rawTokens[idx];
      if (token === '(') parenCount++;
      if (token === ')') {
        parenCount--;
        if (parenCount < 0) {
          return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Unmatched closing parenthesis ")"' };
        }
      }
      if (idx === 0 && (token === '|' || RegexParser.isPostfixOp(token))) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: `Unexpected operator '${token}' at start of expression` };
      }
      if (token === '|' && (idx === 0 || rawTokens[idx - 1] === '(' || rawTokens[idx - 1] === '|')) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Invalid alternation "|" without left operand' };
      }
      if (token === '|' && (idx === rawTokens.length - 1 || rawTokens[idx + 1] === '|' || rawTokens[idx + 1] === ')')) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Invalid alternation "|" without right operand' };
      }
      if (token === '.') {
        if (idx === 0 || idx === rawTokens.length - 1 || rawTokens[idx - 1] === '(' || rawTokens[idx - 1] === '.' || rawTokens[idx + 1] === ')' || rawTokens[idx + 1] === '.') {
          return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Invalid concatenation "." without operands' };
        }
      }
      if (RegexParser.isPostfixOp(token) && idx > 0 && (rawTokens[idx - 1] === '(' || rawTokens[idx - 1] === '|')) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: `Operator '${token}' has no preceding operand` };
      }
      if (token === '(' && idx + 1 < rawTokens.length && rawTokens[idx + 1] === ')') {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Empty parentheses "()" are not allowed' };
      }
    }

    if (parenCount !== 0) {
      return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Unmatched opening parenthesis "("' };
    }

    // Step 3: Insert implicit concatenation operators (.)
    const tokensWithConcat = [];
    const alphabetSet = new Set();

    const isOperand = (t) => {
      return !RegexParser.isOperator(t) || RegexParser.isEpsilon(t);
    };

    for (let j = 0; j < rawTokens.length; j++) {
      const curr = rawTokens[j];
      tokensWithConcat.push(curr);

      if (isOperand(curr) && !RegexParser.isEpsilon(curr)) {
        alphabetSet.add(curr);
      }

      if (j + 1 < rawTokens.length) {
        const next = rawTokens[j + 1];
        // Insert '.' if:
        // (operand or postfix op or ')') followed by (operand or '(')
        const canEndOperand = isOperand(curr) || RegexParser.isPostfixOp(curr) || curr === ')';
        const canStartOperand = isOperand(next) || next === '(';

        if (canEndOperand && canStartOperand) {
          tokensWithConcat.push('.');
        }
      }
    }

    // Step 4: Shunting-Yard Algorithm (Infix to Postfix)
    const postfix = [];
    const opStack = [];

    for (const token of tokensWithConcat) {
      if (isOperand(token)) {
        postfix.push(token);
      } else if (RegexParser.isPostfixOp(token)) {
        // Unary postfix operators have highest precedence, output directly or after higher op
        postfix.push(token);
      } else if (token === '(') {
        opStack.push(token);
      } else if (token === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          postfix.push(opStack.pop());
        }
        if (opStack.length > 0) {
          opStack.pop(); // discard '('
        }
      } else {
        // Binary operators: '.' or '|'
        const prec = RegexParser.precedence(token);
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(' && RegexParser.precedence(opStack[opStack.length - 1]) >= prec) {
          postfix.push(opStack.pop());
        }
        opStack.push(token);
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop();
      if (top !== '(' && top !== ')') {
        postfix.push(top);
      }
    }

    const alphabet = Array.from(alphabetSet).sort();
    return {
      tokens: tokensWithConcat,
      postfix,
      alphabet,
      error: null
    };
  }
}


// ===== Source: thompson.js =====
/**
 * Thompson's Construction
 * Converts postfix regular expression tokens into an NFA.
 * Supports single characters, ε, concatenation (.), union (|), star (*), plus (+), and optional (?).
 */
class Thompson {
  static EPSILON = 'ε';

  /**
   * Constructs an NFA from postfix tokens.
   * @param {string[]} postfix
   * @returns {{
   *   states: number[],
   *   startState: number,
   *   acceptStates: number[],
   *   transitions: Array<{from: number, to: number, symbol: string}>
   * }}
   */
  static build(postfix) {
    if (!postfix || postfix.length === 0) {
      return {
        states: [0],
        startState: 0,
        acceptStates: [0],
        transitions: []
      };
    }

    let nextId = 0;
    const allocState = () => nextId++;

    const stack = [];

    for (const token of postfix) {
      if (token === '.') {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Malformed postfix expression for concatenation');
        // Thompson concatenation: connect a.accept to b.start via ε
        const transitions = [
          ...a.transitions,
          ...b.transitions,
          { from: a.accept, to: b.start, symbol: Thompson.EPSILON }
        ];
        stack.push({
          start: a.start,
          accept: b.accept,
          transitions
        });
      } else if (token === '|') {
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) throw new Error('Malformed postfix expression for alternation');
        const sIn = allocState();
        const sOut = allocState();
        const transitions = [
          ...a.transitions,
          ...b.transitions,
          { from: sIn, to: a.start, symbol: Thompson.EPSILON },
          { from: sIn, to: b.start, symbol: Thompson.EPSILON },
          { from: a.accept, to: sOut, symbol: Thompson.EPSILON },
          { from: b.accept, to: sOut, symbol: Thompson.EPSILON }
        ];
        stack.push({
          start: sIn,
          accept: sOut,
          transitions
        });
      } else if (token === '*') {
        const a = stack.pop();
        if (!a) throw new Error('Malformed postfix expression for star');
        const sIn = allocState();
        const sOut = allocState();
        const transitions = [
          ...a.transitions,
          { from: sIn, to: a.start, symbol: Thompson.EPSILON },
          { from: sIn, to: sOut, symbol: Thompson.EPSILON },
          { from: a.accept, to: a.start, symbol: Thompson.EPSILON },
          { from: a.accept, to: sOut, symbol: Thompson.EPSILON }
        ];
        stack.push({
          start: sIn,
          accept: sOut,
          transitions
        });
      } else if (token === '+') {
        const a = stack.pop();
        if (!a) throw new Error('Malformed postfix expression for plus');
        const sIn = allocState();
        const sOut = allocState();
        const transitions = [
          ...a.transitions,
          { from: sIn, to: a.start, symbol: Thompson.EPSILON },
          { from: a.accept, to: a.start, symbol: Thompson.EPSILON },
          { from: a.accept, to: sOut, symbol: Thompson.EPSILON }
        ];
        stack.push({
          start: sIn,
          accept: sOut,
          transitions
        });
      } else if (token === '?') {
        const a = stack.pop();
        if (!a) throw new Error('Malformed postfix expression for optional');
        const sIn = allocState();
        const sOut = allocState();
        const transitions = [
          ...a.transitions,
          { from: sIn, to: a.start, symbol: Thompson.EPSILON },
          { from: sIn, to: sOut, symbol: Thompson.EPSILON },
          { from: a.accept, to: sOut, symbol: Thompson.EPSILON }
        ];
        stack.push({
          start: sIn,
          accept: sOut,
          transitions
        });
      } else {
        // Base literal or epsilon
        const s0 = allocState();
        const s1 = allocState();
        stack.push({
          start: s0,
          accept: s1,
          transitions: [
            { from: s0, to: s1, symbol: token }
          ]
        });
      }
    }

    if (stack.length !== 1) {
      throw new Error(`Invalid postfix expression; ${stack.length} fragments remaining on stack`);
    }

    const finalFragment = stack.pop();

    // Canonical renumbering using topological flow order (start = 0, accept = end)
    const adj = new Map();
    for (const t of finalFragment.transitions) {
      if (!adj.has(t.from)) adj.set(t.from, []);
      adj.get(t.from).push(t.to);
    }
    // Deprioritize bypass edges to final accept so the main body is numbered first
    for (const [u, neighbors] of adj.entries()) {
      neighbors.sort((a, b) => {
        if (a === finalFragment.accept) return 1;
        if (b === finalFragment.accept) return -1;
        return a - b;
      });
    }

    // Detect cycle back edges with DFS
    const visited = new Set();
    const inStack = new Set();
    const backEdges = new Set();
    function findBackEdges(u) {
      visited.add(u);
      inStack.add(u);
      for (const v of adj.get(u) || []) {
        if (v === u || inStack.has(v)) {
          backEdges.add(`${u}->${v}`);
        } else if (!visited.has(v)) {
          findBackEdges(v);
        }
      }
      inStack.delete(u);
    }
    findBackEdges(finalFragment.start);

    // Post-order DFS on forward DAG to produce clean topological flow
    const postOrder = [];
    const visitedDag = new Set();
    function dfsDag(u) {
      visitedDag.add(u);
      for (const v of adj.get(u) || []) {
        if (!backEdges.has(`${u}->${v}`) && !visitedDag.has(v)) {
          dfsDag(v);
        }
      }
      postOrder.push(u);
    }
    dfsDag(finalFragment.start);

    const topoOrder = postOrder.reverse();
    const stateMap = new Map();
    let currentNewId = 0;
    for (const s of topoOrder) {
      if (!stateMap.has(s)) stateMap.set(s, currentNewId++);
    }

    // Assign any unvisited states (if any exist)
    for (const t of finalFragment.transitions) {
      if (!stateMap.has(t.from)) stateMap.set(t.from, currentNewId++);
      if (!stateMap.has(t.to)) stateMap.set(t.to, currentNewId++);
    }
    if (!stateMap.has(finalFragment.accept)) stateMap.set(finalFragment.accept, currentNewId++);

    const remappedTransitions = finalFragment.transitions.map(t => ({
      from: stateMap.get(t.from),
      to: stateMap.get(t.to),
      symbol: t.symbol
    })).sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      if (a.to !== b.to) return a.to - b.to;
      return a.symbol.localeCompare(b.symbol);
    });

    const states = Array.from({ length: currentNewId }, (_, i) => i);
    const startState = stateMap.get(finalFragment.start);
    const acceptStates = [stateMap.get(finalFragment.accept)];

    return {
      states,
      startState,
      acceptStates,
      transitions: remappedTransitions
    };
  }
}


// ===== Source: subset-construction.js =====
/**
 * Subset Construction (NFA to DFA)
 * Converts an NFA into an equivalent DFA using epsilon closures and powerset construction.
 * Generates:
 * 1. Intermediate "Sigma | Appears | Goes to" lookup table.
 * 2. Full DFA transition table with state names d0, d1, ... and dead state Φ.
 */
class SubsetConstruction {
  static TRAP_STATE = 'Φ';

  /**
   * Computes the ε-closure of a set of NFA states.
   * @param {number|number[]} states
   * @param {Array<{from: number, to: number, symbol: string}>} transitions
   * @returns {number[]} Sorted distinct state IDs
   */
  static epsilonClosure(states, transitions) {
    const initial = Array.isArray(states) ? states : [states];
    const closure = new Set(initial);
    const stack = [...initial];

    // Build ε-adjacency list
    const epsAdj = new Map();
    for (const t of transitions) {
      if (t.symbol === 'ε' || t.symbol === 'ϵ') {
        if (!epsAdj.has(t.from)) epsAdj.set(t.from, []);
        epsAdj.get(t.from).push(t.to);
      }
    }

    while (stack.length > 0) {
      const u = stack.pop();
      const neighbors = epsAdj.get(u) || [];
      for (const v of neighbors) {
        if (!closure.has(v)) {
          closure.add(v);
          stack.push(v);
        }
      }
    }

    return Array.from(closure).sort((a, b) => a - b);
  }

  /**
   * Finds all direct destinations from a set of states on a given symbol.
   * @param {number[]} states
   * @param {string} symbol
   * @param {Array<{from: number, to: number, symbol: string}>} transitions
   * @returns {number[]}
   */
  static move(states, symbol, transitions) {
    const dest = new Set();
    const stateSet = new Set(states);
    for (const t of transitions) {
      if (stateSet.has(t.from) && t.symbol === symbol) {
        dest.add(t.to);
      }
    }
    return Array.from(dest).sort((a, b) => a - b);
  }

  /**
   * Builds the intermediate "Sigma | Appears | Goes to" table (FCIS '26 Lab 4 format).
   * @param {Object} nfa
   * @param {string[]} alphabet
   * @returns {Array<{symbol: string, appears: number, goesTo: number[], isAccept: boolean}>}
   */
  static buildIntermediateTable(nfa, alphabet) {
    const rows = [];
    const acceptSet = new Set(nfa.acceptStates);

    for (const sym of alphabet) {
      // Find all transitions on symbol
      const matching = nfa.transitions.filter(t => t.symbol === sym);
      // Group by source state
      const appearsMap = new Map();
      for (const t of matching) {
        if (!appearsMap.has(t.from)) appearsMap.set(t.from, []);
        appearsMap.get(t.from).push(t.to);
      }

      for (const [fromState, destStates] of appearsMap.entries()) {
        const closure = SubsetConstruction.epsilonClosure(destStates, nfa.transitions);
        const isAccept = closure.some(s => acceptSet.has(s));
        rows.push({
          symbol: sym,
          appears: fromState,
          goesTo: closure,
          isAccept
        });
      }
    }

    rows.sort((a, b) => {
      if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
      return a.appears - b.appears;
    });

    return rows;
  }

  /**
   * Converts an NFA to a DFA using Subset Construction.
   * @param {{ states: number[], startState: number, acceptStates: number[], transitions: Array<{from: number, to: number, symbol: string}> }} nfa
   * @param {string[]} alphabet
   * @returns {{
   *   intermediateTable: Array<{symbol: string, appears: number, goesTo: number[], isAccept: boolean}>,
   *   dfa: {
   *     states: Array<{id: string, nfaStates: number[], isStart: boolean, isAccept: boolean}>,
   *     alphabet: string[],
   *     transitions: Record<string, Record<string, string>>,
   *     trapState: string
   *   }
   * }}
   */
  static convert(nfa, alphabet) {
    const intermediateTable = SubsetConstruction.buildIntermediateTable(nfa, alphabet);
    const acceptSet = new Set(nfa.acceptStates);

    const startClosure = SubsetConstruction.epsilonClosure(nfa.startState, nfa.transitions);
    const keyOf = (arr) => arr.join(',');

    const dfaStates = [];
    const stateMap = new Map(); // key -> id
    const transitions = {};

    let stateCounter = 0;
    const addDfaState = (nfaStates, isStart = false) => {
      const id = `d${stateCounter++}`;
      const isAccept = nfaStates.some(s => acceptSet.has(s));
      const stateObj = {
        id,
        nfaStates,
        isStart,
        isAccept
      };
      dfaStates.push(stateObj);
      stateMap.set(keyOf(nfaStates), id);
      transitions[id] = {};
      return stateObj;
    };

    const initial = addDfaState(startClosure, true);
    const queue = [initial];
    let trapNeeded = false;

    while (queue.length > 0) {
      const current = queue.shift();

      for (const sym of alphabet) {
        const directDest = SubsetConstruction.move(current.nfaStates, sym, nfa.transitions);
        if (directDest.length === 0) {
          transitions[current.id][sym] = SubsetConstruction.TRAP_STATE;
          trapNeeded = true;
        } else {
          const closure = SubsetConstruction.epsilonClosure(directDest, nfa.transitions);
          const key = keyOf(closure);
          if (!stateMap.has(key)) {
            const newState = addDfaState(closure, false);
            queue.push(newState);
            transitions[current.id][sym] = newState.id;
          } else {
            transitions[current.id][sym] = stateMap.get(key);
          }
        }
      }
    }

    // If trap state is referenced, add explicit row for Φ
    if (trapNeeded) {
      dfaStates.push({
        id: SubsetConstruction.TRAP_STATE,
        nfaStates: [],
        isStart: false,
        isAccept: false
      });
      transitions[SubsetConstruction.TRAP_STATE] = {};
      for (const sym of alphabet) {
        transitions[SubsetConstruction.TRAP_STATE][sym] = SubsetConstruction.TRAP_STATE;
      }
    }

    return {
      intermediateTable,
      dfa: {
        states: dfaStates,
        alphabet,
        transitions,
        trapState: SubsetConstruction.TRAP_STATE
      }
    };
  }
}


// ===== Source: hopcroft-minimization.js =====
/**
 * Hopcroft DFA Minimization (Equivalence Partitioning)
 * Minimizes a DFA using iterative k-equivalence partitioning (0-Equivalence, 1-Equivalence, ...).
 * Produces:
 * 1. Step-by-step equivalence partitions with human-readable split justifications.
 * 2. Minimized DFA transition table matching FCIS '26 standards.
 */
class HopcroftMinimizer {
  /**
   * Minimizes a DFA.
   * @param {{
   *   states: Array<{id: string, nfaStates: number[], isStart: boolean, isAccept: boolean}>,
   *   alphabet: string[],
   *   transitions: Record<string, Record<string, string>>,
   *   trapState: string
   * }} dfa
   * @returns {{
   *   equivalenceRounds: Array<{ round: number, partition: string[][], explanations: string[] }>,
   *   minimizedDfa: {
   *     states: Array<{id: string, originalStates: string[], label: string, isStart: boolean, isAccept: boolean}>,
   *     alphabet: string[],
   *     transitions: Record<string, Record<string, string>>,
   *     trapState: string
   *   }
   * }}
   */
  static minimize(dfa) {
    const { states, alphabet, transitions, trapState } = dfa;

    // Helper: Find which group an ID belongs to in a partition
    const findGroupIndex = (partition, stateId) => {
      for (let i = 0; i < partition.length; i++) {
        if (partition[i].includes(stateId)) return i;
      }
      return -1;
    };

    // Helper: Canonical string sort for states in a group
    const sortStates = (arr) => {
      return [...arr].sort((a, b) => {
        if (a === trapState) return 1;
        if (b === trapState) return -1;
        const numA = parseInt(a.replace(/\D/g, ''), 10);
        const numB = parseInt(b.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
      });
    };

    // Step 1: 0-Equivalence Partition
    // Group 1: Non-accepting states (including Φ if present)
    // Group 2: Accepting states
    const nonAccepting = sortStates(states.filter(s => !s.isAccept).map(s => s.id));
    const accepting = sortStates(states.filter(s => s.isAccept).map(s => s.id));

    const p0 = [];
    if (nonAccepting.length > 0) p0.push(nonAccepting);
    if (accepting.length > 0) p0.push(accepting);

    const equivalenceRounds = [
      {
        round: 0,
        partition: p0.map(g => [...g]),
        explanations: [
          `0-Equivalence initial partition: Non-Accepting states ${nonAccepting.length > 0 ? `{${nonAccepting.join(', ')}}` : '∅'} and Accepting states ${accepting.length > 0 ? `{${accepting.join(', ')}}` : '∅'}.`
        ]
      }
    ];

    let currentPartition = p0;
    let roundNum = 1;

    // Step 2: Iterative Refinement
    while (true) {
      const nextPartition = [];
      const explanations = [];

      for (const group of currentPartition) {
        if (group.length <= 1) {
          nextPartition.push([...group]);
          continue;
        }

        // Group states by their transition target group indices
        const signatureMap = new Map();
        for (const stateId of group) {
          const sigParts = [];
          for (const sym of alphabet) {
            const dest = transitions[stateId]?.[sym] || trapState;
            const destGroupIdx = findGroupIndex(currentPartition, dest);
            sigParts.push(`${sym}->G${destGroupIdx}`);
          }
          const signature = sigParts.join('|');
          if (!signatureMap.has(signature)) {
            signatureMap.set(signature, []);
          }
          signatureMap.get(signature).push(stateId);
        }

        const subGroups = Array.from(signatureMap.values()).map(sortStates);

        if (subGroups.length === 1) {
          nextPartition.push(subGroups[0]);
          explanations.push(`Group {${group.join(', ')}} is consistent across all alphabet symbols.`);
        } else {
          // Explaining splits
          const splitSummary = subGroups.map(sg => `{${sg.join(', ')}}`).join(', ');
          explanations.push(`Group {${group.join(', ')}} splits into ${splitSummary} due to different transition destinations.`);
          for (const sg of subGroups) {
            nextPartition.push(sg);
          }
        }
      }

      // Sort next partition canonical order
      nextPartition.sort((a, b) => {
        if (a[0] === trapState) return 1;
        if (b[0] === trapState) return -1;
        return a[0].localeCompare(b[0]);
      });

      // Check for convergence
      const isSame = (
        currentPartition.length === nextPartition.length &&
        currentPartition.every((g, i) => g.length === nextPartition[i].length && g.every((v, j) => v === nextPartition[i][j]))
      );

      equivalenceRounds.push({
        round: roundNum,
        partition: nextPartition.map(g => [...g]),
        explanations: isSame
          ? [`No further splits. Convergence achieved at ${roundNum}-Equivalence.`]
          : explanations
      });

      if (isSame) {
        break;
      }

      currentPartition = nextPartition;
      roundNum++;
      if (roundNum > 50) break; // Safeguard against theoretical loops
    }

    // Step 3: Synthesize Minimized DFA
    const finalPartition = equivalenceRounds[equivalenceRounds.length - 1].partition;
    const originalStateMap = new Map(states.map(s => [s.id, s]));

    const minimizedStates = [];
    const minTransitions = {};

    finalPartition.forEach((group, idx) => {
      // Find if any state in group is start or accept
      const isStart = group.some(sId => originalStateMap.get(sId)?.isStart);
      const isAccept = group.some(sId => originalStateMap.get(sId)?.isAccept);
      const isTrap = group.length === 1 && group[0] === trapState;

      // Primary ID: use original state ID (or group label)
      const leaderId = group[0];
      const label = group.length > 1 ? `{${group.join(', ')}}` : group[0];
      const minId = isTrap ? trapState : (group.length > 1 ? leaderId : group[0]);

      minimizedStates.push({
        id: minId,
        label,
        originalStates: group,
        isStart,
        isAccept
      });

      minTransitions[minId] = {};
    });

    // Populate transitions
    for (const minState of minimizedStates) {
      const repOriginal = minState.originalStates[0];
      for (const sym of alphabet) {
        const destOrig = transitions[repOriginal]?.[sym] || trapState;
        const targetGroupIdx = findGroupIndex(finalPartition, destOrig);
        const targetMinState = minimizedStates[targetGroupIdx];
        minTransitions[minState.id][sym] = targetMinState ? targetMinState.id : trapState;
      }
    }

    return {
      equivalenceRounds,
      minimizedDfa: {
        states: minimizedStates,
        alphabet,
        transitions: minTransitions,
        trapState
      }
    };
  }
}


// ===== Source: string-simulator.js =====
/**
 * String Simulator
 * Simulates user input strings on a DFA step-by-step.
 * Generates accepted and rejected test strings (e.g., 3 accepted & 3 rejected).
 */
class StringSimulator {
  /**
   * Simulates an input string on a DFA.
   * @param {{
   *   states: Array<{id: string, isStart: boolean, isAccept: boolean}>,
   *   alphabet: string[],
   *   transitions: Record<string, Record<string, string>>,
   *   trapState: string
   * }} dfa
   * @param {string} inputString
   * @returns {{
   *   accepted: boolean,
   *   path: Array<{state: string, symbol: string, nextState: string}>,
   *   finalState: string,
   *   reason: string
   * }}
   */
  static simulate(dfa, inputString) {
    const startState = dfa.states.find(s => s.isStart) || dfa.states[0];
    if (!startState) {
      return { accepted: false, path: [], finalState: '', reason: 'DFA has no states' };
    }

    const stateMap = new Map(dfa.states.map(s => [s.id, s]));
    let currentState = startState.id;
    const path = [];

    // Normalize empty / epsilon string
    const chars = (inputString === 'ε' || inputString === 'ϵ' || inputString === '@' || inputString === '\\e' || inputString === '')
      ? []
      : inputString.split('');

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (!dfa.alphabet.includes(char)) {
        return {
          accepted: false,
          path,
          finalState: currentState,
          reason: `Rejected: Character '${char}' at index ${i} is not in alphabet Σ = {${dfa.alphabet.join(', ')}}`
        };
      }

      const next = dfa.transitions[currentState]?.[char] || dfa.trapState;
      path.push({
        state: currentState,
        symbol: char,
        nextState: next
      });
      currentState = next;
    }

    const finalStateObj = stateMap.get(currentState);
    const isAccepting = finalStateObj?.isAccept === true && currentState !== dfa.trapState;

    const reason = isAccepting
      ? `Accepted: Simulation terminated in accepting state '${currentState}'`
      : `Rejected: Simulation terminated in non-accepting state '${currentState}'${currentState === dfa.trapState ? ' (Dead/Trap State Φ)' : ''}`;

    return {
      accepted: isAccepting,
      path,
      finalState: currentState,
      reason
    };
  }

  /**
   * Generates candidate accepted and rejected example strings.
   * @param {Object} dfa
   * @param {number} maxAccepted
   * @param {number} maxRejected
   * @returns {{ accepted: string[], rejected: string[] }}
   */
  static generateExamples(dfa, maxAccepted = 3, maxRejected = 3) {
    const accepted = [];
    const rejected = [];

    const queue = [''];
    const visited = new Set(['']);

    const alphabet = dfa.alphabet && dfa.alphabet.length > 0 ? dfa.alphabet : ['a', 'b'];

    while (queue.length > 0 && (accepted.length < maxAccepted || rejected.length < maxRejected)) {
      const str = queue.shift();
      const sim = StringSimulator.simulate(dfa, str);

      if (sim.accepted && accepted.length < maxAccepted) {
        if (!accepted.includes(str)) accepted.push(str);
      } else if (!sim.accepted && rejected.length < maxRejected) {
        if (!rejected.includes(str)) rejected.push(str);
      }

      // Generate next candidates up to length 6
      if (str.length < 6) {
        for (const sym of alphabet) {
          const nextStr = str + sym;
          if (!visited.has(nextStr)) {
            visited.add(nextStr);
            queue.push(nextStr);
          }
        }
      }
    }

    return {
      accepted,
      rejected
    };
  }
}


// ===== Source: graph-renderer.js =====
/**
 * GraphRenderer
 * High-performance standalone SVG directed graph layout and renderer for finite state automata.
 * Visual design matches interactive_dfa_studio_c_lexical_analyzer:
 * - Crisp state circles with color-coded semantic types (Start: Sky Blue, Accept: Emerald Double-Circle, Dead/Trap: Rose, Regular: Slate)
 * - Prominent, bold directed transition paths (3.2px) with distinct arrowhead markers
 * - Sleek rounded transition label pills with drop shadows and JetBrains Mono typography
 * - High-arch cubic Bezier self-loops
 * - Fully distinct opposing bidirectional transitions (two separate independent curves with individual arrows and labels)
 * - Concentric obstacle-avoiding edge routing:
 *     * Multi-layer feedback loops arch cleanly OVER THE TOP of intermediate states
 *     * Multi-layer forward bypass edges arch cleanly UNDER THE BOTTOM of intermediate states
 *     * Straight horizontal/diagonal lines for adjacent steps with zero overlay
 * - Prominent "start" indicator arrow
 * - Canvas radial dot-grid background
 * - Pure visualizer (cannot be edited): interactive pan & zoom without altering layout
 */
class GraphRenderer {
  /**
   * Computes layout coordinates (x, y) for each state in the graph.
   * Uses DAG longest-path layering with cycle back-edge detection and
   * barycentric sorting to maintain clean parallel tracks without line crossings.
   * @param {Array<{id: string, isStart?: boolean, isAccept?: boolean}>} states
   * @param {Array<{from: string, to: string, symbol: string}>} transitions
   * @param {string} startStateId
   * @param {number} width
   * @param {number} height
   * @returns {Map<string, {x: number, y: number, layer: number}>}
   */
  static computeLayout(states, transitions, startStateId, width = 900, height = 450) {
    if (!states || states.length === 0) return new Map();

    const isTrapState = (id) => id === 'Φ' || id === 'trap' || id.toLowerCase().includes('trap') || id.toLowerCase().includes('dead');
    const regularStates = states.filter(s => !isTrapState(s.id));
    const trapStates = states.filter(s => isTrapState(s.id));

    // If only trap states exist:
    if (regularStates.length === 0) {
      const positions = new Map();
      trapStates.forEach(s => positions.set(s.id, { x: width / 2, y: height / 2, layer: 0, isTrap: true }));
      return positions;
    }

    const adj = new Map();
    for (const s of regularStates) adj.set(s.id, []);
    for (const t of transitions) {
      if (adj.has(t.from) && adj.has(t.to)) {
        adj.get(t.from).push(t.to);
      }
    }

    // 1. Detect cycle back-edges using DFS from startStateId
    const visited = new Set();
    const inStack = new Set();
    const backEdges = new Set();

    function dfsCycle(u) {
      visited.add(u);
      inStack.add(u);
      for (const v of adj.get(u) || []) {
        if (v === u || inStack.has(v)) {
          backEdges.add(`${u}->${v}`);
        } else if (!visited.has(v)) {
          dfsCycle(v);
        }
      }
      inStack.delete(u);
    }

    const actualStart = regularStates.find(s => s.id === startStateId)?.id || regularStates[0].id;
    if (adj.has(actualStart)) {
      dfsCycle(actualStart);
    }
    for (const s of regularStates) {
      if (!visited.has(s.id)) dfsCycle(s.id);
    }

    // 2. Build forward DAG excluding back-edges and self-loops
    const dagAdj = new Map();
    const inDegree = new Map();
    for (const s of regularStates) {
      dagAdj.set(s.id, []);
      inDegree.set(s.id, 0);
    }
    for (const t of transitions) {
      const k = `${t.from}->${t.to}`;
      if (dagAdj.has(t.from) && dagAdj.has(t.to) && !backEdges.has(k) && t.from !== t.to) {
        dagAdj.get(t.from).push(t.to);
        inDegree.set(t.to, (inDegree.get(t.to) || 0) + 1);
      }
    }

    // 3. Topological Sort on Forward DAG
    const q = [];
    for (const s of regularStates) {
      if (inDegree.get(s.id) === 0) q.push(s.id);
    }
    const topo = [];
    const degCopy = new Map(inDegree);
    while (q.length > 0) {
      const u = q.shift();
      topo.push(u);
      for (const v of dagAdj.get(u) || []) {
        degCopy.set(v, degCopy.get(v) - 1);
        if (degCopy.get(v) === 0) q.push(v);
      }
    }

    // 4. Longest-Path Layering
    const layers = new Map();
    for (const s of regularStates) layers.set(s.id, 0);

    for (const u of topo) {
      const curL = layers.get(u) || 0;
      for (const v of dagAdj.get(u) || []) {
        if (layers.get(v) < curL + 1) {
          layers.set(v, curL + 1);
        }
      }
    }

    // 5. Assign layers for unvisited states
    let maxLayer = 0;
    for (const l of layers.values()) {
      if (l > maxLayer) maxLayer = l;
    }

    for (const s of regularStates) {
      if (!layers.has(s.id)) {
        layers.set(s.id, maxLayer + 1);
      }
    }

    let finalMaxLayer = 0;
    for (const l of layers.values()) {
      if (l > finalMaxLayer) finalMaxLayer = l;
    }

    // 6. Group states by layer
    const layerGroups = Array.from({ length: finalMaxLayer + 1 }, () => []);
    for (const [id, layer] of layers.entries()) {
      layerGroups[layer].push(id);
    }
    const nonEmptyGroups = layerGroups.filter(g => g.length > 0);
    const numLayers = nonEmptyGroups.length;

    // 7. Barycentric sorting to align tracks and prevent crossing edges
    for (let l = 1; l < numLayers; l++) {
      const prevGroup = nonEmptyGroups[l - 1];
      const prevRank = new Map(prevGroup.map((id, idx) => [id, idx]));
      nonEmptyGroups[l].sort((a, b) => {
        const predsA = transitions.filter(t => t.to === a && prevRank.has(t.from)).map(t => prevRank.get(t.from));
        const predsB = transitions.filter(t => t.to === b && prevRank.has(t.from)).map(t => prevRank.get(t.from));
        const avgA = predsA.length ? (predsA.reduce((s, x) => s + x, 0) / predsA.length) : 0;
        const avgB = predsB.length ? (predsB.reduce((s, x) => s + x, 0) / predsB.length) : 0;
        return avgA - avgB;
      });
    }

    // 8. Calculate physical (x, y) coordinates for regular states
    const positions = new Map();
    const startX = 90;
    const availableWidth = Math.max(width - 180, numLayers * 140);
    const xStep = numLayers > 1 ? availableWidth / (numLayers - 1) : 0;
    const centerY = height / 2;

    for (let l = 0; l < numLayers; l++) {
      const group = nonEmptyGroups[l];
      const count = group.length;
      const x = startX + l * xStep;

      const ySpacing = Math.min(105, (height - 130) / Math.max(1, count));
      for (let i = 0; i < count; i++) {
        const id = group[i];
        const yOffset = (i - (count - 1) / 2) * ySpacing;
        const y = centerY + yOffset;
        positions.set(id, { x, y, layer: l, isTrap: false });
      }
    }

    // 9. Position trap states on dedicated lower sink row
    if (trapStates.length > 0) {
      const regularPositions = regularStates.map(s => positions.get(s.id)).filter(Boolean);
      const minX = Math.min(...regularPositions.map(p => p.x));
      const maxX = Math.max(...regularPositions.map(p => p.x));
      const maxY = Math.max(...regularPositions.map(p => p.y));
      const trapCenterX = (minX + maxX) / 2;
      const trapY = maxY + 120;

      trapStates.forEach((s, idx) => {
        const xOffset = (idx - (trapStates.length - 1) / 2) * 80;
        positions.set(s.id, {
          x: trapCenterX + xOffset,
          y: trapY,
          layer: numLayers,
          isTrap: true
        });
      });
    }

    return positions;
  }

  /**
   * Generates pure SVG string representing the graph.
   * Visual aesthetics matching interactive_dfa_studio_c_lexical_analyzer.html.
   * Features:
   * - Fully distinct bidirectional transitions: p1 -> p2 on one line, p2 -> p1 on a separate line
   * - Obstacle-avoiding edge routing where loopbacks arch over the top
   *   and long bypasses arch under the bottom, preventing all line overlaps
   * - Dynamic node radius & scaling font so composite labels ({d0, d2, d3}) fit cleanly
   * @param {{ states: Array<{id: string, label?: string, isStart?: boolean, isAccept?: boolean}>, transitions: Array<{from: string, to: string, symbol: string}>, startState: string, acceptStates: string[] }} graphModel
   * @param {{ isDark?: boolean, width?: number, height?: number, idPrefix?: string }} options
   * @returns {string}
   */
  static createSvgString(graphModel, options = {}) {
    const isDark = options.isDark !== false;
    const width = options.width || 900;
    const height = options.height || 450;
    const centerY = height / 2;
    const idPrefix = options.idPrefix || 'g' + Math.floor(Math.random() * 10000);
    const R = 28; // base node radius
    const isTrapState = (id) => id === 'Φ' || id === 'trap' || (typeof id === 'string' && (id.toLowerCase().includes('trap') || id.toLowerCase().includes('dead')));

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

    // Compute dynamic node radius per state so composite labels fit cleanly inside
    for (const state of states) {
      const label = state.label || state.id;
      const nodeR = Math.max(R, Math.min(38, Math.round(label.length * 2.8 + 2)));
      const pos = positions.get(state.id);
      if (pos) {
        pos.r = nodeR;
      }
    }

    // Dynamic width calculation
    let maxX = 0;
    for (const pos of positions.values()) {
      if (pos.x > maxX) maxX = pos.x;
    }

    // Account for clearance lanes extending outward around stacked states
    for (const t of transitions) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      if (p1 && p2 && (p2.isTrap || isTrapState(t.to))) {
        for (const [otherId, pos] of positions.entries()) {
          if (otherId !== t.from && !pos.isTrap && !isTrapState(otherId)) {
            if (Math.abs(pos.x - p1.x) <= 35 && pos.y > p1.y + 20) {
              if (p1.x >= p2.x && pos.x + 90 > maxX) {
                maxX = pos.x + 90;
              }
            }
          }
        }
      }
    }
    const viewBoxWidth = Math.max(width, maxX + 110);

    // Theme palette
    const themeKey = isDark ? 'dark' : 'light';
    const markerId = `arrow-${idPrefix}-${themeKey}`;
    const startMarkerId = `start-arrow-${idPrefix}-${themeKey}`;
    const deadMarkerId = `dead-arrow-${idPrefix}-${themeKey}`;
    const shadowId = `shadow-${idPrefix}`;

    const bg = isDark ? '#111827' : '#ffffff';
    const gridDot = isDark ? '#374151' : '#cbd5e1';

    // State Colors
    const regularNodeFill = isDark ? '#1e293b' : '#ffffff';
    const regularNodeStroke = isDark ? '#64748b' : '#334155';

    const startNodeFill = isDark ? '#0c4a6e' : '#f0f9ff';
    const startNodeStroke = isDark ? '#38bdf8' : '#0284c7';
    const startArrowColor = isDark ? '#38bdf8' : '#0284c7';

    const acceptNodeFill = isDark ? '#064e3b' : '#ecfdf5';
    const acceptNodeStroke = isDark ? '#34d399' : '#059669';

    const trapNodeFill = isDark ? '#4c0519' : '#fff1f2';
    const trapNodeStroke = isDark ? '#f43f5e' : '#e11d48';

    // Transition Colors
    const edgeStroke = isDark ? '#94a3b8' : '#1e293b';
    const edgeDeadStroke = isDark ? '#f43f5e' : '#e11d48';
    const edgePillFill = isDark ? '#1e293b' : '#ffffff';
    const edgePillStroke = isDark ? '#64748b' : '#475569';
    const edgeTextFill = isDark ? '#f8fafc' : '#0f172a';
    const stateTextFill = isDark ? '#f8fafc' : '#0f172a';

    // Edge Classification & Obstacle Avoidance Routing
    const existingPairs = new Set(transitions.map(t => `${t.from}->${t.to}`));
    const selfLoops = [];
    const trapEdges = [];
    const backwardEdges = [];
    const bypassEdges = [];
    const regularEdges = [];

    for (const t of transitions) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      if (!p1 || !p2) continue;

      if (t.from === t.to) {
        selfLoops.push(t);
      } else if (p2.isTrap || isTrapState(t.to)) {
        trapEdges.push(t);
      } else {
        const isAdjacent = Math.abs(p1.layer - p2.layer) <= 1;
        const hasReverse = existingPairs.has(`${t.to}->${t.from}`);

        if (hasReverse && isAdjacent) {
          // Bidirectional adjacent pair: each direction must have its own distinct curved line
          regularEdges.push(t);
        } else if (p2.layer < p1.layer && !isAdjacent) {
          // Backward multi-layer loop (e.g. 10 -> 1 looping back over top)
          backwardEdges.push(t);
        } else if (p2.layer > p1.layer && (p2.layer - p1.layer) > 1) {
          // Forward bypass skipping intermediate layers (e.g. 0 -> 11 bypassing under bottom)
          bypassEdges.push(t);
        } else {
          regularEdges.push(t);
        }
      }
    }

    // Calculate angular fan-in ports on trap state(s)
    const trapTargetPorts = new Map();
    const trapEdgesByTarget = new Map();
    for (const t of trapEdges) {
      if (!trapEdgesByTarget.has(t.to)) trapEdgesByTarget.set(t.to, []);
      trapEdgesByTarget.get(t.to).push(t);
    }

    for (const [targetId, edges] of trapEdgesByTarget.entries()) {
      const pTrap = positions.get(targetId);
      const rTrap = pTrap ? (pTrap.r || R) : R;
      const trapX = pTrap ? pTrap.x : width / 2;
      const trapY = pTrap ? pTrap.y : height;

      // Sort by source state x-coordinate and vertical position
      edges.sort((a, b) => {
        const p1a = positions.get(a.from);
        const p1b = positions.get(b.from);
        if (!p1a || !p1b) return 0;
        const calcKey = (p) => {
          const dx = p.x - trapX;
          const dy = trapY - p.y;
          if (dx < -10) return dx - dy * 0.15;
          if (dx > 10) return dx + dy * 0.15;
          return dx;
        };
        return calcKey(p1a) - calcKey(p1b);
      });

      const K = edges.length;
      const minAngle = -150 * Math.PI / 180;
      const maxAngle = -30 * Math.PI / 180;

      edges.forEach((t, i) => {
        const p1 = positions.get(t.from);
        const angle = K === 1
          ? Math.max(minAngle, Math.min(maxAngle, Math.atan2(p1.y - trapY, p1.x - trapX)))
          : minAngle + (i / (K - 1)) * (maxAngle - minAngle);

        const ex = trapX + (rTrap + 3) * Math.cos(angle);
        const ey = trapY + (rTrap + 3) * Math.sin(angle);
        trapTargetPorts.set(`${t.from}->${t.to}`, { ex, ey, angle });
      });
    }

    // Sort arches by span so they form concentric, non-overlapping bridges
    backwardEdges.sort((a, b) => {
      const p1a = positions.get(a.from), p2a = positions.get(a.to);
      const p1b = positions.get(b.from), p2b = positions.get(b.to);
      return (p1a.x - p2a.x) - (p1b.x - p2b.x);
    });

    bypassEdges.sort((a, b) => {
      const p1a = positions.get(a.from), p2a = positions.get(a.to);
      const p1b = positions.get(b.from), p2b = positions.get(b.to);
      return (p2a.x - p1a.x) - (p2b.x - p1b.x);
    });

    // Compute bounding box extents to ensure SVG height accommodates high/low arches
    let minObsY = height;
    let maxObsY = 0;
    for (const pos of positions.values()) {
      const r = pos.r || R;
      if (pos.y - r < minObsY) minObsY = pos.y - r;
      if (pos.y + r > maxObsY) maxObsY = pos.y + r;
    }

    // Assign arch apex Y coordinates
    backwardEdges.forEach((t, idx) => {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      let localMinY = Math.min(p1.y, p2.y);
      for (const pos of positions.values()) {
        if (pos.x >= Math.min(p1.x, p2.x) - 10 && pos.x <= Math.max(p1.x, p2.x) + 10) {
          if (pos.y < localMinY) localMinY = pos.y;
        }
      }
      t._archY = (localMinY - R) - 45 - (idx * 26) - (Math.abs(p1.layer - p2.layer) * 4);
      if (t._archY - 35 < minObsY) minObsY = t._archY - 35;
    });

    bypassEdges.forEach((t, idx) => {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      let localMaxY = Math.max(p1.y, p2.y);
      for (const pos of positions.values()) {
        if (pos.x >= Math.min(p1.x, p2.x) - 10 && pos.x <= Math.max(p1.x, p2.x) + 10) {
          if (pos.y > localMaxY) localMaxY = pos.y;
        }
      }
      t._archY = (localMaxY + R) + 45 + (idx * 26) + (Math.abs(p2.layer - p1.layer) * 4);
      if (t._archY + 35 > maxObsY) maxObsY = t._archY + 35;
    });

    for (const t of selfLoops) {
      const p = positions.get(t.from);
      const r = p?.r || R;
      if (p) {
        if (p.isTrap || isTrapState(t.from)) {
          if (p.y + r + 75 > maxObsY) maxObsY = p.y + r + 75;
        } else {
          if (p.y - r - 75 < minObsY) minObsY = p.y - r - 75;
        }
      }
    }

    // Account for bidirectional return arches in vertical extents
    for (const t of regularEdges) {
      if (existingPairs.has(`${t.to}->${t.from}`)) {
        const p1 = positions.get(t.from);
        const p2 = positions.get(t.to);
        if (p1 && p2 && p1.x > p2.x) {
          const isUpper = (p1.y < centerY) || (p1.y <= p2.y && p2.y <= centerY);
          if (isUpper) {
            const archY = Math.min(p1.y, p2.y) - 52;
            if (archY - 35 < minObsY) minObsY = archY - 35;
          } else {
            const archY = Math.max(p1.y, p2.y) + 52;
            if (archY + 35 > maxObsY) maxObsY = archY + 35;
          }
        }
      }
    }

    // Shift coordinates if arches extend near top boundary
    let yShift = 0;
    if (minObsY < 30) {
      yShift = Math.ceil(30 - minObsY);
    }
    const viewBoxHeight = Math.max(height, Math.ceil(maxObsY + yShift + 45));

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" class="automata-svg" style="width:100%;height:100%;background-color:${bg};background-image:radial-gradient(${gridDot} 1.25px, transparent 1.25px);background-size:24px 24px;font-family:'JetBrains Mono',monospace;">
      <defs>
        <marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${edgeStroke}" />
        </marker>
        <marker id="${startMarkerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${startArrowColor}" />
        </marker>
        <marker id="${deadMarkerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="${edgeDeadStroke}" />
        </marker>
        <filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-opacity="${isDark ? '0.45' : '0.18'}" />
        </filter>
      </defs>
      <g class="graph-content" transform="translate(0, ${yShift})">`;

    // 1. Draw Start Indicator (Sky blue arrow + bold "start" label)
    if (startStateId && positions.has(startStateId)) {
      const pos = positions.get(startStateId);
      const r = pos.r || R;
      const startX = pos.x - r - 54;
      const targetX = pos.x - r - 3;
      svg += `
        <g class="start-indicator">
          <line x1="${startX}" y1="${pos.y}" x2="${targetX}" y2="${pos.y}" stroke="${startArrowColor}" stroke-width="3.6" marker-end="url(#${startMarkerId})" />
          <text x="${startX - 6}" y="${pos.y + 5}" fill="${startArrowColor}" font-size="13.5" font-weight="800" font-family="'JetBrains Mono', monospace" letter-spacing="0.02em" text-anchor="end">start</text>
        </g>`;
    }

    // Helper to render an edge with a styled pill label
    const renderEdgeMarkup = (pathD, labelX, labelY, symbol, isTrap, isSelfLoop = false) => {
      const stroke = isTrap ? edgeDeadStroke : edgeStroke;
      const marker = isTrap ? `url(#${deadMarkerId})` : `url(#${markerId})`;
      const strokeWidth = isTrap ? '2.8' : '3.2';
      const dashArray = isTrap ? 'stroke-dasharray="7,5"' : '';

      const pillW = Math.max(34, symbol.length * 8.6 + 20);
      const pillH = 25;

      return `
        <g class="edge${isSelfLoop ? ' self-loop' : ''}">
          <path d="${pathD}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" ${dashArray} marker-end="${marker}" />
          <rect x="${labelX - pillW / 2}" y="${labelY - pillH / 2}" width="${pillW}" height="${pillH}" rx="6.5" fill="${edgePillFill}" stroke="${edgePillStroke}" stroke-width="2.2" filter="url(#${shadowId})" />
          <text x="${labelX}" y="${labelY + 4.5}" fill="${edgeTextFill}" font-size="13" font-weight="800" font-family="'JetBrains Mono', monospace" letter-spacing="0.01em" text-anchor="middle">${symbol}</text>
        </g>`;
    };

    // 2. Draw Self-Loops (High Arch Cubic Bezier: Top for regular states, Bottom for trap states)
    for (const t of selfLoops) {
      const p1 = positions.get(t.from);
      const r = p1.r || R;
      const isToTrap = p1.isTrap || isTrapState(t.from);
      const spread = 0.45;

      if (isToTrap) {
        // Arches on bottom of trap state to keep upper perimeter clear for incoming error edges
        const sx = p1.x + r * Math.cos(Math.PI / 2 + spread);
        const sy = p1.y + r * Math.sin(Math.PI / 2 + spread);
        const ex = p1.x + (r + 3) * Math.cos(Math.PI / 2 - spread);
        const ey = p1.y + (r + 3) * Math.sin(Math.PI / 2 - spread);

        const ctrlX1 = p1.x - 30;
        const ctrlY1 = p1.y + r + 52;
        const ctrlX2 = p1.x + 30;
        const ctrlY2 = p1.y + r + 52;

        const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
        const labelX = p1.x;
        const labelY = p1.y + r + 60;

        svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, true, true);
      } else {
        const sx = p1.x + r * Math.cos(-Math.PI / 2 - spread);
        const sy = p1.y + r * Math.sin(-Math.PI / 2 - spread);
        const ex = p1.x + (r + 3) * Math.cos(-Math.PI / 2 + spread);
        const ey = p1.y + (r + 3) * Math.sin(-Math.PI / 2 + spread);

        const ctrlX1 = p1.x - 30;
        const ctrlY1 = p1.y - r - 52;
        const ctrlX2 = p1.x + 30;
        const ctrlY2 = p1.y - r - 52;

        const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
        const labelX = p1.x;
        const labelY = p1.y - r - 60;

        svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, false, true);
      }
    }

    // 3. Draw Backward Loops (Arches Over The Top of Intermediate States)
    for (const t of backwardEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const spanX = Math.abs(p1.x - p2.x);
      const archY = t._archY;

      // Leaves top of p1
      const sx = p1.x + r1 * Math.cos(-Math.PI * 0.45);
      const sy = p1.y + r1 * Math.sin(-Math.PI * 0.45);

      // Enters top of p2
      const ex = p2.x + (r2 + 3) * Math.cos(-Math.PI * 0.55);
      const ey = p2.y + (r2 + 3) * Math.sin(-Math.PI * 0.55);

      const ctrlX1 = sx - spanX * 0.14;
      const ctrlY1 = archY;
      const ctrlX2 = ex + spanX * 0.14;
      const ctrlY2 = archY;

      const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
      const labelX = (sx + ex) / 2;
      const labelY = archY - 14;

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 4. Draw Forward Bypass Edges (Arches Under The Bottom of Intermediate States)
    for (const t of bypassEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const spanX = Math.abs(p2.x - p1.x);
      const archY = t._archY;

      // Leaves bottom of p1
      const sx = p1.x + r1 * Math.cos(Math.PI * 0.45);
      const sy = p1.y + r1 * Math.sin(Math.PI * 0.45);

      // Enters bottom of p2
      const ex = p2.x - (r2 + 3) * Math.cos(Math.PI * 0.45);
      const ey = p2.y + (r2 + 3) * Math.sin(Math.PI * 0.45);

      const ctrlX1 = sx + spanX * 0.14;
      const ctrlY1 = archY;
      const ctrlX2 = ex - spanX * 0.14;
      const ctrlY2 = archY;

      const pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
      const labelX = (sx + ex) / 2;
      const labelY = archY + 14;

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 5. Draw Regular & Adjacent Edges (Straight or Distinct Opposing Bidirectional Curves)
    for (const t of regularEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const r2 = p2.r || R;
      const isToTrap = t.to === 'Φ' || t.to === 'trap' || t.to.toLowerCase().includes('trap') || t.to.toLowerCase().includes('dead');

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) continue;

      const hasReverse = existingPairs.has(`${t.to}->${t.from}`);
      const isSameLayer = p1.layer === p2.layer;

      let pathD = '';
      let labelX = 0;
      let labelY = 0;

      if (hasReverse) {
        if (p1.x <= p2.x) {
          // Forward direction of a bidirectional pair (e.g. q1 -> q2 or q1 -> q4):
          // Rendered as a clean direct straight line!
          const ux = dx / dist;
          const uy = dy / dist;
          const sx = p1.x + r1 * ux;
          const sy = p1.y + r1 * uy;
          const ex = p2.x - (r2 + 3) * ux;
          const ey = p2.y - (r2 + 3) * uy;

          pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
          labelX = (sx + ex) / 2;
          labelY = (sy + ey) / 2;
        } else {
          // Return direction of a bidirectional pair (p1.x > p2.x, e.g. q2 -> q1 or q4 -> q1):
          // Arches gracefully around the OUTSIDE (matching interactive_dfa_studio):
          // Upper branch arches OVER THE TOP; lower branch arches UNDER THE BOTTOM.
          const spanX = Math.abs(p1.x - p2.x);
          const isUpper = (p1.y < centerY) || (p1.y <= p2.y && p2.y <= centerY);

          if (isUpper) {
            // Upper branch: arch OVER THE TOP
            const archY = Math.min(p1.y, p2.y) - 52;
            const sx = p1.x + r1 * Math.cos(-Math.PI * 0.45);
            const sy = p1.y + r1 * Math.sin(-Math.PI * 0.45);
            const ex = p2.x + (r2 + 3) * Math.cos(-Math.PI * 0.35);
            const ey = p2.y + (r2 + 3) * Math.sin(-Math.PI * 0.35);

            const ctrlX1 = sx - spanX * 0.15;
            const ctrlY1 = archY;
            const ctrlX2 = ex + spanX * 0.15;
            const ctrlY2 = archY;

            pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
            labelX = (sx + ex) / 2;
            labelY = archY - 14;
          } else {
            // Lower branch: arch UNDER THE BOTTOM
            const archY = Math.max(p1.y, p2.y) + 52;
            const sx = p1.x + r1 * Math.cos(Math.PI * 0.45);
            const sy = p1.y + r1 * Math.sin(Math.PI * 0.45);
            const ex = p2.x + (r2 + 3) * Math.cos(Math.PI * 0.35);
            const ey = p2.y + (r2 + 3) * Math.sin(Math.PI * 0.35);

            const ctrlX1 = sx - spanX * 0.15;
            const ctrlY1 = archY;
            const ctrlX2 = ex + spanX * 0.15;
            const ctrlY2 = archY;

            pathD = `M ${sx} ${sy} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${ex} ${ey}`;
            labelX = (sx + ex) / 2;
            labelY = archY + 14;
          }
        }
      } else if (isSameLayer) {
        // Vertical edges within the same column: curve right
        const curveOffset = 38;
        const midX = (p1.x + p2.x) / 2 + curveOffset;
        const midY = (p1.y + p2.y) / 2;

        const angleStart = Math.atan2(midY - p1.y, midX - p1.x);
        const sx = p1.x + r1 * Math.cos(angleStart);
        const sy = p1.y + r1 * Math.sin(angleStart);

        const angleEnd = Math.atan2(p2.y - midY, p2.x - midX);
        const ex = p2.x - (r2 + 3) * Math.cos(angleEnd);
        const ey = p2.y - (r2 + 3) * Math.sin(angleEnd);

        pathD = `M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`;
        labelX = midX;
        labelY = midY;
      } else {
        // Straight line between circumference boundaries
        const ux = dx / dist;
        const uy = dy / dist;
        const sx = p1.x + r1 * ux;
        const sy = p1.y + r1 * uy;
        const ex = p2.x - (r2 + 3) * ux;
        const ey = p2.y - (r2 + 3) * uy;

        pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
        labelX = (sx + ex) / 2;
        labelY = (sy + ey) / 2;
      }

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, isToTrap);
    }

    // 6. Draw Trap Error Transitions (Dedicated angular fan-in ports on Φ)
    for (const t of trapEdges) {
      const p1 = positions.get(t.from);
      const p2 = positions.get(t.to);
      const r1 = p1.r || R;
      const port = trapTargetPorts.get(`${t.from}->${t.to}`);
      const ex = port ? port.ex : p2.x;
      const ey = port ? port.ey : p2.y;

      // Check if p1 has states beneath it in the same column
      const belowStates = [];
      for (const [otherId, pos] of positions.entries()) {
        if (otherId !== t.from && !pos.isTrap && !isTrapState(otherId)) {
          if (Math.abs(pos.x - p1.x) <= 35 && pos.y > p1.y + 20) {
            belowStates.push(pos);
          }
        }
      }

      let pathD = '';
      let labelX = 0;
      let labelY = 0;

      if (belowStates.length > 0) {
        // Upper stacked state: route around the outside of the column via clearance lane
        const maxBelowY = Math.max(...belowStates.map(s => s.y));
        const maxColX = Math.max(p1.x, ...belowStates.map(s => s.x));
        const minColX = Math.min(p1.x, ...belowStates.map(s => s.x));

        if (p1.x >= p2.x) {
          // Route around the RIGHT side
          const sx = p1.x + r1;
          const sy = p1.y;
          const cx1 = maxColX + 70;
          const cy1 = p1.y + 20;
          const cx2 = maxColX + 70;
          const cy2 = maxBelowY + 40;

          pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
          labelX = cx1;
          labelY = (p1.y + maxBelowY) / 2;
        } else {
          // Route around the LEFT side
          const sx = p1.x - r1;
          const sy = p1.y;
          const cx1 = minColX - 70;
          const cy1 = p1.y + 20;
          const cx2 = minColX - 70;
          const cy2 = maxBelowY + 40;

          pathD = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
          labelX = cx1;
          labelY = (p1.y + maxBelowY) / 2;
        }
      } else {
        // Direct straight line to dedicated angular port
        const angleStart = Math.atan2(ey - p1.y, ex - p1.x);
        const sx = p1.x + r1 * Math.cos(angleStart);
        const sy = p1.y + r1 * Math.sin(angleStart);

        pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
        labelX = (sx + ex) / 2;
        labelY = (sy + ey) / 2;
      }

      svg += renderEdgeMarkup(pathD, labelX, labelY, t.symbol, true);
    }

    // 7. Draw Nodes (States) - Color-coded by semantic role with double circle for accept
    for (const state of states) {
      const pos = positions.get(state.id);
      if (!pos) continue;

      const r = pos.r || R;
      const isAccept = acceptStateIds.has(state.id);
      const isStart = state.id === startStateId;
      const isTrap = state.id === 'Φ' || state.id === 'trap' || state.id.toLowerCase().includes('trap') || state.id.toLowerCase().includes('dead');
      const label = state.label || state.id;

      let fill = regularNodeFill;
      let stroke = regularNodeStroke;

      if (isTrap) {
        fill = trapNodeFill;
        stroke = trapNodeStroke;
      } else if (isAccept) {
        fill = acceptNodeFill;
        stroke = acceptNodeStroke;
      } else if (isStart) {
        fill = startNodeFill;
        stroke = startNodeStroke;
      }

      const fontSize = label.length > 8 ? '9' : (label.length > 5 ? '10.5' : (label.length > 3 ? '12' : '13.5'));

      svg += `
        <g class="node" data-id="${state.id}" transform="translate(${pos.x}, ${pos.y})">
          <circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.4" filter="url(#${shadowId})" />`;

      if (isAccept) {
        svg += `
          <circle class="accept-inner" r="${r - 5.5}" fill="none" stroke="${stroke}" stroke-width="2.0" />`;
      }

      svg += `
          <text dy="4.0" fill="${stateTextFill}" font-size="${fontSize}" font-family="'JetBrains Mono', monospace" font-weight="700" text-anchor="middle">${label}</text>
        </g>`;
    }

    svg += `
      </g>
    </svg>`;

    return svg;
  }

  /**
   * Mounts an interactive SVG with pan and zoom capabilities inside a container element.
   * Pure visualizer (cannot be edited).
   * @param {HTMLElement} container
   * @param {Object} graphModel
   * @param {{ isDark?: boolean, idPrefix?: string }} options
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
          <button class="btn-zoom-in" title="Zoom In" style="padding:4px 9px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-weight:bold;cursor:pointer;">+</button>
          <button class="btn-zoom-out" title="Zoom Out" style="padding:4px 9px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-weight:bold;cursor:pointer;">−</button>
          <button class="btn-zoom-reset" title="Reset View" style="padding:4px 10px;border-radius:6px;border:1px solid #64748b;background:rgba(15,23,42,0.8);color:#fff;font-size:12px;font-weight:600;cursor:pointer;">Reset</button>
        </div>
        <div class="svg-host" style="width:100%;height:100%;cursor:grab;">
          ${svgMarkup}
        </div>
      </div>
    `;

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

    const onMouseMove = (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        if (host) host.style.cursor = 'grab';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };

    // Pan & Drag events: attach to window only while dragging
    const onMouseDown = (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      host.style.cursor = 'grabbing';
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    host?.addEventListener('mousedown', onMouseDown);

    // Wheel zoom
    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.3, Math.min(3.0, scale * zoomFactor));
      updateTransform();
    };
    host?.addEventListener('wheel', onWheel, { passive: false });

    return {
      zoomIn,
      zoomOut,
      resetZoom,
      destroy: () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        host?.removeEventListener('mousedown', onMouseDown);
        host?.removeEventListener('wheel', onWheel);
        container.innerHTML = '';
      }
    };
  }
}


// ===== Source: app.js =====
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







class AutomataApp {
  constructor() {
    // Current computed pipeline data
    this.pipelineData = null;

    // Track which graphs have been rendered to prevent redundant redraws
    this.renderedState = {
      nfa: false,
      dfa: false,
      minDfa: false
    };

    // Cache active graph renderer controllers for zoom/destroy
    this.graphControllers = {
      nfa: null,
      dfa: null,
      minDfa: null
    };

    this.isDark = true;
    this.initElements();
    this.initTheme();
    this.bindEvents();

    // Auto-run with initial preset
    this.runPipeline();
  }

  initElements() {
    this.regexInput = document.getElementById('regex-input');
    this.btnConvert = document.getElementById('btn-convert');
    this.btnClear = document.getElementById('btn-clear');
    this.presetSelect = document.getElementById('preset-select');
    this.errorBanner = document.getElementById('error-banner');
    this.statusText = document.getElementById('status-text');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.themeIcon = document.getElementById('theme-icon');
    this.themeText = document.getElementById('theme-text');

    this.btnExpandAll = document.getElementById('btn-expand-all');
    this.btnCollapseAll = document.getElementById('btn-collapse-all');

    // Simulator elements
    this.simInput = document.getElementById('sim-input');
    this.simBadge = document.getElementById('sim-badge');
    this.simReasonText = document.getElementById('sim-reason-text');
    this.simTraceChips = document.getElementById('sim-trace-chips');
    this.acceptedExamplesList = document.getElementById('accepted-examples-list');
    this.rejectedExamplesList = document.getElementById('rejected-examples-list');
  }

  initTheme() {
    const savedTheme = localStorage.getItem('compiler_theme') || 'dark';
    this.setTheme(savedTheme);
  }

  setTheme(theme) {
    this.isDark = (theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    if (this.themeIcon && this.themeText) {
      if (this.isDark) {
        this.themeIcon.textContent = '☀️';
        this.themeText.textContent = 'Light Mode';
      } else {
        this.themeIcon.textContent = '🌙';
        this.themeText.textContent = 'Dark Mode';
      }
    }
    localStorage.setItem('compiler_theme', theme);

    // Invalidate rendered graphs so visible ones re-render with new colors
    this.renderedState.nfa = false;
    this.renderedState.dfa = false;
    this.renderedState.minDfa = false;
    this.renderVisibleGraphs();
  }

  bindEvents() {
    // Theme toggle
    this.themeToggleBtn.addEventListener('click', () => {
      this.setTheme(this.isDark ? 'light' : 'dark');
    });

    // Preset dropdown
    this.presetSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        this.regexInput.value = e.target.value;
        this.runPipeline();
      }
    });

    // Quick symbol chips
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const insertText = e.currentTarget.getAttribute('data-insert');
        this.insertTextAtCursor(this.regexInput, insertText);
      });
    });

    // Convert & Analyze
    this.btnConvert.addEventListener('click', () => this.runPipeline());

    // Enter key in regex input
    this.regexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.runPipeline();
      }
    });

    // Clear button
    this.btnClear.addEventListener('click', () => {
      this.regexInput.value = '';
      this.regexInput.focus();
      this.errorBanner.style.display = 'none';
    });

    // Expand & Collapse All
    this.btnExpandAll.addEventListener('click', () => {
      document.querySelectorAll('.accordion-card').forEach(card => card.classList.add('open'));
      this.renderVisibleGraphs();
    });

    this.btnCollapseAll.addEventListener('click', () => {
      document.querySelectorAll('.accordion-card').forEach(card => card.classList.remove('open'));
    });

    // Accordion headers toggle & ON-DEMAND rendering
    document.querySelectorAll('.card-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const cardId = header.getAttribute('data-target');
        const card = document.getElementById(cardId);
        if (!card) return;

        const isOpen = card.classList.toggle('open');
        if (isOpen) {
          // Card was opened: trigger on-demand rendering for its graph
          this.renderGraphForCard(cardId);
        }
      });
    });

    // String simulator real-time input
    this.simInput.addEventListener('input', () => {
      this.runSimulation();
    });
  }

  insertTextAtCursor(input, text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;
    input.value = current.substring(0, start) + text + current.substring(end);
    if (text === '()') {
      input.selectionStart = input.selectionEnd = start + 1;
    } else {
      input.selectionStart = input.selectionEnd = start + text.length;
    }
    input.focus();
  }

  showError(message) {
    this.errorBanner.textContent = `⚠️ Syntax Error: ${message}`;
    this.errorBanner.style.display = 'block';
    this.statusText.textContent = `Conversion halted: ${message}`;
  }

  hideError() {
    this.errorBanner.style.display = 'none';
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
      const subsetResult = SubsetConstruction.convert(nfa, parseResult.alphabet);

      // 4. Hopcroft Minimization
      const minResult = HopcroftMinimizer.minimize(subsetResult.dfa);

      // 5. String Simulator Examples
      const simExamples = StringSimulator.generateExamples(minResult.minimizedDfa, 3, 3);

      this.pipelineData = {
        parsed: parseResult,
        nfa,
        subset: subsetResult,
        minimized: minResult,
        examples: simExamples
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

      this.statusText.textContent = `Pipeline computed successfully in <2ms! Alphabet: {${parseResult.alphabet.join(', ')}}`;
    } catch (err) {
      console.error(err);
      this.showError(err.message || 'Error occurred during automata computation');
    }
  }

  updateBadges() {
    const { nfa, subset, minimized } = this.pipelineData;
    document.getElementById('nfa-stats-badge').textContent = `${nfa.states.length} States • ${nfa.transitions.length} Trans`;
    document.getElementById('dfa-stats-badge').textContent = `${subset.dfa.states.length} States`;
    document.getElementById('min-stats-badge').textContent = `${minimized.minimizedDfa.states.length} States (${minimized.equivalenceRounds.length} Rounds)`;
  }

  /**
   * On-Demand Rendering: Checks if card is open and renders its graph if dirty
   */
  renderVisibleGraphs() {
    if (document.getElementById('card-nfa')?.classList.contains('open')) {
      this.renderGraphForCard('card-nfa');
    }
    if (document.getElementById('card-dfa')?.classList.contains('open')) {
      this.renderGraphForCard('card-dfa');
    }
    if (document.getElementById('card-hopcroft')?.classList.contains('open')) {
      this.renderGraphForCard('card-hopcroft');
    }
  }

  renderGraphForCard(cardId) {
    if (!this.pipelineData) return;

    if (cardId === 'card-nfa' && !this.renderedState.nfa) {
      const container = document.getElementById('nfa-graph-viewport');
      const { nfa } = this.pipelineData;
      const graphModel = {
        states: nfa.states.map(id => ({
          id: id.toString(),
          label: id.toString(),
          isStart: id === nfa.startState,
          isAccept: nfa.acceptStates.includes(id)
        })),
        transitions: nfa.transitions.map(t => ({
          from: t.from.toString(),
          to: t.to.toString(),
          symbol: t.symbol
        })),
        startState: nfa.startState.toString(),
        acceptStates: nfa.acceptStates.map(s => s.toString())
      };
      if (this.graphControllers.nfa) this.graphControllers.nfa.destroy();
      this.graphControllers.nfa = GraphRenderer.render(container, graphModel, { isDark: this.isDark, idPrefix: 'nfa' });
      this.renderedState.nfa = true;
    } else if (cardId === 'card-dfa' && !this.renderedState.dfa) {
      const container = document.getElementById('dfa-graph-viewport');
      const { dfa } = this.pipelineData.subset;

      // Extract transitions for graph
      const transitionsList = [];
      for (const [fromId, symMap] of Object.entries(dfa.transitions)) {
        for (const [sym, toId] of Object.entries(symMap)) {
          transitionsList.push({ from: fromId, to: toId, symbol: sym });
        }
      }

      const graphModel = {
        states: dfa.states.map(s => ({
          id: s.id,
          label: s.id,
          isStart: s.isStart,
          isAccept: s.isAccept
        })),
        transitions: transitionsList,
        startState: dfa.states.find(s => s.isStart)?.id || 'd0',
        acceptStates: dfa.states.filter(s => s.isAccept).map(s => s.id)
      };
      if (this.graphControllers.dfa) this.graphControllers.dfa.destroy();
      this.graphControllers.dfa = GraphRenderer.render(container, graphModel, { isDark: this.isDark, idPrefix: 'dfa' });
      this.renderedState.dfa = true;
    } else if (cardId === 'card-hopcroft' && !this.renderedState.minDfa) {
      const container = document.getElementById('min-dfa-graph-viewport');
      const { minimizedDfa } = this.pipelineData.minimized;

      const transitionsList = [];
      for (const [fromId, symMap] of Object.entries(minimizedDfa.transitions)) {
        for (const [sym, toId] of Object.entries(symMap)) {
          transitionsList.push({ from: fromId, to: toId, symbol: sym });
        }
      }

      const graphModel = {
        states: minimizedDfa.states.map(s => ({
          id: s.id,
          label: s.label || s.id,
          isStart: s.isStart,
          isAccept: s.isAccept
        })),
        transitions: transitionsList,
        startState: minimizedDfa.states.find(s => s.isStart)?.id || 'd0',
        acceptStates: minimizedDfa.states.filter(s => s.isAccept).map(s => s.id)
      };
      if (this.graphControllers.minDfa) this.graphControllers.minDfa.destroy();
      this.graphControllers.minDfa = GraphRenderer.render(container, graphModel, { isDark: this.isDark, idPrefix: 'min-dfa' });
      this.renderedState.minDfa = true;
    }
  }

  /**
   * Renders NFA Transition Table
   */
  renderNfaTable() {
    const tbody = document.querySelector('#nfa-transition-table tbody');
    if (!tbody) return;
    const { nfa } = this.pipelineData;
    tbody.innerHTML = '';

    nfa.transitions.forEach(t => {
      const tr = document.createElement('tr');
      const fromIsStart = t.from === nfa.startState ? '<span class="state-start">→</span> ' : '';
      const toIsAccept = nfa.acceptStates.includes(t.to) ? ' <span class="state-accept">*</span>' : '';
      tr.innerHTML = `
        <td>${fromIsStart}<span class="state-chip">${t.from}</span></td>
        <td><span style="font-weight:bold;color:${t.symbol === 'ε' ? 'var(--text-muted)' : 'var(--accent-blue)'}">${t.symbol}</span></td>
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
    const intBody = document.querySelector('#intermediate-table tbody');
    if (intBody) {
      intBody.innerHTML = '';
      if (intermediateTable.length === 0) {
        intBody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);">No transition appearances</td></tr>';
      } else {
        intermediateTable.forEach(row => {
          const tr = document.createElement('tr');
          const acceptStar = row.isAccept ? ' <span class="state-accept">*</span>' : '';
          tr.innerHTML = `
            <td><span style="font-weight:bold;color:var(--accent-blue);">${row.symbol}</span></td>
            <td><span class="state-chip">${row.appears}</span></td>
            <td>{ ${row.goesTo.join(', ')} }${acceptStar}</td>
          `;
          intBody.appendChild(tr);
        });
      }
    }

    // 2. Full DFA Transition Table
    const thead = document.getElementById('dfa-table-head');
    const tbody = document.getElementById('dfa-table-body');
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

    tbody.innerHTML = '';
    dfa.states.forEach(state => {
      const tr = document.createElement('tr');
      const startPrefix = state.isStart ? '<span class="state-start">→</span> ' : '';
      const acceptSuffix = state.isAccept ? ' <span class="state-accept">*</span>' : '';

      let rowHtml = `
        <td>${startPrefix}<span class="state-chip ${state.id === dfa.trapState ? 'state-trap' : ''}">${state.id}</span>${acceptSuffix}</td>
        <td>${state.id === dfa.trapState ? 'Φ' : `{ ${state.nfaStates.join(', ')} }`}${acceptSuffix}</td>
      `;

      for (const sym of dfa.alphabet) {
        const dest = dfa.transitions[state.id]?.[sym] || dfa.trapState;
        rowHtml += `<td><span class="state-chip ${dest === dfa.trapState ? 'state-trap' : ''}">${dest}</span></td>`;
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
    const timeline = document.getElementById('equivalence-timeline');
    if (timeline) {
      timeline.innerHTML = '';
      equivalenceRounds.forEach(round => {
        const card = document.createElement('div');
        card.className = 'timeline-card';

        const partitionStr = round.partition
          .map(g => `{ ${g.join(', ')} }`)
          .join('   ');

        let expList = '';
        round.explanations.forEach(exp => {
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
    const minThead = document.getElementById('min-dfa-table-head');
    const minTbody = document.getElementById('min-dfa-table-body');
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

    minTbody.innerHTML = '';
    minimizedDfa.states.forEach(state => {
      const tr = document.createElement('tr');
      const startPrefix = state.isStart ? '<span class="state-start">→</span> ' : '';
      const acceptSuffix = state.isAccept ? ' <span class="state-accept">*</span>' : '';

      let rowHtml = `
        <td>${startPrefix}<span class="state-chip">${state.id}</span>${acceptSuffix}</td>
        <td>${state.originalStates.length > 1 ? `{ ${state.originalStates.join(', ')} }` : state.originalStates[0]}${acceptSuffix}</td>
      `;

      for (const sym of minimizedDfa.alphabet) {
        const dest = minimizedDfa.transitions[state.id]?.[sym] || minimizedDfa.trapState;
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
      container.innerHTML = '';
      if (list.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);font-size:12px;">No examples available</div>';
        return;
      }
      list.forEach(str => {
        const item = document.createElement('div');
        item.className = 'example-item';
        const displayStr = str === '' ? 'ε (empty string)' : `"${str}"`;
        item.innerHTML = `
          <span>${displayStr}</span>
          <button type="button" class="btn-try-string" data-string="${str}">Test</button>
        `;
        item.querySelector('.btn-try-string').addEventListener('click', (e) => {
          this.simInput.value = e.target.getAttribute('data-string');
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
      this.simBadge.className = 'sim-badge accepted';
      this.simBadge.textContent = 'ACCEPTED ✓';
    } else {
      this.simBadge.className = 'sim-badge rejected';
      this.simBadge.textContent = 'REJECTED ✗';
    }

    this.simReasonText.textContent = result.reason;

    // Render path chips
    this.simTraceChips.innerHTML = '';
    if (result.path.length === 0) {
      const startState = minimizedDfa.states.find(s => s.isStart)?.id || 'd0';
      this.simTraceChips.innerHTML = `<span class="trace-state">${startState}</span>`;
      return;
    }

    result.path.forEach((step, idx) => {
      if (idx === 0) {
        const spanFrom = document.createElement('span');
        spanFrom.className = 'trace-state';
        spanFrom.textContent = step.state;
        this.simTraceChips.appendChild(spanFrom);
      }

      const spanArrow = document.createElement('span');
      spanArrow.className = 'trace-arrow';
      spanArrow.textContent = `—[${step.symbol}]→`;
      this.simTraceChips.appendChild(spanArrow);

      const spanTo = document.createElement('span');
      spanTo.className = 'trace-state';
      spanTo.textContent = step.nextState;
      this.simTraceChips.appendChild(spanTo);
    });
  }
}

// Instantiate on window DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.automataApp = new AutomataApp();
});


})();
