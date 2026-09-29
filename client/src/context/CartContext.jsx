import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { store } from "../lib/util.js";
import { flyToCart } from "../lib/motion.js";
import { useContent } from "./ContentContext.jsx";
import { useToast } from "./ToastContext.jsx";

/* Cart lines are { kind: "course" | "tool" | "plan", id }. Plan ids are "serviceKey|Plan name". */
const CART_KEY = "ds_cart_v1";
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { COURSES, TOOLS, SERVICES } = useContent();
  const toast = useToast();
  const [items, setItems] = useState(() => store.json(CART_KEY, []));

  const write = useCallback((next) => { setItems(next); store.set(CART_KEY, JSON.stringify(next)); }, []);
  const has = useCallback((kind, id) => items.some((i) => i.kind === kind && i.id === id), [items]);

  const add = useCallback((kind, id, fromEl) => {
    if (items.some((i) => i.kind === kind && i.id === id)) { toast("Already in your cart — view it anytime from the cart icon"); return false; }
    write(items.concat({ kind, id }));
    toast("Added to cart ✓");
    flyToCart(fromEl);
    return true;
  }, [items, write, toast]);

  const remove = useCallback((kind, id) => write(items.filter((i) => !(i.kind === kind && i.id === id))), [items, write]);
  const clear = useCallback(() => write([]), [write]);

  // Cart lines joined with current content (items that no longer exist are dropped)
  const resolved = useMemo(() => items.map((i) => {
    if (i.kind === "plan") {
      const [key, ...rest] = i.id.split("|");
      const s = SERVICES[key];
      const p = s && s.plans.find((x) => x.name === rest.join("|"));
      return p ? { kind: "plan", id: i.id, title: s.title + " — " + p.name, price: p.price, oldPrice: p.oldPrice || p.price, unit: p.unit, color: s.color, icon: s.icon, image: s.image } : null;
    }
    const src = i.kind === "course" ? COURSES : TOOLS;
    const item = src.find((x) => x.id === i.id);
    return item ? { ...item, kind: i.kind, image: item.images ? item.images[0] : item.image } : null;
  }).filter(Boolean), [items, COURSES, TOOLS, SERVICES]);

  const value = useMemo(() => ({ items, resolved, count: items.length, has, add, remove, clear }), [items, resolved, has, add, remove, clear]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
