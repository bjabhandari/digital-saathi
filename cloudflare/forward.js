/* Forward a request to the Digital Saathi Node server (API_ORIGIN), streaming
   bodies both ways so uploads, live updates and cookies keep working. */
export async function forward(request, apiOrigin) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) headers.set("X-Forwarded-For", ip);
  const init = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) { init.body = request.body; init.duplex = "half"; }
  const res = await fetch(apiOrigin.replace(/\/+$/, "") + url.pathname + url.search, init);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
