import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callApi } from "./api.mjs";

// Exposes WhatsApp Business inventory as MCP resources so hosts can cache them
// independently from tool calls. URIs use the `whatsapp://` scheme.
//
//   whatsapp://business-accounts/{business_id}   → WABAs owned by a business
//   whatsapp://phone-numbers/{waba_id}           → phone numbers on a WABA
//   whatsapp://templates/{waba_id}               → message templates on a WABA
export function registerResources(server) {
  const jsonContents = (uri, data) => ({
    contents: [
      { uri, mimeType: "application/json", text: JSON.stringify(data, null, 2) },
    ],
  });

  server.registerResource(
    "business-accounts",
    new ResourceTemplate("whatsapp://business-accounts/{business_id}", { list: undefined }),
    {
      title: "WhatsApp Business Accounts",
      description: "WABAs owned by the given Meta Business ID (returns id, name, status)",
      mimeType: "application/json",
    },
    async (uri, { business_id }) => {
      const data = await callApi(
        "GET",
        `/${business_id}/owned_whatsapp_business_accounts?fields=id,name,status&limit=100`
      );
      if (data.error) return jsonContents(uri.href, { error: data.error });
      return jsonContents(uri.href, data.data || []);
    }
  );

  server.registerResource(
    "phone-numbers",
    new ResourceTemplate("whatsapp://phone-numbers/{waba_id}", { list: undefined }),
    {
      title: "WhatsApp Phone Numbers",
      description: "Phone numbers registered on the given WABA",
      mimeType: "application/json",
    },
    async (uri, { waba_id }) => {
      const data = await callApi(
        "GET",
        `/${waba_id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`
      );
      if (data.error) return jsonContents(uri.href, { error: data.error });
      return jsonContents(uri.href, data.data || []);
    }
  );

  server.registerResource(
    "templates",
    new ResourceTemplate("whatsapp://templates/{waba_id}", { list: undefined }),
    {
      title: "WhatsApp Message Templates",
      description: "Message templates on the given WABA (name, language, status, category)",
      mimeType: "application/json",
    },
    async (uri, { waba_id }) => {
      const data = await callApi("GET", `/${waba_id}/message_templates?limit=200`);
      if (data.error) return jsonContents(uri.href, { error: data.error });
      const templates = (data.data || []).map((t) => ({
        name: t.name,
        language: t.language,
        status: t.status,
        category: t.category,
      }));
      return jsonContents(uri.href, templates);
    }
  );
}
