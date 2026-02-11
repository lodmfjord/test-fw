# @babbstack/test-app

Simple showcase app that defines schema-first endpoints with `@babbstack/http-api-contract`.

The same endpoint declarations are used for:
- one Bun app in dev (`bun serve` via `createDevApp`)
- many Lambda entries in prod (generated manifests/contracts)

Endpoints are defined in `/Users/lommi/Projects/babbstack/apps/test-app/src/endpoints.ts`.
The file just calls `defineGet` / `definePost` directly; no exported endpoint array is required.

## Commands

- `bun test apps/test-app/src/showcase.test.ts`
- `bun run --cwd apps/test-app dev`
- `bun run --cwd apps/test-app generate:contracts`

`generate:contracts` writes:
- `dist/contracts/*.json`
- `dist/lambda-js/*.mjs`
- `dist/*.tf.json` (when enabled in settings; always split by concern)

Generation settings live in `apps/test-app/babb.settings.json`.
Terraform settings support:
- top-level `appName` (optional; defaults to contract api name)
- top-level `prefix` (optional name prefix segment)
- `terraform.region` (for example `eu-west-1`)
- workspace-based environments via `terraform.workspace` in generated names
- auto-generated Terraform S3 backend state config
- optional `terraform.state` override (`bucket`, `keyPrefix`, optional `lockTableName`)
- lambda layers are auto-generated only for routes that import `externalModules`; identical package sets reuse one layer zip in `dist/layer-artifacts/*.zip`
- each `externalModules` package must be installed in this app (`apps/test-app/package.json`) so generated layer zips use your pinned versions
