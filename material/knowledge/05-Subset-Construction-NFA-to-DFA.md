# 05. Subset Construction: NFA to DFA

> **Academic Provenance:** FCIS '26 Compilers Theory — Lecture 3 (Subset Construction), Lab 4 (Subset Construction Method & Intermediate Tables).

---

## 1. Motivation & Mathematical Principles

Because NFAs permit non-deterministic branching and $\varepsilon$-transitions, executing an NFA directly on a character stream requires tracking multiple states simultaneously or using recursive backtracking.

To achieve optimal $O(|w|)$ linear execution in compiler lexical analyzers, the NFA is converted into an equivalent **Deterministic Finite Automaton (DFA)** using the **Subset Construction** algorithm (also known as the **Powerset Construction**).

### Core Theorem
For every NFA $N = (Q_N, \Sigma, \delta_N, q_0, F_N)$, there exists an equivalent DFA $D = (Q_D, \Sigma, \delta_D, d_0, F_D)$ such that:
$$L(D) = L(N)$$
While $Q_D \subseteq \mathcal{P}(Q_N)$ can theoretically contain up to $2^{|Q_N|}$ states, in actual compiler design the number of reachable subsets is typically linear with respect to the NFA size.

---

## 2. Fundamental Operations

The subset construction algorithm relies on three fundamental set operations:

### 2.1 Epsilon Closure ($\varepsilon\text{-closure}$)
- **For a single state $s \in Q_N$:**
  $\varepsilon\text{-closure}(s)$ is the set of all NFA states reachable from $s$ by taking zero or more $\varepsilon$-transitions.
  - **Reflexive Invariant:** $s \in \varepsilon\text{-closure}(s)$ always.
- **For a set of states $T \subseteq Q_N$:**
  $$\varepsilon\text{-closure}(T) = \bigcup_{s \in T} \varepsilon\text{-closure}(s)$$

#### Iterative Computation of $\varepsilon\text{-closure}(T)$
```python
def epsilon_closure(nfa, states):
    stack = list(states)
    closure = set(states)

    while stack:
        current = stack.pop()
        for next_state in nfa.epsilon_transitions.get(current, []):
            if next_state not in closure:
                closure.add(next_state)
                stack.append(next_state)

    return closure
```

### 2.2 Move Function ($\text{move}(T, a)$)
The set of all NFA states reachable from any state in $T$ on a single input transition labeled with symbol $a \in \Sigma$:
$$\text{move}(T, a) = \bigcup_{s \in T} \delta_N(s, a)$$

### 2.3 DFA State Transition ($D\text{-tran}$)
The target DFA state reached from a state subset $T$ upon reading symbol $a$ is the $\varepsilon$-closure of the states reached by moving on $a$:
$$D\text{-tran}(T, a) = \varepsilon\text{-closure}(\text{move}(T, a))$$

---

## 3. The FCIS '26 Canonical Method: The Intermediate Lookup Table

In the FCIS '26 curriculum, students and automated tools employ an explicit intermediate lookup table—the **"Sigma / Appears / Goes to"** table—before constructing the final DFA transition table.

### 3.1 Structure of the "Sigma / Appears / Goes to" Table
For each symbol in the alphabet $\Sigma$, this table precomputes every active transition in the NFA and its complete target $\varepsilon$-closure:

| Column | Description |
| :--- | :--- |
| **Sigma ($\Sigma$)** | The input character symbol ($a, b, c$). |
| **Appears** | The specific NFA state number that has an outgoing edge labeled with this symbol. |
| **Goes to** | The target NFA state reached on this symbol, followed by its **full $\varepsilon$-closure**. If the resulting set contains an NFA accepting state, it is marked with an asterisk ($*$). |

#### Concrete Example: $(ab \mid ac)^*$ (Lab 4 Example 1)
From the 12-state Thompson NFA for $(ab \mid ac)^*$:
- On symbol $a$: State $2$ transitions to $3$, whose $\varepsilon$-closure is $\{3, 4\}$. State $7$ transitions to $8$, whose $\varepsilon$-closure is $\{8, 9\}$.
- On symbol $b$: State $4$ transitions to $5$, whose $\varepsilon$-closure is $\{1, 2, 5, 6, 7, 11\}^*$.
- On symbol $c$: State $9$ transitions to $10$, whose $\varepsilon$-closure is $\{1, 2, 6, 7, 10, 11\}^*$.

The resulting FCIS Intermediate Table:
| Sigma | Appears | Goes to |
| :---: | :---: | :--- |
| **a** | 2 | $\{3, 4\}$ |
| | 7 | $\{8, 9\}$ |
| **b** | 4 | $\{1, 2, 5, 6, 7, 11\}^*$ |
| **c** | 9 | $\{1, 2, 6, 7, 10, 11\}^*$ |

*Utility:* When computing $\delta_D(d_i, \sigma)$, one simply looks up which states in $d_i$ appear in the "Appears" column, and takes the union of their corresponding "Goes to" entries.

---

## 4. The Complete Subset Construction Algorithm

```
Algorithm: Subset Construction
Input:  NFA N = (Q_N, Sigma, delta_N, s0, F_N)
Output: DFA D = (Q_D, Sigma, delta_D, d0, F_D)

1. Compute initial state:
   d0 = epsilon_closure({s0})
   Q_D = { d0 }
   Mark d0 as "unmarked"

2. While there is an unmarked state U in Q_D:
   a. Mark U
   b. For each input symbol a in Sigma:
      i.   T = move(U, a)
      ii.  If T is empty:
              delta_D(U, a) = Phi  (Trap / Dead state)
           Else:
              V = epsilon_closure(T)
              If V not in Q_D:
                 Add V to Q_D as an unmarked state (assign name d_new)
              delta_D(U, a) = V

3. Define Start State:
   DFA Start State = -> d0 (marked with ->)

4. Define Accepting States (F_D):
   For each state subset d_i in Q_D:
      If (d_i intersect F_N) != empty:
         d_i is an accepting state (marked with *)
```

---

## 5. Course Case Study: Tracing $(ab \mid ac)^*$

### Step 1: Initial State Computation
The NFA start state is $0$.
$$d_0 = \varepsilon\text{-closure}(\{0\}) = \{0, 1, 2, 7, 11\}^*$$
- Because $11 \in F_{\text{NFA}}$, $d_0$ is an **accepting state** ($\to d_0^*$).

### Step 2: Transitions from $d_0 = \{0, 1, 2, 7, 11\}$
- **On symbol $a$:**
  States $2$ and $7$ appear in $d_0$.
  $$\delta(d_0, a) = \{3, 4\} \cup \{8, 9\} = \{3, 4, 8, 9\} \equiv d_1$$
- **On symbol $b$:**
  State $4$ does not appear in $d_0$. $\implies \Phi$ (Trap state).
- **On symbol $c$:**
  State $9$ does not appear in $d_0$. $\implies \Phi$.

### Step 3: Transitions from $d_1 = \{3, 4, 8, 9\}$
- **On symbol $a$:** No state has an $a$ transition. $\implies \Phi$.
- **On symbol $b$:** State $4$ appears $\implies \{1, 2, 5, 6, 7, 11\}^* \equiv d_2^*$.
- **On symbol $c$:** State $9$ appears $\implies \{1, 2, 6, 7, 10, 11\}^* \equiv d_3^*$.

### Step 4: Transitions from $d_2^* = \{1, 2, 5, 6, 7, 11\}$
- **On symbol $a$:** States $2$ and $7$ appear $\implies \{3, 4, 8, 9\} = d_1$.
- **On symbol $b$:** $\Phi$.
- **On symbol $c$:** $\Phi$.

### Step 5: Transitions from $d_3^* = \{1, 2, 6, 7, 10, 11\}$
- **On symbol $a$:** States $2$ and $7$ appear $\implies \{3, 4, 8, 9\} = d_1$.
- **On symbol $b$:** $\Phi$.
- **On symbol $c$:** $\Phi$.

### Step 6: Complete DFA Transition Table
In accordance with FCIS '26 standards:

| DFA State | NFA State Set | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
| :--- | :--- | :---: | :---: | :---: |
| **$\to d_0^*$** | $\{0, 1, 2, 7, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_1$** | $\{3, 4, 8, 9\}$ | $\Phi$ | $d_2^*$ | $d_3^*$ |
| **$\Phi$** | $\Phi$ (Dead State) | $\Phi$ | $\Phi$ | $\Phi$ |
| **$d_2^*$** | $\{1, 2, 5, 6, 7, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_3^*$** | $\{1, 2, 6, 7, 10, 11\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
