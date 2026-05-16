import test from "node:test";
import assert from "node:assert/strict";

process.env.WHATSAPP_TOKEN = "test-token";

const {
  callApi,
  validatePhoneE164,
  validateTemplateName,
  validateLanguageCode,
  errorResponse,
} = await import("../src/api.mjs");

function mockFetch(impl) {
  const orig = globalThis.fetch;
  globalThis.fetch = impl;
  return () => {
    globalThis.fetch = orig;
  };
}

function fakeResponse({ status = 200, body = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

test("validatePhoneE164 accepts canonical E.164", () => {
  assert.equal(validatePhoneE164("351912345678"), "351912345678");
  assert.equal(validatePhoneE164("+15551234567"), "15551234567");
});

test("validatePhoneE164 rejects bad inputs", () => {
  assert.throws(() => validatePhoneE164("0123456789"));
  assert.throws(() => validatePhoneE164("+1-555-123-4567"));
  assert.throws(() => validatePhoneE164(""));
  assert.throws(() => validatePhoneE164("123"));
});

test("validateTemplateName enforces snake_case", () => {
  assert.equal(validateTemplateName("order_confirmation_v2"), "order_confirmation_v2");
  assert.throws(() => validateTemplateName("Order Confirmation"));
  assert.throws(() => validateTemplateName("ORDER"));
});

test("validateLanguageCode accepts ISO/locale forms", () => {
  assert.equal(validateLanguageCode("en"), "en");
  assert.equal(validateLanguageCode("pt_PT"), "pt_PT");
  assert.throws(() => validateLanguageCode("en-US"));
  assert.throws(() => validateLanguageCode("english"));
});

test("callApi classifies 401 as auth error", async () => {
  const restore = mockFetch(async () =>
    fakeResponse({ status: 401, body: { error: { message: "Invalid OAuth token", code: 190, error_subcode: 467 } } })
  );
  const data = await callApi("GET", "/123/phone_numbers");
  restore();
  assert.ok(data.error);
  assert.equal(data.error.kind, "token_invalid");
  assert.equal(data.error.http_status, 401);
});

test("callApi classifies 429 as rate_limited", async () => {
  const restore = mockFetch(async () =>
    fakeResponse({ status: 429, body: { error: { message: "Too many calls", code: 4 } } })
  );
  const data = await callApi("GET", "/123/message_templates");
  restore();
  assert.equal(data.error.kind, "rate_limited");
});

test("callApi classifies 403 as permission_denied", async () => {
  const restore = mockFetch(async () =>
    fakeResponse({ status: 403, body: { error: { message: "Permissions error", code: 10 } } })
  );
  const data = await callApi("GET", "/123/message_templates");
  restore();
  assert.equal(data.error.kind, "permission_denied");
});

test("callApi returns successful data unchanged", async () => {
  const restore = mockFetch(async () =>
    fakeResponse({ status: 200, body: { data: [{ id: "1" }] } })
  );
  const data = await callApi("GET", "/123/phone_numbers");
  restore();
  assert.deepEqual(data, { data: [{ id: "1" }] });
});

test("callApi survives network errors", async () => {
  const restore = mockFetch(async () => {
    throw new Error("ECONNREFUSED");
  });
  const data = await callApi("GET", "/123/phone_numbers");
  restore();
  assert.equal(data.error.kind, "network_error");
});

test("errorResponse includes hint and kind", () => {
  const r = errorResponse({
    error: { message: "Bad token", kind: "token_invalid", hint: "Refresh it", http_status: 401 },
  });
  assert.ok(r.isError);
  assert.match(r.content[0].text, /token_invalid/);
  assert.match(r.content[0].text, /Refresh it/);
});
