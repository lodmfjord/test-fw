# @babbstack/create-app-cli

CLI-first scaffold library for generating a brand-new app with only hello-world boilerplate.

## CLI

```bash
bun run --cwd libs/create-app-cli build
bun libs/create-app-cli/dist/create-app-bin.js my-app
```

This creates:

- `apps/my-app/package.json`
- `apps/my-app/README.md`
- `apps/my-app/src/app-bin.ts` with `console.log("Hello world");`

## API

- `runCreateAppCli(args, repoRoot)`
