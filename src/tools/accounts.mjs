import { z } from "zod";
import { callApi, errorResponse, jsonResponse } from "../api.mjs";

export function registerAccountTools(server) {
  server.tool(
    "wa_get_business_accounts",
    "Get WhatsApp Business Accounts owned by a Meta Business. Returns WABA IDs and names.",
    {
      business_id: z.string().describe("Meta Business ID"),
      fields: z
        .string()
        .default("id,name,status")
        .describe("Comma-separated fields to return"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ business_id, fields }) => {
      const data = await callApi(
        "GET",
        `/${business_id}/owned_whatsapp_business_accounts?fields=${fields}&limit=100`
      );
      if (data.error) return errorResponse(data);
      return jsonResponse(data.data || []);
    }
  );

  server.tool(
    "wa_get_phone_numbers",
    "Get phone numbers registered to a WABA",
    {
      waba_id: z.string().describe("WhatsApp Business Account ID"),
      fields: z
        .string()
        .default("id,display_phone_number,verified_name,quality_rating,status")
        .describe("Fields to return"),
    },
    { annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true } },
    async ({ waba_id, fields }) => {
      const data = await callApi(
        "GET",
        `/${waba_id}/phone_numbers?fields=${fields}`
      );
      if (data.error) return errorResponse(data);
      return jsonResponse(data.data || []);
    }
  );
}
