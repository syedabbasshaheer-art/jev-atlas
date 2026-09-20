# Contributing

The most useful thing you can add is a **blueprint** — a composed, launchable project in a field that is currently empty.

## Add a blueprint

One object in `src/blueprints.mjs`. The validator will tell you precisely what is wrong, so add it, run `npm run build`, and fix what it names.

```js
{
  id: "kebab-case-id",
  category: "commerce",          // must exist in FIELDS (src/taxonomy.mjs)
  name: "Short plain name",
  jtbd: "When <situation>, I want <motivation>, so <outcome>.",
  who: "Who this is for, in one line.",
  why_now: "What changed that makes this buildable. Cite a number if you have one.",

  stack: ["fetch", "classify", "vision"],   // every key must exist in CAPABILITIES
  jev_role: "What the typed model decides. Be specific about the questions.",
  not_jev: "The rest of the build. Usually most of it.",

  phases: [
    { n: 1, name: "Phase name", detail: "What you actually do.", caps: ["fetch"] }
  ],

  evidence: ["Exact title of a shipped project"],  // MUST match data/evidence.json exactly
  hard_parts: ["What actually goes wrong, from experience or from the evidence."],

  effort: 3,   // 1 easy … 5 hard
  impact: 5,   // 1 niche … 5 many people want this
  moat: "What compounds if you keep running it. 'None' is an honest answer."
}
```

### The rules that matter

**Evidence must resolve.** Every title in `evidence` has to match a project in `data/evidence.json` character for character. The build fails otherwise:

```
BUILD FAILED - 1 dangling reference(s):
  - blueprint my-idea: evidence "A thing that does not exist" not in corpus
```

This is deliberate. A blueprint that cites work nobody did is worse than no blueprint.

**Capabilities must exist.** Same rule for `stack` and every phase's `caps`. If you need a capability the registry lacks, add it to `src/capabilities.mjs` **first**, with real providers and a real note.

**`jtbd` is a job, not a pitch.** "When … I want … so …". If it reads like marketing, rewrite it from the user's side.

**`hard_parts` is the valuable field.** Anyone can list phases. What stops people is knowing that OCR on curved packaging is the real work, or that a noisy gate gets switched off within a week. Put the discouraging thing in.

**`moat: "None"` is allowed** and sometimes correct. Say so rather than inventing a defensibility story.

## Add a capability

In `src/capabilities.mjs`. Keep it **provider-agnostic** — the capability is the job, the providers are today's options, and one of them should usually be a self-hostable or fallback route so the entry survives a vendor disappearing.

## Fix a classification

`src/classify.mjs` assigns a field by ordered regex over title, tags and description. Rules are wrong sometimes. Two ways to fix:

1. **Tighten the rule** if it is wrong in general. Check the counts afterwards — see below.
2. **Add an override** in `OVERRIDE_BY_TITLE` if it is wrong for one project.

### Always check against the gallery's own counts

The scraped JSON carries the gallery's own category for every project. After changing a rule, compare. This repo shipped a bug where `/market/` in the finance rule silently ate every **Marketing** project, giving Finance 30 and Marketing 1, with no error at all. The gallery said 17. That comparison is the only thing that caught it.

## Generated files

`docs/PATTERNS.md` and `docs/CAPABILITIES.md` are **generated** by `npm run docs`. Editing them by hand does nothing — the next build overwrites your work. Edit `src/taxonomy.mjs` or `src/capabilities.mjs`.

## Before you open a PR

```bash
npm run build     # must print BUILD OK, DOCS OK and RENDER OK
```

If it prints `BUILD FAILED`, read the dangling-reference list. It names the exact field.

## What this repo is not

Not another awesome-list. Six of those already exist and they are better at collecting links. The value here is **composition**: which capabilities a real project needs, in what order, and what goes wrong. A PR that adds a bare link without that is out of scope.
