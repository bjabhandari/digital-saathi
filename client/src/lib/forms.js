/* Form helpers: inline validation and inquiry forms (contact, teacher application) */
import { createElement as h, useState } from "react";
import { api } from "./util.js";

/* Marks invalid .field wrappers and focuses the first bad input. Returns true if valid. */
export function validate(form) {
  let firstBad = null;
  Array.from(form.querySelectorAll("input, select, textarea")).forEach((el) => {
    const field = el.closest(".field");
    if (!field || el.type === "radio") return;
    const ok = el.checkValidity() && !(el.type === "tel" && el.value && !/^[+\d][\d\s-]{6,}$/.test(el.value));
    field.classList.toggle("invalid", !ok);
    if (!field.querySelector(".err")) {
      const err = document.createElement("span");
      err.className = "err";
      err.textContent = el.type === "email" ? "Please enter a valid email." : el.type === "tel" ? "Please enter a valid phone number." : "This field is required.";
      field.appendChild(err);
    }
    if (!ok && !firstBad) firstBad = el;
  });
  if (firstBad) firstBad.focus();
  return !firstBad;
}

/* onInput handler that clears the error state once a field becomes valid */
export function clearInvalid(e) {
  const f = e.target.closest(".field");
  if (f && f.classList.contains("invalid") && e.target.checkValidity()) f.classList.remove("invalid");
}

/* Saves an inquiry to the server (best effort) and opens WhatsApp with the message.
   Returns false if the form is invalid. */
export function submitInquiry(form, type, waLinkFor) {
  if (!validate(form)) return false;
  const data = new FormData(form);
  const fields = {};
  data.forEach((v, k) => { fields[k] = String(v); });
  api("/api/messages", { type, fields }).catch(() => { /* WhatsApp still carries the message */ });
  const lines = [type, ""];
  data.forEach((v, k) => { if (String(v).trim()) lines.push(k.charAt(0).toUpperCase() + k.slice(1) + ": " + v); });
  window.open(waLinkFor(lines.join("\n")), "_blank", "noopener");
  return true;
}

/* Inquiry form state: onSubmit validates, saves and opens WhatsApp, then flips to the
   success view. `height` keeps the card from jumping when its content is swapped. */
export function useInquiry(type, waLinkFor) {
  const [state, setState] = useState({ sent: false, height: 0 });
  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (submitInquiry(form, type, waLinkFor)) setState({ sent: true, height: form.offsetHeight });
  };
  const reset = () => setState({ sent: false, height: 0 });
  return { ...state, onSubmit, reset };
}

/* Success view shown in place of a submitted inquiry form */
export function FormSuccess({ height, onReset }) {
  return h("div", { className: "form-success", style: { display: "grid", placeItems: "center", minHeight: Math.max(0, height - 64) } },
    h("div", null,
      h("svg", { className: "tick", viewBox: "0 0 72 72" }, h("circle", { cx: 36, cy: 36, r: 30 }), h("path", { d: "M24 37l8 8 16-17" })),
      h("h3", null, "Thank you! 🙏"),
      h("p", { className: "muted" }, "WhatsApp has opened with your details. Just press send and our team will reply within 24 hours."),
      h("button", { type: "button", className: "btn btn--ghost", onClick: onReset }, "Send another")));
}
