# Agent Capability Hub

Self-hosted control plane for MCP and REST capabilities, role-based access, audit, and a public Skills catalog.

## Development

Requirements: Node.js 24 LTS and pnpm 11.

```sh
pnpm install
pnpm dev
```

The web app is available at `http://localhost:5173`. The API listens on `http://localhost:3100`; Vite proxies `/api` requests to it. SQLite data is stored at `data/agent-capability-hub.sqlite` by default. Set `DATABASE_PATH` to use another SQLite file.

On an empty database, copy `.env.example` to `.env` and set `ADMIN_USERNAME` and `ADMIN_PASSWORD` before starting the API. The service refuses to start without both values. They initialize the administrator once; later changes do not overwrite the stored account. Reset the administrator password locally with `pnpm --filter @ach/api admin:reset-password`; the generated password is printed once and all web sessions are revoked.

API Key values are stored in plaintext in the SQLite database so their owners and the administrator can copy them again. Protect the database file and its backups accordingly. The current capability endpoint returns authorized demo resources only and does not invoke MCP tools.

```sh
pnpm test
pnpm typecheck
pnpm build
```
