const LEAD_HANDLER_URL = "https://dynastia-residence.ru/send-lead.php";

function normalizePath(url) {
  return new URL(url).pathname.replace(/\/+$/, "") || "/";
}

async function forwardLead(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" }
    });
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("x-forwarded-host", new URL(request.url).host);

  const response = await fetch(LEAD_HANDLER_URL, {
    method: "POST",
    headers,
    body: request.body,
    redirect: "manual"
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    if (normalizePath(request.url) === "/send-lead.php") {
      return forwardLead(request);
    }

    return env.ASSETS.fetch(request);
  }
};
