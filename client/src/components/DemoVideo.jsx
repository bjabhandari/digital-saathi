import { useEffect, useRef, useState } from "react";
import { Icon } from "../lib/icons.jsx";
import { TeacherAvatar } from "./ui.jsx";

/* Animated demo "video" on teacher profiles: four short scenes that show
   the teacher's craft (design, video, ads, social, web or motion), with
   play/pause, chapters and captions. Pure CSS/SVG animation, no media files. */

const SCENE_MS = 3000;

// Absolutely positioned box inside the stage; x/y/w/h are % of the stage
const B = ({ x, y, w, h, c, d = 0, cls = "", r, children, style }) => (
  <i className={"dv-b " + cls} style={{ left: x + "%", top: y + "%", width: w + "%", height: h + "%", background: c, borderRadius: r, "--d": d + "s", ...style }}>{children}</i>
);
const T = ({ x, y, size = 1, d = 0, cls = "", children, style }) => (
  <b className={"dv-t " + cls} style={{ left: x + "%", top: y + "%", fontSize: size + "em", "--d": d + "s", ...style }}>{children}</b>
);
const Cursor = ({ path }) => <span className={"dv-cursor dv-cursor--" + path} />;
const Check = ({ x, y, d = 0 }) => <T x={x} y={y} d={d} cls="dv-in dv-check">✓</T>;
const Count = ({ to, suffix = "", x, y, size }) => (
  <T x={x} y={y} size={size} cls="dv-count" style={{ "--to": to }}><span data-suffix={suffix} /></T>
);

const SWATCH = ["#7cc15a", "#d4f27a", "#f2b631", "#e8694a", "#163822"];

const DEMOS = {
  design: {
    label: "Graphic design demo",
    scenes: [
      { cap: "Start with a blank artboard and a rough sketch", el: (
        <>
          <B x={22} y={12} w={56} h={76} c="#fff" r="6px" cls="dv-in dv-grid" />
          <svg className="dv-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" className="dv-draw" d="M34 62 C 36 30, 64 30, 66 50 S 46 76, 40 56" /></svg>
          <Cursor path="sketch" />
        </>
      ) },
      { cap: "Build the logo from simple shapes", el: (
        <>
          <B x={22} y={12} w={56} h={76} c="#fff" r="6px" />
          <B x={38} y={26} w={24} h={42} c="#7cc15a" r="50%" cls="dv-pop" d={0.1} />
          <B x={45} y={36} w={10} h={22} c="#0e2616" r="4px" cls="dv-pop" d={0.6} />
          <B x={56} y={22} w={8} h={14} c="#d4f27a" r="50%" cls="dv-pop" d={1} />
          <T x={50} y={78} size={0.9} d={1.4} cls="dv-in dv-ink">SAATHI</T>
          <i className="dv-handles" />
        </>
      ) },
      { cap: "Choose the colours and the typeface", el: (
        <>
          {SWATCH.map((c, i) => <B key={c} x={14 + i * 15} y={22} w={12} h={30} c={c} r="10px" cls="dv-pop" d={i * 0.18} />)}
          <T x={30} y={72} size={2.4} d={1} cls="dv-in dv-display">Aa</T>
          <T x={64} y={72} size={0.8} d={1.3} cls="dv-in">Oswald · Outfit</T>
        </>
      ) },
      { cap: "Mock it up — the client approves it", el: (
        <>
          <div className="dv-card3d"><div className="dv-card3d-in">
            <span className="dv-card-logo" /><b>Digital Saathi</b><small>Brand identity</small>
          </div></div>
          <Check x={76} y={22} d={1.4} />
          <T x={50} y={88} size={0.8} d={1.6} cls="dv-in dv-pill">Logo approved</T>
        </>
      ) }
    ]
  },
  video: {
    label: "Video editing demo",
    scenes: [
      { cap: "Import the raw clips into the project", el: (
        <>
          {["#3f8f27", "#e8694a", "#f2b631", "#7cc15a"].map((c, i) => <B key={c} x={10 + i * 21} y={26} w={17} h={30} c={c} r="6px" cls="dv-fly" d={i * 0.2}><span className="dv-play-mini" /></B>)}
          <B x={10} y={66} w={80} h={14} c="rgba(255,255,255,.08)" r="8px" cls="dv-in" d={1} />
          <T x={50} y={73} size={0.8} d={1.1} cls="dv-in">4 clips · 1080p</T>
        </>
      ) },
      { cap: "Cut and arrange them on the timeline", el: (
        <>
          <B x={8} y={14} w={84} h={40} c="#0b1a10" r="8px" cls="dv-in dv-screen" />
          {[["#3f8f27", 8, 20], ["#e8694a", 29, 14], ["#f2b631", 44, 24], ["#7cc15a", 69, 23]].map(([c, x, w], i) => <B key={c} x={x} y={62} w={w - 1} h={11} c={c} r="4px" cls="dv-grow-x" d={i * 0.15} />)}
          {[["#5aa0e8", 14, 30], ["#a06ae8", 50, 36]].map(([c, x, w], i) => <B key={c} x={x} y={77} w={w} h={8} c={c} r="4px" cls="dv-grow-x" d={0.6 + i * 0.15} />)}
          <i className="dv-playhead" />
        </>
      ) },
      { cap: "Colour grade for a cinematic look", el: (
        <>
          <div className="dv-grade"><span className="dv-grade-after" /><i className="dv-grade-bar" /></div>
          <T x={20} y={84} size={0.75} cls="dv-in">Before</T>
          <T x={80} y={84} size={0.75} d={0.3} cls="dv-in">After</T>
        </>
      ) },
      { cap: "Export the reel, ready to post", el: (
        <>
          <Icon name="film" className="dv-big-icon dv-pop" />
          <B x={22} y={66} w={56} h={6} c="rgba(255,255,255,.12)" r="99px" />
          <B x={22} y={66} w={56} h={6} c="#d4f27a" r="99px" cls="dv-load" />
          <T x={50} y={84} size={0.85} d={1.8} cls="dv-in dv-pill">Reel delivered ✓ 1080×1920</T>
        </>
      ) }
    ]
  },
  ads: {
    label: "Facebook ads demo",
    scenes: [
      { cap: "Write an ad that stops the scroll", el: (
        <>
          <B x={28} y={8} w={44} h={84} c="#fff" r="10px" cls="dv-in" />
          <B x={32} y={13} w={7} h={11} c="#7cc15a" r="50%" cls="dv-pop" d={0.2} />
          <B x={41} y={15} w={22} h={3} c="#cfd8d2" r="99px" cls="dv-grow-x" d={0.3} />
          <B x={41} y={20} w={14} h={2.5} c="#e3ebe5" r="99px" cls="dv-grow-x" d={0.4} />
          <B x={32} y={29} w={36} h={36} c="linear-gradient(135deg,#a6d98b,#3f8f27)" r="6px" cls="dv-pop" d={0.6}><span className="dv-pct">-50%</span></B>
          <B x={32} y={70} w={30} h={3} c="#cfd8d2" r="99px" cls="dv-grow-x" d={1} />
          <B x={32} y={78} w={36} h={9} c="#3f8f27" r="6px" cls="dv-pop dv-btn" d={1.3}>Shop now</B>
        </>
      ) },
      { cap: "Target the right people in Nepal", el: (
        <>
          <div className="dv-radar"><i /><i /><i /><span className="dv-sweep" /></div>
          {[[30, 30], [62, 38], [44, 60], [54, 70], [36, 48]].map(([x, y], i) => <B key={i} x={x} y={y} w={3} h={5} c="#d4f27a" r="50%" cls="dv-ping" d={0.3 + i * 0.25} />)}
          {["Age 18–34", "Kathmandu", "Design lovers"].map((s, i) => <T key={s} x={82} y={30 + i * 18} size={0.7} d={0.8 + i * 0.3} cls="dv-in dv-chip">{s}</T>)}
        </>
      ) },
      { cap: "Launch, test and optimise the budget", el: (
        <>
          {[30, 42, 38, 56, 64, 78, 90].map((h, i) => <B key={i} x={14 + i * 10} y={86 - h * 0.7} w={6} h={h * 0.7} c={i > 4 ? "#d4f27a" : "#7cc15a"} r="4px 4px 0 0" cls="dv-grow-y" d={i * 0.15} />)}
          <svg className="dv-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" className="dv-draw dv-draw--lime" d="M14 70 L 27 62 L 37 64 L 47 52 L 57 46 L 67 34 L 80 20" /></svg>
        </>
      ) },
      { cap: "Real results: more reach, more sales", el: (
        <>
          <Icon name="trending" className="dv-big-icon dv-big-icon--sm dv-pop" />
          <Count to={312} suffix="%" x={50} y={58} size={3.2} />
          <T x={50} y={80} size={0.85} d={1} cls="dv-in dv-pill">+312% reach · Facebook boost</T>
        </>
      ) }
    ]
  },
  social: {
    label: "Social media demo",
    scenes: [
      { cap: "Plan a month of content in one calendar", el: (
        <>
          {Array.from({ length: 14 }, (_, i) => (
            <B key={i} x={12 + (i % 7) * 11} y={24 + Math.floor(i / 7) * 28} w={9} h={22} c={[1, 3, 6, 8, 11, 13].includes(i) ? SWATCH[i % 4] : "rgba(255,255,255,.1)"} r="6px" cls="dv-pop" d={i * 0.08} />
          ))}
        </>
      ) },
      { cap: "Design the posts in Canva", el: (
        <>
          <div className="dv-phone dv-in"><span className="dv-phone-screen">
            <B x={8} y={8} w={84} h={52} c="linear-gradient(160deg,#f2b631,#e8694a)" r="8px" cls="dv-pop" d={0.3} />
            <B x={8} y={66} w={60} h={6} c="#fff" r="99px" cls="dv-grow-x" d={0.7} />
            <B x={8} y={76} w={40} h={6} c="rgba(255,255,255,.5)" r="99px" cls="dv-grow-x" d={0.9} />
          </span></div>
          {SWATCH.slice(0, 3).map((c, i) => <B key={c} x={66} y={26 + i * 18} w={8} h={13} c={c} r="50%" cls="dv-pop" d={0.5 + i * 0.2} />)}
        </>
      ) },
      { cap: "Post reels that people love", el: (
        <>
          <div className="dv-phone"><span className="dv-phone-screen dv-feed">
            {["#3f8f27", "#a06ae8", "#e8694a"].map((c) => <i key={c} style={{ background: c }}><Icon name="play" /></i>)}
          </span></div>
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className="dv-heart" style={{ "--d": 0.3 + i * 0.4 + "s", left: 60 + (i % 3) * 5 + "%" }}>♥</span>)}
        </>
      ) },
      { cap: "Watch your followers grow", el: (
        <>
          <Icon name="users" className="dv-big-icon dv-big-icon--sm dv-pop" />
          <Count to={10} suffix="K" x={50} y={58} size={3.2} />
          <T x={50} y={80} size={0.85} d={1} cls="dv-in dv-pill">followers in 3 months</T>
        </>
      ) }
    ]
  },
  web: {
    label: "Web & UI design demo",
    scenes: [
      { cap: "Wireframe the page in Figma", el: (
        <>
          <div className="dv-browser dv-in"><span /></div>
          <B x={16} y={26} w={68} h={8} c="rgba(255,255,255,.14)" r="4px" cls="dv-grow-x" d={0.3} />
          <B x={16} y={40} w={32} h={34} c="rgba(255,255,255,.1)" r="4px" cls="dv-pop" d={0.6} />
          <B x={52} y={40} w={32} h={8} c="rgba(255,255,255,.14)" r="4px" cls="dv-grow-x" d={0.8} />
          <B x={52} y={52} w={24} h={6} c="rgba(255,255,255,.1)" r="4px" cls="dv-grow-x" d={1} />
          <B x={52} y={64} w={16} h={10} c="rgba(255,255,255,.18)" r="4px" cls="dv-pop" d={1.2} />
        </>
      ) },
      { cap: "Turn it into a polished UI", el: (
        <>
          <div className="dv-browser"><span /></div>
          <B x={16} y={26} w={68} h={8} c="#fff" r="4px" cls="dv-fill" />
          <B x={16} y={40} w={32} h={34} c="linear-gradient(135deg,#a6d98b,#3f8f27)" r="8px" cls="dv-fill" d={0.3} />
          <T x={68} y={44} size={1.1} d={0.6} cls="dv-in dv-display">Learn. Create.</T>
          <B x={52} y={52} w={24} h={6} c="rgba(255,255,255,.4)" r="4px" cls="dv-fill" d={0.8} />
          <B x={52} y={64} w={16} h={10} c="#d4f27a" r="99px" cls="dv-fill" d={1} />
        </>
      ) },
      { cap: "Prototype how it clicks and flows", el: (
        <>
          <div className="dv-browser"><span /></div>
          <div className="dv-screens"><i /><i /></div>
          <Cursor path="click" />
          <svg className="dv-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" className="dv-draw dv-draw--lime" d="M60 69 C 70 90, 86 80, 82 56" /></svg>
        </>
      ) },
      { cap: "Launch it — fast on every screen", el: (
        <>
          <B x={14} y={18} w={50} h={56} c="#fff" r="8px" cls="dv-in dv-device"><i className="dv-device-top" /></B>
          <B x={70} y={30} w={16} h={48} c="#fff" r="10px" cls="dv-in dv-device" d={0.4} />
          <Check x={82} y={20} d={1.2} />
          <T x={50} y={88} size={0.85} d={1.4} cls="dv-in dv-pill">Live · 98 PageSpeed</T>
        </>
      ) }
    ]
  },
  motion: {
    label: "Motion design demo",
    scenes: [
      { cap: "Build the scene in 3D", el: (
        <div className="dv-cube-wrap"><div className="dv-cube"><i /><i /><i /><i /><i /><i /></div></div>
      ) },
      { cap: "Set keyframes and smooth the easing", el: (
        <>
          <span className="dv-ball" />
          <B x={10} y={74} w={80} h={1} c="rgba(255,255,255,.2)" />
          {[12, 34, 56, 78].map((x, i) => <B key={x} x={x} y={80} w={3} h={5} c="#d4f27a" cls="dv-pop dv-key" d={i * 0.25} />)}
          <svg className="dv-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path pathLength="1" className="dv-draw dv-draw--lime" d="M56 44 C 70 44, 70 20, 84 20" /></svg>
        </>
      ) },
      { cap: "Bring text to life with kinetic type", el: (
        <>
          {["LEARN.", "CREATE.", "GROW."].map((w, i) => <T key={w} x={50} y={30 + i * 20} size={2} d={i * 0.4} cls="dv-kin dv-display">{w}</T>)}
        </>
      ) },
      { cap: "Render the final animation", el: (
        <>
          <div className="dv-logo3d"><span>DS</span></div>
          <B x={26} y={78} w={48} h={5} c="rgba(255,255,255,.12)" r="99px" />
          <B x={26} y={78} w={48} h={5} c="#d4f27a" r="99px" cls="dv-load" />
          <T x={50} y={90} size={0.75} d={0.2} cls="dv-in">Rendering 4K · 60 fps</T>
        </>
      ) }
    ]
  }
};

// Pick the demo from the teacher's `demo` field, else from their role
export function demoKind(t) {
  if (t.demo && DEMOS[t.demo]) return t.demo;
  const r = (t.role || "") + " " + (t.skills || []).join(" ");
  if (/motion|blender|3d/i.test(r)) return "motion";
  if (/web|ui|figma/i.test(r)) return "web";
  if (/video|premiere|youtube/i.test(r)) return "video";
  if (/ads|meta|boost/i.test(r)) return "ads";
  if (/social|reels|content/i.test(r)) return "social";
  return "design";
}

const fmt = (ms) => "0:" + String(Math.floor(ms / 1000)).padStart(2, "0");

export default function DemoVideo({ teacher }) {
  const demo = DEMOS[demoKind(teacher)];
  const total = demo.scenes.length * SCENE_MS;
  const [state, setState] = useState("poster"); // poster | playing | paused | ended
  const [scene, setScene] = useState(0);
  const [time, setTime] = useState(0);
  const elapsed = useRef(0);
  const bar = useRef();

  useEffect(() => {
    if (state !== "playing") return;
    let last = performance.now(), raf;
    const tick = (now) => {
      elapsed.current = Math.min(total, elapsed.current + now - last);
      last = now;
      if (bar.current) bar.current.style.transform = "scaleX(" + elapsed.current / total + ")";
      setScene(Math.min(demo.scenes.length - 1, Math.floor(elapsed.current / SCENE_MS)));
      setTime(elapsed.current);
      if (elapsed.current >= total) setState("ended");
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, total, demo]);

  const seek = (i) => { elapsed.current = i * SCENE_MS; setScene(i); setTime(elapsed.current); setState("playing"); };
  const toggle = () => {
    if (state === "playing") setState("paused");
    else if (state === "ended" || state === "poster") seek(0);
    else setState("playing");
  };
  const first = teacher.name.split(" ")[0];
  const s = demo.scenes[scene];

  return (
    <div className={"demo-video demo-video--" + state}>
      <div className="dv-stage" onClick={toggle}>
        <div key={scene + "-" + (state === "poster" ? "p" : "v")} className="dv-scene">{s.el}</div>
        <div className="dv-pip"><TeacherAvatar teacher={teacher} /><span className="dv-wave"><i /><i /><i /><i /></span></div>
        <span className="dv-tag"><Icon name="video" /> {demo.label}</span>
        {state !== "poster" && state !== "ended" ? <p className="dv-cap" key={"c" + scene}>{s.cap}</p> : null}
        {state === "poster" || state === "ended" ? (
          <div className="dv-overlay">
            <button className="dv-big-play" aria-label={state === "ended" ? "Replay demo" : "Play demo"}><Icon name={state === "ended" ? "replay" : "play"} /></button>
            <b>{state === "ended" ? "That's how " + first + " works" : "Watch " + first + "'s demo"}</b>
            <small>{demo.scenes.length} short lessons · {fmt(total)}</small>
          </div>
        ) : null}
      </div>
      <div className="dv-controls">
        <button className="dv-btn-ctl" onClick={toggle} aria-label={state === "playing" ? "Pause" : "Play"}><Icon name={state === "playing" ? "pause" : state === "ended" ? "replay" : "play"} /></button>
        <div className="dv-track">
          <span className="dv-track-fill" ref={bar} />
          {demo.scenes.map((sc, i) => <button key={i} className={"dv-chapter" + (i === scene && state !== "poster" ? " on" : "")} onClick={() => seek(i)} aria-label={"Chapter " + (i + 1) + ": " + sc.cap} />)}
        </div>
        <span className="dv-time">{fmt(time)} / {fmt(total)}</span>
      </div>
      <ol className="dv-chapters">
        {demo.scenes.map((sc, i) => (
          <li key={i}><button className={i === scene && state !== "poster" ? "on" : ""} onClick={() => seek(i)}><span>{i + 1}</span>{sc.cap}</button></li>
        ))}
      </ol>
    </div>
  );
}
