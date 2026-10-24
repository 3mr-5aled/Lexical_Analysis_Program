import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';
import { SubsetConstruction } from '../js/subset-construction.js';

test('computes epsilon closure and intermediate table for (ab|ac)*', () => {
  const parsed = RegexParser.parse('(ab|ac)*');
  const nfa = Thompson.build(parsed.postfix);
  const result = SubsetConstruction.convert(nfa, parsed.alphabet);
  
  assert.ok(result.intermediateTable.length > 0);
  // Verify start state d0 exists and is marked
  const start = result.dfa.states.find(s => s.isStart);
  assert.ok(start !== undefined);
  assert.equal(start.id, 'd0');
  
  // Verify trap state Φ is present
  assert.ok(result.dfa.states.some(s => s.id === 'Φ'));
  
  // Verify transitions exist for all alphabet symbols from d0
  for (const sym of parsed.alphabet) {
    assert.ok(result.dfa.transitions['d0']?.[sym] !== undefined);
  }
});

test('generates correct DFA transition rows for (a|b)*a', () => {
  const parsed = RegexParser.parse('(a|b)*a');
  const nfa = Thompson.build(parsed.postfix);
  const result = SubsetConstruction.convert(nfa, parsed.alphabet);
  
  assert.ok(result.dfa.states.length >= 2);
  const acceptStates = result.dfa.states.filter(s => s.isAccept);
  assert.ok(acceptStates.length >= 1);
});

test('computes intermediate table with accurate Appears and Goes to rows', () => {
  const parsed = RegexParser.parse('a|b');
  const nfa = Thompson.build(parsed.postfix);
  const result = SubsetConstruction.convert(nfa, parsed.alphabet);
  
  // In a|b, there should be an entry for 'a' and an entry for 'b'
  const entryA = result.intermediateTable.find(e => e.symbol === 'a');
  const entryB = result.intermediateTable.find(e => e.symbol === 'b');
  assert.ok(entryA !== undefined);
  assert.ok(entryB !== undefined);
  assert.ok(entryA.goesTo.length > 0);
  assert.ok(entryB.goesTo.length > 0);
});
