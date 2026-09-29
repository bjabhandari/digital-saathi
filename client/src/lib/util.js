/* Shared helpers: formatting, API calls, storage and asset URLs */

// Set VITE_API_URL when the API runs on a different host than the site
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const npr = (n) => "Rs. " + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const pct = (price, oldPrice) => (oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0);

// Content stores paths like "assets/img/x.svg" or "uploads/x.png"; make them absolute
export function asset(src) {
  if (!src) return "";
  if (/^(https?:|data:|blob:|\/)/.test(src)) return src;
  return (src.startsWith("uploads/") ? API_BASE : "") + "/" + src;
}

export async function api(url, body) {
  const res = await fetch(API_BASE + url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const store = {
  get(k, session) { try { return (session ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
  set(k, v, session) { try { (session ? sessionStorage : localStorage).setItem(k, v); } catch (e) { /* storage unavailable */ } },
  json(k, fallback, session) { try { return JSON.parse(store.get(k, session)) ?? fallback; } catch (e) { return fallback; } }
};

/* Orders placed from this browser, so the track page can list them */
export const MyOrders = {
  read: () => store.json("ds_orders", []),
  add(id, phone) { store.set("ds_orders", JSON.stringify([{ id, phone }].concat(MyOrders.read().filter((o) => o.id !== id)).slice(0, 20))); }
};

export const waLink = (number, text) => "https://wa.me/" + number + "?text=" + encodeURIComponent(text);

/* Map old .html URLs (links in content, chat replies, bookmarks) to app routes */
export function legacyToRoute(pathname, search, hash) {
  const m = /\/?([a-z-]+)\.html$/.exec(pathname || "");
  if (!m) return null;
  const q = new URLSearchParams(search || "");
  const id = q.get("id");
  q.delete("id");
  const rest = (q.toString() ? "?" + q : "") + (hash || "");
  const page = m[1];
  const map = { index: "/", courses: "/courses", tools: "/tools", services: "/services", teachers: "/teachers", contact: "/contact", cart: "/cart", track: "/track" };
  if (map[page]) return map[page] + (page === "track" && id ? "?id=" + encodeURIComponent(id) : "") + rest;
  const detail = { course: "/course/", product: "/product/", service: "/service/", teacher: "/teacher/" }[page];
  if (detail) return id ? detail + encodeURIComponent(id) + rest : detail.replace(/\/$/, "s").replace("/products", "/tools");
  return null;
}
