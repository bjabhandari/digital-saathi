/* Cloudflare Pages Function: forwards every /api/* request from the static
   site (digitalsaathi.pages.dev) to the Digital Saathi Node server, so the
   admin panel, live chats, calls, voice messages and orders work on this
   domain too.

   Set it up once in Cloudflare → Workers & Pages → digitalsaathi →
   Settings → Variables and secrets:  API_ORIGIN = https://<your-server>
   (for example your Railway address). Then redeploy. */

export async function onRequest({ request, env }) {
  const origin = (env.API_ORIGIN || "").replace(/\/+$/, "");
  if (!origin) {
    // No server connected yet: the site and admin show their "no server" messages
    return new Response("The Digital Saathi server isn't connected to this site yet.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const url = new URL(request.url);
  const target = origin + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", "https");
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) headers.set("X-Forwarded-For", ip);
  const init = { method: request.method, headers, redirect: "manual" };
  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = request.body; // streamed (video and voice uploads)
    init.duplex = "half";
  }
  const res = await fetch(target, init);
  // Pass the response straight through (keeps live streams and cookies working)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: res.headers });
}
