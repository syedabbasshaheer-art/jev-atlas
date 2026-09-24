# Launch checklist

One line per thing. `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked on you.

Repo: `D:\10. Apps\jev-atlas` · GitHub: https://github.com/syedabbasshaheer-art/jev-atlas

---

## 0. Already done

- [x] Repo created, public, 4 commits pushed
- [x] Build pipeline green — `npm run build` regenerates everything from `corpus.json`
- [x] 359 projects classified into 19 fields, 10 build shapes, 15 capabilities
- [x] 12 blueprints, each citing shipped evidence, with the build failing on a dangling reference
- [x] Colour tokens generated and contrast-audited — the build refuses to render below 4.5:1
- [x] Multi-source harvester — 1,084 unique candidates from 5 sources
- [x] X enrichment via the syndication endpoint (45/45, zero failures)
- [x] `docs/` — README, JEV-REFERENCE, PATTERNS, CAPABILITIES, PLAN-HARVEST, CONTRIBUTING

---

## 1. Content quality — before anyone sees it

The catalogue is only as good as its classification, and the classifier is currently a regex.

- [ ] **1.1** Build `src/classify-ai.mjs` — typed classification per candidate
- [ ] **1.2** Run it over the existing 359 first, and diff against the regex output. Any disagreement is either a regex bug or a model error, and both are worth seeing before trusting it at scale
- [ ] **1.3** Review the diff by hand. Keep the overrides that were right
- [ ] **1.4** Run over the 1,084 harvested candidates: is-it-a-project, field, shape, capabilities, quality
- [ ] **1.5** Promote the ones that pass into `corpus.json` via `corpus-additions.json`
- [ ] **1.6** Rebuild, re-read the field counts, sanity-check against the gallery's own numbers

> Provider: **Claude**, using the `ANTHROPIC_API_KEY` already in `web/.env.local`.
> **OpenRouter does not serve Jev** — 0 matches in 446 models — so recharging it buys nothing here.
> Swap to Jev later by passing a different provider; the classifier does not care which.

---

## 2. The page

- [x] **2.1** Submission dialog wired to the FAB
- [ ] **2.2** Publish with `capabilities: {db, sample, user}`
- [ ] **2.3** Add the Community view to the segmented control
- [ ] **2.4** Check it degrades cleanly when `db` resolves `null` — a page opened outside claude.ai must still work
- [x] **2.5** Looked at it at phone width

---

## 3. GitHub

- [ ] **3.1** Repo description and topics — `jev`, `typesafe`, `catalogue`, `capabilities`, `system-one`
- [ ] **3.2** Fill the live URL into `README.md` (currently a placeholder saying "add your Vercel URL here")
- [ ] **3.3** Social preview image — what shows when the link is shared
- [ ] **3.4** Decide: issues on or off. A catalogue invites corrections, so probably on
- [ ] **3.5** Add a `LICENSE` note to the README about project links belonging to their authors

---

## 4. Vercel — runbook in [DEPLOY.md](DEPLOY.md)

- [!] **4.1** **You:** `npm i -g vercel`, or import the repo in the Vercel dashboard
- [ ] **4.2** Deploy. `vercel.json` already declares `buildCommand: npm run build` and `outputDirectory: public`, so defaults should work
- [ ] **4.3** Confirm the deployed page matches local — same build, so it should, but check
- [ ] **4.4** Set the Node version if the build complains — the scripts need Node 20+

---

## 5. Domain

- [!] **5.1** **You:** buy it
- [ ] **5.2** Add it in Vercel, project → Settings → Domains
- [ ] **5.3** Point DNS at Vercel. Apex needs an A record, `www` needs a CNAME — Vercel prints the exact values
- [ ] **5.4** Wait for the certificate, then confirm https works on both apex and www
- [ ] **5.5** Update the README and the page footer with the real domain

---

## 6. Launch

- [ ] **6.1** Write the launch post. The white-space table is the hook: Games 82, Education 1
- [ ] **6.2** Submit to the awesome-jev lists — they already cross-link each other, so being on them is how people find this
- [ ] **6.3** Post it where the audience is: X, the relevant subreddit, Hacker News
- [ ] **6.4** Re-run the harvester a week later. Whether the field skew survives the launch window is the one open question the data cannot yet answer

---

## Blocked on you

| # | What | Why it needs you |
|---|---|---|
| 4.1 | Vercel CLI or dashboard import | Account access |
| 5.1 | Buy the domain | Payment |

Everything else I can do.

---

## Decisions still open

| Question | Options | Leaning |
|---|---|---|
| Classifier provider | Claude now · Jev later · self-hosted `kev` | **Claude now** — the key exists, the cost is cents, and the classifier takes a provider argument so switching is one flag |
| Submissions | open to anyone · moderated queue | **Moderated.** jevable moderates, and an open queue on a public link is a spam target |
| Repo name on the domain | keep `jev-atlas` · rename to match the domain | Decide when the domain is bought |
