import { Link } from "react-router-dom";
import { useContent } from "../context/ContentContext.jsx";
import { useTitle, useWhatsApp } from "../components/ui.jsx";
import { TeacherCard } from "../components/cards.jsx";
import { FormSuccess, clearInvalid, useInquiry } from "../lib/forms.js";
import Shapes3D from "../components/Shapes3D.jsx";

export default function Teachers() {
  useTitle("Our Teachers | Digital Saathi");
  const { TEACHERS } = useContent();
  const wa = useWhatsApp();
  const inquiry = useInquiry("Teacher application — Digital Saathi", wa);

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Teachers</div>
          <h1 className="h-section">Meet our <span className="hl">teachers</span></h1>
          <p>Working professionals who design, edit and run campaigns every day, and teach you exactly how they do it.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <div className="grid grid-3">{TEACHERS.map((t) => <TeacherCard key={t.id} teacher={t} />)}</div>
        </div>
      </section>

      <section className="section section--soft" id="apply">
        <div className="container split" style={{ alignItems: "start" }}>
          <div className="reveal-left">
            <span className="eyebrow">Teach with us</span>
            <h2 className="h-section">Turn your skills into <span className="hl">income</span></h2>
            <p className="muted" style={{ fontSize: "1.05rem" }}>Are you great at design, video, marketing or tech? Join Digital Saathi as a teacher and reach thousands of motivated learners across Nepal.</p>
            <ul className="check-list">
              <li>Earn a share of every course sale</li>
              <li>We help with recording, editing and publishing</li>
              <li>We market your course to our student community</li>
              <li>Teach live batches or pre-recorded courses</li>
            </ul>
          </div>
          <form className="form-card reveal-right" noValidate onSubmit={inquiry.onSubmit} onInput={clearInvalid} style={inquiry.sent ? { minHeight: inquiry.height } : undefined}>
            {inquiry.sent ? <FormSuccess height={inquiry.height} onReset={inquiry.reset} /> : (
              <>
                <h3 style={{ marginBottom: 20 }}>Apply to become a teacher</h3>
                <div className="form-row">
                  <div className="field"><label htmlFor="t-name">Full name</label><input id="t-name" name="name" required /></div>
                  <div className="field"><label htmlFor="t-phone">Phone</label><input id="t-phone" name="phone" type="tel" required /></div>
                </div>
                <div className="field"><label htmlFor="t-email">Email</label><input id="t-email" name="email" type="email" required /></div>
                <div className="field">
                  <label htmlFor="t-skill">What do you want to teach?</label>
                  <select id="t-skill" name="subject" required defaultValue="">
                    <option value="">Select a subject</option>
                    <option>Graphic Design</option>
                    <option>Video Editing</option>
                    <option>Motion Graphics</option>
                    <option>Digital Marketing</option>
                    <option>UI/UX Design</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field"><label htmlFor="t-portfolio">Portfolio link</label><input id="t-portfolio" name="portfolio" type="url" placeholder="https://" /></div>
                <div className="field"><label htmlFor="t-about">Tell us about your experience</label><textarea id="t-about" name="experience" /></div>
                <button className="btn btn--primary btn--block">Submit Application</button>
                <p className="form-note">Submitting opens WhatsApp with your application details filled in.</p>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
