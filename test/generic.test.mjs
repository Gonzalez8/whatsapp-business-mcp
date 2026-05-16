import test from "node:test";
import assert from "node:assert/strict";

process.env.WHATSAPP_TOKEN = "test-token";

const { _internal } = await import("../src/tools/generic.mjs");
const { isAllowed } = _internal;

test("allowlist accepts WhatsApp endpoints", () => {
  assert.ok(isAllowed("/123456789/message_templates"));
  assert.ok(isAllowed("/123456789/phone_numbers"));
  assert.ok(isAllowed("/123456789/messages"));
  assert.ok(isAllowed("/123456789/whatsapp_business_profile"));
  assert.ok(isAllowed("/123456789/subscribed_apps"));
  assert.ok(isAllowed("/123456789/owned_whatsapp_business_accounts"));
  assert.ok(isAllowed("/123456789/media"));
  assert.ok(isAllowed("/123456789"));
  assert.ok(isAllowed("/wamid.HBgLMzUx_abc-DEF"));
});

test("allowlist rejects unrelated Graph endpoints", () => {
  assert.equal(isAllowed("/me"), false);
  assert.equal(isAllowed("/me/accounts"), false);
  assert.equal(isAllowed("/123/feed"), false);
  assert.equal(isAllowed("/123/ads"), false);
  assert.equal(isAllowed("/123/insights"), false);
  assert.equal(isAllowed("/oauth/access_token"), false);
  assert.equal(isAllowed("/debug_token"), false);
});
