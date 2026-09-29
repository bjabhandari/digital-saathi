import { Link } from "react-router-dom";
import { useTitle } from "../components/ui.jsx";

export default function NotFound() {
  useTitle("Page not found | Digital Saathi");
  return (
    <section className="nf">
      <div>
        <div className="big fade-up">404</div>
        <h1 className="h-section fade-up d1">This page got <span className="hl">lost</span></h1>
        <p className="muted fade-up d2">The page you're looking for doesn't exist or has moved.</p>
        <div className="flex gap-12 wrap fade-up d3" style={{ justifyContent: "center" }}>
          <Link className="btn btn--primary" to="/">Back to Home</Link>
          <Link className="btn btn--ghost" to="/courses">Browse Courses</Link>
        </div>
      </div>
    </section>
  );
}
