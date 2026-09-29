import { Link, useParams } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { asset, npr } from "../lib/util.js";
import { useContent, useTeacher } from "../context/ContentContext.jsx";
import { AddToCartButton, NotFoundBlock, OfferBox, Stack3d, TeacherAvatar, useTitle, useWhatsApp } from "../components/ui.jsx";
import { CourseCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function CourseDetail() {
  const { id } = useParams();
  const { COURSES } = useContent();
  const c = COURSES.find((x) => x.id === id);
  useTitle(c ? c.title + " | Digital Saathi" : "Course | Digital Saathi");
  if (!c) return <NotFoundBlock what="Course" back="/courses" backLabel="Browse all courses" />;
  return <Course c={c} all={COURSES} />;
}

function Course({ c, all }) {
  const t = useTeacher(c.teacher);
  const wa = useWhatsApp();
  const related = all.filter((x) => x.id !== c.id && x.category === c.category).slice(0, 3);
  const hasImages = c.images && c.images.length > 0;

  return (
    <>
      <section className={"page-hero" + (hasImages ? " page-hero--media" : "")}>
        <Shapes3D layout={hasImages ? "spread" : "side"} />
        <div className={"container" + (hasImages ? " course-hero-grid" : "")}>
          <div>
            <div className="crumbs"><Link to="/">Home</Link> / <Link to="/courses">Courses</Link> / {c.category}</div>
            <span className="badge">{c.category} · {c.level}</span>
            <h1 className="h-section" style={{ marginTop: 12, maxWidth: 860 }}>{c.title}</h1>
            <p>{c.summary}</p>
            <div className="meta fade-up d2" style={{ marginTop: 16 }}>
              <span className="stars">★★★★★</span><span>{c.rating} ({c.reviews} reviews)</span>
              <span><Icon name="clock" /> {c.hours} hours</span>
              <span><Icon name="book" /> {c.lessons} lessons</span>
              <span><Icon name="award" /> Certificate</span>
            </div>
          </div>
          {hasImages ? <div className="course-hero-art fade-up d2"><Stack3d images={c.images} className="stack3d--hero" /></div> : null}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 52 }}>
        <div className="container detail-grid">
          <div>
            <h2 className="detail-h2 reveal">What you'll learn</h2>
            <ul className="check-list reveal" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", marginBottom: 44 }}>
              {(c.outcomes || []).map((o, i) => <li key={i}>{o}</li>)}
            </ul>
            <h2 className="detail-h2 reveal">Curriculum</h2>
            <div className="curriculum reveal" style={{ marginBottom: 44 }}>
              {(c.curriculum || []).map((m, i) => (
                <details key={i} open={i === 0}>
                  <summary>{m.title}<span className="muted" style={{ fontWeight: 500, fontSize: ".88rem" }}>{(m.items || []).length} lessons</span></summary>
                  <div className="faq-body"><ul>{(m.items || []).map((x, k) => <li key={k}>{x}</li>)}</ul></div>
                </details>
              ))}
            </div>
            <h2 className="detail-h2 reveal">Your teacher</h2>
            <div className="card reveal" style={{ padding: 24, flexDirection: "row", gap: 18, alignItems: "center", marginBottom: 40 }}>
              <Link to={"/teacher/" + t.id}><TeacherAvatar teacher={t} className="avatar--lg" /></Link>
              <div>
                <h3 style={{ margin: 0 }}><Link to={"/teacher/" + t.id}>{t.name}</Link></h3>
                <div style={{ color: "var(--brand-700)", fontWeight: 600, fontSize: ".92rem" }}>{t.role}</div>
                <p className="muted mb-0" style={{ marginTop: 6 }}>{t.bio}</p>
              </div>
            </div>
          </div>
          <aside className="detail-aside reveal-right">
            <div className="card">
              <div className={"thumb " + c.color}>
                {hasImages ? <img className="thumb-img" src={asset(c.images[0])} alt="" /> : <Icon name={c.icon} className="thumb-icon" />}
              </div>
              <div className="card-body">
                <div className="price" style={{ fontSize: "1.9rem" }}>{npr(c.price)}<del>{npr(c.oldPrice)}</del></div>
                <OfferBox price={c.price} oldPrice={c.oldPrice} />
                <AddToCartButton kind="course" id={c.id} label="Add to Cart" className="btn btn--primary btn--block" style={{ marginTop: 8 }} />
                <a className="btn btn--whatsapp btn--block" target="_blank" rel="noopener noreferrer" href={wa("Namaste! I want to enroll in \"" + c.title + "\".")}><Icon name="whatsapp" /> Enroll via WhatsApp</a>
                <ul className="check-list" style={{ margin: "12px 0 0" }}>
                  <li>Lifetime access</li><li>Certificate of completion</li><li>Downloadable project files</li><li>Private student community</li><li>Q&amp;A with the teacher</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {related.length ? (
        <section className="section section--soft">
          <div className="container">
            <div className="section-head section-head--left"><span className="eyebrow">Keep learning</span><h2 className="h-section">Related courses</h2></div>
            <div className="grid grid-3">{related.map((r) => <CourseCard key={r.id} course={r} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
