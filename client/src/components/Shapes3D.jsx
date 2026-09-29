/* Decorative 3D shapes (cubes, rings, orbs, pyramids) for page heroes.
   They spin continuously and drift with the pointer (see initParallax in
   lib/motion.js). Pure CSS 3D, hidden from screen readers. */

const Cube = ({ className, style }) => (
  <div className={"s3d s3d-cube " + (className || "")} style={style}>
    <div className="s3d-spin"><i /><i /><i /><i /><i /><i /></div>
  </div>
);
const Ring = ({ className, style }) => (
  <div className={"s3d s3d-ring " + (className || "")} style={style}>
    <div className="s3d-spin"><span /><span /></div>
  </div>
);
const Orb = ({ className, style }) => <div className={"s3d s3d-orb " + (className || "")} style={style}><span /></div>;
const Pyramid = ({ className, style }) => (
  <div className={"s3d s3d-pyramid " + (className || "")} style={style}>
    <div className="s3d-spin"><i /><i /><i /><i /></div>
  </div>
);

/* layout: "side" (shapes on the right, for text-left heroes) | "spread" (around the edges) */
export default function Shapes3D({ layout = "side", tone = "light" }) {
  return (
    <div className={"shapes3d shapes3d--" + layout + " shapes3d--" + tone} data-parallax aria-hidden="true">
      <Cube className="s3d-1" style={{ "--s": "74px", "--d": "46px", "--t": "22s" }} />
      <Ring className="s3d-2" style={{ "--s": "96px", "--d": "-30px", "--t": "16s" }} />
      <Orb className="s3d-3" style={{ "--s": "38px", "--d": "64px" }} />
      <Pyramid className="s3d-4" style={{ "--s": "64px", "--d": "26px", "--t": "20s" }} />
      <Cube className="s3d-5 s3d-cube--glass" style={{ "--s": "30px", "--d": "-52px", "--t": "14s" }} />
      <Orb className="s3d-6 s3d-orb--lime" style={{ "--s": "18px", "--d": "-40px" }} />
    </div>
  );
}
