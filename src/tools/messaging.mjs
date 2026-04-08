import { z } from "zod";
import { callApi, errorResponse, textResponse, parseJsonParam } from "../api.mjs";

export function registerMessagingTools(server) {
  server.tool(
    "wa_send_template",
    "Send a template message to a phone number via WhatsApp",
    {
      phone_number_id: z
        .string()
        .describe("Phone number ID (not the phone number itself)"),
      to: z
        .string()
        .describe(
          "Recipient phone number with country code, e.g. 351912345678"
        ),
      template_name: z.string().describe("Template name"),
      language_code: z.string().describe("Language code, e.g. pt_PT"),
      components_json: z
        .string()
        .optional()
        .describe(
          "JSON string of template components with parameter values (header, body params)"
        ),
    },
    { annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
    async ({ phone_number_id, to, template_name, language_code, components_json }) => {
      const components = components_json ? parseJsonParam(components_json, "components_json") : null;
      const payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template_name,
          language: { code: language_code },
        },
      };
      if (components) payload.template.components = components;

      const data = await callApi(
        "POST",
        `/${phone_number_id}/messages`,
        payload
      );

      if (data.error) return errorResponse(data);

      const msgId = data.messages?.[0]?.id || "unknown";
      return textResponse(`Message sent. ID: ${msgId}`);
    }
  );
}
