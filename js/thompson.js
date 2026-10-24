/**
 * Thompson's Construction
 * Converts postfix regular expression tokens into an NFA.
 * Supports single characters, ε, concatenation (.), union (|), star (*), plus (+), and optional (?).
 */
export class Thompson {
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

    // Canonical renumbering using BFS starting from startState
    const stateMap = new Map();
    let currentNewId = 0;

    const getNewId = (oldId) => {
      if (!stateMap.has(oldId)) {
        stateMap.set(oldId, currentNewId++);
      }
      return stateMap.get(oldId);
    };

    // Ensure start state gets ID 0
    getNewId(finalFragment.start);

    // Adjacency list for BFS
    const adj = new Map();
    for (const t of finalFragment.transitions) {
      if (!adj.has(t.from)) adj.set(t.from, []);
      adj.get(t.from).push(t.to);
    }

    const queue = [finalFragment.start];
    const visited = new Set([finalFragment.start]);

    while (queue.length > 0) {
      const u = queue.shift();
      getNewId(u);
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          visited.add(v);
          queue.push(v);
        }
      }
    }

    // Assign any unvisited states (if any exist)
    for (const t of finalFragment.transitions) {
      getNewId(t.from);
      getNewId(t.to);
    }
    getNewId(finalFragment.accept);

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
