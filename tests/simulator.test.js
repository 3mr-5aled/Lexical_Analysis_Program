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
    const res = StringSimulator.simulate(minimizedDfa, s);
    assert.equal(res.accepted, true, `Expected "${s}" to be accepted`);
  }
  for (const s of examples.rejected) {
    const res = StringSimulator.simulate(minimizedDfa, s);
    assert.equal(res.accepted, false, `Expected "${s}" to be rejected`);
  }
});

test('handles characters outside alphabet safely with descriptive rejection reason', () => {
  const parsed = RegexParser.parse('ab');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const { minimizedDfa } = HopcroftMinimizer.minimize(dfa);
  
  const res = StringSimulator.simulate(minimizedDfa, 'axb');
  assert.equal(res.accepted, false);
  assert.ok(res.reason.includes("'x'"));
});

test('simulates \\e as epsilon / empty string input', () => {
  const parsed = RegexParser.parse('a*');
  const nfa = Thompson.build(parsed.postfix);
  const { dfa } = SubsetConstruction.convert(nfa, parsed.alphabet);
  const { minimizedDfa } = HopcroftMinimizer.minimize(dfa);
  
  const res = StringSimulator.simulate(minimizedDfa, '\\e');
  assert.equal(res.accepted, true);
});
