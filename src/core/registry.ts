/**
 * AutomataRegistry
 * Centralized catalog of:
 * 1. FCIS '26 Academic Presets (Labs 3-4, Lecture 4)
 * 2. C# Lexical Scanner Tokens from the reference studio
 * Grounded in material/knowledge/ and material/interactive_dfa_studio_c_lexical_analyzer.html
 */

export interface PresetItem {
  id: string;
  name: string;
  group: "course" | "scanner";
  regex: string;
  formalRE?: string;
  description: string;
  defaultInput?: string;
  csharpCode?: string;
  csharpRegex?: string;
  tokenType?: string;
}

export const AUTOMATA_PRESETS: PresetItem[] = [
  // --- 1. Lecture 3 ---
  {
    id: "course-lec3-identifiers",
    name: "Lecture 3 - Identifiers: (a|b)(a|b|0|1)*",
    group: "course",
    regex: "(a|b)(a|b|0|1)*",
    formalRE: "Letter (Letter | Digit)*",
    description:
      "Formal language model for programming language variable identifiers.",
    defaultInput: "a1b0",
  },

  // --- 2. Lab 3 ---
  {
    id: "course-lab3-ex1",
    name: "Lab 3 - Exercise 1: (ab|c)*",
    group: "course",
    regex: "(ab|c)*",
    formalRE: "(ab|c)*",
    description:
      "Basic alternation inside Kleene star with different length branches.",
    defaultInput: "abc",
  },
  {
    id: "course-lab3-ex2",
    name: "Lab 3 - Exercise 2: (a|b)*a",
    group: "course",
    regex: "(a|b)*a",
    formalRE: "(a|b)*a",
    description: 'Strings ending with "a" over alphabet {a, b}.',
    defaultInput: "bba",
  },
  {
    id: "course-lab3-selfstudy",
    name: "Lab 3 - Self Study: a*b(a|b)*",
    group: "course",
    regex: "a*b(a|b)*",
    formalRE: "a*b(a|b)*",
    description: 'Strings containing at least one "b".',
    defaultInput: "aab",
  },

  // --- 3. Lecture 4 ---
  {
    id: "course-lec4-slide47",
    name: "Lecture 4 - Slide 47: a|abc*",
    group: "course",
    regex: "a|abc*",
    formalRE: "a|abc*",
    description:
      "Assignment from Lecture 4 requiring exactly 3 accepted and 3 rejected strings.",
    defaultInput: "abcc",
  },

  // --- 4. Lab 4 ---
  {
    id: "course-lab4-ex1",
    name: "Lab 4 - Example 1: (ab|ac)*",
    group: "course",
    regex: "(ab|ac)*",
    formalRE: "(ab|ac)*",
    description:
      "Alternation of concatenations with Kleene star. Canonical FCIS Lab 4 example.",
    defaultInput: "abacab",
  },
  {
    id: "course-lab4-ex2",
    name: "Lab 4 - Example 2: (a|b)*a(a|b|ε)",
    group: "course",
    regex: "(a|b)*a(a|b|ε)",
    formalRE: "(a|b)*a(a|b|ε)",
    description:
      "Non-deterministic epsilon branch demonstrating intermediate Appears/Goes-to table.",
    defaultInput: "aba",
  },
  {
    id: "course-lab4-ex3",
    name: "Lab 4 - Example 3: (ba)+(a*b*|a*)",
    group: "course",
    regex: "(ba)+(a*b*|a*)",
    formalRE: "(ba)+(a*b*|a*)",
    description: "Plus loopback with nested Kleene star subsets.",
    defaultInput: "ba",
  },
];
