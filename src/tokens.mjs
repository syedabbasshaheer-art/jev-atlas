// tokens.mjs - generate the Material 3 style role tokens and PROVE the contrast.
//
// Why generated: the previous palette failed because every surface sat within
// 3% lightness of every other one, so cards, rail and page merged into one
// field. M3 fixes that with a surface-container ladder of distinct tones.
//
// Method: build tonal ramps in OKLCH (perceptually even lightness), assign M3
// roles by tone, convert to sRGB hex, then MEASURE every pairing that carries
// text or a boundary. Nothing ships unless it passes.
//
// Run: node src/tokens.mjs         prints the audit + the CSS block

/* ---------- colour maths ---------- */
const srgb = (c) => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(v * 255))); };
function oklchToHex(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  return "#" + [r, g, bl].map((x) => srgb(x).toString(16).padStart(2, "0")).join("");
}
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
function lum(hex) { const h = hex.replace("#", ""); return 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16)); }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

/* ---------- tonal ramps ----------
   tone = M3 tone number 0..100, mapped to OKLCH L.
   Warm accent kept (assessment T007 purged cold blue/lavender), but the
   NEUTRALS are near-neutral rather than cream, which is what stops every
   surface merging into the one before it. */
const HUE = { primary: 38, secondary: 150, tertiary: 82, error: 27, neutral: 60, neutralVar: 55 };
const CHROMA = { primary: 0.14, secondary: 0.07, tertiary: 0.11, error: 0.16, neutral: 0.004, neutralVar: 0.012 };
const toneL = (t) => 0.06 + (t / 100) * 0.94;
const ramp = (name) => (t) => oklchToHex(toneL(t), t <= 4 || t >= 99 ? 0 : CHROMA[name], HUE[name]);
const P = ramp("primary"), S = ramp("secondary"), T = ramp("tertiary"), E = ramp("error"), N = ramp("neutral"), NV = ramp("neutralVar");

/* ---------- M3 role assignment ---------- */
export const LIGHT = {
  primary: P(40), onPrimary: P(100), primaryContainer: P(90), onPrimaryContainer: P(20),
  secondary: S(40), onSecondary: S(100), secondaryContainer: S(90), onSecondaryContainer: S(20),
  tertiary: T(40), onTertiary: T(100), tertiaryContainer: T(90), onTertiaryContainer: T(20),
  error: E(40), onError: E(100), errorContainer: E(90), onErrorContainer: E(20),
  surface: N(98), surfaceDim: N(87), surfaceBright: N(98),
  surfaceContainerLowest: N(100), surfaceContainerLow: N(96), surfaceContainer: N(94),
  surfaceContainerHigh: N(92), surfaceContainerHighest: N(90),
  onSurface: N(10), onSurfaceVariant: NV(30), outline: NV(50), outlineVariant: NV(80),
  inverseSurface: N(20), inverseOnSurface: N(95),
};
export const DARK = {
  primary: P(80), onPrimary: P(20), primaryContainer: P(30), onPrimaryContainer: P(90),
  secondary: S(80), onSecondary: S(20), secondaryContainer: S(30), onSecondaryContainer: S(90),
  tertiary: T(80), onTertiary: T(20), tertiaryContainer: T(30), onTertiaryContainer: T(90),
  error: E(80), onError: E(20), errorContainer: E(30), onErrorContainer: E(90),
  surface: N(6), surfaceDim: N(6), surfaceBright: N(24),
  surfaceContainerLowest: N(4), surfaceContainerLow: N(10), surfaceContainer: N(12),
  surfaceContainerHigh: N(17), surfaceContainerHighest: N(22),
  onSurface: N(90), onSurfaceVariant: NV(80), outline: NV(60), outlineVariant: NV(30),
  inverseSurface: N(90), inverseOnSurface: N(20),
};

/* ---------- the audit: text pairs need 4.5, UI boundaries need 3 ---------- */
const TEXT = [
  ["onSurface", "surface"], ["onSurface", "surfaceContainer"], ["onSurface", "surfaceContainerHigh"],
  ["onSurface", "surfaceContainerLow"], ["onSurface", "surfaceContainerHighest"],
  ["onSurfaceVariant", "surface"], ["onSurfaceVariant", "surfaceContainer"], ["onSurfaceVariant", "surfaceContainerHigh"],
  ["onPrimary", "primary"], ["onPrimaryContainer", "primaryContainer"],
  ["onSecondaryContainer", "secondaryContainer"], ["onTertiaryContainer", "tertiaryContainer"],
  ["onError", "error"], ["onErrorContainer", "errorContainer"],
  ["inverseOnSurface", "inverseSurface"],
];
const UI = [
  ["outline", "surface"], ["outline", "surfaceContainer"], ["primary", "surface"],
];
// Adjacent surfaces are not a text pair. Two surfaces at 3:1 would mean black
// beside white. What stops them merging is a perceptible tone step PLUS a
// border that reads, so those are the two things measured.
const SEP = [
  ["surfaceContainerLowest", "surfaceContainerHighest", 1.25],
  ["surface", "surfaceContainerHigh", 1.12],
  ["surfaceContainerLow", "surfaceContainerHighest", 1.12],
  ["outlineVariant", "surface", 1.30],
  ["outlineVariant", "surfaceContainerLow", 1.25],
];
export function audit(scheme, name) {
  const out = [];
  for (const [fg, bg] of TEXT) out.push({ kind: "text", pair: fg + " on " + bg, r: ratio(scheme[fg], scheme[bg]), need: 4.5 });
  for (const [fg, bg] of UI) out.push({ kind: "ui", pair: fg + " vs " + bg, r: ratio(scheme[fg], scheme[bg]), need: 3 });
  for (const [a, b, n] of SEP) out.push({ kind: "sep", pair: a + " / " + b, r: ratio(scheme[a], scheme[b]), need: n });
  const fails = out.filter((o) => o.r < o.need);
  return { name, out, fails };
}

/* ---------- emit ---------- */
const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
export const cssBlock = (scheme, indent) => Object.entries(scheme)
  .map(([k, v]) => `${indent}--${kebab(k)}:${v};`).join("\n");

if (process.argv[1] && process.argv[1].indexOf("tokens.mjs") >= 0) {
  let bad = 0;
  for (const [scheme, name] of [[LIGHT, "LIGHT"], [DARK, "DARK"]]) {
    const a = audit(scheme, name);
    console.log(`\n=== ${name} ===`);
    for (const o of a.out) {
      const ok = o.r >= o.need;
      if (!ok) bad++;
      console.log(`  ${ok ? "PASS" : "FAIL"}  ${o.r.toFixed(2).padStart(6)} (need ${o.need})  ${o.pair}`);
    }
    console.log(`  surface ladder: ` + ["surfaceContainerLowest","surfaceContainerLow","surfaceContainer","surfaceContainerHigh","surfaceContainerHighest"]
      .map((k) => scheme[k]).join(" -> "));
  }
  console.log(bad ? `\n${bad} FAILURE(S)` : "\nALL PAIRS PASS");
  process.exit(bad ? 1 : 0);
}
