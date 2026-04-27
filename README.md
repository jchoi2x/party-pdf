# Party PDF

## Server Route File Structure Convention

All API routes under `src/server/lib/routes` must follow a strict endpoint-per-directory contract.

### Goals

- Keep route implementation predictable and discoverable.
- Separate concerns between OpenAPI config, runtime handler, and router registration.
- Ensure each endpoint has explicit request/response schema files.

### Required structure

```text
src/server/lib/routes/
  index.ts                           # mounts top-level route groups

  <group>/
    index.ts                         # mounts group endpoints and optional group middleware
    <endpoint-name>/
      index.ts                       # re-exports endpoint-local files only
      <endpoint-name>.route.ts       # OpenAPIHono router + .openapi(config, handler)
      <endpoint-name>.config.ts      # createRoute definition
      <endpoint-name>.handler.ts     # RouteHandler
      schemas/
        index.ts                     # schema/type re-exports only
        body.schema.ts               # when endpoint accepts JSON body
        query.schema.ts              # when endpoint accepts query params
        params.schema.ts             # when endpoint accepts path params
        response.schema.ts           # success payload schema
        error.schema.ts              # error payload schema (if endpoint exposes one)
```

### Naming rules

- Endpoint directory names are kebab-case and map to endpoint intent (for example `get-token`, `docs-by-session-id`, `patch-profile`).
- Exactly one endpoint route lives in each endpoint directory.
- Use singular file names:
  - `*.config.ts`
  - `*.handler.ts`
  - `*.route.ts`
  - `schemas/*.schema.ts` (never `*.schemas.ts`)
- `schemas/index.ts` re-exports schema/type symbols only.
- Endpoint `index.ts` re-exports endpoint-local symbols only.
- Group `index.ts` composes child routers via `route('', childRouter)` and applies group middleware.

### Existing examples in this repo

- `src/server/lib/routes/files/docs`
- `src/server/lib/routes/files/session-invite`
- `src/server/lib/routes/me/get-me`
- `src/server/lib/routes/me/patch-profile`
- `src/server/lib/routes/video/get-token`

## Backend Conventions

### Route naming convention

- Endpoint directory names are kebab-case (`get-token`, `patch-profile`).
- Endpoint symbols are camelCase and suffix-based:
  - `<endpointName>Config`
  - `<endpointName>Handler`
  - `<endpointName>Router`
- Avoid generic symbol names (`config`, `handler`, `router`) and duplicate aliases for the same type.

Valid:

```ts
export const getTokenConfig = createRoute(...);
export const getTokenHandler: RouteHandler<...> = async (c) => { ... };
export const getTokenRouter = new OpenAPIHono<{ Bindings: Env }>();
```

Invalid:

```ts
export const config = createRoute(...);
export const handler = async (c) => { ... };
export const router = new OpenAPIHono();
```

### Schema contract convention

- Use singular schema filenames only:
  - `body.schema.ts`
  - `query.schema.ts`
  - `params.schema.ts`
  - `response.schema.ts`
  - `error.schema.ts`
- Never use plural schema filenames like `*.schemas.ts`.
- `schemas/index.ts` must be re-export-only (no inline schema definitions).
- Define explicit success and documented error schemas for endpoint responses.

### Handler/service boundary convention

- Handlers should be thin:
  - read validated input,
  - read auth/request context,
  - call service methods,
  - map service results/errors to HTTP responses.
- Business logic and external provider integrations belong in `src/server/lib/services/**`.
- Handlers should not instantiate provider SDK clients or perform direct repository/DB logic.

### Backend test checklist

For each changed endpoint:

1. success-path test
2. validation-failure test
3. auth/permission-failure test (if protected)
4. service/upstream-failure test

For each changed route group:

- at least one wiring test for mount + middleware behavior.

### Common anti-patterns

- `schemas/*.schemas.ts` filenames.
- Inline schema definitions inside `schemas/index.ts`.
- Generic endpoint symbols (`config`, `handler`, `router`).
- Third-party SDK orchestration inside route handlers.
- Happy-path-only tests with weak assertions.
