import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';
import { Thompson } from '../js/thompson.js';
import { SubsetConstruction } from '../js/subset-construction.js';
import { HopcroftMinimizer } from '../js/hopcroft-minimization.js';
import { StringSimulator } from '../js/string-simulator.js';
import { GraphRenderer } from '../js/graph-renderer.js';

const COURSE_PRESETS = [
  '(ab|ac)*',
  '(a|b)*a(a|b|ε)',
  '(ba)+(a*b*|a*)',
  'a|abc*',
  '(ab|c)*',
  '(a|b)*a',
  'a*b(a|b)*',
  '(a|b)(a|b|0|1)*'
];

for (const re of COURSE_PRESETS) {
  test(`end-to-end pipeline succeeds for course preset: ${re}`, () => {
    // 1. Parser
    const parsed = RegexParser.parse(re);
    assert.equal(parsed.error, null, `Parser failed for ${re}: ${parsed.error}`);
    assert.ok(parsed.postfix.length > 0);

    // 2. Thompson NFA
    const nfa = Thompson.build(parsed.postfix);
    assert.ok(nfa.states.length > 0);
    assert.ok(nfa.acceptStates.length >= 1);

    // 3. Subset Construction
    const subset = SubsetConstruction.convert(nfa, parsed.alphabet);
    assert.ok(subset.dfa.states.length > 0);
    assert.ok(subset.intermediateTable !== undefined);

    // 4. Hopcroft Minimization
    const minimized = HopcroftMinimizer.minimize(subset.dfa);
    assert.ok(minimized.equivalenceRounds.length >= 1);
    assert.ok(minimized.minimizedDfa.states.length <= subset.dfa.states.length);

    // 5. String Simulator
    const examples = StringSimulator.generateExamples(minimized.minimizedDfa, 3, 3);
    assert.ok(examples.accepted.length > 0);
    assert.ok(examples.rejected.length > 0);

    // 6. SVG Graph Generation for each stage
    const nfaSvg = GraphRenderer.createSvgString({
      states: nfa.states.map(s => ({ id: s.toString(), isStart: s === nfa.startState, isAccept: nfa.acceptStates.includes(s) })),
      transitions: nfa.transitions.map(t => ({ from: t.from.toString(), to: t.to.toString(), symbol: t.symbol }))
    }, { isDark: true });
    assert.ok(nfaSvg.includes('<svg'));

    const dfaSvg = GraphRenderer.createSvgString({
      states: subset.dfa.states,
      transitions: Object.entries(subset.dfa.transitions).flatMap(([from, syms]) =>
        Object.entries(syms).map(([symbol, to]) => ({ from, to, symbol }))
      )
    }, { isDark: false });
    assert.ok(dfaSvg.includes('<svg'));

    const minSvg = GraphRenderer.createSvgString({
      states: minimized.minimizedDfa.states,
      transitions: Object.entries(minimized.minimizedDfa.transitions).flatMap(([from, syms]) =>
        Object.entries(syms).map(([symbol, to]) => ({ from, to, symbol }))
      )
    }, { isDark: true });
    assert.ok(minSvg.includes('<svg'));
  });
}
