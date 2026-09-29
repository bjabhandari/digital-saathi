import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext.jsx";
import { FaqList, useTitle, useWhatsApp } from "../components/ui.jsx";
import { FormSuccess, clearInvalid, useInquiry } from "../lib/forms.js";
import Shapes3D from "../components/Shapes3D.jsx";

const svgProps = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

export default function Contact() {
  useTitle("Contact Us | Digital Saathi");
  const { SITE } = useContent();
  const wa = useWhatsApp();
  const inquiry = useInquiry("New inquiry — Digital Saathi website", wa);

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Contact</div>
          <h1 className="h-section">Let's <span className="hl">talk</span></h1>
          <p>Have a question about a course, or need a quote for design, video or ads? We usually reply within a few hours.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container contact-grid">
          <div className="reveal-left">
            <div className="contact-item">
              <span className="icon g7"><svg {...svgProps}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></svg></span>
              <div><h4>Phone / WhatsApp</h4><p>{SITE.phone}</p></div>
            </div>
            <div className="contact-item">
              <span className="icon g2"><svg {...svgProps}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg></span>
              <div><h4>Email</h4><p>{SITE.email}</p></div>
            </div>
            <div className="contact-item">
              <span className="icon g4"><svg {...svgProps}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg></span>
              <div><h4>Office</h4><p>{SITE.address}</p></div>
            </div>
            <div className="contact-item">
              <span className="icon g1"><svg {...svgProps}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg></span>
              <div><h4>Office hours</h4><p>{SITE.hours}</p></div>
            </div>
            <a href={wa("Namaste Digital Saathi!")} target="_blank" rel="noopener noreferrer" className="btn btn--whatsapp btn--block">Chat on WhatsApp</a>
          </div>

          <form className="form-card reveal-right" noValidate onSubmit={inquiry.onSubmit} onInput={clearInvalid} style={inquiry.sent ? { minHeight: inquiry.height } : undefined}>
            {inquiry.sent ? <FormSuccess height={inquiry.height} onReset={inquiry.reset} /> : (
              <>
                <h3 style={{ marginBottom: 20 }}>Send us a message</h3>
                <div className="form-row">
                  <div className="field"><label htmlFor="c-name">Full name</label><input id="c-name" name="name" required /></div>
                  <div className="field"><label htmlFor="c-phone">Phone</label><input id="c-phone" name="phone" type="tel" required /></div>
                </div>
                <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" /></div>
                <div className="field">
                  <label htmlFor="c-topic">I'm interested in</label>
                  <select id="c-topic" name="interest" required defaultValue="">
                    <option value="">Select an option</option>
                    <option>Courses</option>
                    <option>Editing Tools</option>
                    <option>Graphic Design Service</option>
                    <option>Video Editing Service</option>
                    <option>Facebook Boost</option>
                    <option>Becoming a Teacher</option>
                    <option>Something else</option>
                  </select>
                </div>
                <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" name="message" required placeholder="Tell us about your project or question…" /></div>
                <button className="btn btn--primary btn--block">Send Message</button>
                <p className="form-note">Submitting opens WhatsApp with your message filled in so we can reply faster.</p>
              </>
            )}
          </form>
        </div>
      </section>

      <section className="section section--soft">
        <div className="container">
          <div className="section-head reveal"><span className="eyebrow">FAQ</span><h2 className="h-section">Common <span className="hl">questions</span></h2></div>
          <FaqList className="reveal" />
        </div>
      </section>
    </>
  );
}
