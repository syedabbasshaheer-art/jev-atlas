/* relevance.mjs — the hard accept/reject gate for a harvested candidate.
 *
 * THE RULE: a false reject is cheap, a false accept is not.
 * Letting a real Jev project slip through costs one missing row. Letting a
 * TypeScript utility library in makes the whole catalogue look unreliable,
 * and a reader who spots one wrong row stops trusting the other thousand.
 * So this gate is tuned for PRECISION and is deliberately harsh.
 *
 * It already caught: typesafe-i18n, typesafe-actions, typesafe-path,
 * typesafe-decorators — four TypeScript libraries with no connection to Jev,
 * admitted by an earlier filter that matched bare "typesafe".
 */

/* ── STRONG: unambiguous. "jev" as its own word, or TypeSafe bound to the
      product, or the model-class name. Any one of these is enough. ── */
const STRONG = [
  /\bjev\b/i,                       // the word on its own
  /\bjev[-_]/i,                     // jev-router, jev_client
  /[-_]jev\b/i,                     // openjev, pi-jev
  /typesafe[\s'’]*(?:ai|jev)/i,     // "TypeSafe AI", "TypeSafe's Jev"
  /\bsystem[\s-]?one\b/i,           // the model class
  /\bsystemone\b/i,
];

/* ── POISON: present, and the candidate is almost certainly something else.
      Checked only when no STRONG signal fired, so a genuine Jev project that
      happens to mention TypeScript is not punished. ── */
const POISON = [
  /\btypesafe[-_](i18n|actions?|path|decorators?|react|router|api|sql|css|store|rpc|env|form)/i,
  /\bjevons?\b/i,                   // Jevons paradox, and the surname
  /\bjevgen|jevtic|jevons|jevric/i, // people called Jev-something
];

/* ── WEAK: on its own, not enough. Needs a second weak signal. ── */
const WEAK = [
  /\bdecision model\b/i,
  /\btyped decisions?\b/i,
  /\bcalibrated\b/i,
  /\bchoice.{0,12}score.{0,12}noul\b/i,
  /\bnoul\b/i,
];

/**
 * @returns {{accept:boolean, reason:string, tier:"strong"|"weak"|"none"|"poison"}}
 */
export function judge(item) {
  const hay = [item.title, item.text, (item.tags || []).join(" "), item.url]
    .filter(Boolean).join(" ");

  const strong = STRONG.filter((re) => re.test(hay));
  if (strong.length) return { accept: true, tier: "strong", reason: "matched " + strong[0] };

  const poison = POISON.find((re) => re.test(hay));
  if (poison) return { accept: false, tier: "poison", reason: "looks like something else: " + poison };

  const weak = WEAK.filter((re) => re.test(hay));
  if (weak.length >= 2) return { accept: true, tier: "weak", reason: weak.length + " weak signals" };
  if (weak.length === 1) return { accept: false, tier: "weak", reason: "only one weak signal, not enough" };

  return { accept: false, tier: "none", reason: "no Jev signal at all" };
}

export const RELEVANT = { test: (s) => judge({ title: s, text: "", tags: [], url: "" }).accept };
