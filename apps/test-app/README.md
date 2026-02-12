# @babbstack/test-app

Simple showcase app that defines schema-first endpoints with `@babbstack/http-api-contract`.

The same endpoint declarations are used for:
- one Bun app in dev (`bun serve` via `createDevApp`)
- many Lambda entries in prod (generated manifests/contracts)

Endpoints are defined in `/Users/lommi/Projects/simple-api/apps/test-app/src/endpoints.ts`.
The endpoint entrypoint exports `endpoints` (arrays and nested arrays are supported).

## Commands

- `bun test apps/test-app/src/showcase.test.ts`
- `bun run --cwd apps/test-app dev`
- `bun run --cwd apps/test-app generate:contracts`

`generate:contracts` writes:
- `dist/contracts/*.json`
- `dist/lambda-js/*.mjs`
- `dist/*.tf.json` (when enabled in settings; always split by concern)
- `dist/lambda-artifacts/*.zip` and `dist/lambda-artifacts/source-code-hashes.json`
- `dist/layer-artifacts/*.zip` and `dist/layer-artifacts/source-code-hashes.json` (when layers are used)

Usage notes:
- `dist/contracts/*.json` is contract output for external consumers (OpenAPI/manifests).
- Terraform deploys use `dist/*.tf.json` plus `dist/lambda-artifacts` and `dist/layer-artifacts`.
- Generated Lambda and Layer resources use `source_code_hash` from the `source-code-hashes.json` files so unchanged source does not trigger unnecessary redeploys.

Generation settings live in `apps/test-app/babb.settings.json`.
Terraform settings support:
- top-level `appName` (optional; defaults to contract api name)
- top-level `prefix` (optional name prefix segment)
- `terraform.region` (for example `eu-west-1`)
- workspace-based environments via `terraform.workspace` in generated names
- auto-generated Terraform S3 backend state config (or disable backend with `terraform.state.enabled: false`)
- optional `terraform.state` override (`bucket`, `keyPrefix`, optional `lockTableName`)
- lambda layers are auto-generated only for routes that import `externalModules`; identical package sets reuse one layer zip in `dist/layer-artifacts/*.zip`
- each `externalModules` package must be installed in this app (`apps/test-app/package.json`) so generated layer zips use your pinned versions
