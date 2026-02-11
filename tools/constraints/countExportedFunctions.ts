const EXPORTED_FUNCTION_PATTERNS = [
  /\bexport\s+default\s+(?:async\s+)?function\b/g,
  /\bexport\s+(?:async\s+)?function\b/g,
  /\bexport\s+const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
];

function stripStringsAndComments(source: string): string {
  const chars = source.split("");
  const cleaned: string[] = [];
  let i = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < chars.length) {
    const current = chars[i] ?? "";
    const next = chars[i + 1] ?? "";
    const previous = chars[i - 1] ?? "";

    if (inLineComment) {
      if (current === "\n") {
        inLineComment = false;
        cleaned.push("\n");
      } else {
        cleaned.push(" ");
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (current === "*" && next === "/") {
        inBlockComment = false;
        cleaned.push(" ", " ");
        i += 2;
      } else {
        cleaned.push(current === "\n" ? "\n" : " ");
        i += 1;
      }
      continue;
    }

    if (inSingleQuote) {
      if (current === "'" && previous !== "\\") {
        inSingleQuote = false;
      }
      cleaned.push(current === "\n" ? "\n" : " ");
      i += 1;
      continue;
    }

    if (inDoubleQuote) {
      if (current === '"' && previous !== "\\") {
        inDoubleQuote = false;
      }
      cleaned.push(current === "\n" ? "\n" : " ");
      i += 1;
      continue;
    }

    if (inTemplate) {
      if (current === "`" && previous !== "\\") {
        inTemplate = false;
      }
      cleaned.push(current === "\n" ? "\n" : " ");
      i += 1;
      continue;
    }

    if (current === "/" && next === "/") {
      inLineComment = true;
      cleaned.push(" ", " ");
      i += 2;
      continue;
    }

    if (current === "/" && next === "*") {
      inBlockComment = true;
      cleaned.push(" ", " ");
      i += 2;
      continue;
    }

    if (current === "'") {
      inSingleQuote = true;
      cleaned.push(" ");
      i += 1;
      continue;
    }

    if (current === '"') {
      inDoubleQuote = true;
      cleaned.push(" ");
      i += 1;
      continue;
    }

    if (current === "`") {
      inTemplate = true;
      cleaned.push(" ");
      i += 1;
      continue;
    }

    cleaned.push(current);
    i += 1;
  }

  return cleaned.join("");
}

function countPatternMatches(source: string, pattern: RegExp): number {
  const matches = source.match(pattern);
  return matches ? matches.length : 0;
}

export function countExportedFunctions(source: string): number {
  const cleanSource = stripStringsAndComments(source);

  return EXPORTED_FUNCTION_PATTERNS.reduce((total, pattern) => {
    return total + countPatternMatches(cleanSource, pattern);
  }, 0);
}
