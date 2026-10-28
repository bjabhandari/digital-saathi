/* Images uploaded in the admin panel (/uploads/<file>), from D1 or the forwarded server */
import { handleUpload } from "../../cloudflare/api.js";
import { forward } from "../../cloudflare/forward.js";

export async function onRequest({ request, env }) {
  if (env.API_ORIGIN) return forward(request, env.API_ORIGIN);
  return handleUpload(request, env);
}
