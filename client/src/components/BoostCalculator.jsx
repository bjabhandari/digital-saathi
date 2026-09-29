import { useEffect, useRef, useState } from "react";
import { npr } from "../lib/util.js";
import { animateNumber } from "../lib/motion.js";
import { useContent } from "../context/ContentContext.jsx";
import { useWhatsApp } from "./ui.jsx";

const fmt = (n) => Math.round(n).toLocaleString("en-IN");
const fill = (v, min, max) => ({ "--fill": ((v - min) / (max - min)) * 100 + "%" });
const GOALS = [["messages", "💬 Messages"], ["likes", "👍 Page likes"], ["engagement", "❤️ Engagement"], ["views", "▶️ Video views"]];

/* Facebook boost calculator: live reach / results / price estimates in NPR */
export default function BoostCalculator() {
  const { BOOST: cfg } = useContent();
  const wa = useWhatsApp();
  const [usd, setUsd] = useState(20);
  const [days, setDays] = useState(7);
  const [objective, setObjective] = useState("messages");
  const big = useRef();
  const lastReach = useRef(0);

  const goal = cfg.objectives[objective] || Object.values(cfg.objectives)[0];
  const total = usd * cfg.rate;
  const reachLo = usd * cfg.reachPerUsd[0], reachHi = usd * cfg.reachPerUsd[1];
  const resLo = usd / goal.costPerResult[1], resHi = usd / goal.costPerResult[0];
  const mid = (reachLo + reachHi) / 2;

  useEffect(() => {
    animateNumber(big.current, lastReach.current, mid);
    lastReach.current = mid;
  }, [mid]);

  const orderLink = wa(
    "Namaste! I want to boost my page.\n\nAd budget: $" + usd + " (" + npr(total) + ")\nDuration: " + days + " days\nGoal: " + goal.label +
    "\nEstimated reach: " + fmt(reachLo) + " – " + fmt(reachHi) + " people"
  );

  return (
    <section className="section" id="calculator">
      <div className="container">
        <div className="section-head reveal">
          <span className="eyebrow">Boost calculator</span>
          <h2 className="h-section">How many people can <span className="hl">you reach?</span></h2>
          <p>Move the sliders to estimate your Facebook &amp; Instagram boost results and price in NPR.</p>
        </div>
        <form className="calc reveal" onSubmit={(e) => e.preventDefault()}>
          <div className="calc-controls">
            <div className="calc-row">
              <div className="top"><label htmlFor="b-budget">Ad budget</label><output>${usd}</output></div>
              <input id="b-budget" type="range" name="budget" min="5" max="500" step="5" value={usd} style={fill(usd, 5, 500)} onChange={(e) => setUsd(Number(e.target.value))} />
            </div>
            <div className="calc-row">
              <div className="top"><label htmlFor="b-days">Duration</label><output>{days + (days === 1 ? " day" : " days")}</output></div>
              <input id="b-days" type="range" name="days" min="1" max="30" step="1" value={days} style={fill(days, 1, 30)} onChange={(e) => setDays(Number(e.target.value))} />
            </div>
            <div className="calc-row mb-0">
              <div className="top"><span id="b-goal">Campaign goal</span></div>
              <div className="seg" role="radiogroup" aria-labelledby="b-goal">
                {GOALS.filter(([k]) => cfg.objectives[k]).map(([k, label]) => (
                  <label key={k}><input type="radio" name="objective" value={k} checked={objective === k} onChange={() => setObjective(k)} /><span>{label}</span></label>
                ))}
              </div>
            </div>
          </div>
          <div className="calc-result" aria-live="polite">
            <span className="eyebrow" style={{ marginBottom: 0 }}>Estimated reach</span>
            <div className="calc-big"><span ref={big}>0</span><small style={{ fontSize: "1.1rem", color: "#9db5a4" }}> people</small></div>
            <div className="calc-kv"><span>Reach range</span><b>{fmt(reachLo)} – {fmt(reachHi)}</b></div>
            <div className="calc-kv"><span>Expected results</span><b>{fmt(resLo)} – {fmt(resHi)} {goal.label}</b></div>
            <div className="calc-kv"><span>Per day</span><b>{npr(total / days)}</b></div>
            <div className="calc-kv" style={{ fontSize: "1.1rem" }}><span>Total price</span><b style={{ color: "var(--lime)" }}>{npr(total)}</b></div>
            <a className="btn btn--lime btn--block" style={{ marginTop: 18 }} target="_blank" rel="noopener noreferrer" href={orderLink}>Boost Now via WhatsApp</a>
            <p className="form-note" style={{ color: "#7f9887", marginBottom: 0 }}>Estimates based on typical Nepal audiences. Actual results vary by content and targeting.</p>
          </div>
        </form>
      </div>
    </section>
  );
}
