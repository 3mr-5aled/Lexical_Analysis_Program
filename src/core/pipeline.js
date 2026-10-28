/**
 * AutomataPipeline
 * Consolidated deep module for Compiler Automata Theory (FCIS '26).
 * Coordinates:
 * 1. Regex Parsing (infix -> postfix, alphabet extraction)
 * 2. Thompson's Construction (RE -> NFA with single start and accept state)
 * 3. Subset Construction (NFA -> DFA with epsilon closure & Intermediate Table)
 * 4. Hopcroft Minimization (k-equivalence partitioning & state merging)
 * 5. String Simulation (verifying 3 accepted & 3 rejected strings)
 *
 * Adheres strictly to scientific standards in material/knowledge/.
 */

import { RegexParser } from "./regex-parser.js";
import { Thompson } from "./thompson.js";
import { SubsetConstruction } from "./subset-construction.js";
import { HopcroftMinimizer } from "./hopcroft-minimization.js";
import { StringSimulator } from "./string-simulator.js";

export class AutomataSyntaxError extends Error {
  constructor(message) {
    super(message);
    this.name = "AutomataSyntaxError";
  }
}

export class AutomataPipeline {
  /**
   * Compiles a regular expression through the complete compiler automata pipeline.
   * @param {string} rawRegex
   * @returns {{
   *   parsed: object,
   *   nfa: object,
   *   intermediateTable: Array<object>,
   *   dfa: object,
   *   equivalenceRounds: Array<object>,
   *   minimizedDfa: object,
   *   simulatorExamples: { accepted: Array<object>, rejected: Array<object> }
   * }}
   * @throws {AutomataSyntaxError} on syntax error
   */
  static compile(rawRegex) {
    if (typeof rawRegex !== "string" || rawRegex.trim() === "") {
      throw new AutomataSyntaxError("Regular expression cannot be empty.");
    }

    // 1. Regex Parser
    const parseResult = RegexParser.parse(rawRegex);
    if (parseResult.error) {
      throw new AutomataSyntaxError(parseResult.error);
    }

    // 2. Thompson's Construction
    const nfa = Thompson.build(parseResult.postfix);

    // 3. Subset Construction & Intermediate Table
    const subsetResult = SubsetConstruction.convert(nfa, parseResult.alphabet);

    // 4. Hopcroft Minimization
    const minResult = HopcroftMinimizer.minimize(subsetResult.dfa);

    // 5. String Simulator Examples (3 accepted, 3 rejected per Lecture 4 Slide 47)
    const simExamples = StringSimulator.generateExamples(
      minResult.minimizedDfa,
      3,
      3
    );

    return {
      parsed: parseResult,
      nfa,
      intermediateTable: subsetResult.intermediateTable,
      dfa: subsetResult.dfa,
      equivalenceRounds: minResult.equivalenceRounds,
      minimizedDfa: minResult.minimizedDfa,
      simulatorExamples: simExamples,
    };
  }
}
