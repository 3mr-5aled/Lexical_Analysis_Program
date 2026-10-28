/**
 * Subset Construction (NFA to DFA)
 * Converts an NFA into an equivalent DFA using epsilon closures and powerset construction.
 * Generates:
 * 1. Intermediate "Sigma | Appears | Goes to" lookup table.
 * 2. Full DFA transition table with state names d0, d1, ... and dead state Φ.
 */
export class SubsetConstruction {
  static TRAP_STATE = "φ";

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
      if (t.symbol === "ε" || t.symbol === "ϵ") {
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
      const matching = nfa.transitions.filter((t) => t.symbol === sym);
      // Group by source state
      const appearsMap = new Map();
      for (const t of matching) {
        if (!appearsMap.has(t.from)) appearsMap.set(t.from, []);
        appearsMap.get(t.from).push(t.to);
      }

      for (const [fromState, destStates] of appearsMap.entries()) {
        const closure = SubsetConstruction.epsilonClosure(
          destStates,
          nfa.transitions
        );
        const isAccept = closure.some((s) => acceptSet.has(s));
        rows.push({
          symbol: sym,
          appears: fromState,
          goesTo: closure,
          isAccept,
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
    const intermediateTable = SubsetConstruction.buildIntermediateTable(
      nfa,
      alphabet
    );
    const acceptSet = new Set(nfa.acceptStates);

    const startClosure = SubsetConstruction.epsilonClosure(
      nfa.startState,
      nfa.transitions
    );
    const keyOf = (arr) => arr.join(",");

    const dfaStates = [];
    const stateMap = new Map(); // key -> id
    const transitions = {};

    let stateCounter = 0;
    const addDfaState = (nfaStates, isStart = false) => {
      const id = `d${stateCounter++}`;
      const isAccept = nfaStates.some((s) => acceptSet.has(s));
      const stateObj = {
        id,
        nfaStates,
        isStart,
        isAccept,
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
        const directDest = SubsetConstruction.move(
          current.nfaStates,
          sym,
          nfa.transitions
        );
        if (directDest.length === 0) {
          transitions[current.id][sym] = SubsetConstruction.TRAP_STATE;
          trapNeeded = true;
        } else {
          const closure = SubsetConstruction.epsilonClosure(
            directDest,
            nfa.transitions
          );
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
        isAccept: false,
      });
      transitions[SubsetConstruction.TRAP_STATE] = {};
      for (const sym of alphabet) {
        transitions[SubsetConstruction.TRAP_STATE][sym] =
          SubsetConstruction.TRAP_STATE;
      }
    }

    return {
      intermediateTable,
      dfa: {
        states: dfaStates,
        alphabet,
        transitions,
        trapState: SubsetConstruction.TRAP_STATE,
      },
    };
  }
}
