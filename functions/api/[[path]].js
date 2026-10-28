/* Cloudflare Pages Function for every /api/* request on digitalsaathi.pages.dev.
   - With a D1 database bound as DB: runs the Digital Saathi API right here
     (cloudflare/api.js) — admin, orders, chats, calls, voice messages, alerts.
   - Or, with API_ORIGIN set (e.g. a Railway server): forwards to that server.
   Setup: Cloudflare → Workers & Pages → digitalsaathi → Settings →
   Bindings → add D1 database "DB", and Variables → ADMIN_PASSWORD. */
import { handleApi } from "../../cloudflare/api.js";
import { forward } from "../../cloudflare/forward.js";

export async function onRequest({ request, env, waitUntil }) {
  if (env.API_ORIGIN) return forward(request, env.API_ORIGIN);
  return handleApi(request, env, { waitUntil });
}
