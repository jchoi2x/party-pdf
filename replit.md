# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a collaborative PDF document editing platform powered by Apryse WebViewer and Y.js for real-time collaboration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Validation**: Zod (`zod/v4`)

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

### Y.js Collaboration Server (External — Cloudflare Workers)
- **Host**: `oblockparty.xvzf.workers.dev`
- **Stack**: Cloudflare Workers + `y-partyserver`
- **Purpose**: Provides WebSocket-based Y.js document sync for multi-user annotation collaboration
- **Client**: `y-partyserver/provider` (`YProvider`) connects to `wss://oblockparty.xvzf.workers.dev/parties/main/{roomId}`
- **Protocol**: Y.js sync protocol via partysocket; rooms identified by ULID document session ID

## Structure

```text
artifacts-monorepo/
├── artifacts/
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
├── lib/                    # Shared libraries
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Key Files

- `artifacts/pdf-collab/src/pages/home.tsx` — Upload form, ULID generation, IndexedDB save
- `artifacts/pdf-collab/src/pages/document.tsx` — Apryse WebViewer init, Y.js provider setup, device settings integration
- `artifacts/pdf-collab/src/hooks/use-media-devices.ts` — Device enumeration hook + localStorage device preferences
- `artifacts/pdf-collab/src/hooks/use-webrtc.ts` — WebRTC hook with replaceLocalStream + device-aware startCamera
- `artifacts/pdf-collab/src/components/logical-units/DeviceSettingsDialog.tsx` — Mic/speaker/camera settings dialog
- `artifacts/pdf-collab/src/components/logical-units/MicLevelBar.tsx` — Real-time mic level indicator (Web Audio API)
- `artifacts/pdf-collab/src/components/logical-units/VideoPanel.tsx` — Video panel with gear icon for device settings
- `artifacts/pdf-collab/src/lib/indexeddb.ts` — IndexedDB wrapper (saveDocument, getDocument, etc.)
- `artifacts/pdf-collab/src/lib/username.ts` — localStorage username helpers
- `artifacts/pdf-collab/src/components/NameDialog.tsx` — Required name prompt (non-dismissable)
- `artifacts/pdf-collab/src/components/DocumentHeader.tsx` — Header with inline name editing
- `artifacts/pdf-collab/vite.config.ts` — Vite config with `/yjs` WebSocket proxy to party server

## Workflows

- `Start application`: `PORT=23260 BASE_PATH=/ pnpm --filter @workspace/pdf-collab run dev`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Packages

### `scripts` (`@workspace/scripts`)
Utility scripts package.
