# apps

Runnable applications live in this folder.

## Purpose

Apps are consumers/showcases of the framework in `libs/`. They should demonstrate integration behavior, not introduce framework-breaking conventions.

## Structure

- `apps/<app-name>/`
- Typical contents:
  - `package.json`
  - `tsconfig.json`
  - `README.md`
  - `src/`

## Guardrails

- Follow strict TDD (`bun run tdd`).
- File names must be kebab-case.
- At most one exported function per source file.
- At most 300 lines per source file.

## Documentation

When an app changes behavior, commands, generated outputs, or runtime assumptions, update:

- root `README.md`
- that app's `README.md`
