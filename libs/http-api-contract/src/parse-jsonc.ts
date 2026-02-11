function stripJsonComments(source: string): string {
  let output = "";
  let index = 0;
  let inString = false;
  let isEscaped = false;

  while (index < source.length) {
    const character = source[index];
    const nextCharacter = index + 1 < source.length ? source[index + 1] : "";

    if (inString) {
      output += character;
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (character === '"') {
      inString = true;
      output += character;
      index += 1;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      index += 2;
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      index += 2;
      while (index + 1 < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          index += 2;
          break;
        }
        index += 1;
      }
      continue;
    }

    output += character;
    index += 1;
  }

  return output;
}

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

export function parseJsonc(source: string): unknown {
  const withoutComments = stripJsonComments(source);
  const withoutTrailingCommas = stripTrailingCommas(withoutComments);
  return JSON.parse(withoutTrailingCommas) as unknown;
}
