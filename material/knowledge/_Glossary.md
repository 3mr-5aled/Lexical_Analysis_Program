# Centralized Domain Glossary & Notation Guide

> **Academic Provenance:** FCIS '26 Compilers Theory — Official Terminology, Mathematical Symbols, and Standard Notations.

---

## 1. Mathematical Symbols & Formal Notations

| Symbol | Name / Concept | Formal Definition & Usage |
| :---: | :--- | :--- |
| **$\Sigma$** | **Alphabet** | A finite, non-empty set of symbols (e.g., $\Sigma = \{a, b\}$ or $\Sigma = \{0, 1\}$). |
| **$\varepsilon$** (or $\lambda$) | **Empty String** | The unique string of length zero ($|\varepsilon| = 0$). In regular expressions, denotes zero occurrences. |
| **$\emptyset$** | **Empty Set / Empty Language** | A language containing zero strings ($\emptyset = \{\}$). Note that $\emptyset \neq \{\varepsilon\}$. |
| **$\Phi$** | **Trap / Dead State** | An absorbing, non-accepting DFA sink state ($\Phi \notin F$, $\delta(\Phi, a) = \Phi \, \forall a \in \Sigma$). Represents lexical error. |
| **$\to$** | **Start State Indicator** | An incoming arrow without an origin, designating the machine's initial state (e.g., $\to d_0$). |
| **$*$** | **Accepting State Mark** | Denotes an accepting (final) state in tables and text (e.g., $d_0^*$ or $11^*$). Rendered as a concentric double circle in SVG graphs. |
| **$\Sigma^*$** | **Kleene Star of Alphabet** | The set of all possible strings of all finite lengths over $\Sigma$, including $\varepsilon$. |
| **$\Sigma^+$** | **Positive Closure of Alphabet** | The set of all non-empty strings over $\Sigma$ ($\Sigma^+ = \Sigma^* \setminus \{\varepsilon\}$). |
| **$|w|$** | **String Length** | The number of character positions in string $w$. |
| **$\delta$** | **Transition Function** | State transition mapping: $\delta: Q \times \Sigma \to Q$ for DFA; $\delta: Q \times (\Sigma \cup \{\varepsilon\}) \to \mathcal{P}(Q)$ for NFA. |
| **$\hat{\delta}$** | **Extended Transition Function** | Function mapping a state and an entire string to a state: $\hat{\delta}: Q \times \Sigma^* \to Q$. |
| **$\mathcal{P}(Q)$** | **Power Set** | The set of all subsets of $Q$. Defines the theoretical state space for subset construction ($2^{|Q|}$). |
| **$\equiv$** | **State Equivalence** | $p \equiv q \iff \forall w \in \Sigma^*: (\hat{\delta}(p, w) \in F \iff \hat{\delta}(q, w) \in F)$. |

---

## 2. Automata Theory & Lexical Analysis Terminology

### 2.1 Compiler Architecture
- **Compiler:** A program that translates source code written in a high-level language into semantically equivalent target assembly or machine code.
- **Scanner (Lexical Analyzer):** The initial front-end phase that consumes raw characters and produces a stream of typed tokens while stripping whitespace and comments.
- **Parser (Syntax Analyzer):** The second compiler phase that validates the token stream against a Context-Free Grammar (CFG) and builds an Abstract Syntax Tree (AST).
- **Symbol Table:** An associative data structure storing variable and function declarations, type information, scope levels, and memory offsets.
- **Lexeme:** The concrete string of characters in the source program matching a token pattern (e.g., `position`, `3.14`, `while`).
- **Token:** An abstract grammatical category emitted by the scanner, represented as `<token_type, attribute_value>`.
- **Pattern:** The formal specification (usually a Regular Expression) governing what lexemes belong to a given token type.
- **Longest Match (Maximal Munch):** The lexical rule requiring the scanner to always match the longest possible prefix of characters.
- **Rule Priority:** The disambiguation rule stating that if a string matches two patterns of equal length, the first declared pattern takes precedence (e.g., keywords take priority over identifiers).

### 2.2 Finite Automata & Regular Expressions
- **Finite Automaton (FA / FSM):** A 5-tuple $M = (Q, \Sigma, \delta, q_0, F)$ modeling state-driven computation over an alphabet.
- **Deterministic Finite Automaton (DFA):** An FA with no $\varepsilon$-moves and exactly one deterministic transition for each symbol from each state.
- **Non-Deterministic Finite Automaton (NFA):** An FA that permits $\varepsilon$-moves and multiple transitions for the same symbol from a single state.
- **Regular Expression (RE):** An algebraic expression formed from symbols, alternation ($|$), concatenation ($\cdot$), and Kleene closure ($*$).
- **Thompson's Construction:** An inductive, syntax-directed algorithm translating an RE into an equivalent NFA with exactly one start and one accept state.
- **Subset Construction (Powerset Construction):** An algorithm that eliminates non-determinism and $\varepsilon$-transitions, transforming an NFA into an equivalent DFA.
- **$\varepsilon$-closure ($T$):** The set of all NFA states reachable from any state in subset $T$ using zero or more $\varepsilon$-transitions.
- **$\text{move}(T, a)$:** The set of all NFA states reachable from any state in $T$ on a single transition of symbol $a$.
- **"Sigma / Appears / Goes to" Table:** An intermediate lookup table used in the FCIS '26 curriculum to record NFA state transitions and their corresponding $\varepsilon$-closures.
- **DFA Minimization:** The optimization process that merges indistinguishable states to produce the unique minimal DFA.
- **Hopcroft's Algorithm:** An algorithm that partitions states into equivalence classes by iteratively splitting groups that transition to different partitions on input symbols.
- **$k$-Equivalence ($P_k$):** An equivalence relation where states are indistinguishable by any string of length $\le k$.
- **Distinguishing String:** A string $w$ that leads one state into an accepting state and another into a non-accepting state, proving they cannot be merged.
- **Myhill-Nerode Theorem:** The foundational theorem establishing that every regular language has a unique minimal DFA up to state isomorphism.
