# WhatsApp Business MCP Server

MCP server for the WhatsApp Business / Meta Graph API. List business accounts and phone numbers,
manage message templates, send template messages, and look up message status.

Supports two transports:

- **stdio** — default; for local Claude Desktop / Claude Code / Cursor.
- **HTTP (Streamable / SSE)** — for remote deployment (Railway, Fly.io, Render, your own
  container).

## Tools

| Tool | Read-only | Description |
|---|---|---|
| `wa_get_business_accounts` | yes | **Discovery — start here.** List WABAs owned by a Meta Business. |
| `wa_get_phone_numbers` | yes | List phone numbers on a WABA (returns `phone_number_id` for sending). |
| `wa_get_templates` | yes | List templates with filters (status, language, name) and pagination. |
| `wa_create_template` | no | Create a new message template (goes through Meta review). |
| `wa_delete_template` | destructive | Delete a template by name (all languages). |
| `wa_send_template` | no | Send an approved template message. Validates phone (E.164), template name, locale. |
| `wa_get_message_status` | yes | Look up a message by `wamid`. |
| `wa_api_call` | restricted | Escape hatch — only whitelisted WhatsApp Business paths. |

## Resources

The server also exposes the same inventory as MCP resources so the host can cache them:

- `whatsapp://business-accounts/{business_id}`
- `whatsapp://phone-numbers/{waba_id}`
- `whatsapp://templates/{waba_id}`

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `WHATSAPP_TOKEN` | yes | — | Meta Graph API access token (system user token recommended). |
| `WHATSAPP_API_VERSION` | no | `v23.0` | Graph API version. |
| `MCP_TRANSPORT` | no | `stdio` | `stdio` or `http`. |
| `PORT` | no | `3000` | HTTP transport port. |
| `HOST` | no | `0.0.0.0` | HTTP transport bind address. |
| `MCP_HTTP_PATH` | no | `/mcp` | HTTP transport endpoint path. |
| `MCP_BEARER_TOKEN` | no | — | If set, HTTP requests must send `Authorization: Bearer <token>`. |

## Install

```bash
npm install
npm test
```

## Run locally (stdio)

```bash
WHATSAPP_TOKEN=... npm start
```

## Run as an HTTP server

```bash
WHATSAPP_TOKEN=... MCP_BEARER_TOKEN=... npm run start:http
# → MCP listening on http://0.0.0.0:3000/mcp
# → Health check at GET /health
```

## Configure in Claude Code / Desktop (stdio)

Once published to npm:

```json
{
  "mcpServers": {
    "whatsapp-business": {
      "command": "npx",
      "args": ["-y", "whatsapp-business-mcp-server"],
      "env": { "WHATSAPP_TOKEN": "your-token-here" }
    }
  }
}
```

Or from a local checkout:

```json
{
  "mcpServers": {
    "whatsapp-business": {
      "command": "node",
      "args": ["/absolute/path/to/whatsapp-business-mcp/src/server.mjs"],
      "env": { "WHATSAPP_TOKEN": "your-token-here" }
    }
  }
}
```

## Configure as a remote HTTP MCP

```json
{
  "mcpServers": {
    "whatsapp-business": {
      "url": "https://your-host.example.com/mcp",
      "headers": { "Authorization": "Bearer your-bearer-token" }
    }
  }
}
```

## Docker

```bash
docker build -t whatsapp-business-mcp .
docker run --rm -p 3000:3000 \
  -e WHATSAPP_TOKEN=... \
  -e MCP_BEARER_TOKEN=... \
  whatsapp-business-mcp
```

## Deployment

### Railway

1. New project → Deploy from GitHub.
2. Railway detects the Dockerfile. Set service variables:
   - `WHATSAPP_TOKEN`
   - `MCP_BEARER_TOKEN` (shared secret for the HTTP endpoint)
3. `PORT` is provided automatically by Railway; the server respects it.
4. Public URL → `https://<service>.up.railway.app/mcp`.

### Fly.io

```bash
fly launch --no-deploy
fly secrets set WHATSAPP_TOKEN=... MCP_BEARER_TOKEN=...
fly deploy
```

Ensure the `[http_service]` block in `fly.toml` uses `internal_port = 3000`.

### Render

1. New → Web Service → connect repo. Render detects the Dockerfile.
2. Add environment variables `WHATSAPP_TOKEN` and `MCP_BEARER_TOKEN`.
3. Health check path: `/health`.

## Security notes

- **Always set `MCP_BEARER_TOKEN`** when exposing the HTTP transport publicly. Without it,
  anyone who reaches the endpoint can use your WhatsApp Business token.
- The token is read from the server's environment, never accepted from MCP clients.
- `wa_api_call` is restricted to a whitelist of WhatsApp Business paths; arbitrary Graph
  endpoints are rejected.
- Inputs are validated before requests reach Meta: phone numbers must be E.164, template
  names match `[a-z0-9_]+`, locales match `xx` or `xx_YY`.

## Error handling

The server classifies Graph API failures and returns structured hints to the LLM:

- `token_expired` / `token_invalid` (HTTP 401, code 190) — refresh credentials.
- `permission_denied` (HTTP 403, code 10/200) — scopes/asset access missing.
- `rate_limited` (HTTP 429, code 4) — back off and retry.
- `not_found` (HTTP 404).
- `upstream_error` (5xx).
- `network_error` — fetch failed before reaching Meta.
