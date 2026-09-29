import { Link, useParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { npr } from "../lib/util.js";
import { useContent } from "../context/ContentContext.jsx";
import { NotFoundBlock, OfferBox, TeacherAvatar, Timer, useTitle, useWhatsApp } from "../components/ui.jsx";
import { CourseCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function TeacherDetail() {
  const { id } = useParams();
  const { TEACHERS, COURSES } = useContent();
  const wa = useWhatsApp();
  const t = TEACHERS.find((x) => x.id === id);
  useTitle(t ? t.name + " — " + t.role + " | Digital Saathi" : "Teacher not found | Digital Saathi");
  if (!t) return <NotFoundBlock what="Teacher" back="/teachers" backLabel="Meet all teachers" />;

  const courses = COURSES.filter((c) => c.teacher === t.id);
  const m = t.mentorship;
  const first = t.name.split(" ")[0];
  const scrollToCourses = (e) => { e.preventDefault(); const g = document.getElementById("teacher-courses"); if (g) g.scrollIntoView({ behavior: "smooth" }); };

  return (
    <>
      <section className="teacher-hero">
        <Shapes3D layout="spread" />
        <span className="blob blob--1" /><span className="blob blob--2" />
        <div className="container teacher-hero-grid">
          <div className="profile-photo fade-up">
            <div className="photo-orbit"><span className="dot" /></div>
            <TeacherAvatar teacher={t} className="avatar--xl" />
            <span className="photo-badge"><Icon name="award" /> {t.experience}+ yrs</span>
          </div>
          <div>
            <div className="crumbs"><Link to="/">Home</Link> / <Link to="/teachers">Teachers</Link> / {t.name}</div>
            <span className="eyebrow fade-up">{t.role}</span>
            <h1 className="h-display" style={{ fontSize: "clamp(2.4rem,5vw,4rem)" }}><span className="line"><span>{t.name}</span></span></h1>
            <p className="muted fade-up d1" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="pin" /> {t.location}, Nepal</p>
            <p className="lead fade-up d2">{t.about}</p>
            <div className="svc-stats fade-up d3">
              <div><b>{t.rating}★</b><span>Rating</span></div>
              <div><b>{Number(t.students || 0).toLocaleString("en-IN")}</b><span>Students</span></div>
              <div><b>{courses.length}</b><span>Course{courses.length === 1 ? "" : "s"}</span></div>
              <div><b>{t.experience}+</b><span>Years exp.</span></div>
            </div>
            <div className="skills fade-up d4" style={{ justifyContent: "flex-start", marginTop: 20 }}>
              {(t.skills || []).map((s) => <span key={s} className="badge">{s}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section className="section"><div className="container detail-grid">
        <div>
          <h2 className="detail-h2 reveal">Highlights</h2>
          <ul className="feature-list reveal">{(t.highlights || []).map((h, i) => <li key={i}><Icon name="award" /><span>{h}</span></li>)}</ul>
          {(t.reviews || []).length ? (
            <>
              <h2 className="detail-h2 reveal" style={{ marginTop: 44 }}>What students say</h2>
              <div className="grid grid-2 reveal">
                {t.reviews.map((r, i) => <div key={i} className="review"><div className="stars">★★★★★</div><p>“{r.text}”</p><b>— {r.name}</b></div>)}
              </div>
            </>
          ) : null}
        </div>
        {m ? (
          <aside className="detail-aside reveal-right"><div className="card mentor-card"><div className="card-body">
            <span className="badge badge--green">1:1 Mentorship</span>
            <h3 style={{ margin: "6px 0 2px" }}>Book a session with {first}</h3>
            <p className="muted" style={{ margin: "0 0 8px" }}>{m.desc}</p>
            <div className="price-block"><del>{npr(m.oldPrice)}</del><b>{npr(m.price)}</b><small className="muted">/ {m.duration}</small></div>
            <OfferBox price={m.price} oldPrice={m.oldPrice} what="mentorship session" />
            <a className="btn btn--primary btn--block" target="_blank" rel="noopener noreferrer" href={wa("Namaste! I'd like to book a " + m.duration + " mentorship session with " + t.name + " (" + npr(m.price) + ", today's offer).")}><Icon name="whatsapp" /> Book Session</a>
            <ul className="check-list" style={{ margin: "14px 0 0" }}><li>Live on Zoom / Google Meet</li><li>Recording shared after the call</li><li>Pick a time that suits you</li></ul>
          </div></div></aside>
        ) : null}
      </div></section>

      {courses.length ? (
        <section className="section section--soft" id="teacher-courses"><div className="container">
          <div className="section-head section-head--left reveal">
            <span className="eyebrow">Courses</span>
            <h2 className="h-section">Courses by <span className="hl">{first}</span></h2>
            <div className="timer-inline" style={{ marginTop: 12 }}>Course offer ends in <Timer size="mini" /></div>
          </div>
          <div className="grid grid-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </div></section>
      ) : null}

      <section style={{ padding: "96px 0" }}><div className="container"><div className="cta-band reveal">
        <div><h2>Learn with <span className="hl">{first}</span></h2><p>Enroll in a course or book a 1:1 session today.</p></div>
        <div className="actions">
          {courses.length ? <a href="#teacher-courses" className="btn btn--lime" onClick={scrollToCourses}>View Courses</a> : <Link to="/courses" className="btn btn--lime">View Courses</Link>}
          <Link to="/teachers" className="btn btn--light">All Teachers</Link>
        </div>
      </div></div></section>
    </>
  );
}
