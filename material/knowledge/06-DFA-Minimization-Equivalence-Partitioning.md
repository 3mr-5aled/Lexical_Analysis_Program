# 06. DFA Minimization: Equivalence Partitioning

> **Academic Provenance:** FCIS '26 Compilers Theory — Lecture 4 (Hopcroft Algorithm & DFA Minimization), Lab 4 (Minimization Exercises & Equivalence Partitions).

---

## 1. Theoretical Motivation & Foundations

Subset construction often generates DFAs with redundant, duplicate, or equivalent states. 

### Why Minimize?
1. **Memory Footprint:** Minimization reduces the number of states and transition table entries to the absolute theoretical minimum.
2. **Cache Locality:** Smaller transition tables fit directly into CPU L1/L2 data cache, accelerating scanner throughput in production compilers.
3. **Canonical Representation:** By the **Myhill-Nerode Theorem**, every regular language possesses a **unique (up to state renaming) minimal DFA**. Minimization allows proving whether two arbitrary regular expressions are equivalent by checking if their minimized DFAs are isomorphic.

---

## 2. State Distinguishability & Equivalence

### 2.1 Formal Definition of Equivalence
Let $D = (Q, \Sigma, \delta, q_0, F)$ be a DFA.
Two states $p, q \in Q$ are **equivalent** (denoted $p \equiv q$) if and only if for all possible input strings $w \in \Sigma^*$, reading $w$ from either state leads to the same acceptance outcome:
$$p \equiv q \iff \forall w \in \Sigma^*: (\hat{\delta}(p, w) \in F \iff \hat{\delta}(q, w) \in F)$$

### 2.2 Distinguishability
Two states $p$ and $q$ are **distinguishable** if there exists at least one string $w \in \Sigma^*$ (called a **distinguishing string**) such that:
$$\hat{\delta}(p, w) \in F \quad \text{and} \quad \hat{\delta}(q, w) \notin F \quad (\text{or vice versa})$$

#### Immediate 0-Step Distinguishability
If state $p \in F$ (accepting) and state $q \notin F$ (non-accepting), they are immediately distinguished by the empty string $w = \varepsilon$:
$$\hat{\delta}(p, \varepsilon) = p \in F \quad \text{while} \quad \hat{\delta}(q, \varepsilon) = q \notin F$$
Therefore, **an accepting state can never be equivalent to a non-accepting state**.

---

## 3. The Hopcroft / $k$-Equivalence Partitioning Algorithm

The FCIS '26 curriculum utilizes the **$k$-Equivalence Partitioning Method** (the pedagogical realization of Hopcroft's algorithm).

### 3.1 Step 1: 0-Equivalence Partition ($P_0$)
Divide the set of all DFA states $Q$ (including the dead state $\Phi$) into two initial groups based on acceptance status:
$$P_0 = \{ G_{\text{non-accepting}}, G_{\text{accepting}} \}$$
Where:
- $G_{\text{non-accepting}} = (Q \setminus F) \cup \{\Phi\}$
- $G_{\text{accepting}} = F$

All states within the same group are considered **0-equivalent** (indistinguishable by strings of length $0$).

---

### 3.2 Step 2: Iterative Refinement ($k$-Equivalence $\to (k+1)$-Equivalence)
Given partition $P_k$, construct partition $P_{k+1}$ by testing if states within each group $G \in P_k$ behave consistently for all single input symbols $a \in \Sigma$:

For a group $G = \{s_1, s_2, \dots, s_m\} \in P_k$:
1. For each symbol $a \in \Sigma$, compute the target state $\delta(s_i, a)$ for each member $s_i \in G$.
2. Identify which group in $P_k$ contains the target state $\delta(s_i, a)$.
3. Two states $s_1, s_2 \in G$ remain in the same sub-group of $P_{k+1}$ if and only if for **every** symbol $a \in \Sigma$, their transitions $\delta(s_1, a)$ and $\delta(s_2, a)$ fall into the **exact same group of $P_k$**:
   $$\text{target\_group}_{P_k}(\delta(s_1, a)) = \text{target\_group}_{P_k}(\delta(s_2, a)) \quad \forall a \in \Sigma$$
4. If states transition to different groups in $P_k$, **split $G$** into separate sub-groups.

---

### 3.3 Step 3: Termination Condition
Repeat the refinement step until no groups split:
$$P_{k+1} = P_k$$
When a full pass over all groups across all symbols produces no new splits, the algorithm terminates.

---

### 3.4 Step 4: Constructing the Minimized DFA
1. **States:** Each group in the final partition $P_{\text{final}}$ becomes a single state in the minimized DFA.
2. **Start State:** The super-state containing the original start state $\to d_0$ becomes the new start state $\to D_0$.
3. **Accepting States:** Every super-state containing one or more original accepting states ($d_i^*$) becomes an accepting state ($D_j^*$).
4. **Transitions:** For any super-state $G$ and symbol $a$:
   $$\delta_{\text{min}}(G, a) = \text{group containing } \delta(s, a) \quad (\text{for any representative } s \in G)$$

---

## 4. Course Reference Walkthroughs

### 4.1 Walkthrough 1: $(ab \mid ac)^*$ (Lab 4 Example 1)
From Subset Construction:
- States: $\{d_0^*, d_1, \Phi, d_2^*, d_3^*\}$
- Accepting: $\{d_0, d_2, d_3\}$
- Non-Accepting: $\{d_1, \Phi\}$

#### Partition Progression
1. **0-Equivalence:**
   $$P_0 = \{d_1, \Phi\} \, \{d_0, d_2, d_3\}$$

2. **Check $\{d_1, \Phi\}$ for 1-Equivalence:**
   - On symbol $b$: $\delta(d_1, b) = d_2 \in \{d_0, d_2, d_3\}$, while $\delta(\Phi, b) = \Phi \in \{d_1, \Phi\}$.
   - Target groups differ! Group $\{d_1, \Phi\}$ splits into $\{d_1\}$ and $\{\Phi\}$.

3. **Check $\{d_0, d_2, d_3\}$ for 1-Equivalence:**
   | State | $\delta(s, a)$ | Group in $P_0$ | $\delta(s, b)$ | Group in $P_0$ | $\delta(s, c)$ | Group in $P_0$ |
   | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
   | **$d_0$** | $d_1$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ |
   | **$d_2$** | $d_1$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ |
   | **$d_3$** | $d_1$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ | $\Phi$ | $\{d_1, \Phi\}$ |
   All three states transition to the exact same groups for all inputs! They remain together.

   $$P_1 = \{d_1\} \, \{\Phi\} \, \{d_0, d_2, d_3\}$$

4. **Check for 2-Equivalence:**
   Testing $\{d_0, d_2, d_3\}$ against $P_1$:
   - On $a$: all go to $d_1 \in \{d_1\}$.
   - On $b$: all go to $\Phi \in \{\Phi\}$.
   - On $c$: all go to $\Phi \in \{\Phi\}$.
   No splits occur:
   $$P_2 = \{d_1\} \, \{\Phi\} \, \{d_0, d_2, d_3\}$$
   Since $P_2 = P_1$, the algorithm terminates.

#### Resulting Minimized DFA
States $d_0, d_2, d_3$ merge into a single super-state $\to d_0^*$.

| Minimized DFA | Original States | $\delta(q, a)$ | $\delta(q, b)$ | $\delta(q, c)$ |
| :--- | :--- | :---: | :---: | :---: |
| **$\to d_0^*$** | $\{d_0, d_2, d_3\}^*$ | $d_1$ | $\Phi$ | $\Phi$ |
| **$d_1$** | $\{d_1\}$ | $\Phi$ | $d_0^*$ | $d_0^*$ |
| **$\Phi$** | $\{\Phi\}$ | $\Phi$ | $\Phi$ | $\Phi$ |

---

### 4.2 Walkthrough 2: $(a \mid b)^* a (a \mid b \mid \varepsilon)$ (Lab 4 Example 2)
Original DFA:
- Non-Accepting: $\{d_0, d_2\}$
- Accepting: $\{d_1^*, d_3^*, d_4^*\}$

#### Partitions
- **0-Equivalence:**
  $$P_0 = \{d_0, d_2\} \, \{d_1, d_3, d_4\}$$
- **1-Equivalence:**
  - $\{d_0, d_2\}$: both transition to $d_1$ on $a$, and to $d_2$ on $b$. Remains together.
  - $\{d_1, d_3, d_4\}$:
    - $d_1$: on $a \to d_3$, on $b \to d_4$.
    - $d_3$: on $a \to d_3$, on $b \to d_4$.
    - $d_4$: on $a \to d_1$, on $b \to d_2$.
    - Notice that $\delta(d_4, b) = d_2 \in \{d_0, d_2\}$, whereas $\delta(d_1, b) = d_4 \in \{d_1, d_3, d_4\}$. Thus $d_4$ splits!
  $$P_1 = \{d_0, d_2\} \, \{d_1, d_3\} \, \{d_4\}$$
- **2-Equivalence:**
  Checking $\{d_0, d_2\}$ and $\{d_1, d_3\}$ against $P_1$ yields no further splits:
  $$P_2 = \{d_0, d_2\} \, \{d_1, d_3\} \, \{d_4\}$$
  Terminates with 3 minimized states.

---

### 4.3 Walkthrough 3: An Already-Minimal DFA: $(ba)^+ (a^*b^* \mid a^*)$ (Lab 4 Example 3)
In Lab 4 Example 3, the partitioning evolves as:
- **0-Equivalence:** $\{d_0, d_1, \Phi\} \, \{d_2, d_3, d_4, d_5\}$
- **1-Equivalence:** $\{d_0, \Phi\} \, \{d_1\} \, \{d_2, d_3, d_4\} \, \{d_5\}$
- **2-Equivalence:** $\{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2\} \, \{d_3, d_4\} \, \{d_5\}$
- **3-Equivalence:** $\{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2\} \, \{d_3\} \, \{d_4\} \, \{d_5\}$
- **4-Equivalence:** $\{d_0\} \, \{\Phi\} \, \{d_1\} \, \{d_2\} \, \{d_3\} \, \{d_4\} \, \{d_5\}$

**Crucial Pedagogical Takeaway (Lab 4 Slide 30):**
Every state isolates into its own singleton set. No two states can be merged together. Therefore, the original DFA is already minimal, and the minimized DFA remains identical to the original DFA.
