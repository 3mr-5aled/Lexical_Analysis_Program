import test from "node:test";
import assert from "node:assert/strict";
import { AutomataPipeline } from "../src/core/pipeline.js";
import { StringTracer } from "../src/core/tracer.js";

test("StringTracer accurately steps character-by-character on minimized DFA", () => {
  const result = AutomataPipeline.compile("a|abc*");
  const tracer = new StringTracer(result.minimizedDfa);

  tracer.load("abc");
  assert.equal(tracer.status, "ready");
  assert.equal(tracer.tapeIndex, 0);

  // Step 1: read 'a'
  const step1 = tracer.step();
  assert.ok(step1);
  assert.equal(step1.char, "a");
  assert.equal(tracer.tapeIndex, 1);

  // Step 2: read 'b'
  const step2 = tracer.step();
  assert.ok(step2);
  assert.equal(step2.char, "b");

  // Step 3: read 'c'
  const step3 = tracer.step();
  assert.ok(step3);
  assert.equal(step3.char, "c");
  assert.equal(tracer.status, "accepted");
  assert.ok(tracer.isFinished);
});

test("StringTracer immediately routes to trap state on illegal character", () => {
  const result = AutomataPipeline.compile("(ab)*");
  const tracer = new StringTracer(result.minimizedDfa);

  tracer.load("x");
  const step = tracer.step();
  assert.equal(tracer.status, "rejected");
  assert.match(tracer.reason, /trap|invalid|outside alphabet/i);
});
