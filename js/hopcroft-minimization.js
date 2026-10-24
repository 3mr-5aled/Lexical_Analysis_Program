/**
 * Hopcroft DFA Minimization (Equivalence Partitioning)
 * Minimizes a DFA using iterative k-equivalence partitioning (0-Equivalence, 1-Equivalence, ...).
 * Produces:
 * 1. Step-by-step equivalence partitions with human-readable split justifications.
 * 2. Minimized DFA transition table matching FCIS '26 standards.
 */
export class HopcroftMinimizer {
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
