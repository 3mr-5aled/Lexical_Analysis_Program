/**
 * RegexParser
 * Parses regular expressions, inserts explicit concatenation operators (.),
 * and converts infix notation to postfix tokens via Shunting-Yard.
 * Supports standard symbols, ε (@, \e), |, *, +, ?, and parentheses.
 */
export class RegexParser {
  static EPSILON = 'ε';

  static isEpsilon(token) {
    return token === 'ε' || token === 'ϵ' || token === '@' || token === '\\e';
  }

  static isOperator(char) {
    return char === '|' || char === '.' || char === '*' || char === '+' || char === '?' || char === '(' || char === ')';
  }

  static isPostfixOp(char) {
    return char === '*' || char === '+' || char === '?';
  }

  static precedence(op) {
    switch (op) {
      case '(':
        return 1;
      case '|':
        return 2;
      case '.':
        return 3;
      case '*':
      case '+':
      case '?':
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Tokenizes and parses regular expression.
   * @param {string} rawRegex
   * @returns {{ tokens: string[], postfix: string[], alphabet: string[], error: string|null }}
   */
  static parse(rawRegex) {
    if (!rawRegex || typeof rawRegex !== 'string') {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression cannot be empty' };
    }

    const trimmed = rawRegex.trim();
    if (!trimmed) {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression cannot be empty' };
    }

    // Step 1: Lex raw string into initial tokens
    const rawTokens = [];
    let i = 0;
    while (i < trimmed.length) {
      const ch = trimmed[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (ch === '\\' && i + 1 < trimmed.length && trimmed[i + 1] === 'e') {
        rawTokens.push(RegexParser.EPSILON);
        i += 2;
      } else if (ch === '@' || ch === 'ε' || ch === 'ϵ') {
        rawTokens.push(RegexParser.EPSILON);
        i++;
      } else {
        rawTokens.push(ch);
        i++;
      }
    }

    if (rawTokens.length === 0) {
      return { tokens: [], postfix: [], alphabet: [], error: 'Regular expression has no valid tokens' };
    }

    // Step 2: Validate basic syntax
    let parenCount = 0;
    for (let idx = 0; idx < rawTokens.length; idx++) {
      const token = rawTokens[idx];
      if (token === '(') parenCount++;
      if (token === ')') {
        parenCount--;
        if (parenCount < 0) {
          return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Unmatched closing parenthesis ")"' };
        }
      }
      if (idx === 0 && (token === '|' || RegexParser.isPostfixOp(token))) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: `Unexpected operator '${token}' at start of expression` };
      }
      if (token === '|' && (idx === rawTokens.length - 1 || rawTokens[idx + 1] === '|' || rawTokens[idx + 1] === ')')) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Invalid alternation "|" without right operand' };
      }
      if (RegexParser.isPostfixOp(token) && idx > 0 && (rawTokens[idx - 1] === '(' || rawTokens[idx - 1] === '|')) {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: `Operator '${token}' has no preceding operand` };
      }
      if (token === '(' && idx + 1 < rawTokens.length && rawTokens[idx + 1] === ')') {
        return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Empty parentheses "()" are not allowed' };
      }
    }

    if (parenCount !== 0) {
      return { tokens: rawTokens, postfix: [], alphabet: [], error: 'Unmatched opening parenthesis "("' };
    }

    // Step 3: Insert implicit concatenation operators (.)
    const tokensWithConcat = [];
    const alphabetSet = new Set();

    const isOperand = (t) => {
      return !RegexParser.isOperator(t) || RegexParser.isEpsilon(t);
    };

    for (let j = 0; j < rawTokens.length; j++) {
      const curr = rawTokens[j];
      tokensWithConcat.push(curr);

      if (isOperand(curr) && !RegexParser.isEpsilon(curr)) {
        alphabetSet.add(curr);
      }

      if (j + 1 < rawTokens.length) {
        const next = rawTokens[j + 1];
        // Insert '.' if:
        // (operand or postfix op or ')') followed by (operand or '(')
        const canEndOperand = isOperand(curr) || RegexParser.isPostfixOp(curr) || curr === ')';
        const canStartOperand = isOperand(next) || next === '(';

        if (canEndOperand && canStartOperand) {
          tokensWithConcat.push('.');
        }
      }
    }

    // Step 4: Shunting-Yard Algorithm (Infix to Postfix)
    const postfix = [];
    const opStack = [];

    for (const token of tokensWithConcat) {
      if (isOperand(token)) {
        postfix.push(token);
      } else if (RegexParser.isPostfixOp(token)) {
        // Unary postfix operators have highest precedence, output directly or after higher op
        postfix.push(token);
      } else if (token === '(') {
        opStack.push(token);
      } else if (token === ')') {
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(') {
          postfix.push(opStack.pop());
        }
        if (opStack.length > 0) {
          opStack.pop(); // discard '('
        }
      } else {
        // Binary operators: '.' or '|'
        const prec = RegexParser.precedence(token);
        while (opStack.length > 0 && opStack[opStack.length - 1] !== '(' && RegexParser.precedence(opStack[opStack.length - 1]) >= prec) {
          postfix.push(opStack.pop());
        }
        opStack.push(token);
      }
    }

    while (opStack.length > 0) {
      const top = opStack.pop();
      if (top !== '(' && top !== ')') {
        postfix.push(top);
      }
    }

    const alphabet = Array.from(alphabetSet).sort();
    return {
      tokens: tokensWithConcat,
      postfix,
      alphabet,
      error: null
    };
  }
}
