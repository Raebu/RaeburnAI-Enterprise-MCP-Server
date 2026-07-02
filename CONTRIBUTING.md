# Contributing

Thank you for helping improve RaeburnAI Enterprise MCP Server.

## Development setup

```bash
cp .env.example .env
npm install
npm run check
npm run build
```

## Pull request checklist

- Add or update tests for behaviour changes.
- Keep write actions behind the risk and policy system.
- Avoid logging secrets, message bodies, documents, or customer data unless explicitly required and redacted.
- Document any new environment variables in `.env.example` and `README.md`.
- Prefer small connector files with typed input schemas.

## Connector design rules

Every connector tool must define:

- `name`
- `description`
- `connector`
- `risk`
- `inputSchema`
- `run`

Use `risk: 'read'` for safe retrieval, `risk: 'write'` for user-visible changes, and `risk: 'admin'` for high-impact administrative operations.
