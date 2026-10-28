import test from "node:test";
import assert from "node:assert/strict";
import { AutomataPipeline, AutomataSyntaxError } from "../src/core/pipeline.js";

const COURSE_PRESETS = [
  "(ab|ac)*",
  "(a|b)*a(a|b|ε)",
  "(ba)+(a*b*|a*)",
  "a|abc*",
  "(ab|c)*",
  "(a|b)*a",
  "a*b(a|b)*",
  "(a|b)(a|b|0|1)*",
];

for (const re of COURSE_PRESETS) {
  test(`AutomataPipeline.compile successfully compiles course preset: ${re}`, () => {
    const result = AutomataPipeline.compile(re);

    assert.ok(result.parsed.alphabet.length > 0);
    assert.ok(result.nfa.states.length > 0);
    assert.ok(result.dfa.states.length > 0);
    assert.ok(result.intermediateTable !== undefined);
    assert.ok(result.minimizedDfa.states.length <= result.dfa.states.length);
    assert.ok(result.simulatorExamples.accepted.length > 0);
    assert.ok(result.simulatorExamples.rejected.length > 0);
  });
}

test("AutomataPipeline.compile throws AutomataSyntaxError on unmatched parenthesis", () => {
  assert.throws(
    () => AutomataPipeline.compile("(ab|ac"),
    (err) => {
      assert.ok(err instanceof AutomataSyntaxError);
      assert.match(err.message, /parenthesis|mismatch/i);
      return true;
    }
  );
});

test("AutomataPipeline.compile throws AutomataSyntaxError on adjacent binary operators", () => {
  assert.throws(
    () => AutomataPipeline.compile("a||b"),
    (err) => {
      assert.ok(err instanceof AutomataSyntaxError);
      return true;
    }
  );
});
