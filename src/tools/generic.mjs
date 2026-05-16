import { z } from "zod";
import { callApi, errorResponse, jsonResponse, parseJsonParam } from "../api.mjs";

// Allowlist of Graph API path patterns. Designed to cover legitimate WhatsApp Business
// administration use cases without exposing the entire Meta Graph API. Each pattern is a
// RegExp anchored at the start of the path.
const ALLOWED_PATTERNS = [
  // WABA-scoped resources
  /^\/\d+\/message_templates(\/|$|\?)/,
  /^\/\d+\/phone_numbers(\/|$|\?)/,
  /^\/\d+\/subscribed_apps(\/|$|\?)/,
  /^\/\d+\/owned_whatsapp_business_accounts(\/|$|\?)/,
  /^\/\d+\/conversation_analytics(\/|$|\?)/,
  /^\/\d+\/template_analytics(\/|$|\?)/,
  // Phone-number-scoped resources
  /^\/\d+\/messages(\/|$|\?)/,
  /^\/\d+\/whatsapp_business_profile(\/|$|\?)/,
  /^\/\d+\/media(\/|$|\?)/,
  // Direct resource reads (single ID)
  /^\/\d+(\?|$)/,
  /^\/wamid\.[A-Za-z0-9_-]+(\?|$)/,
];

const DENIED_HINT =
  "Path not on the allowlist. wa_api_call is restricted to WhatsApp Business endpoints. Use a dedicated tool (wa_get_templates, wa_send_template, etc.) when one exists, or open an issue to extend the allowlist.";

function isAllowed(path) {
  return ALLOWED_PATTERNS.some((re) => re.test(path));
}

export function registerGenericTools(server) {
  server.tool(
    "wa_api_call",
    [
      "Escape hatch for WhatsApp Business / Meta Graph endpoints that don't have a dedicated tool yet.",
      "",
      "Restricted: only paths matching a curated allowlist of WhatsApp Business resources are accepted",
      "(message_templates, phone_numbers, messages, media, business_profile, analytics, subscribed_apps,",
      "owned_whatsapp_business_accounts, single-ID reads, wamid lookups). Anything else is rejected.",
      "",
      "Prefer the typed tools when one matches — they validate inputs and surface clearer errors.",
      "",
      "Inputs:",
      "- `path`: starts with `/`, e.g. `/{waba_id}/subscribed_apps`",
      "- `query_params`: raw query string without leading `?` (will be appended)",
      "- `body_json`: JSON string of the request body, used with POST/DELETE",
    ].join("\n"),
    {
      method: z.enum(["GET", "POST", "DELETE"]).describe("HTTP method"),
      path: z
        .string()
        .startsWith("/", "path must start with /")
        .describe("Graph API path starting with /, e.g. /{waba_id}/subscribed_apps"),
      query_params: z
        .string()
        .optional()
        .describe("Query string params (without leading ?), e.g. fields=id,name&limit=100"),
      body_json: z
        .string()
        .optional()
        .describe("JSON string of request body for POST/DELETE"),
    },
    { annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } },
    async ({ method, path, query_params, body_json }) => {
      if (!isAllowed(path)) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error [path_not_allowed]: ${path}\n${DENIED_HINT}` }],
        };
      }

      let body = null;
      try {
        body = body_json ? parseJsonParam(body_json, "body_json") : null;
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: `Validation error: ${e.message}` }] };
      }

      const fullPath = query_params ? `${path}?${query_params}` : path;
      const data = await callApi(method, fullPath, body);
      if (data.error) return errorResponse(data);
      return jsonResponse(data);
    }
  );
}

// Exported for tests
export const _internal = { ALLOWED_PATTERNS, isAllowed };
