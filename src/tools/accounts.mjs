import { z } from "zod";
import { callApi, errorResponse, jsonResponse } from "../api.mjs";

export function registerAccountTools(server) {
  server.tool(
    "wa_get_business_accounts",
    [
      "DISCOVERY — START HERE.",
      "",
      "List all WhatsApp Business Accounts (WABAs) owned by a Meta Business. This is the entry",
      "point for almost every other tool: most calls take a `waba_id` returned here.",
      "",
      "Typical flow:",
      "  1. wa_get_business_accounts (this tool) → pick a `waba_id`",
      "  2. wa_get_phone_numbers(waba_id) → pick a `phone_number_id` for sending",
      "  3. wa_get_templates(waba_id) → pick an APPROVED template",
      "  4. wa_send_template(phone_number_id, to, template_name, language_code, ...)",
      "",
      "Resources `whatsapp://business-accounts/{business_id}` provide the same data and can be",
      "cached by the host.",
    ].join("\n"),
    {
      business_id: z
        .string()
        .regex(/^\d+$/, "business_id must be numeric")
        .describe("Meta Business ID (numeric)"),
      fields: z
        .string()
        .default("id,name,status")
        .describe("Comma-separated fields to return (default: id,name,status)"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ business_id, fields }) => {
      const data = await callApi(
        "GET",
        `/${business_id}/owned_whatsapp_business_accounts?fields=${encodeURIComponent(fields)}&limit=100`
      );
      if (data.error) return errorResponse(data);
      return jsonResponse(data.data || []);
    }
  );

  server.tool(
    "wa_get_phone_numbers",
    [
      "List phone numbers registered to a WhatsApp Business Account (WABA).",
      "",
      "Use this to discover the `phone_number_id` required by wa_send_template. `display_phone_number`",
      "is the human-readable number (e.g. +351 91 234 5678); `id` is the numeric resource ID you pass",
      "as `phone_number_id` to send.",
      "",
      "Also returns quality_rating (GREEN/YELLOW/RED) and messaging status, useful for diagnosing",
      "delivery problems.",
    ].join("\n"),
    {
      waba_id: z
        .string()
        .regex(/^\d+$/, "waba_id must be numeric")
        .describe("WhatsApp Business Account ID (numeric)"),
      fields: z
        .string()
        .default("id,display_phone_number,verified_name,quality_rating,status")
        .describe("Fields to return"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, fields }) => {
      const data = await callApi("GET", `/${waba_id}/phone_numbers?fields=${encodeURIComponent(fields)}`);
      if (data.error) return errorResponse(data);
      return jsonResponse(data.data || []);
    }
  );
}
