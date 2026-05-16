import { z } from "zod";
import {
  callApi,
  errorResponse,
  textResponse,
  jsonResponse,
  parseJsonParam,
  validatePhoneE164,
  validateTemplateName,
  validateLanguageCode,
} from "../api.mjs";

export function registerMessagingTools(server) {
  server.tool(
    "wa_send_template",
    [
      "Send a pre-approved template message to a recipient on WhatsApp.",
      "",
      "When to use: outbound notifications, marketing or utility messages where the recipient is",
      "outside the 24-hour customer service window, or any first-contact message.",
      "",
      "Requirements:",
      "- The template must already exist and be in APPROVED status (use wa_get_templates to verify).",
      "- `phone_number_id` is the numeric ID of YOUR sending number (from wa_get_phone_numbers),",
      "  NOT the destination phone.",
      "- `to` must be E.164 (digits only, country code first), e.g. 351912345678.",
      "- `components_json` is required when the template has variables ({{1}}, header media, buttons).",
      "",
      "Returns: the WhatsApp message ID (wamid) on success, which can be used with wa_get_message_status.",
      "",
      "Limitations: templates with header media require uploaded media handles; delivery/read status",
      "is delivered asynchronously via webhooks — this tool returns only the accepted message ID.",
    ].join("\n"),
    {
      phone_number_id: z
        .string()
        .regex(/^\d+$/, "phone_number_id must be the numeric ID, not a phone number")
        .describe("Numeric ID of the sending WhatsApp phone number (from wa_get_phone_numbers)"),
      to: z
        .string()
        .describe("Recipient phone number in E.164 format (digits, country code first), e.g. 351912345678"),
      template_name: z
        .string()
        .describe("Approved template name (lowercase, digits, underscores only)"),
      language_code: z
        .string()
        .describe("Language/locale code of the template, e.g. en, pt_PT, es_ES"),
      components_json: z
        .string()
        .optional()
        .describe(
          'JSON array of components with parameter values, e.g. [{"type":"body","parameters":[{"type":"text","text":"Alice"}]}]'
        ),
    },
    { annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true } },
    async ({ phone_number_id, to, template_name, language_code, components_json }) => {
      let normalizedTo, normalizedName, normalizedLang, components;
      try {
        normalizedTo = validatePhoneE164(to, "to");
        normalizedName = validateTemplateName(template_name);
        normalizedLang = validateLanguageCode(language_code);
        components = components_json ? parseJsonParam(components_json, "components_json") : null;
        if (components && !Array.isArray(components)) {
          throw new Error("components_json must be a JSON array");
        }
      } catch (e) {
        return { isError: true, content: [{ type: "text", text: `Validation error: ${e.message}` }] };
      }

      const payload = {
        messaging_product: "whatsapp",
        to: normalizedTo,
        type: "template",
        template: {
          name: normalizedName,
          language: { code: normalizedLang },
        },
      };
      if (components) payload.template.components = components;

      const data = await callApi("POST", `/${phone_number_id}/messages`, payload);
      if (data.error) return errorResponse(data);

      const msgId = data.messages?.[0]?.id || "unknown";
      return textResponse(`Message accepted. wamid: ${msgId}`);
    }
  );

  server.tool(
    "wa_get_message_status",
    [
      "Look up information about a previously sent WhatsApp message by its ID.",
      "",
      "Use this after wa_send_template to confirm Graph API received the message. Note that",
      "WhatsApp delivery/read status (sent → delivered → read) is pushed asynchronously via",
      "webhooks; the Graph API does not expose a polling endpoint for those transitions. This",
      "tool retrieves the message resource directly and surfaces whatever Meta returns.",
      "",
      "Inputs: the wamid returned by wa_send_template.",
    ].join("\n"),
    {
      message_id: z
        .string()
        .min(1)
        .describe("The wamid returned when the message was sent (e.g. wamid.XXXX...)"),
      fields: z
        .string()
        .optional()
        .default("id,status,recipient_id,timestamp,errors")
        .describe("Comma-separated fields to request"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ message_id, fields }) => {
      const encoded = encodeURIComponent(message_id);
      const data = await callApi("GET", `/${encoded}?fields=${fields}`);
      if (data.error) {
        if (data.error.http_status === 404) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  "Message not found via Graph API lookup. Note: delivery status is normally delivered via webhooks, not by polling. Configure a webhook subscription on the WABA to receive status callbacks.",
              },
            ],
          };
        }
        return errorResponse(data);
      }
      return jsonResponse(data);
    }
  );
}
