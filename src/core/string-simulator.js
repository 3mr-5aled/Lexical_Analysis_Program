/**
 * String Simulator
 * Simulates user input strings on a DFA step-by-step.
 * Generates accepted and rejected test strings (e.g., 3 accepted & 3 rejected).
 */
export class StringSimulator {
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
    const startState = dfa.states.find((s) => s.isStart) || dfa.states[0];
    if (!startState) {
      return {
        accepted: false,
        path: [],
        finalState: "",
        reason: "DFA has no states",
      };
    }

    const stateMap = new Map(dfa.states.map((s) => [s.id, s]));
    let currentState = startState.id;
    const path = [];

    // Normalize empty / epsilon string
    const chars =
      inputString === "ε" ||
      inputString === "ϵ" ||
      inputString === "@" ||
      inputString === "\\e" ||
      inputString === ""
        ? []
        : inputString.split("");

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (!dfa.alphabet.includes(char)) {
        return {
          accepted: false,
          path,
          finalState: currentState,
          reason: `Rejected: Character '${char}' at index ${i} is not in alphabet Σ = {${dfa.alphabet.join(", ")}}`,
        };
      }

      const next = dfa.transitions[currentState]?.[char] || dfa.trapState;
      path.push({
        state: currentState,
        symbol: char,
        nextState: next,
      });
      currentState = next;
    }

    const finalStateObj = stateMap.get(currentState);
    const isAccepting =
      finalStateObj?.isAccept === true && currentState !== dfa.trapState;

    const reason = isAccepting
      ? `Accepted: Simulation terminated in accepting state '${currentState}'`
      : `Rejected: Simulation terminated in non-accepting state '${currentState}'${currentState === dfa.trapState ? " (Dead/Trap State φ)" : ""}`;

    return {
      accepted: isAccepting,
      path,
      finalState: currentState,
      reason,
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

    const queue = [""];
    const visited = new Set([""]);

    const alphabet =
      dfa.alphabet && dfa.alphabet.length > 0 ? dfa.alphabet : ["a", "b"];

    while (
      queue.length > 0 &&
      (accepted.length < maxAccepted || rejected.length < maxRejected)
    ) {
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
      rejected,
    };
  }
}
