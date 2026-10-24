import test from 'node:test';
import assert from 'node:assert/strict';
import { RegexParser } from '../js/regex-parser.js';

test('parses simple concatenation and inserts explicit concat operator', () => {
  const result = RegexParser.parse('ab');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', 'b', '.']);
  assert.deepEqual(result.alphabet, ['a', 'b']);
});

test('handles union and kleene star with precedence', () => {
  const result = RegexParser.parse('(a|b)*a');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', 'b', '|', '*', 'a', '.']);
});

test('handles epsilon symbols and plus operator', () => {
  const result = RegexParser.parse('a+ε');
  assert.equal(result.error, null);
  assert.deepEqual(result.postfix, ['a', '+', 'ε', '.']);
  assert.deepEqual(result.alphabet, ['a']); // epsilon excluded from alphabet
});

test('reports syntax error on unmatched parenthesis', () => {
  const result = RegexParser.parse('(a|b');
  assert.ok(result.error !== null);
});

test('handles complex FCIS example (ab|ac)*', () => {
  const result = RegexParser.parse('(ab|ac)*');
  assert.equal(result.error, null);
  assert.deepEqual(result.alphabet, ['a', 'b', 'c']);
  assert.deepEqual(result.postfix, ['a', 'b', '.', 'a', 'c', '.', '|', '*']);
});

test('rejects alternation without left operand like (|a)', () => {
  const result = RegexParser.parse('(|a)');
  assert.ok(result.error !== null);
  assert.ok(result.error.includes('without left operand') || result.error.includes('Invalid alternation'));
});

test('rejects invalid explicit concatenation dots like .a and a..b', () => {
  const res1 = RegexParser.parse('.a');
  assert.ok(res1.error !== null);
  const res2 = RegexParser.parse('a.');
  assert.ok(res2.error !== null);
  const res3 = RegexParser.parse('a..b');
  assert.ok(res3.error !== null);
});
