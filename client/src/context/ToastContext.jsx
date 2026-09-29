import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState({ text: "", show: false });
  const timer = useRef();
  const toast = useCallback((text) => {
    setMsg({ text, show: false });
    requestAnimationFrame(() => setMsg({ text, show: true }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg((m) => ({ ...m, show: false })), 2600);
  }, []);
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={"toast" + (msg.show ? " show" : "")} role="status">{msg.text}</div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
