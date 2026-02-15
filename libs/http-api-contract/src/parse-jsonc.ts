/**
 * @fileoverview Implements parse jsonc.
 */
/** Converts values to string-state transition. */
function toStringState(
  character: string | undefined,
  source: { inString: boolean; isEscaped: boolean },
): { inString: boolean; isEscaped: boolean } {
  if (character === undefined) {
    return source;
  }

  if (source.isEscaped) {
    return {
      inString: source.inString,
      isEscaped: false,
    };
  }

  if (character === "\\") {
    return {
      inString: source.inString,
      isEscaped: true,
    };
  }

  if (character === '"') {
    return {
      inString: false,
      isEscaped: false,
    };
  }

  return source;
}

/** Converts values to line-comment end index. */
function toLineCommentEndIndex(source: string, index: number): number | undefined {
  if (source[index] !== "/" || source[index + 1] !== "/") {
    return undefined;
  }

  let commentIndex = index + 2;
  while (commentIndex < source.length && source[commentIndex] !== "\n") {
    commentIndex += 1;
  }

  return commentIndex;
}

/** Converts values to block-comment end index. */
function toBlockCommentEndIndex(source: string, index: number): number | undefined {
  if (source[index] !== "/" || source[index + 1] !== "*") {
    return undefined;
  }

  let commentIndex = index + 2;
  while (commentIndex + 1 < source.length) {
    if (source[commentIndex] === "*" && source[commentIndex + 1] === "/") {
      return commentIndex + 2;
    }
    commentIndex += 1;
  }

  return commentIndex;
}

/** Handles strip json comments. */
function stripJsonComments(source: string): string {
  let output = "";
  let index = 0;
  let inString = false;
  let isEscaped = false;

  while (index < source.length) {
    const character = source[index];

    if (inString) {
      output += character;
      const nextState = toStringState(character, {
        inString,
        isEscaped,
      });
      inString = nextState.inString;
      isEscaped = nextState.isEscaped;
      index += 1;
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      index += 1;
      continue;
    }

    const lineCommentEndIndex = toLineCommentEndIndex(source, index);
    if (lineCommentEndIndex !== undefined) {
      index = lineCommentEndIndex;
      continue;
    }

    const blockCommentEndIndex = toBlockCommentEndIndex(source, index);
    if (blockCommentEndIndex !== undefined) {
      index = blockCommentEndIndex;
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
}

/** Handles strip trailing commas. */
function stripTrailingCommas(source: string): string {
  let output = "";
  let inString = false;
  let isEscaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      output += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      continue;
    }

    if (character === ",") {
      let lookaheadIndex = index + 1;
      while (lookaheadIndex < source.length && /\s/.test(source[lookaheadIndex] ?? "")) {
        lookaheadIndex += 1;
      }
      const lookaheadCharacter = source[lookaheadIndex];
      if (lookaheadCharacter === "}" || lookaheadCharacter === "]") {
        continue;
      }
    }

    output += character;
  }

  return output;
}

/**
 * Handles parse jsonc.
 * @param source - Source parameter.
 * @example
 * parseJsonc(source)
 */
export function parseJsonc(source: string): unknown {
  const withoutComments = stripJsonComments(source);
  const withoutTrailingCommas = stripTrailingCommas(withoutComments);
  return JSON.parse(withoutTrailingCommas) as unknown;
}
