import { createContext, useContext, useEffect, useState } from "react";
import seed from "../../../seed/content.json";
import { API_BASE, api } from "../lib/util.js";

/* Site content comes from the server (edited in the admin panel).
   If the API can't be reached (e.g. static hosting), the bundled seed is used. */
const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const [state, setState] = useState({ content: null, live: false });

  useEffect(() => {
    let done = false;
    const fallback = setTimeout(() => { if (!done) { done = true; setState({ content: seed, live: false }); } }, 4000);
    api("/api/content")
      .then((content) => {
        // Static hosting (e.g. Cloudflare Pages) answers /api/* with the HTML page, not content
        if (!content || !content.SITE) throw new Error("No API");
        if (!done) { done = true; setState({ content: { ...seed, ...content }, live: true }); }
      })
      .catch(() => { if (!done) { done = true; setState({ content: seed, live: false }); } })
      .finally(() => clearTimeout(fallback));
    return () => clearTimeout(fallback);
  }, []);

  // Live updates: refetch when the admin saves content; reload after a new build
  useEffect(() => {
    if (typeof EventSource === "undefined" || !state.live) return undefined;
    const es = new EventSource(API_BASE + "/api/live");
    let build = null, connected = false;
    const refetch = () => api("/api/content").then((content) => setState({ content: { ...seed, ...content }, live: true })).catch(() => {});
    const checkBuild = (e) => {
      const b = JSON.parse(e.data).build;
      if (build && b !== build && b !== "dev") window.location.reload();
      build = b;
    };
    es.addEventListener("hello", (e) => {
      checkBuild(e);
      if (connected) refetch(); // reconnected after a server restart: catch up on missed changes
      connected = true;
    });
    es.addEventListener("build", checkBuild);
    es.addEventListener("content", refetch);
    // Class recordings changed in the admin: course pages listen for this
    es.addEventListener("recordings", (e) => window.dispatchEvent(new CustomEvent("ds:recordings", { detail: JSON.parse(e.data) })));
    return () => es.close();
  }, [state.live]);

  if (!state.content) return <div className="app-loading" aria-busy="true"><img src="/assets/img/wordmark.png" alt="Digital Saathi" width="120" /></div>;
  return <ContentContext.Provider value={{ ...state.content, live: state.live }}>{children}</ContentContext.Provider>;
}

/* useContent() → { SITE, OFFER, SERVICES, COURSES, TOOLS, TEACHERS, SOFTWARE, BOOST, TESTIMONIALS, FAQS, CHATBOT, live } */
export const useContent = () => useContext(ContentContext);

export function useTeacher(id) {
  const { TEACHERS } = useContent();
  return TEACHERS.find((t) => t.id === id) || { id, name: "Digital Saathi", initials: "DS", color: "g1", role: "", bio: "" };
}
