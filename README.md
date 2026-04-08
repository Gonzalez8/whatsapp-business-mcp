# WhatsApp Business MCP Server

MCP Server for the WhatsApp Business / Meta Graph API. Manage templates, phone numbers, and send messages.

## Tools

| Tool | Description |
|---|---|
| `wa_get_business_accounts` | Get WABAs owned by a Meta Business |
| `wa_get_phone_numbers` | Get phone numbers for a WABA |
| `wa_get_templates` | Get templates (filter by language, status, name) |
| `wa_create_template` | Create a template |
| `wa_delete_template` | Delete a template |
| `wa_send_template` | Send a template message |
| `wa_api_call` | Generic Graph API call |

## Setup

```bash
npm install
```

## Configure in Claude Code

Add to `~/.claude/settings.json` or project `.mcp.json`:

```json
{
  "mcpServers": {
    "whatsapp-business": {
      "command": "node",
      "args": ["/absolute/path/to/whatsapp-business-mcp/src/server.mjs"],
      "env": {
        "WHATSAPP_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WHATSAPP_TOKEN` | Yes | Meta Graph API access token |
| `WHATSAPP_API_VERSION` | No | API version (default: `v23.0`) |
