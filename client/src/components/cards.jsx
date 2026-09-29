import { Link } from "react-router-dom";
import { Icon } from "../lib/icons.jsx";
import { npr, pct } from "../lib/util.js";
import { useContent, useTeacher } from "../context/ContentContext.jsx";
import { AddToCartButton, Badges, ServiceScene, SoftwareTile, Stack3d, TeacherAvatar, TitlesStage, useWhatsApp } from "./ui.jsx";

export function CourseCard({ course: c }) {
  const t = useTeacher(c.teacher);
  return (
    <article className="card tilt reveal">
      <Link to={"/course/" + c.id} className={"thumb " + c.color} aria-label={c.title}>
        <span className="badge badge--light">{c.bestseller ? "🔥 Bestseller" : c.level}</span>
        {c.images && c.images.length ? <Stack3d images={c.images} /> : <Icon name={c.icon} className="thumb-icon" />}
      </Link>
      <div className="card-body">
        <span className="badge">{c.category}</span>
        <h3><Link to={"/course/" + c.id}>{c.title}</Link></h3>
        <Link className="teacher-line" to={"/teacher/" + t.id}><TeacherAvatar teacher={t} />{t.name}</Link>
        <div className="meta">
          <span><span className="stars">★</span> {c.rating} ({c.reviews})</span>
          <span><Icon name="clock" /> {c.hours}h</span>
          <span><Icon name="book" /> {c.lessons} lessons</span>
        </div>
      </div>
      <div className="card-foot">
        <span className="price">{npr(c.price)}<del>{npr(c.oldPrice)}</del></span>
        <AddToCartButton kind="course" id={c.id} label="Enroll" className="btn btn--primary btn--sm" />
      </div>
    </article>
  );
}

export function ToolCard({ tool: t }) {
  if (t.category === "Titles") return <TitlesCard tool={t} />;
  return (
    <article className="card tilt reveal">
      <Link to={"/product/" + t.id} className={"thumb " + t.color} aria-label={t.title}>
        <span className="badge badge--light">{t.type}</span>
        <Icon name={t.icon} className="thumb-icon" />
      </Link>
      <div className="card-body">
        <h3><Link to={"/product/" + t.id}>{t.title}</Link></h3>
        <p className="muted mb-0" style={{ fontSize: ".93rem" }}>{t.desc}</p>
        <div className="meta"><span><Icon name="download" /> Instant download</span></div>
        <div className="meta"><span><Icon name="layers" /> {t.compat}</span></div>
      </div>
      <div className="card-foot">
        <span className="price">{npr(t.price)}<del>{npr(t.oldPrice)}</del></span>
        <AddToCartButton kind="tool" id={t.id} label="Buy Now" className="btn btn--primary btn--sm" />
      </div>
    </article>
  );
}

/* Neon store card for titles & lower thirds packs */
export function TitlesCard({ tool: t }) {
  const { SOFTWARE } = useContent();
  return (
    <article className="pcard tilt reveal">
      <div className="pcard-badges"><Badges list={t.badges} /></div>
      <Link to={"/product/" + t.id} className="pcard-media" aria-label={t.title}>
        <SoftwareTile id={t.software} className="sw-tile--float" />
        <TitlesStage tool={t} count={8} />
        <span className="pcard-play"><Icon name="play" /> Preview</span>
      </Link>
      <div className="pcard-body">
        <h3><Link to={"/product/" + t.id}>{t.title}</Link></h3>
        <div className="pcard-meta">{t.count || ""} · {SOFTWARE[t.software] ? SOFTWARE[t.software].name : t.type}</div>
        <div className="pcard-price"><b>{npr(t.price)}</b><del>{npr(t.oldPrice)}</del></div>
        <AddToCartButton kind="tool" id={t.id} label="Add to Cart" className="btn btn--lime btn--block btn--sm" />
      </div>
    </article>
  );
}

export function TeacherCard({ teacher: t }) {
  const { COURSES } = useContent();
  const courses = COURSES.filter((c) => c.teacher === t.id).length;
  return (
    <article className="card teacher-card tilt reveal">
      <Link to={"/teacher/" + t.id} className="avatar-ring" aria-label={t.name + " profile"}><TeacherAvatar teacher={t} /></Link>
      <h3><Link to={"/teacher/" + t.id}>{t.name}</Link></h3>
      <div className="role">{t.role}</div>
      <p className="bio">{t.bio}</p>
      <div className="meta">
        <span><span className="stars">★</span> {t.rating}</span>
        <span><Icon name="users" /> {Number(t.students || 0).toLocaleString("en-IN")} students</span>
        <span><Icon name="book" /> {courses} course{courses === 1 ? "" : "s"}</span>
      </div>
      <div className="skills">{(t.skills || []).map((s) => <span key={s} className="badge">{s}</span>)}</div>
      <Link className="btn btn--ghost btn--sm" style={{ marginTop: 18 }} to={"/teacher/" + t.id}>View Profile <Icon name="arrow" className="arrow" /></Link>
    </article>
  );
}

export function TestimonialCard({ quote: q }) {
  return (
    <figure className="quote">
      <div className="qmark" aria-hidden="true">“</div>
      <div className="stars" aria-label="5 stars">★★★★★</div>
      <p>{q.text}</p>
      <figcaption className="who">
        <span className={"avatar " + q.color}>{q.initials}</span>
        <div><strong>{q.name}</strong><small>{q.role}</small></div>
      </figcaption>
    </figure>
  );
}

export function PlanCard({ service, plan: p }) {
  const wa = useWhatsApp();
  const off = pct(p.price, p.oldPrice);
  return (
    <div className={"plan tilt" + (p.featured ? " plan--featured" : "")}>
      {p.featured ? <span className="plan-tag">MOST POPULAR</span> : null}
      <h4>{p.name}</h4>
      <p className="plan-desc">{p.desc}</p>
      {p.oldPrice ? <div className="plan-old"><del>{npr(p.oldPrice)}</del><span className="offer-pct">-{off}%</span></div> : null}
      <div className="plan-price">{npr(p.price)} <small>{p.unit}</small></div>
      <ul className="check-list" style={{ marginTop: 16 }}>{(p.features || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
      <AddToCartButton kind="plan" id={service.key + "|" + p.name} label="Order Now" className={"btn " + (p.featured ? "btn--lime" : "btn--primary") + " btn--block"} />
      <a className="plan-wa" target="_blank" rel="noopener noreferrer"
        href={wa("Namaste! I'm interested in the " + service.title + " — " + p.name + " package (" + npr(p.price) + " " + p.unit + (p.oldPrice ? ", today's offer price" : "") + ").")}>
        <Icon name="whatsapp" /> or ask on WhatsApp
      </a>
    </div>
  );
}

export function ServiceCard({ service: s }) {
  return (
    <div className="service-card service-card--media reveal" id={s.key}>
      <div className="svc-art"><ServiceScene service={s} /></div>
      <div className={"icon " + s.color}><Icon name={s.icon} /></div>
      <h3>{s.title}</h3>
      <p>{s.blurb}</p>
      <ul className="check-list">{(s.features || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
      <Link to={"/service/" + s.key} className="link">View full details <Icon name="arrow" /></Link>
    </div>
  );
}
