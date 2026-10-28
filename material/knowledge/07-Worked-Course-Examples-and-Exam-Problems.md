# 07. Worked Course Examples & Exam Problems

> **Academic Provenance:** FCIS '26 Compilers Theory — Lecture 3 (NFA & Subset), Lecture 4 (Hopcroft Minimization & Exam Assignment Slide 47), Lab 3 (Thompson Exercises), Lab 4 (Comprehensive Examples 1–3).

---

## Overview

This document provides complete, rigorous, end-to-end solutions for all authoritative course examples and exam assignments from the FCIS '26 Compilers Theory curriculum. These serve as ground truth for algorithmic verification, unit tests, and the interactive application presets.

---

## Problem 1: $(ab \mid ac)^*$ (Lab 4 Example 1)

### 1. Thompson's Construction (NFA)
- Sub-expression $N_1 = ab$: $2 \xrightarrow{a} 3 \xrightarrow{\varepsilon} 4 \xrightarrow{b} 5$
- Sub-expression $N_2 = ac$: $7 \xrightarrow{a} 8 \xrightarrow{\varepsilon} 9 \xrightarrow{c} 10$
- Union $ab \mid ac$: Start $1 \xrightarrow{\varepsilon} 2$, $1 \xrightarrow{\varepsilon} 7$; Exit $5 \xrightarrow{\varepsilon} 6$, $10 \xrightarrow{\varepsilon} 6$
- Kleene Closure $(ab \mid ac)^*$: Global start $0 \xrightarrow{\varepsilon} 1$, bypass $0 \xrightarrow{\varepsilon} 11^*$; Loopback $6 \xrightarrow{\varepsilon} 1$, exit $6 \xrightarrow{\varepsilon} 11^*$
- **Start State:** $0$
- **Accept State:** $11^*$

### 2. Intermediate "Sigma / Appears / Goes to" Table
| Sigma | Appears | Goes to |
| :---: | :---: | :--- |
| **a** | 2 | $\{3, 4\}$ |
| | 7 | $\{8, 9\}$ |
| **b** | 4 | $\{1, 2, 5, 6, 7, 11\}^*$ |
| **c** | 9 | $\{1, 2, 6, 7, 10, 11\}^*$ |

### 3. Subset Construction Table (DFA)
- Initial state: $d_0 = \varepsilon\text{-closure}(0) = \{0, 1, 2, 7, 11\}^*$

| DFA State | NFA Subset | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
| :--- | :--- | :---: | :---: | :---: |
| **$\to d_0^*$** | $\{0, 1, 2, 7, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_1$** | $\{3, 4, 8, 9\}$ | $\Phi$ | $d_2^*$ | $d_3^*$ |
| **$\Phi$** | $\Phi$ (Dead State) | $\Phi$ | $\Phi$ | $\Phi$ |
| **$d_2^*$** | $\{1, 2, 5, 6, 7, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_3^*$** | $\{1, 2, 6, 7, 10, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |

### 4. Hopcroft Minimization ($k$-Equivalence)
- **0-Equivalence:** $\{d_1, \Phi\} \, \{d_0, d_2, d_3\}$
- **1-Equivalence:** $\{d_1\} \, \{\Phi\} \, \{d_0, d_2, d_3\}$
- **2-Equivalence:** $\{d_1\} \, \{\Phi\} \, \{d_0, d_2, d_3\}$ (Terminates)
- **Merged Super-state:** $d_0, d_2, d_3 \implies \to d_0^*$

#### Minimized DFA Transition Table
| Minimized State | Original States | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
| :--- | :--- | :---: | :---: | :---: |
| **$\to d_0^*$** | $\{d_0, d_2, d_3\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_1$** | $\{d_1\}$ | $\Phi$ | $d_0^*$ | $d_0^*$ |
| **$\Phi$** | $\{\Phi\}$ | $\Phi$ | $\Phi$ | $\Phi$ |

### 5. String Acceptance & Rejection Verification
- **Accepted Strings ($\in L$):**
  1. $\varepsilon$ (empty string: finishes in start/accept state $d_0^*$)
  2. `ab` ($d_0 \xrightarrow{a} d_1 \xrightarrow{b} d_0^*$)
  3. `acab` ($d_0 \xrightarrow{a} d_1 \xrightarrow{c} d_0 \xrightarrow{a} d_1 \xrightarrow{b} d_0^*$)
- **Rejected Strings ($\notin L$):**
  1. `a` (terminates in non-accepting state $d_1$)
  2. `b` (transitions from $d_0$ to $\Phi$)
  3. `aba` (terminates in non-accepting state $d_1$)

---

## Problem 2: $(a \mid b)^* a (a \mid b \mid \varepsilon)$ (Lab 4 Example 2)

### 1. Thompson NFA Specifications
- Start state: $0$
- Accept state: $17^*$
- $\varepsilon\text{-closure}(0) = \{0, 1, 2, 5, 7, 8\}$

### 2. Intermediate "Sigma / Appears / Goes to" Table
| Sigma | Appears | Goes to |
| :---: | :---: | :--- |
| **a** | 2 | $\{1, 2, 3, 4, 5, 7, 8\}$ |
| | 8 | $\{9, 10, 11, 12, 15, 17\}^*$ |
| | 12 | $\{13, 14, 17\}^*$ |
| **b** | 5 | $\{1, 2, 4, 5, 6, 7, 8\}$ |
| | 15 | $\{14, 16, 17\}^*$ |

### 3. Subset Construction Table (DFA)
| DFA State | NFA Subset | $\delta(q, a)$ | $\delta(q, b)$ |
| :--- | :--- | :---: | :---: |
| **$\to d_0$** | $\{0, 1, 2, 5, 7, 8\}$ | $d_1^*$ | $d_2$ |
| **$d_1^*$** | $\{1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 15, 17\}^*$ | $d_3^*$ | $d_4^*$ |
| **$d_2$** | $\{1, 2, 4, 5, 6, 7, 8\}$ | $d_1^*$ | $d_2$ |
| **$d_3^*$** | $\{1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17\}^*$ | $d_3^*$ | $d_4^*$ |
| **$d_4^*$** | $\{1, 2, 4, 5, 6, 7, 8, 14, 16, 17\}^*$ | $d_1^*$ | $d_2$ |

### 4. Hopcroft Minimization ($k$-Equivalence)
- **0-Equivalence:** $\{d_0, d_2\} \, \{d_1, d_3, d_4\}$
- **1-Equivalence:** $\{d_0, d_2\} \, \{d_1, d_3\} \, \{d_4\}$
- **2-Equivalence:** $\{d_0, d_2\} \, \{d_1, d_3\} \, \{d_4\}$ (Terminates)

#### Minimized DFA Transition Table
- State Renaming:
  - $D_0 = \{d_0, d_2\}$ (Start)
  - $D_1^* = \{d_1, d_3\}^*$ (Accept)
  - $D_2^* = \{d_4\}^*$ (Accept)

| Minimized DFA | Original States | $\delta(q, a)$ | $\delta(q, b)$ |
| :--- | :--- | :---: | :---: |
| **$\to D_0$** | $\{d_0, d_2\}$ | $D_1^*$ | $D_0$ |
| **$D_1^*$** | $\{d_1, d_3\}^*$ | $D_1^*$ | $D_2^*$ |
| **$D_2^*$** | $\{d_4\}^*$ | $D_1^*$ | $D_0$ |

### 5. Test Strings
- **Accepted:** `a`, `aa`, `ab`, `bab`, `bbaa`
- **Rejected:** $\varepsilon$, `b`, `bb`, `bbb`

---

## Problem 3: $(ba)^+ (a^*b^* \mid a^*)$ (Lab 4 Example 3 - Already Minimal)

### 1. Context & Distinctive Feature
This example demonstrates a language where subset construction produces a DFA that is **already in its unique minimal form**.

### 2. Subset Construction Transition Table
| DFA State | NFA Subset | $\delta(q, a)$ | $\delta(q, b)$ |
| :--- | :--- | :---: | :---: |
| **$\to d_0$** | $\{0, 1\}$ | $\Phi$ | $d_1$ |
| **$\Phi$** | $\Phi$ (Dead State) | $\Phi$ | $\Phi$ |
| **$d_1$** | $\{2, 3\}$ | $d_2^*$ | $\Phi$ |
| **$d_2^*$** | $\{1, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18\}^*$ | $d_3^*$ | $d_4^*$ |
| **$d_3^*$** | $\{7, 8, 9, 10, 11, 13, 15, 16, 17, 18\}^*$ | $d_3^*$ | $d_5^*$ |
| **$d_4^*$** | $\{2, 3, 11, 12, 13, 18\}^*$ | $d_2^*$ | $d_5^*$ |
| **$d_5^*$** | $\{11, 12, 13, 18\}^*$ | $\Phi$ | $d_5^*$ |

### 3. Hopcroft Minimization Tracing
- **0-Equivalence:** $\{d_0, d_1, \Phi\} \, \{d_2, d_3, d_4, d_5\}$
- **1-Equivalence:** $\{d_0, \Phi\} \, \{d_1\} \, \{d_2, d_3, d_4\} \, \{d_5\}$
- **2-Equivalence:** $\{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2\} \, \{d_3, d_4\} \, \{d_5\}$
- **3-Equivalence:** $\{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2\} \, \{d_3\} \, \{d_4\} \, \{d_5\}$
- **4-Equivalence:** Identical to 3-Equivalence.
- **Conclusion (Lab 4 Slide 30):** Every state isolates into a singleton set. No states are combined. The minimized DFA is identical to the original DFA.

---

## Problem 4: $a \mid abc^*$ (Lecture 4 Slide 47 Assignment)

> **Official 20-Mark Exam Problem:**
> *"For the following Regular Expression: $a \mid abc^*$*
> - *a) Construct the NFA using Thompson's Construction. (5 marks)*
> - *b) Convert the NFA to DFA using Subset Construction. (5 marks)*
> - *c) Minimize the resulting DFA using Hopcroft Algorithm. (5 marks)*
> - *d) Determine Three accepted strings and Three rejected ones by the DFA. (5 marks)*
> *Note: Show all Transition Tables required to solve (b) and (c)."*

### Model Solution

#### Part A: Thompson's Construction (5 Marks)
1. Sub-expression $N(a_1)$: $2 \xrightarrow{a} 3$
2. Sub-expression $N(a_2)$: $6 \xrightarrow{a} 7$
3. Sub-expression $N(b)$: $8 \xrightarrow{b} 9$
4. Sub-expression $N(c)$: $12 \xrightarrow{c} 13$
5. $N(c^*)$: Start $10 \xrightarrow{\varepsilon} 12$, $10 \xrightarrow{\varepsilon} 11$; Loopback $13 \xrightarrow{\varepsilon} 12$, Exit $13 \xrightarrow{\varepsilon} 11$
6. Concatenation $N(a_2 b c^*)$: $7 \xrightarrow{\varepsilon} 8$, $9 \xrightarrow{\varepsilon} 10$
7. Union $a \mid abc^*$:
   - Global start $0 \xrightarrow{\varepsilon} 2$, $0 \xrightarrow{\varepsilon} 6$
   - Exit to global accept state $1^*$: $3 \xrightarrow{\varepsilon} 1$, $11 \xrightarrow{\varepsilon} 1$
- **Total States:** $14$ states ($0$ through $13$).
- **Start State:** $0$
- **Accept State:** $1^*$

#### Part B: Subset Construction (5 Marks)
- **Intermediate "Sigma / Appears / Goes to" Table:**
  | Sigma | Appears | Goes to |
  | :---: | :---: | :--- |
  | **a** | 2 | $\{1, 3\}^*$ |
  | | 6 | $\{7, 8\}$ |
  | **b** | 8 | $\{9, 10, 11, 12, 1\}^*$ |
  | **c** | 12 | $\{1, 11, 12, 13\}^*$ |

- **DFA State Subsets:**
  - $d_0 = \varepsilon\text{-closure}(0) = \{0, 2, 6\}$ (Non-accepting start)
  - $\delta(d_0, a) = \{1, 3\} \cup \{7, 8\} = \{1, 3, 7, 8\}^* \equiv d_1^*$ (Accepting because $1 \in d_1$)
  - $\delta(d_0, b) = \Phi$
  - $\delta(d_0, c) = \Phi$
  - $\delta(d_1, a) = \Phi$
  - $\delta(d_1, b) = \{1, 9, 10, 11, 12\}^* \equiv d_2^*$ (Accepting because $1, 11 \in d_2$)
  - $\delta(d_1, c) = \Phi$
  - $\delta(d_2, a) = \Phi$
  - $\delta(d_2, b) = \Phi$
  - $\delta(d_2, c) = \{1, 11, 12, 13\}^* \equiv d_3^*$ (Accepting)
  - $\delta(d_3, a) = \Phi$
  - $\delta(d_3, b) = \Phi$
  - $\delta(d_3, c) = \{1, 11, 12, 13\}^* = d_3^*$ (Self-loop)

- **Subset Construction Transition Table:**
  | DFA State | NFA State Set | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
  | :--- | :--- | :---: | :---: | :---: |
  | **$\to d_0$** | $\{0, 2, 6\}$ | $d_1^*$ | $\Phi$ | $\Phi$ |
  | **$d_1^*$** | $\{1, 3, 7, 8\}^*$ | $\Phi$ | $d_2^*$ | $\Phi$ |
  | **$d_2^*$** | $\{1, 9, 10, 11, 12\}^*$ | $\Phi$ | $\Phi$ | $d_3^*$ |
  | **$d_3^*$** | $\{1, 11, 12, 13\}^*$ | $\Phi$ | $\Phi$ | $d_3^*$ |
  | **$\Phi$** | $\Phi$ (Dead State) | $\Phi$ | $\Phi$ | $\Phi$ |

#### Part C: Hopcroft Minimization (5 Marks)
- **0-Equivalence:**
  $$P_0 = \{d_0, \Phi\} \, \{d_1, d_2, d_3\}$$
- **1-Equivalence:**
  - Checking $\{d_0, \Phi\}$ on $a$: $\delta(d_0, a) = d_1 \in \{d_1, d_2, d_3\}$, while $\delta(\Phi, a) = \Phi \in \{d_0, \Phi\}$. Split occurs: $\{d_0\} \{\Phi\}$.
  - Checking $\{d_1, d_2, d_3\}$ on $b$: $\delta(d_1, b) = d_2 \in \{d_1, d_2, d_3\}$, while $\delta(d_2, b) = \Phi$ and $\delta(d_3, b) = \Phi$. Split occurs!
  - Checking $\{d_2, d_3\}$ on $c$: $\delta(d_2, c) = d_3$ and $\delta(d_3, c) = d_3$. Both transition to the same state on $c$, and both go to $\Phi$ on $a$ and $b$. They remain equivalent!
  $$P_1 = \{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2, d_3\}$$
- **2-Equivalence:**
  Checking $\{d_2, d_3\}$ against $P_1$:
  - On $a$: both go to $\Phi \in \{\Phi\}$.
  - On $b$: both go to $\Phi \in \{\Phi\}$.
  - On $c$: both go to $d_3 \in \{d_2, d_3\}$.
  No further splits occur:
  $$P_2 = \{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2, d_3\}$$
  Terminates with $P_2 = P_1$.

- **Minimized DFA Transition Table:**
  Let $D_0 = d_0$, $D_1^* = d_1$, $D_2^* = \{d_2, d_3\}^*$, $\Phi = \Phi$.

  | Minimized State | Original States | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
  | :--- | :--- | :---: | :---: | :---: |
  | **$\to D_0$** | $\{d_0\}$ | $D_1^*$ | $\Phi$ | $\Phi$ |
  | **$D_1^*$** | $\{d_1\}^*$ | $\Phi$ | $D_2^*$ | $\Phi$ |
  | **$D_2^*$** | $\{d_2, d_3\}^*$ | $\Phi$ | $\Phi$ | $D_2^*$ |
  | **$\Phi$** | $\{\Phi\}$ | $\Phi$ | $\Phi$ | $\Phi$ |

#### Part D: Three Accepted & Three Rejected Strings (5 Marks)
- **Accepted Strings ($\in L$):**
  1. `a` ($D_0 \xrightarrow{a} D_1^*$)
  2. `ab` ($D_0 \xrightarrow{a} D_1 \xrightarrow{b} D_2^*$)
  3. `abccc` ($D_0 \xrightarrow{a} D_1 \xrightarrow{b} D_2 \xrightarrow{c} D_2 \xrightarrow{c} D_2 \xrightarrow{c} D_2^*$)
- **Rejected Strings ($\notin L$):**
  1. $\varepsilon$ (empty string: stops at initial non-accepting state $D_0$)
  2. `b` (transitions immediately from $D_0$ to dead state $\Phi$)
  3. `abc*` literal with unpermitted symbols or `aba` (transitions from $D_1$ or $D_2$ to dead state $\Phi$)

---

## Systematic Algorithm for Generating 3 Accepted & 3 Rejected Strings

To automate question part (d) cleanly in the interactive app:

### Generating Accepted Strings
1. Run a Breadth-First Search (BFS) starting at $\to q_0$ on the Minimized DFA transition graph.
2. Traverse edges, recording the accumulated string prefix.
3. Whenever a node $q \in F$ is reached, yield the string if not already yielded.
4. Continue until at least 3 distinct strings of minimal length are collected.

### Generating Rejected Strings
1. Test $\varepsilon$ (if $q_0 \notin F$, $\varepsilon$ is immediately valid).
2. For each state along valid paths, identify input characters that transition to $\Phi$ or are missing. Construct short prefixes that deliberately trigger dead state entry (e.g., `b`, `aa`).
3. Construct a string that halts in a non-accepting state $q \notin F$ (e.g., prefix `a` when `ab` is required).
