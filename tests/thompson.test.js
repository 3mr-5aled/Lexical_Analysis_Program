import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';

test('constructs NFA for single character', () => {
  const parsed = RegexParser.parse('a');
  const nfa = Thompson.build(parsed.postfix);
  assert.equal(nfa.transitions.length, 1);
  assert.equal(nfa.transitions[0].symbol, 'a');
  assert.equal(nfa.startState, nfa.transitions[0].from);
  assert.ok(nfa.acceptStates.includes(nfa.transitions[0].to));
});

test('constructs NFA for concatenation a.b', () => {
  const parsed = RegexParser.parse('ab');
  const nfa = Thompson.build(parsed.postfix);
  const eps = nfa.transitions.filter(t => t.symbol === 'ε');
  assert.ok(eps.length >= 1);
  assert.ok(nfa.acceptStates.length === 1);
});

test('constructs NFA for union a|b', () => {
  const parsed = RegexParser.parse('a|b');
  const nfa = Thompson.build(parsed.postfix);
  const eps = nfa.transitions.filter(t => t.symbol === 'ε');
  assert.equal(eps.length, 4);
});

test('constructs NFA for (ab|ac)* matching Lab 4 state structure', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  assert.ok(nfa.states.length > 0);
  assert.equal(nfa.acceptStates.length, 1);
  assert.equal(nfa.startState, 0);
  // Transitions should contain symbols a, b, c, and ε
  const symbols = new Set(nfa.transitions.map(t => t.symbol));
  assert.ok(symbols.has('a'));
  assert.ok(symbols.has('b'));
  assert.ok(symbols.has('c'));
  assert.ok(symbols.has('ε'));
});

test('constructs NFA for plus operator a+', () => {
  const parsed = RegexParser.parse('a+');
  const nfa = Thompson.build(parsed.postfix);
  assert.ok(nfa.states.length >= 2);
  const loopback = nfa.transitions.find(t => t.symbol === 'ε' && t.to <= t.from);
  assert.ok(loopback !== undefined, 'Plus should feature an epsilon loopback transition');
});
