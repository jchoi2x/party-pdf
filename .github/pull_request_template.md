## Summary

- 

## Backend Convention Checklist

- [ ] Route file structure follows endpoint-per-directory contract.
- [ ] Endpoint symbols follow naming contract (`<endpointName>Config|Handler|Router`).
- [ ] Schema files use singular `*.schema.ts` naming (no `*.schemas.ts`).
- [ ] `schemas/index.ts` contains re-exports only.
- [ ] Handler/service boundary is respected (no business logic/provider SDK orchestration in handlers).
- [ ] Backend route tests added/updated for success, validation, auth/permission, and service error paths.
- [ ] Route-group wiring tests updated when route mounts or middleware changed.

## Verification

- [ ] `bun run typecheck`
- [ ] `bun run test:server`
- [ ] `bun run biome:ci`
