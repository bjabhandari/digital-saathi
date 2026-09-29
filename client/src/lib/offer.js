/* Daily offer countdown: ends at the next midnight in Nepal time, then restarts */
export function offerOn(offer) { return Boolean(offer && offer.enabled); }
const offsetMs = (offer) => ((offer && offer.timezoneOffsetMinutes) || 345) * 60000;

export function offerParts(offer) {
  const left = 86400000 - ((Date.now() + offsetMs(offer)) % 86400000);
  const t = Math.floor(left / 1000);
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0"));
}

export function offerDateLabel(offer) {
  const d = new Date(Date.now() + offsetMs(offer));
  const day = d.getUTCDate();
  const sfx = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return d.toLocaleString("en-US", { month: "long", timeZone: "UTC" }) + " " + day + sfx;
}
