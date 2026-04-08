const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

export function getToken() {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) throw new Error("WHATSAPP_TOKEN env var not set");
  return token;
}

export async function callApi(method, path, body = null) {
  const url = `${BASE_URL}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  // Meta API sometimes returns control chars in JSON
  const cleaned = text.replace(/[\x00-\x1f\x7f]/g, (ch) =>
    ch === "\n" || ch === "\r" || ch === "\t" ? ch : ""
  );
  return JSON.parse(cleaned);
}

export function errorResponse(data) {
  const msg = data.error?.error_user_msg || data.error?.message || "Unknown error";
  return { isError: true, content: [{ type: "text", text: `Error: ${msg}` }] };
}

export function parseJsonParam(str, paramName) {
  try {
    return JSON.parse(str);
  } catch {
    throw new Error(`Invalid JSON in ${paramName}: ${str}`);
  }
}

export function textResponse(text) {
  return { content: [{ type: "text", text }] };
}

export function jsonResponse(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}
