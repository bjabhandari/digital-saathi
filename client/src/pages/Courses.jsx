import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useContent } from "../context/ContentContext.jsx";
import { useTitle } from "../components/ui.jsx";
import { CourseCard } from "../components/cards.jsx";
import Shapes3D from "../components/Shapes3D.jsx";

export default function Courses() {
  const { COURSES, TEACHERS } = useContent();
  const [params] = useSearchParams();
  useTitle("All Courses | Digital Saathi");

  const cats = useMemo(() => ["All"].concat(Array.from(new Set(COURSES.map((c) => c.category)))), [COURSES]);
  const initialCat = params.get("cat");
  const [cat, setCat] = useState(cats.includes(initialCat) ? initialCat : "All");
  const [query, setQuery] = useState(params.get("q") || "");
  const [level, setLevel] = useState("All");
  const [sort, setSort] = useState("popular");
  // bumps on every filter change to replay the pop-in animation
  const [animKey, setAnimKey] = useState(0);
  const change = (setter) => (v) => { setter(v); setAnimKey((k) => k + 1); };

  // Follow ?cat= / ?q= links (e.g. footer "Design Courses") while already on this page
  useEffect(() => {
    const c = params.get("cat");
    setCat(cats.includes(c) ? c : "All");
    setQuery(params.get("q") || "");
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const teacherName = (id) => (TEACHERS.find((t) => t.id === id) || {}).name || "";
  const q = query.trim().toLowerCase();
  const list = COURSES.filter((c) =>
    (cat === "All" || c.category === cat) &&
    (level === "All" || c.level === level) &&
    (!q || (c.title + " " + c.summary + " " + c.category + " " + teacherName(c.teacher)).toLowerCase().includes(q))
  );
  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "rating") list.sort((a, b) => b.rating - a.rating);

  return (
    <>
      <section className="page-hero">
        <Shapes3D />
        <div className="container">
          <div className="crumbs"><Link to="/">Home</Link> / Courses</div>
          <h1 className="h-section">Explore our <span className="hl">courses</span></h1>
          <p>Practical, project-based courses in design, video and marketing. Lifetime access, certificates and real support from your teacher.</p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48 }}>
        <div className="container">
          <div className="toolbar">
            <div className="search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              <label className="sr-only" htmlFor="course-search">Search courses</label>
              <input id="course-search" type="search" placeholder="Search courses, skills or teachers…" value={query} onChange={(e) => change(setQuery)(e.target.value)} />
            </div>
            <label className="sr-only" htmlFor="course-level">Level</label>
            <select id="course-level" className="input" style={{ width: "auto" }} value={level} onChange={(e) => change(setLevel)(e.target.value)}>
              <option value="All">All levels</option>
              <option>Beginner</option>
              <option>Intermediate</option>
            </select>
            <label className="sr-only" htmlFor="course-sort">Sort</label>
            <select id="course-sort" className="input" style={{ width: "auto" }} value={sort} onChange={(e) => change(setSort)(e.target.value)}>
              <option value="popular">Most popular</option>
              <option value="rating">Highest rated</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </div>
          <div className="flex wrap" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div className="chips">
              {cats.map((c) => <button key={c} className={"chip" + (c === cat ? " active" : "")} onClick={() => change(setCat)(c)}>{c}</button>)}
            </div>
            <span className="muted" style={{ fontWeight: 600, fontSize: ".9rem" }}>{list.length} course{list.length === 1 ? "" : "s"}</span>
          </div>
          <div key={animKey} className={"grid grid-3" + (animKey ? " is-filtering" : "")}>
            {list.length
              ? list.map((c) => <CourseCard key={c.id} course={c} />)
              : <div className="empty" style={{ gridColumn: "1/-1" }}>No courses match your search. Try a different keyword.</div>}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 88px" }}>
        <div className="container">
          <div className="cta-band reveal">
            <div>
              <h2>Are you an expert? <span className="hl">Teach with us.</span></h2>
              <p>Share your skills with thousands of learners and earn from every enrollment.</p>
            </div>
            <div className="actions"><Link to="/teachers#apply" className="btn btn--lime">Become a Teacher</Link></div>
          </div>
        </div>
      </section>
    </>
  );
}
