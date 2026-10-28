# Domain Glossary: Compiler Automata Theory (FCIS '26)

This glossary defines the canonical domain vocabulary used across this codebase, tests, issues, and UI modules. For detailed mathematical formulations and step-by-step algorithms, see the comprehensive reference documents in [material/knowledge/](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/_Course_MOC.md).

---

## Core Domain Vocabulary

### 1. Automata & Expressions

- **Regular Expression (RE):** Formal notation denoting a regular language through concatenation ($\cdot$), alternation ($|$), and Kleene star ($*$).
- **NFA (Non-Deterministic Finite Automaton):** A 5-tuple $(Q, \Sigma, \delta, q_0, F)$ permitting multiple transitions on identical symbols and $\varepsilon$-transitions.
- **DFA (Deterministic Finite Automaton):** A 5-tuple where every state has at most one deterministic transition per input symbol, with zero $\varepsilon$-transitions.
- **Minimized DFA:** The unique, canonical DFA recognizing language $L$ with the minimal possible state count, obtained via Hopcroft / $k$-equivalence partitioning.
- **Dead / Trap / Sink State ($\Phi$):** An absorbing, non-accepting state ($\delta(\Phi, a) = \Phi \, \forall a \in \Sigma$) entered upon illegal transitions (signals lexical errors).

### 2. Algorithms & Stages

- **Thompson's Construction:** Converts a Regular Expression into an equivalent NFA with exactly 1 start state and 1 accept state.
- **Subset Construction (Powerset Construction):** Converts an NFA into a deterministic DFA.
- **$\varepsilon\text{-closure}(T)$:** The set of all NFA states reachable from set $T$ via zero or more $\varepsilon$-transitions.
- **$\text{move}(T, a)$:** The set of NFA states reachable from set $T$ upon reading symbol $a$.
- **Intermediate Table ("Sigma / Appears / Goes to"):** The standard FCIS '26 lookup table recording active NFA state transitions and their corresponding target closures before computing DFA state subsets.
- **Hopcroft Minimization ($k$-Equivalence):** Iteratively partitions states starting from 0-equivalence ($P_0$: non-accepting vs accepting) until $P_{k+1} = P_k$.

### 3. Visual & Table Standards

- **Start State ($\to$):** Denoted with an incoming source-less arrow $\to d_0$.
- **Accept State ($\*$ / Double Circle):** Marked with an asterisk in tables ($d_i^*$) and rendered as a concentric double circle in SVG graphs.
- **DFA State Naming:** $d_0, d_1, d_2, \dots$ ($D_0, D_1, \dots$ for minimized states).
- **String Simulator:** Simulates input strings over the minimized DFA in $O(|w|)$ time, reporting acceptance or the exact rejection category (trap state entry, invalid character, or non-accepting termination).

### 4. Architecture & Studio Modules

- **AutomataPipeline:** Deep module consolidating the full 5-stage scientific pipeline (`compile(regex)`) into an immutable compilation artifact.
- **AutomataStudioCanvas:** Deep SVG canvas module managing DAG layered positioning, dedicated lower sink routing for $\Phi$, node dragging, and bezier curve handles without label overlap.
- **StringTracer:** Interactive stepped tape state machine (`load(tape)`, `step()`, `run()`, `reset()`) maintaining character tape index, active state transitions, and active node glow.
- **AutomataRegistry:** Centralized catalog of academic presets (Labs 3–4, Lecture 4) and compiler lexical tokens (Identifier, Constant, String, Char, Operators, Delimiters, Comments, Keywords).

---

## Detailed Scientific Reference

- [Course Map of Content](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/_Course_MOC.md)
- [01. Compiler Architecture & Lexical Analysis](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/01-Compiler-Architecture-and-Lexical-Analysis.md)
- [02. Regular Expressions & Formal Languages](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/02-Regular-Expressions-and-Formal-Languages.md)
- [03. Finite Automata Theory: DFA & NFA](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/03-Finite-Automata-Theory-DFA-and-NFA.md)
- [04. Thompson's Construction: RE to NFA](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/04-Thompsons-Construction-RE-to-NFA.md)
- [05. Subset Construction: NFA to DFA](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/05-Subset-Construction-NFA-to-DFA.md)
- [06. DFA Minimization: Equivalence Partitioning](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/06-DFA-Minimization-Equivalence-Partitioning.md)
- [07. Worked Course Examples & Exam Problems](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/07-Worked-Course-Examples-and-Exam-Problems.md)
- [Centralized Domain Glossary](file:///D:/02-Projects/01-Development/01-Active/lexical-analysis-program/material/knowledge/_Glossary.md)
