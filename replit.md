# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a collaborative PDF document editing platform powered by Apryse WebViewer and Y.js for real-time collaboration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Applications

### PDF Collaboration Platform (`artifacts/pdf-collab`)
- **URL**: `/` (root)
- **Port**: 23260
- **Stack**: React 19 + Vite + Tailwind CSS v4 + shadcn/ui
- **Features**:
  - PDF upload with IndexedDB persistence (blobs stored locally)
  - Unique session URLs generated via ULID (`/document/:id`)
  - Apryse WebViewer v11.11.0 for PDF viewing and annotation
  - Real-time Y.js collaboration via `y-websocket` provider + `partysocket` transport
  - User identity management with localStorage + name prompt dialog
  - Deep navy blue + warm amber design theme (Space Grotesk + Inter fonts)

### Y.js Collaboration Server (`artifacts/party-server`)
- **Port**: 1999
- **Stack**: Node.js + `@y/websocket-server` + `ws`
- **Purpose**: Provides WebSocket-based Y.js document sync for multi-user annotation collaboration
- **Protocol**: Standard Y.js WebSocket protocol, rooms identified by document session ID

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (shared backend)
│   ├── pdf-collab/         # React Vite PDF collaboration frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── home.tsx        # Upload page
│   │   │   │   └── document.tsx    # PDF viewer + collaboration
│   │   │   ├── components/
│   │   │   │   ├── DocumentHeader.tsx   # Header with user identity
│   │   │   │   ├── NameDialog.tsx       # Required name prompt
│   │   │   │   └── ui/                  # shadcn/ui components
│   │   │   └── lib/
│   │   │       ├── indexeddb.ts    # PDF blob persistence
│   │   │       └── username.ts     # localStorage name helpers
│   └── party-server/       # Y.js WebSocket collaboration server
│       └── src/
│           └── index.js    # setupWSConnection from @y/websocket-server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Files

- `artifacts/pdf-collab/src/pages/home.tsx` — Upload form, ULID generation, IndexedDB save
- `artifacts/pdf-collab/src/pages/document.tsx` — Apryse WebViewer init, Y.js provider setup
- `artifacts/pdf-collab/src/lib/indexeddb.ts` — IndexedDB wrapper (saveDocument, getDocument, etc.)
- `artifacts/pdf-collab/src/lib/username.ts` — localStorage username helpers
- `artifacts/pdf-collab/src/components/NameDialog.tsx` — Required name prompt (non-dismissable)
- `artifacts/pdf-collab/src/components/DocumentHeader.tsx` — Header with inline name editing
- `artifacts/pdf-collab/vite.config.ts` — Vite config with `/yjs` WebSocket proxy to party server
- `artifacts/party-server/src/index.js` — Y.js WebSocket server

## Workflows

- `Start application`: `PORT=23260 BASE_PATH=/ PARTY_PORT=1999 pnpm --filter @workspace/pdf-collab run dev`
- `Y.js Collaboration Server`: `pnpm --filter @workspace/party-server run dev`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with health check route at `/api/healthz`.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)
Owns the OpenAPI 3.1 spec and Orval config.
Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `scripts` (`@workspace/scripts`)
Utility scripts package.
