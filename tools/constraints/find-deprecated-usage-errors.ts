/**
 * @fileoverview Finds deprecated API/type usage via TypeScript suggestion diagnostics.
 */
import { dirname, relative, resolve } from "node:path";
import * as ts from "typescript";

/** Converts values to normalized absolute path. */
function toAbsolutePath(filePath: string): string {
  return resolve(filePath);
}

/** Converts values to flattened diagnostic message text. */
function toDiagnosticMessage(diagnostic: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n").trim();
}

/** Checks whether a diagnostic reports deprecated usage. */
function isDeprecatedDiagnostic(diagnostic: ts.Diagnostic): boolean {
  if (diagnostic.reportsDeprecated) {
    return true;
  }

  return /\bdeprecated\b/i.test(toDiagnosticMessage(diagnostic));
}

/** Converts values to TypeScript config errors. */
function toConfigErrors(filePath: string, diagnostics: readonly ts.Diagnostic[]): string[] {
  const errors: string[] = [];
  for (const diagnostic of diagnostics) {
    errors.push(
      `${filePath}: cannot evaluate deprecated usage constraints ("${toDiagnosticMessage(diagnostic)}").`,
    );
  }
  return errors;
}

/** Converts values to language service host. */
function toLanguageServiceHost(parsedConfig: ts.ParsedCommandLine): ts.LanguageServiceHost {
  const normalizedFileNames = parsedConfig.fileNames.map((filePath) => toAbsolutePath(filePath));
  const fileSet = new Set(normalizedFileNames);

  return {
    directoryExists: ts.sys.directoryExists,
    fileExists(fileName: string): boolean {
      return fileSet.has(toAbsolutePath(fileName)) || ts.sys.fileExists(fileName);
    },
    getCompilationSettings(): ts.CompilerOptions {
      return parsedConfig.options;
    },
    getCurrentDirectory(): string {
      return ts.sys.getCurrentDirectory();
    },
    getDefaultLibFileName(options: ts.CompilerOptions): string {
      return ts.getDefaultLibFilePath(options);
    },
    getDirectories: ts.sys.getDirectories,
    getScriptFileNames(): string[] {
      return normalizedFileNames;
    },
    getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
      const source = ts.sys.readFile(fileName);
      if (source === undefined) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(source);
    },
    getScriptVersion(_fileName: string): string {
      return "1";
    },
    readDirectory: ts.sys.readDirectory,
    readFile: ts.sys.readFile,
    useCaseSensitiveFileNames(): boolean {
      return ts.sys.useCaseSensitiveFileNames;
    },
  };
}

/** Converts values to deprecated usage errors for one source file. */
function toFileErrors(
  sourceFilePath: string,
  suggestions: readonly ts.DiagnosticWithLocation[],
  configDirectory: string,
): string[] {
  const seenMessages = new Set<string>();
  const errors: string[] = [];
  const sourceFile = ts.createSourceFile(
    sourceFilePath,
    ts.sys.readFile(sourceFilePath) ?? "",
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const displayPath = relative(configDirectory, sourceFilePath);
  const sortedSuggestions = [...suggestions].sort((left, right) => {
    const leftStart = left.start ?? 0;
    const rightStart = right.start ?? 0;
    return leftStart - rightStart;
  });

  for (const suggestion of sortedSuggestions) {
    if (!isDeprecatedDiagnostic(suggestion)) {
      continue;
    }

    const message = toDiagnosticMessage(suggestion);
    if (seenMessages.has(message)) {
      continue;
    }
    seenMessages.add(message);

    const start = suggestion.start ?? 0;
    const { character, line } = sourceFile.getLineAndCharacterOfPosition(start);
    errors.push(
      `${displayPath}:${line + 1}:${character + 1}: uses deprecated API/type ("${message}").`,
    );
  }

  return errors;
}

/**
 * Finds deprecated API/type usages for target files.
 * @param filePaths - Target file paths to evaluate.
 * @param tsconfigPath - Path to the TypeScript config file.
 * @example
 * findDeprecatedUsageErrors(["libs/schema/src/schema.ts"], "tsconfig.json")
 */
export function findDeprecatedUsageErrors(filePaths: string[], tsconfigPath: string): string[] {
  const configPath = toAbsolutePath(tsconfigPath);
  const configDirectory = dirname(configPath);
  const readConfigResult = ts.readConfigFile(configPath, ts.sys.readFile);

  if (readConfigResult.error) {
    return toConfigErrors(tsconfigPath, [readConfigResult.error]);
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    readConfigResult.config,
    ts.sys,
    configDirectory,
  );
  if (parsedConfig.errors.length > 0) {
    return toConfigErrors(tsconfigPath, parsedConfig.errors);
  }

  const targetFilePaths = filePaths.map((filePath) => toAbsolutePath(filePath));
  const includedFilePaths = new Set(
    parsedConfig.fileNames.map((filePath) => toAbsolutePath(filePath)),
  );
  const languageServiceHost = toLanguageServiceHost(parsedConfig);
  const languageService = ts.createLanguageService(
    languageServiceHost,
    ts.createDocumentRegistry(),
  );
  const errors: string[] = [];

  for (const sourceFilePath of targetFilePaths) {
    if (!includedFilePaths.has(sourceFilePath)) {
      continue;
    }

    const suggestions = languageService.getSuggestionDiagnostics(sourceFilePath);
    errors.push(...toFileErrors(sourceFilePath, suggestions, configDirectory));
  }

  return errors;
}
