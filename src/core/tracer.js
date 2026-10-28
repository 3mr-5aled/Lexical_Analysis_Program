/**
 * StringTracer
 * Step-by-step interactive tape execution state machine for finite automata.
 * Models:
 * - Input tape cells with read pointer
 * - Active state tracking on minimized DFA
 * - Transition step history with character, from, to, and acceptance verdict
 * - Dead state (trap) entry detection
 */

export class StringTracer {
  /**
   * @param {object} dfa
   */
  constructor(dfa) {
    this.dfa = dfa;
    this.rawInput = "";
    this.tape = [];
    this.tapeIndex = 0;
    this.currentState = "";
    this.history = [];
    this.status = "ready"; // 'ready' | 'running' | 'accepted' | 'rejected'
    this.reason = "";
    this.isFinished = false;

    this.startState = dfa.states?.find((s) => s.isStart)?.id || "d0";
    this.acceptStates = new Set(
      dfa.states?.filter((s) => s.isAccept).map((s) => s.id) || []
    );
    this.trapState = dfa.trapState || "φ";
  }

  /**
   * Loads a new input string onto the tape and resets the pointer to 0.
   * @param {string} input
   */
  load(input) {
    this.rawInput = input;
    if (input === "" || input === "ε" || input === "\\e" || input === "@") {
      this.tape = [];
    } else {
      this.tape = input.split("");
    }
    this.tapeIndex = 0;
    this.currentState = this.startState;
    this.history = [];
    this.isFinished = false;
    this.reason = "";

    // Check if initial empty string is accepted
    if (this.tape.length === 0) {
      if (this.acceptStates.has(this.currentState)) {
        this.status = "accepted";
        this.reason = `Empty string (ε) accepted at start state ${this.currentState}`;
      } else {
        this.status = "rejected";
        this.reason = `Empty string (ε) rejected: start state ${this.currentState} is non-accepting`;
      }
      this.isFinished = true;
    } else {
      this.status = "ready";
      this.reason = `Ready to simulate "${input}" from start state ${this.startState}`;
    }

    return this.getState();
  }

  /**
   * Steps the read head forward by 1 character.
   * @returns {object|null} step information
   */
  step() {
    if (this.isFinished) return null;

    if (this.tapeIndex >= this.tape.length) {
      this.finish();
      return null;
    }

    const char = this.tape[this.tapeIndex];
    const from = this.currentState;

    // Check transition
    const transMap = this.dfa.transitions?.[from] || {};
    const nextState = transMap[char];

    if (!nextState || nextState === this.trapState) {
      // Illegal character or trap transition
      this.currentState = this.trapState;
      const stepRecord = {
        stepIndex: this.tapeIndex,
        char,
        from,
        to: this.trapState,
        isTrap: true,
        isAccept: false,
      };
      this.history.push(stepRecord);
      this.tapeIndex++;
      this.status = "rejected";
      this.reason = `Character '${char}' has no valid transition from state ${from} (routed to trap state ${this.trapState})`;
      this.isFinished = true;
      return stepRecord;
    }

    // Valid deterministic transition
    this.currentState = nextState;
    const isAccept = this.acceptStates.has(nextState);
    const stepRecord = {
      stepIndex: this.tapeIndex,
      char,
      from,
      to: nextState,
      isTrap: false,
      isAccept,
    };
    this.history.push(stepRecord);
    this.tapeIndex++;

    if (this.tapeIndex >= this.tape.length) {
      this.finish();
    } else {
      this.status = "running";
      this.reason = `Read '${char}' -> transitioned from ${from} to ${nextState}`;
    }

    return stepRecord;
  }

  /**
   * Runs all remaining steps until completion.
   */
  run() {
    while (!this.isFinished) {
      this.step();
    }
    return this.getState();
  }

  /**
   * Evaluates the final status once the entire tape has been consumed.
   */
  finish() {
    this.isFinished = true;
    if (this.acceptStates.has(this.currentState)) {
      this.status = "accepted";
      this.reason = `Input accepted: terminated in accepting state ${this.currentState}`;
    } else {
      this.status = "rejected";
      this.reason = `Input rejected: terminated in non-accepting state ${this.currentState}`;
    }
  }

  /**
   * Resets simulation back to index 0.
   */
  reset() {
    return this.load(this.rawInput);
  }

  /**
   * Returns a snapshot of the tracer state for reactive UI consumption.
   */
  getState() {
    return {
      rawInput: this.rawInput,
      tape: this.tape,
      tapeIndex: this.tapeIndex,
      currentState: this.currentState,
      history: this.history,
      status: this.status,
      reason: this.reason,
      isFinished: this.isFinished,
    };
  }
}
