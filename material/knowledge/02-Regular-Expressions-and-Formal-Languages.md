# 02. Regular Expressions & Formal Languages

> **Academic Provenance:** FCIS '26 Compilers Theory — Lecture 1 (Introduction & RE), Lab 1 (Exercises on RE), Lab 2 (Scanning & Regex in C#).

---

## 1. Mathematical Foundations of Formal Languages

### 1.1 Alphabet ($\Sigma$)
An **alphabet** $\Sigma$ is a finite, non-empty set of symbols.
- **Binary Alphabet:** $\Sigma = \{0, 1\}$
- **Lower-case Alphabet:** $\Sigma = \{a, b, \dots, z\}$
- **Course Common Alphabet:** $\Sigma = \{a, b\}$ or $\Sigma = \{a, b, c\}$
- **ASCII Alphabet:** The standard 128-character set used in modern computing.

### 1.2 Strings (Words)
A **string** $w$ over an alphabet $\Sigma$ is a finite sequence of symbols chosen from $\Sigma$.

#### Key String Properties & Operations
1. **Length ($|w|$):** The total number of symbol occurrences in $w$.
   - If $w = \text{compiler}$, $|w| = 8$.
2. **Empty String ($\varepsilon$ or $\lambda$):** The unique string containing zero symbols.
   - $|\varepsilon| = 0$.
   - In course slides and exam questions, $\varepsilon$ is standard.
3. **Concatenation:** If $x = \text{comp}$ and $y = \text{iler}$, then $xy = \text{compiler}$.
   - Length of concatenation: $|xy| = |x| + |y|$.
   - Identity property: $w\varepsilon = \varepsilon w = w$.
4. **String Exponentiation ($w^k$):**
   - $w^0 = \varepsilon$
   - $w^1 = w$
   - $w^k = w w^{k-1}$ for $k \ge 1$.
   - If $w = ab$, then $w^3 = ababab$.
5. **Prefix, Suffix, Substring:**
   - A string $x$ is a **prefix** of $w$ if there exists $y$ such that $w = xy$.
   - A string $y$ is a **suffix** of $w$ if there exists $x$ such that $w = xy$.
   - A string $s$ is a **substring** if there exist $x, y$ such that $w = xsy$.

### 1.3 Alphabet Exponentiation & Kleene Closure ($\Sigma^*, \Sigma^+$)
- $\Sigma^k$: The set of all strings over $\Sigma$ of exact length $k$.
  - For $\Sigma = \{0, 1\}$: $\Sigma^0 = \{\varepsilon\}$, $\Sigma^1 = \{0, 1\}$, $\Sigma^2 = \{00, 01, 10, 11\}$.
- **Kleene Star ($\Sigma^*$):** The set of all strings over $\Sigma$ of any finite length, including $\varepsilon$:
  $$\Sigma^* = \bigcup_{k=0}^{\infty} \Sigma^k = \Sigma^0 \cup \Sigma^1 \cup \Sigma^2 \cup \dots$$
- **Positive Closure ($\Sigma^+$):** The set of all non-empty strings over $\Sigma$:
  $$\Sigma^+ = \bigcup_{k=1}^{\infty} \Sigma^k = \Sigma^* \setminus \{\varepsilon\}$$

### 1.4 Formal Language ($L$)
A **formal language** $L$ over an alphabet $\Sigma$ is any subset of $\Sigma^*$:
$$L \subseteq \Sigma^*$$
- Empty Language: $\emptyset = \{\}$ (contains 0 strings). Note: $\emptyset \neq \{\varepsilon\}$.
- Language of all binary palindromes: $L = \{w \in \{0, 1\}^* \mid w = w^R\}$.
- Language of valid C identifiers: $L \subseteq \Sigma^*_{\text{ASCII}}$.

---

## 2. Formal Inductive Definition of Regular Expressions

A **Regular Expression (RE)** is an algebraic notation used to describe regular languages.

### 2.1 Inductive Definition
Given an alphabet $\Sigma$:

#### Base Cases
1. **$\varepsilon$** is an RE denoting the language $L(\varepsilon) = \{\varepsilon\}$.
2. **$\emptyset$** is an RE denoting the empty language $L(\emptyset) = \emptyset$.
3. For each symbol **$a \in \Sigma$**, $a$ is an RE denoting $L(a) = \{a\}$.

#### Inductive Step
If $r$ and $s$ are regular expressions denoting languages $L(r)$ and $L(s)$, then:
1. **Alternation / Union ($r \mid s$):**
   $$L(r \mid s) = L(r) \cup L(s)$$
2. **Concatenation ($r \cdot s$ or $rs$):**
   $$L(r \cdot s) = L(r) \cdot L(s) = \{xy \mid x \in L(r), y \in L(s)\}$$
3. **Kleene Star / Closure ($r^*$):**
   $$L(r^*) = (L(r))^* = \bigcup_{k=0}^{\infty} (L(r))^k$$

### 2.2 Syntactic Sugar & Extended Regular Expressions
To simplify practical compiler scanner specifications, standard extensions are defined in terms of the three core operations:

| Operator | Notation | Equivalent Core RE | Meaning |
| :--- | :--- | :--- | :--- |
| **Positive Closure** | $r^+$ | $r \cdot r^*$ or $r^* \cdot r$ | One or more occurrences of $r$. |
| **Optionality** | $r?$ | $(r \mid \varepsilon)$ | Zero or one occurrence of $r$. |
| **Character Class** | $[a-z]$ | $a \mid b \mid c \mid \dots \mid z$ | Matches any single character in the range. |
| **Negated Class** | $[\hat{\phantom{a}}a-z]$ | $\Sigma \setminus \{a, b, \dots, z\}$ | Matches any single character not in the range. |

---

## 3. Operator Precedence Hierarchy

Without parentheses, operations are evaluated according to strict precedence rules:

| Precedence | Operator Category | Associativity | Example | Evaluation |
| :---: | :--- | :---: | :--- | :--- |
| **1 (Highest)** | Parentheses `( )` | N/A | `(a|b)*` | Groups sub-expressions explicitly. |
| **2** | Postfix Unary (`*`, `+`, `?`) | Left-to-right | `ab*` | Evaluated as `a(b*)`, NOT `(ab)*`. |
| **3** | Concatenation (`·`) | Left-to-right | `ab|c` | Evaluated as `(ab)|c`, NOT `a(b|c)`. |
| **4 (Lowest)** | Alternation (`|`) | Left-to-right | `a|b|c` | Evaluated as `(a|b)|c`. |

---

## 4. Algebraic Laws of Regular Expressions

Two regular expressions $r$ and $s$ are **equivalent** ($r = s$) if and only if they denote the exact same language: $L(r) = L(s)$.

### 4.1 Laws for Alternation / Union
- **Commutativity:** $r \mid s = s \mid r$
- **Associativity:** $r \mid (s \mid t) = (r \mid s) \mid t$
- **Idempotence:** $r \mid r = r$
- **Identity:** $r \mid \emptyset = \emptyset \mid r = r$

### 4.2 Laws for Concatenation
- **Associativity:** $r(st) = (rs)t$
- **Identity:** $r\varepsilon = \varepsilon r = r$
- **Annihilator:** $r\emptyset = \emptyset r = \emptyset$

### 4.3 Distributive Laws
- **Left Distributivity:** $r(s \mid t) = rs \mid rt$
- **Right Distributivity:** $(s \mid t)r = sr \mid tr$

### 4.4 Laws for Kleene Star
- $\varepsilon^* = \varepsilon$
- $\emptyset^* = \varepsilon$
- $r^* = r \mid r^* = (r \mid \varepsilon)^*$
- $r^* = \varepsilon \mid r r^* = \varepsilon \mid r^* r$
- $(r^*)^* = r^*$
- $r^* r^* = r^*$
- $(r^* s^*)^* = (r \mid s)^*$
- $(r \mid s)^* = (r^* s^*)^* = r^*(sr^*)^*$

---

## 5. Course High-Yield Patterns & Worked Examples

The following problems and patterns appear repeatedly in FCIS '26 lectures, labs, and exams:

### Pattern 1: No Three Consecutive Identical Characters
**Problem:** Construct an RE over $\Sigma = \{a, b\}$ for all strings that do not contain three consecutive $a$'s ($aaa$).
- **Analysis:** Between occurrences of $b$, $a$ can appear 0, 1, or 2 times. The string can also end with up to two $a$'s.
- **Solution:**
  $$(b \mid ab \mid aab)^* \, (\varepsilon \mid a \mid aa)$$
- **Alternative:**
  $$(\varepsilon \mid a \mid aa) \, (b \, (\varepsilon \mid a \mid aa))^*$$

### Pattern 2: Odd Number of Symbols
**Problem:** Construct an RE over $\Sigma = \{a, b\}$ for all strings containing an odd number of $a$'s.
- **Analysis:** Must contain at least one $a$, and all subsequent $a$'s must appear in pairs. Arbitrary $b$'s can appear anywhere.
- **Solution:**
  $$b^* a b^* (b^* a b^* a b^*)^*$$
- **Simplified Equivalent:**
  $$b^* a (b \mid a b^* a)^*$$

### Pattern 3: Even Number of Symbols
**Problem:** Construct an RE over $\Sigma = \{a, b\}$ for all strings containing an even number of $a$'s.
- **Analysis:** Zero $a$'s (even), or $a$'s appearing in pairs, interleaved with arbitrary $b$'s.
- **Solution:**
  $$b^* (a b^* a b^*)^*$$

### Pattern 4: Beginning and Ending with Specific Characters
- **Begins with $a$ and ends with $b$:**
  $$a (a \mid b)^* b$$
- **Begins and ends with the same character ($\Sigma = \{a, b\}$):**
  $$a (a \mid b)^* a \mid b (a \mid b)^* b \mid a \mid b$$
- **Begins and ends with different characters:**
  $$a (a \mid b)^* b \mid b (a \mid b)^* a$$

### Pattern 5: Numeric Floating-Point Literals
**Problem:** Construct an RE for signed floating-point numbers with optional exponents.
- **Components:**
  - $\text{Sign} \to (+ \mid - \mid \varepsilon)$
  - $\text{Digits} \to [0-9]^+$
  - $\text{Fraction} \to (\cdot [0-9]^+)?$
  - $\text{Exponent} \to ([eE](+ \mid - \mid \varepsilon)[0-9]^+)?$
- **Combined RE:**
  $$(+ \mid - \mid \varepsilon) \, [0-9]^+ \, (\cdot [0-9]^+)? \, ([eE](+ \mid - \mid \varepsilon)[0-9]^+)?$$
