# Agent Capability Hub

Self-hosted control plane for MCP and REST capabilities, role-based access, audit, and a public Skills catalog.

## Development

Requirements: Node.js 24 LTS and pnpm 11.

```sh
pnpm install
pnpm dev
```

The web app is available at `http://localhost:5173`. The API listens on `http://localhost:3100`; Vite proxies `/api` requests to it. SQLite data is stored at `data/agent-capability-hub.sqlite` by default. Set `DATABASE_PATH` to use another SQLite file.

```sh
pnpm test
pnpm typecheck
pnpm build
```
