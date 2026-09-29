import { createContext, useContext, useEffect, useState } from "react";
import seed from "../../../seed/content.json";
import { api } from "../lib/util.js";

/* Site content comes from the server (edited in the admin panel).
   If the API can't be reached (e.g. static hosting), the bundled seed is used. */
const ContentContext = createContext(null);

export function ContentProvider({ children }) {
  const [state, setState] = useState({ content: null, live: false });

  useEffect(() => {
    let done = false;
    const fallback = setTimeout(() => { if (!done) { done = true; setState({ content: seed, live: false }); } }, 4000);
    api("/api/content")
      .then((content) => { if (!done) { done = true; setState({ content: { ...seed, ...content }, live: true }); } })
      .catch(() => { if (!done) { done = true; setState({ content: seed, live: false }); } })
      .finally(() => clearTimeout(fallback));
    return () => clearTimeout(fallback);
  }, []);

  if (!state.content) return <div className="app-loading" aria-busy="true"><img src="/assets/img/wordmark.png" alt="Digital Saathi" width="120" /></div>;
  return <ContentContext.Provider value={{ ...state.content, live: state.live }}>{children}</ContentContext.Provider>;
}

/* useContent() → { SITE, OFFER, SERVICES, COURSES, TOOLS, TEACHERS, SOFTWARE, BOOST, TESTIMONIALS, FAQS, CHATBOT, live } */
export const useContent = () => useContext(ContentContext);

export function useTeacher(id) {
  const { TEACHERS } = useContent();
  return TEACHERS.find((t) => t.id === id) || { id, name: "Digital Saathi", initials: "DS", color: "g1", role: "", bio: "" };
}
