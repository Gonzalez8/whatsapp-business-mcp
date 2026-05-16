import { z } from "zod";
import {
  callApi,
  errorResponse,
  textResponse,
  jsonResponse,
  parseJsonParam,
  validateTemplateName,
  validateLanguageCode,
} from "../api.mjs";

const TEMPLATE_STATUS = ["APPROVED", "PENDING", "REJECTED", "PAUSED", "DISABLED", "IN_APPEAL"];
const TEMPLATE_CATEGORIES = ["UTILITY", "MARKETING", "AUTHENTICATION"];

export function registerTemplateTools(server) {
  server.tool(
    "wa_get_templates",
    [
      "List message templates for a WhatsApp Business Account (WABA), with optional filters.",
      "",
      "When to use: discovery before sending (wa_send_template requires an APPROVED template),",
      "auditing template inventory, or verifying review status after wa_create_template.",
      "",
      "Filters are applied server-side (status, name) or client-side (language). Use pagination",
      "via `after` when `has_more` is true in the response.",
      "",
      "Returns: { count, templates[], has_more, next_cursor? } where each template includes name,",
      "language, status, category and component definitions.",
    ].join("\n"),
    {
      waba_id: z
        .string()
        .regex(/^\d+$/, "waba_id must be numeric")
        .describe("WhatsApp Business Account ID (numeric)"),
      language: z
        .string()
        .optional()
        .describe("Filter by language code (e.g. en, pt_PT, es). Applied client-side."),
      status: z
        .enum(TEMPLATE_STATUS)
        .optional()
        .describe("Filter by Meta review status"),
      name: z.string().optional().describe("Filter by exact template name"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(50)
        .describe("Max templates to return (1-1000, default 50)"),
      after: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response's next_cursor"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, language, status, name, limit, after }) => {
      const params = [`limit=${limit}`];
      if (name) params.push(`name=${encodeURIComponent(name)}`);
      if (status) params.push(`status=${encodeURIComponent(status)}`);
      if (after) params.push(`after=${encodeURIComponent(after)}`);

      const data = await callApi("GET", `/${waba_id}/message_templates?${params.join("&")}`);
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
      return jsonResponse({
        count: result.length,
        templates: result,
        has_more: !!paging.cursors?.after,
        ...(paging.cursors?.after && { next_cursor: paging.cursors.after }),
      });
    }
  );

  server.tool(
    "wa_create_template",
    [
      "Create a new message template in a WABA. Templates go through Meta review before they can be sent.",
      "",
      "When to use: setting up a new outbound notification, marketing or authentication message type.",
      "",
      "Inputs:",
      "- `name`: lowercase letters, digits, underscores only.",
      "- `language`: locale code matching Meta's list (en, pt_PT, es_ES, ...).",
      "- `category`: UTILITY | MARKETING | AUTHENTICATION. Affects pricing and review rules.",
      "- `components_json`: JSON array following Meta's component schema. Common types:",
      '    [{"type":"HEADER","format":"TEXT","text":"Hello"},',
      '     {"type":"BODY","text":"Hi {{1}}, your code is {{2}}.","example":{"body_text":[["Alice","123"]]}},',
      '     {"type":"FOOTER","text":"Reply STOP to opt out"}]',
      "",
      "Returns: the new template's ID. Status starts as PENDING; poll wa_get_templates for review result.",
    ].join("\n"),
    {
      waba_id: z.string().regex(/^\d+$/).describe("WhatsApp Business Account ID (numeric)"),
      name: z
        .string()
        .describe("Template name: lowercase letters, digits, underscores only"),
      language: z
        .string()
        .describe("Language/locale code, e.g. en, pt_PT, es_ES"),
      category: z.enum(TEMPLATE_CATEGORIES).describe("Template category"),
      components_json: z
        .string()
        .describe("JSON array of components (HEADER, BODY, FOOTER, BUTTONS) following Meta API schema"),
    },
    { annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, name, language, category, components_json }) => {
      let validName, validLang, components;
      try {
        validName = validateTemplateName(name);
        validLang = validateLanguageCode(language);
        components = parseJsonParam(components_json, "components_json");
        if (!Array.isArray(components) || components.length === 0) {
          throw new Error("components_json must be a non-empty JSON array");
        }
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: `Validation error: ${e.message}` }] };
      }

      const data = await callApi("POST", `/${waba_id}/message_templates`, {
        name: validName,
        language: validLang,
        category,
        components,
      });

      if (data.error) return errorResponse(data);
      return textResponse(
        `Template created. ID: ${data.id}, Name: ${validName}, Language: ${validLang}, Status: ${data.status || "PENDING"}`
      );
    }
  );

  server.tool(
    "wa_delete_template",
    [
      "Delete a message template from a WABA by name. WARNING: deletes ALL languages of that template.",
      "",
      "When to use: removing obsolete or rejected templates. Cannot be undone.",
      "",
      "Note: deletion is irreversible. Confirm with the user before invoking.",
    ].join("\n"),
    {
      waba_id: z.string().regex(/^\d+$/).describe("WhatsApp Business Account ID (numeric)"),
      name: z.string().describe("Exact template name to delete (all languages will be removed)"),
    },
    { annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true } },
    async ({ waba_id, name }) => {
      const data = await callApi("DELETE", `/${waba_id}/message_templates`, { name });
      if (data.error) return errorResponse(data);
      return textResponse(`Template "${name}" deleted successfully.`);
    }
  );
}
