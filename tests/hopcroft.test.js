import test from "node:test";
import assert from "node:assert/strict";
import { RegexParser } from "../js/regex-parser.js";
import { Thompson } from "../js/thompson.js";
import { SubsetConstruction } from "../js/subset-construction.js";
import { HopcroftMinimizer } from "../js/hopcroft-minimization.js";

test("partitions (ab|ac)* into 0-Equivalence, 1-Equivalence and produces minimized DFA", () => {
  const parsed = RegexParser.parse("(ab|ac)*");
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const result = HopcroftMinimizer.minimize(dfa);

  assert.ok(result.equivalenceRounds.length >= 2);
  // Round 0 must have 2 groups: non-accepting (with φ) and accepting
  assert.equal(result.equivalenceRounds[0].partition.length, 2);
  assert.ok(result.minimizedDfa.states.length <= dfa.states.length);
  // Start state must be identified in minimized DFA
  assert.ok(result.minimizedDfa.states.some((s) => s.isStart));
});

test("handles already-minimal DFA without infinite loop", () => {
  const parsed = RegexParser.parse("ab");
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const result = HopcroftMinimizer.minimize(dfa);

  assert.ok(result.equivalenceRounds.length >= 1);
  assert.ok(result.minimizedDfa.states.length > 0);
});

test("generates human-readable partition explanations for splits", () => {
  const parsed = RegexParser.parse("(ab|ac)*");
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const result = HopcroftMinimizer.minimize(dfa);

  // At least one round should have split explanations
  const hasExplanations = result.equivalenceRounds.some(
    (r) => r.explanations && r.explanations.length > 0
  );
  assert.ok(hasExplanations);
});
