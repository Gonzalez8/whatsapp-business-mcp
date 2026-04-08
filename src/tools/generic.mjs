import { z } from "zod";
import { callApi, errorResponse, jsonResponse, parseJsonParam } from "../api.mjs";

export function registerGenericTools(server) {
  server.tool(
    "wa_api_call",
    "Make a generic call to the WhatsApp Business / Meta Graph API. Use for endpoints not covered by other tools.",
    {
      method: z.enum(["GET", "POST", "DELETE"]).describe("HTTP method"),
      path: z
        .string()
        .describe(
          "API path, e.g. /{waba_id}/message_templates or /{business_id}/owned_whatsapp_business_accounts"
        ),
      query_params: z
        .string()
        .optional()
        .describe("Query string params, e.g. fields=id,name&limit=100"),
      body_json: z
        .string()
        .optional()
        .describe("JSON string of request body for POST/DELETE"),
    },
    { annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } },
    async ({ method, path, query_params, body_json }) => {
      const body = body_json ? parseJsonParam(body_json, "body_json") : null;
      const fullPath = query_params ? `${path}?${query_params}` : path;
      const data = await callApi(method, fullPath, body);

      if (data.error) return errorResponse(data);
      return jsonResponse(data);
    }
  );
}
