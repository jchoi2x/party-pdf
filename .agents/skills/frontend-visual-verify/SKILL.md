---
name: frontend-visual-verify
description: >-
  Verifies how the React/Vite frontend actually renders after UI or styling
  changes. Use when editing components, CSS, layout, or pages; when the user
  asks how something looks; or before claiming a UI task is done. Requires
  Browser MCP (cursor-ide-browser) to be enabled.
---

# Frontend visual verification

## When to use

Apply after non-trivial UI changes (components, Tailwind classes, layout, responsive behavior), or when the user wants a visual sanity check.

## Preconditions

- **Browser MCP**: `cursor-ide-browser` must be enabled for this session. If browser tools are not available, say so and ask the user to enable them; do not claim the page was inspected.
- **Dev server**: From repo root, `bun run dev` starts Vite with the Cloudflare plugin. Default URL is `http://localhost:3000` unless `PORT` is set (see `vite.config.ts`).

## Routes to spot-check

- `http://localhost:3000/` — home
- `http://localhost:3000/document/<id>` — document room (use a real or test document id when verifying that flow)

## Steps

1. If the dev server is not already running, start it (`bun run dev`) and wait until `http://localhost:3000` responds.
2. Navigate to the path under test with the browser tool.
3. Take a fresh **snapshot** of the page (and a viewport **screenshot** when layout, spacing, or color judgment matters).
4. Summarize what appears: structure, obvious regressions, overflow, contrast, empty or error states.
5. After further edits that affect DOM or styles, repeat from step 3 — do not reuse stale snapshots or refs from an earlier snapshot.

## Scope

Focus on user-visible outcome. This complements but does not replace automated tests.
