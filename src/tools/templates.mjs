import { z } from "zod";
import { callApi, errorResponse, textResponse, jsonResponse, parseJsonParam } from "../api.mjs";

export function registerTemplateTools(server) {
  server.tool(
    "wa_get_templates",
    "Get message templates from a WABA. Optionally filter by language, status, or name.",
    {
      waba_id: z.string().describe("WhatsApp Business Account ID"),
      language: z
        .string()
        .optional()
        .describe("Filter by language code, e.g. es, pt_PT, en"),
      status: z
        .enum(["APPROVED", "PENDING", "REJECTED"])
        .optional()
        .describe("Filter by status"),
      name: z.string().optional().describe("Filter by exact template name"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(50)
        .describe("Max templates to return (default 50)"),
      after: z
        .string()
        .optional()
        .describe("Cursor for next page (from previous response's next_cursor)"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, language, status, name, limit, after }) => {
      const params = [`limit=${limit}`];
      if (name) params.push(`name=${encodeURIComponent(name)}`);
      if (status) params.push(`status=${encodeURIComponent(status)}`);
      if (after) params.push(`after=${encodeURIComponent(after)}`);

      const data = await callApi(
        "GET",
        `/${waba_id}/message_templates?${params.join("&")}`
      );
      if (data.error) return errorResponse(data);

      let templates = data.data || [];
      if (language) templates = templates.filter((t) => t.language === language);

      if (templates.length === 0) {
        return textResponse("No templates found with given filters.");
      }

      const result = templates
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => ({
          name: t.name,
          language: t.language,
          status: t.status,
          category: t.category,
          components: t.components,
        }));

      const paging = data.paging || {};
      const response = {
        count: result.length,
        templates: result,
        has_more: !!paging.cursors?.after,
        ...(paging.cursors?.after && { next_cursor: paging.cursors.after }),
      };

      return jsonResponse(response);
    }
  );

  server.tool(
    "wa_create_template",
    "Create a new message template in a WABA",
    {
      waba_id: z.string().describe("WhatsApp Business Account ID"),
      name: z
        .string()
        .describe("Template name (lowercase, underscores, no spaces)"),
      language: z.string().describe("Language code, e.g. pt_PT, es, en"),
      category: z
        .enum(["UTILITY", "MARKETING", "AUTHENTICATION"])
        .describe("Template category"),
      components_json: z
        .string()
        .describe(
          "JSON string of components array (HEADER, BODY, FOOTER, BUTTONS) following Meta API format"
        ),
    },
    { annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, name, language, category, components_json }) => {
      const components = parseJsonParam(components_json, "components_json");
      const payload = { name, language, category, components };
      const data = await callApi(
        "POST",
        `/${waba_id}/message_templates`,
        payload
      );

      if (data.error) return errorResponse(data);

      return textResponse(
        `Template created. ID: ${data.id}, Name: ${name}, Language: ${language}`
      );
    }
  );

  server.tool(
    "wa_delete_template",
    "Delete a message template from a WABA by name (deletes all languages)",
    {
      waba_id: z.string().describe("WhatsApp Business Account ID"),
      name: z.string().describe("Template name to delete"),
    },
    { annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } },
    async ({ waba_id, name }) => {
      const data = await callApi("DELETE", `/${waba_id}/message_templates`, {
        name,
      });

      if (data.error) return errorResponse(data);
      return textResponse(`Template "${name}" deleted successfully.`);
    }
  );
}
