#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerAccountTools } from "./tools/accounts.mjs";
import { registerTemplateTools } from "./tools/templates.mjs";
import { registerMessagingTools } from "./tools/messaging.mjs";
import { registerGenericTools } from "./tools/generic.mjs";

const server = new McpServer({
  name: "whatsapp-business",
  version: "1.0.0",
});

registerAccountTools(server);
registerTemplateTools(server);
registerMessagingTools(server);
registerGenericTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
