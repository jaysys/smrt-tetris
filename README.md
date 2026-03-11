# Tetris Webservice

MVP monorepo scaffold for the Tetris-style webservice defined in `2.설계문서`.

## Workspace
- `apps/web`: public player-facing application
- `apps/admin`: admin backoffice application
- `apps/api`: API service
- `packages/game-engine`: core game rules and deterministic utilities
- `packages/shared-types`: shared DTO and domain types
- `packages/ui`: shared UI primitives
- `packages/analytics`: analytics event helpers

## Intended commands
```bash
pnpm install
pnpm dev:web
pnpm dev:admin
pnpm dev:api
pnpm build
pnpm test
```

## Current status
- D0 repository scaffold created
- Dependency installation and build verification not executed in this workspace yet
