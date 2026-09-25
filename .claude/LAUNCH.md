# LAUNCH.md — system of record

> **This file is the truth.** Any board is a *view* generated from it. The board holds no state of
> its own, so it cannot go stale.
>
> **Project:** jev-atlas — a category-anchored catalogue of buildable projects.
> **Repo:** `D:\10. Apps\jev-atlas` · https://github.com/syedabbasshaheer-art/jev-atlas
> **Live:** nothing is deployed yet. That is Goal 1.
>
> **Deploy doctrine is machine-wide, not in this file: `~/.claude/deploy-kit/DEPLOY.md`**, and the
> long-form version at `C:\Users\syeda\Edtech\web\docs\Vercel\from-push-to-live.md` (nine phases).
> Cards below cite it rather than repeating it. The repo's own `DEPLOY.md` is the click-by-click
> runbook for one sitting; this file is the whole plan.

## What this product is, in one line

**Category is the spine. Jev is one capability of fifteen.** Somebody arrives wanting to build a
thing — an XXXL-fit finder, a receipt parser, a voice tutor — and leaves knowing which shipped
projects already solved a piece of it and what they were built from. The catalogue is the evidence;
the capability list is the parts bin.

**The core problem is search and discovery.** 1,442 rows is not a list, it is a shop. The standard
is not another awesome-list — it is what a person already expects from an ecommerce grid, a food
delivery app, or Airbnb: type three letters and see results, every filter carries a live count,
nothing ever returns a blank screen, and any view you are looking at has a URL you can send.

## Two concepts, and nothing else

| | |
|---|---|
| **GOAL** | The only real thing. A card belongs to exactly one. |
| **CARD** | A piece of work. May depend on other cards. |

**"When does this run" is not a field — it is computed.** A card is **do-able** when every card it
depends on is `DONE`. Nothing is scheduled by hand, so nothing can drift, and readiness is never
stored as a state anyone has to maintain.

**Card IDs match their goal.** A card numbered `2.x` is in Goal 2. Watch-list conditions are `W1–Wn`
and decisions are `D1–Dn` — neither are cards. They never move and are never scheduled.

## Format

| Field | Values |
|---|---|
| `ST` | `BACKLOG` · `BLOCKED` · `DOING` · `DONE` — **four states, no READY.** A card with its deps met is do-able, and that is computed, not stored. **`BLOCKED` is only for something OUTSIDE this repo stopping the work**; waiting on another card is `BACKLOG` |
| `OWN` | `agent` · `human` |
| `TYPE` | `code` · `config` · `account` · `content` · `verify` |
| `EFF` | `Q` <15m · `S` <1h · `L` >1h |
| `GATE` | `-` · `approval` · `money` |
| `DEPS` | card IDs, or `-` |

**The rule:** nothing enters `DONE` without its DONE-WHEN condition *observed*. Unverifiable is `BLOCKED`.

---

## GOALS

| # | Goal | One line | Cards | State |
|---|---|---|---|---|
| **1** | **Go live** | A stranger opens a URL and the atlas loads | 36 | **ACTIVE** |
| **2** | **Search & discovery** | Find the right project in under ten seconds | 20 | **ACTIVE** |
| 3 | The funnel | awareness → discovery → learn → try → collaborate | 9 | after 2 |
| 4 | Stay fresh | A daily cron adds new projects, timestamped | 9 | after 1 |
| 5 | Classification at scale | Every row typed by a model, not a regex | 6 | after 4 |

**Sequence.** Goal 1 and Goal 2 run in parallel — deploying and being good are different events, and
the invisibility switch (card 1.6) is what makes that safe. Goal 1 ends at card 1.30, when the
noindex comes off. Nothing in Goal 3 matters before Goal 2, because a funnel over a search box
nobody can use is a funnel to nowhere. Goal 4 needs a live site to deploy into. Goal 5 needs Goal 4
so the classifier runs on the cron rather than by hand.

---

## GOAL 1 — Go live

Mapped phase by phase onto THE SEQUENCE. **The domain is Phase 4, not step 2.** Phases 1–3 and 6–8
need no domain; Phase 4 is the only step that spends money and the only one that cannot be undone.

### Phase 0–1 · Decide, and the repository

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.1 | DONE | agent | code | L | - | - | Static-only architecture: one HTML file, no framework, no function, no database, no key | `npm run build` regenerates the whole site from `data/corpus.json` with no network call |
| 1.2 | DONE | agent | code | S | - | 1.1 | Its own git repo at `D:\10. Apps\jev-atlas`, not a folder inside another project | `git log` is this project's history alone |
| 1.3 | DONE | agent | verify | S | - | 1.1 | The build is green before anything else happens | The log prints `BUILD OK`, `DOCS OK`, `RENDER OK`, and fails on a dangling blueprint reference |
| 1.4 | DONE | agent | config | Q | - | 1.3 | `vercel.json` declares `buildCommand` and `outputDirectory: public`, framework preset deliberately `null` | Importing the config needs no dashboard override |
| 1.5 | DONE | agent | verify | Q | - | 1.1 | No secret can leak, because there is none — no API key, no database, no function (LAW 3) | Grep of `public/` for `KEY`, `SECRET`, `TOKEN`: no matches |
| 1.6 | DONE | agent | code | S | - | 1.4 | **The invisibility switch.** One env flag, default off, reaching `<meta robots>`, the `X-Robots-Tag` header and `robots.txt` | Built output verified both ways: off gives `noindex,nofollow` and `Disallow: /`; on gives `index,follow` plus the sitemap |
| 1.7 | DONE | agent | config | S | - | 1.4 | Security headers in `vercel.json`: HSTS, frame-deny, nosniff, referrer policy, permissions policy, and one-year `immutable` cache on `/thumbs/*` | Six header rules present; `curl -I` on a thumb shows `Cache-Control: immutable` |
| 1.8 | BACKLOG | agent | config | Q | - | - | Reorder the repo's own `DEPLOY.md` to match THE SEQUENCE — it currently buys the domain at step 2 | The runbook's step order is 1 import, 2 verify, 3 domain, matching phases 3, 6, 4 |

### Phase 2 · GitHub

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.9 | DONE | human | account | S | - | 1.3 | Repo created under `syedabbasshaheer-art` and `main` pushed | `git remote -v` set, commits on GitHub |
| 1.10 | DONE | agent | content | Q | - | 1.9 | Repo description and topics — `jev`, `typesafe`, `catalogue`, `capabilities`, `system-one` | The repo page shows all five topics and a one-line description |
| 1.11 | BACKLOG | agent | content | Q | - | 1.9 | A `LICENSE` note in the README: project links and screenshots belong to their authors; the classification is ours | The README says who owns what |
| 1.12 | BACKLOG | human | account | Q | - | 1.9 | Server-side branch protection on `main` — local hooks run only where they are installed (doctrine open #7) | A direct push without a passing check is refused |

### Phase 3 · First deploy

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.13 | DONE | agent | config | Q | - | - | **Do this before touching Vercel.** Deny the ten money and production MCP tools — `buy_pro`, `buy_credits`, `buy_domain`, `buy_domains`, `buy_single_domain`, `buy_addon`, `pause_project`, `create_deployment`, `update_project_protection_bypass`, `patch_url_protection_bypass` — plus `vercel --prod`, `deploy`, `curl`, `httpstat`, `env pull`. Set `VERCEL_PLUGIN_TELEMETRY=off` (LAW 1) | `.claude/settings.json` carries the deny list, and the plugin cannot be consented into spending |
| 1.14 | DONE | agent | account | S | - | 1.4, 1.6, 1.13 | Import `syedabbasshaheer-art/jev-atlas` on Vercel. Dashboard, not CLI. Accept every default. Node 20+ if the build complains. Set the noindex flag in all environments | First build green on a `*.vercel.app` URL |
| 1.15 | DONE | agent | verify | Q | - | 1.14 | Confirm **Deployments → the deployment → Source** reads `git` with a SHA — answer "how does this deploy?" from that record, never from the page rendering (LAW 2) | The Source panel names a commit |
| 1.16 | DONE | agent | verify | S | - | 1.14 | Open the preview: every filter, the reading pane, deep links, the palette, the theme toggle. Response carries `X-Robots-Tag: noindex` | Every surface renders and the noindex header is present |
| 1.17 | DONE | agent | verify | S | - | 1.14 | **The 1,204 thumbnails are a bulk upload and get verified from the outside** (LAW 4). Walk `public/thumbs` on disk, sample keys at random, fetch each from the public host. Never read back the build's own manifest — that measures obedience, not completeness | A random sample of 40 keys all return 200 with a non-zero body, and the sampled count matches disk |

### Phase 4 · The domain — the only irreversible spend

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.18 | BACKLOG | human | account | Q | approval | 1.16 | Decide two or three acceptable names. `.com` first, `.dev` fallback | Names stated |
| 1.19 | BACKLOG | agent | verify | Q | - | 1.18 | Check availability and price **by RDAP, not a registrar search box** — a search box is a sales funnel and prices unowned names as "premium" (DNS 4). `curl -s -o /dev/null -w "%{http_code}" https://rdap.org/domain/<name>` — 404 free, 200 taken | Each name checked across both TLDs with a real status code |
| 1.20 | BACKLOG | human | account | S | **money** | 1.19 | Buy at Cloudflare Registrar — at cost, no renewal markup, same dashboard as the other project | The domain is in the account |
| 1.21 | BACKLOG | human | account | Q | - | 1.20 | Protect it: auto-renew · WHOIS privacy · DNSSEC (checklist 10) | All three on |

### Phase 5 · DNS and connection

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.22 | BACKLOG | human | config | Q | - | 1.20, 1.14 | Add the domain in **Vercel first**, so Vercel reveals the record it wants. Take the CNAME it recommends, never the legacy `76.76.21.21` | Vercel shows the exact target value |
| 1.23 | BACKLOG | human | config | S | - | 1.22 | The two records in Cloudflare: CNAME `@` and CNAME `www`, both to Vercel's value, **both proxy OFF (grey)**. Orange loses visitor IPs and can break certificate issuance (DNS 3) | Both records grey; `dig` resolves to the Vercel target |
| 1.24 | BACKLOG | human | config | Q | - | 1.23 | **Delete any wildcard `*` A record Cloudflare imported.** It answers for names that never existed and silently shadows anything added later (LAW 5) | No wildcard row in the zone |
| 1.25 | BACKLOG | agent | verify | Q | - | 1.23 | **Read the CAA records immediately** (DNS 1). An imported zone can inherit rows that fail closed and block certificate issuance with no error anywhere — the symptom is a dead TLS handshake while the dashboard says Active. `dig CAA <domain> +short @1.1.1.1` | Either no CAA rows, or only rows naming the issuer Vercel uses |
| 1.26 | BACKLOG | human | config | Q | - | 1.22 | `www` redirects to the apex as a **308 — permanent and method-preserving, never a 307** (DNS 5) | `curl -I` on www returns 308 |
| 1.27 | BACKLOG | human | config | Q | - | 1.23 | Cloudflare SSL/TLS mode **Full (strict)**, never Flexible | The mode is set |

### Phase 6 · Verify from the outside

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.28 | BACKLOG | agent | verify | S | - | 1.25, 1.26, 1.27 | End to end on the real domain: valid certificate on apex and www, every route renders, still noindex, `Cache-Control: immutable` on `/thumbs/`, and a thumbnail loads over the real hostname | Every check passes from a machine that is not building the site |
| 1.29 | BACKLOG | agent | verify | S | - | 1.16 | The responsive sweep: 320 → 1920px. No horizontal scroll, nothing overflowing, no tap target under 44px, no text under 12px | Headless run over every viewport, clean |

### Phase 7–8 · Protection and monitoring

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.30 | BACKLOG | human | account | Q | - | 1.14 | **Hobby is personal, non-commercial only — donations included** (COST 1). A public catalogue with no revenue is inside it. Confirm the plan and turn on usage alerts | Plan confirmed, alerts on |
| 1.31 | BACKLOG | human | verify | S | - | 1.28 | **Drill the rollback before you need it** (LAW 6 #6). Push auto-promotes, so push equals production. Push a trivial change, promote the previous deployment from the dashboard, confirm the site reverts | The site reverted, once, while nothing was wrong |
| 1.32 | BLOCKED | agent | config | S | - | 1.28 | Uptime and certificate-expiry monitoring — **nothing in this stack watches either** (doctrine open #6). A silent renewal failure on a 3-month certificate is a dead site with no notice. *Blocked: needs a third-party monitor account that does not exist* | An alert fires on a deliberately induced failure |

### Phase 9 · Going public

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 1.33 | BACKLOG | agent | content | Q | - | 1.28 | Live URL into `README.md` — it still says "add your Vercel URL here" — and into the page footer | Neither says placeholder |
| 1.34 | DOING | agent | code | S | - | 1.28 | OG meta and a social preview image, so a shared link is not a grey rectangle | A link preview renders a real card on X and in a chat app |
| 1.35 | BACKLOG | agent | config | Q | approval | 1.33, 1.34, 2.20 | **GO PUBLIC:** flip the noindex switch, redeploy, submit the sitemap | `robots.txt` allows crawling and pages carry `index,follow`. Its own commit, deliberately |
| 1.36 | BACKLOG | human | content | S | approval | 1.35 | Announce: the six `awesome-jev` lists first — they cross-link each other and that is how people find this — then X, the relevant subreddit, Hacker News. The white-space table is the hook: Games 82, Education 1 | Posted, with the live URL |
| 1.37 | BACKLOG | human | account | Q | - | 1.14 | **Pick the production hostname.** Vercel generated `jev-atlas-drab.vercel.app`, which is public and works, but `drab` is a random word and it is the URL being shared until a domain exists. Rename the project or add a cleaner alias | The shared link is one a person would type |

---

## GOAL 2 — Search & discovery

**The standard being matched.** An ecommerce grid, a food delivery app, Airbnb. Four behaviours the
user already expects and does not think about: results appear while typing · every filter shows how
many things it would leave · a blank screen never happens · the view you are looking at has a URL.
None of the four are true today.

### Already true

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 2.1 | DONE | agent | code | L | - | - | Three-pane shell: filter rail, bento feed, reading pane — so scrolling the catalogue and reading a project happen side by side | All three panes present and independently scrollable |
| 2.2 | DONE | agent | code | S | - | 2.1 | Every card opens the same reading pane, from every view. `tabindex`, Enter and Space, and the external link still opens in a new tab without triggering it | Keyboard reaches every card and the click guard holds |
| 2.3 | DONE | agent | code | S | - | 2.1 | Family and Field merged into one tree — family is the parent row, fields nest. Two filter groups for one idea was the biggest navigation complaint | One tree, and the dynamic "Field in Family" re-titling is gone |
| 2.4 | DONE | agent | code | S | - | 2.1 | Every fabricated metric removed: Effort, Usefulness, and npm's popularity score shown as stars. 281 fake star counts dropped | Only objective values remain: GitHub stars, X likes, date, source, author |
| 2.5 | DONE | agent | code | Q | - | 2.4 | Sort reduced to three honest options: Most starred · Newest · A to Z | The dropdown has three entries and each is computable from the data |
| 2.6 | DONE | agent | code | S | - | 2.1 | Windowed at 60 cards — 1,442 rendered at once is a dead tab | Scroll extends the window; first paint does not wait on the tail |
| 2.7 | DONE | agent | code | L | - | - | The hard QA gate: precision over recall. Centrality classification rejects `peripheral`, disclaimer detection catches "alternative to", and star counts only survive from GitHub | `data/qa-rejects.json` is readable and each rejection names its reason |

### The work

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 2.8 | DONE | agent | content | L | - | 2.1 | Covers for the remaining 241 rows. 1,201 of 1,442 have one; a placeholder-only card reads as a dead row in an image-led grid | Every row has a cover or a deliberate monogram, never a broken-image icon |
| 2.9 | DONE | agent | code | S | - | 2.1 | **Typo-tolerant search.** It is plain `indexOf` today, so "langchian" finds nothing. Fuse.js is ~12KB from cdnjs | A one-character typo in a known project name still ranks it first |
| 2.10 | DONE | agent | code | S | - | 2.3 | **A live count against every filter**, recomputed as the query narrows. A facet that leads to zero results should say so before it is clicked | Every rail row shows a number, and the numbers change with the search box |
| 2.11 | DONE | agent | code | S | - | 2.10 | **Zero results is never a blank screen.** Say which filter was the one that emptied it, offer to drop that one, and show the nearest matches | An impossible filter combination still shows something to click |
| 2.12 | DONE | agent | code | S | - | 2.9 | Relevance becomes a fourth sort, and the default one, while a query is active. Today sort still says "Most starred" over a text search, which is the wrong answer to the question asked | Typing switches the sort label; clearing restores the previous one |
| 2.13 | DONE | agent | code | S | - | 2.1 | **The URL carries the whole state** — query, family, field, capability, pattern, sort, and the open project. Today the hash holds only view, family and category, so a shared link loses the search | Copy the URL, open it in a clean browser, see the identical screen |
| 2.14 | BACKLOG | agent | code | L | - | 2.13 | Route-based detail at `/project/<slug>` rather than modal-only, so one project is a shareable page with its own OG card | A project URL opens directly and previews correctly when pasted |
| 2.15 | DONE | agent | code | S | - | 2.1 | Tile min-width 272 → 340px, grid gap 12 → 24px, radius 16 → 20px, text padding 20–24px, image edge to edge. The current density fights an image-led layout | Measured in the built page, not asserted |
| 2.16 | DONE | agent | code | S | - | 2.8 | Avatar and author name under every cover, initials-circle when there is no avatar, always the secondary line and never the primary | Attribution renders on every card; the data already exists and is currently thrown away |
| 2.17 | DONE | agent | code | S | - | 2.15 | Category as a ribbon on the image rather than its own row — at 1,442 items a badge row costs a full card of vertical space per screen | The badge sits on the image and the card is shorter |
| 2.18 | DOING | agent | code | S | - | 2.1 | Accessibility pass: focus trap in the command palette (Tab currently escapes to the page behind), `aria-live` on the result count, `role="tablist"` on the segmented control, a visible focus ring everywhere | A full keyboard pass reaches every action, and a screen reader hears the count change |
| 2.19 | BACKLOG | agent | code | S | - | 2.9 | The command palette gains recent and frequent items — it cold-starts empty every time — and groups by kind instead of one flat list | Opening it with no query shows something useful |
| 2.20 | DONE | agent | verify | S | - | 2.15 | **Mobile at 390px**, treated as the primary surface and not a shrunk desktop: the rail becomes a bottom sheet, the reading pane goes full-screen, the grid is one column | A real handset check plus the headless sweep, both clean |
| 2.21 | BACKLOG | agent | verify | S | - | 2.8, 2.15 | **Measure, do not assert.** First contentful paint, interaction latency on a filter click, and layout shift after the images land | Three numbers recorded in the repo, with the date and the machine |
| 2.22 | DONE | agent | verify | S | - | 2.1 | **A test that actually runs the page.** `npm run smoke` loads the built file in real Chrome with `--dump-dom` and reads the DOM back: 14 cases across render, windowing, covers, filtering, exact search, typo search, the empty state, relevance and a deep link. A green build only proves the file was written and its script tags balance | 14 of 14 pass locally **and** against the live host. No dependency; skips itself where there is no Chrome |
| 2.23 | DONE | agent | verify | S | - | 2.8 | **Bulk-upload verification from the outside** (LAW 4). `scripts/verify-images.mjs` walks `public/thumbs` on disk, samples at random, fetches each from the deployed host, and fails on a 404, an empty body, or a file served much smaller than the one on disk | 60 of 60 sampled served correctly from the live host. It is what caught the `/thumbs/` cache bug |

---

## GOAL 3 — The funnel

Awareness → discovery → learn → try → collaborate. Each stage has exactly one job and one card set.

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 3.1 | DONE | agent | code | S | - | - | **Try** — the submission path exists: a circular filled FAB and a native `<dialog>` with `required` and `pattern` validation, wired to `src/submit.js`, which was 21KB with no entry point | The dialog opens from the FAB and validates before it accepts |
| 3.2 | DOING | agent | content | S | - | - | **Learn** — fix the copy that confuses the two axes: *"a build shape is the pipeline; a capability is one job inside it"*, rename "Capability used" to "Capabilities in this build", and define a capability as *"one job a build needs done, independent of which vendor does it"* | All three strings changed and no screen uses the old wording |
| 3.3 | BACKLOG | agent | code | L | - | 2.14 | **Learn** — the reading pane answers "how would I build this?": the build shape, the capabilities it uses, and which shipped project is the evidence for each | Opening any project shows its parts list, and every part links to the capability page |
| 3.4 | BACKLOG | agent | code | S | - | 3.3 | **Try** — copy the build recipe as a prompt, so someone can paste it and start | One button produces text that is useful without editing |
| 3.5 | BACKLOG | agent | content | S | - | 1.34 | **Awareness** — a per-view OG image, so a link to "Education, 1 project" previews as that claim rather than a generic card | A filtered URL previews with its own title and count |
| 3.6 | BLOCKED | agent | code | L | - | 3.1 | **Collaborate** — submissions have to persist somewhere. A static site has no runtime write path: the function filesystem is read-only, and there is no function. *Blocked: needs a decision on where a submission lands — object storage, a form service, or the git path in 3.8* | A submission made by a stranger survives a redeploy |
| 3.7 | BACKLOG | human | account | Q | approval | 3.6 | **Collaborate** — decide: open submissions or a moderated queue. jevable moderates, and an open queue on a public link is a spam target | Decided, and the decision is written into D-table below |
| 3.8 | BACKLOG | agent | code | S | - | 1.11 | **Collaborate, the git-native path that needs no backend** — a documented pull request against `data/corpus-additions.json`, with the schema and one worked example in `CONTRIBUTING.md` | Someone who has never seen the repo can add a project by PR in under ten minutes |
| 3.9 | DONE | agent | code | S | - | 2.13 | **Discovery** — copy-link-to-this-view, which is core to an atlas and currently absent | One click puts the current filtered state on the clipboard |

---

## GOAL 4 — Stay fresh

**Git is the database.** GitHub Actions harvests, builds, commits and pushes; Vercel auto-deploys on
the push. Nothing writes at runtime, so there is no storage credential, no function, no cost, and
the whole history of the catalogue is `git log`. This deliberately avoids everything in the doctrine's
BEYOND A STATIC SITE section.

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 4.1 | DONE | agent | code | L | - | - | The harvester itself: six source adapters — GitHub, Hacker News, dev.to, npm, jevable, six awesome-lists — plus X enrichment through the syndication endpoint, which needs no key | 1,442 rows from six sources, and `npm run harvest` reruns end to end |
| 4.2 | DONE | agent | code | S | - | 1.14 | The workflow file: daily schedule, checkout, Node and Python setup, `npm ci` | It runs on a manual dispatch and the log shows every step |
| 4.3 | DONE | agent | code | S | - | 4.2 | The steps in order: `npm run harvest` → `python src/thumbs.py` → `npm run build` | A dispatch produces a changed `public/` |
| 4.4 | DONE | agent | code | S | - | 4.3 | **Dedup against what already exists** before anything is written. The same project appearing on two awesome-lists must not become two rows | A rerun with no new upstream content produces an empty diff |
| 4.5 | DONE | agent | code | S | - | 4.4 | `added_at` on every row, and a "New this week" filter in the rail. Timestamped arrival is the whole point of the cron | A row added today is findable by that filter and shows its date |
| 4.6 | DONE | agent | code | Q | - | 4.3 | Commit and push from the action with `GITHUB_TOKEN` scoped to this repo only. **Never a write token in the host's env** | The push appears as the action's own commit, and no token exists outside GitHub |
| 4.7 | DONE | agent | code | S | - | 4.6 | **The workflow fails loudly.** A cron that silently stops is worse than no cron, because the site looks maintained | A failed run opens an issue; a run that harvests zero rows for three days does too |
| 4.8 | DONE | agent | code | S | - | 4.4 | The QA gate runs inside the cron, not after it. A source that changes its HTML must fail the gate rather than poison the catalogue | A deliberately corrupted source input produces zero admissions, not garbage rows |
| 4.9 | BACKLOG | agent | verify | Q | - | 4.7 | Watch the first week by hand: what it added, what it rejected, and whether the field skew survives | Seven days of diffs read, with the verdict written down |
| 4.10 | BACKLOG | agent | code | S | - | 4.8 | **`run.mjs` never calls `hardQA` at all** — the sweep applies `relevance.judge()` and nothing else, so the hard gate that rejects a non-Jev project has been bypassed on every harvest so far. The cron now runs it as a separate step, but the sweep itself should call it | A harvest run outside the cron admits nothing the gate would reject |

---

## GOAL 5 — Classification at scale

The catalogue is only as good as its classification, and the classifier is a regex. A regex already
swallowed Marketing into Finance once, and only a count comparison caught it.

| ID | ST | OWN | TYPE | EFF | GATE | DEPS | Card | DONE-WHEN |
|---|---|---|---|---|---|---|---|---|
| 5.1 | BLOCKED | human | account | Q | money | - | **Verify the real provider balance before any scaled paid run.** A dry run still spends tokens; only the write is skipped. *Blocked: the balance has not been read* | A live balance figure, read from the provider, written here |
| 5.2 | BACKLOG | agent | code | L | - | 5.1 | Build `src/classify-ai.mjs` — typed classification per candidate, provider passed as an argument so the model can be swapped without touching the logic | One command classifies one row and returns a typed object, not prose |
| 5.3 | BACKLOG | agent | verify | S | - | 5.2 | Run it over the original 359 first and **diff against the regex output**. Every disagreement is either a regex bug or a model error, and both are worth seeing before trusting it at scale | A diff file listing every disagreement with both verdicts |
| 5.4 | BACKLOG | human | content | S | approval | 5.3 | Read the diff by hand. Keep the overrides that were right | A decision recorded per disagreement |
| 5.5 | BACKLOG | agent | code | L | - | 5.4 | Run over all 1,442: is-it-a-project, field, shape, capabilities, quality | Every row carries a model verdict alongside its regex one |
| 5.6 | BACKLOG | agent | verify | S | - | 5.5 | Rebuild, then **sanity-check the field counts against the gallery's own numbers**. This is the check that caught the Marketing bug | No field's count moves by more than expected, and every move has a reason |

---

## Decisions — settled, with the reason

| # | Decision | Why |
|---|---|---|
| D1 | **Category is the spine; Jev is one capability of fifteen** | The original framing made a vendor the organising principle. Somebody with an XXXL-fit problem needs classification, scraping, OCR, voice and try-on — Jev is one row in that list, not the title |
| D2 | One static HTML file, no framework, no runtime | Nothing to keep alive, nothing to pay for, nothing to break at 3am. A catalogue is a document |
| D3 | **The repo is public, which deviates from doctrine Phase 2** | Phase 2 says private until Phase 9. Deliberate exception: this is an open-source catalogue whose contribution path is a pull request. The *site* is still hidden by the invisibility switch, so deploying and launching stay separate events |
| D4 | The domain is bought at Phase 4, not first | The repo's old runbook bought it at step 2. Phases 1–3 and 6–8 need no domain, and Phase 4 is the only step that spends money and cannot be undone. Card 1.8 fixes the runbook |
| D5 | Release is `git push`. Never `vercel --prod` or `vercel deploy` | Those upload the working folder instead of building from git, and that path died at the 15,000-file limit once already, costing 22 unpushed commits while the wrong thing was debugged (LAW 2) |
| D6 | No Git LFS for the 1,204 images | It is the top search result and it fails silently and late: the host re-clones every build, burns the 10 GiB monthly LFS bandwidth in a few deploys, then serves pointer text files where images should be, with nothing in the logs. These are 10 MB of ordinary files |
| D7 | No Cloudflare proxy — grey cloud only | Orange loses visitor IPs, degrades Vercel's analytics and can break the first certificate. Turn it on later, on purpose, if there is ever traffic to need it |
| D8 | **Precision over recall in the QA gate — a type-2 error is the one that matters** | Rejecting a real project costs one row. Admitting a fake one costs the catalogue's credibility, which is the only thing it has |
| D9 | npm's popularity score is not a star count | It was being multiplied by 1,000 and displayed as stars. 281 fabricated counts dropped. A number nobody can verify is worse than no number |
| D10 | Dual build: files for Vercel, inlined data URIs for the artifact | The artifact CSP has no origin, so it blocks every cross-origin image. One codebase, two render targets, an 11 MB budget on the inlined one |
| D11 | The cron is git-as-database | GitHub Actions commits, Vercel auto-deploys. No runtime write, no storage credential, no function, and the catalogue's whole history is `git log` |
| D12 | Four states only, and `BLOCKED` means blocked by something outside this repo | Defaulting to blocked makes everything look stuck when only one or two things actually are |
| D13 | The classifier takes a provider argument | Claude now because the key exists and the cost is cents; **OpenRouter serves no Jev model — 0 matches in 446** — so recharging it buys nothing here. Swapping later is one flag |

---

## Watch list — conditions, not cards

| # | Watch for | Why it matters | If it fires |
|---|---|---|---|
| W1 | `vercel curl` or `vercel httpstat` run against this project | On the other project the first run silently minted a Deployment Protection bypass secret as a build-visible env var, and can fail at its stated job while still writing the credential | Check the activity log, delete the secret under Settings → Deployment Protection. Both are denied in card 1.13 |
| W2 | Cloudflare proxy turned on for the Vercel records | Orange cloud breaks certificate issuance and causes redirect loops | Turn it off. If it must stay on, SSL/TLS must be Full, never Flexible |
| W3 | A runtime error older than an hour | Hobby keeps runtime logs for one hour only | Not applicable yet — nothing runs. It becomes applicable the day anything does |
| W4 | Anyone proposing Git LFS for the images | See D6. It fails late, silently, and mid-deploy | Refuse it |
| W5 | This site ever earning money — ads, affiliate links, donations | Vercel Hobby is personal, non-commercial only, donations included | Upgrade to Pro before the first rupee, not after |
| W6 | `MSYS_NO_PATHCONV` missing on a `vercel api` call in Git Bash | Git Bash rewrites any argument starting with `/` and the command fails confusingly | Prefix the command, or use PowerShell |
| W7 | A gate being added to the commit path | Commit gates protect nothing that a deploy can break, and a slow hook gets bypassed | Put the gate where the breakage is (LAW 6) |
| W8 | **The cron running but adding nothing, for days** | A silently dead harvester looks exactly like a quiet week | Card 4.7 opens an issue. Read it rather than assuming the field is quiet |
| W9 | **A source changing its markup or API** | Six adapters scrape six shapes. One change turns precision into garbage, and the gate is the only thing standing between that and the catalogue | Card 4.8 fails the run. Fix the adapter, never loosen the gate to make the run pass |
| W10 | The Vercel MCP tools starting to return 200 instead of 403 | Its token currently sees no teams. Fixing that makes ten money and production tools callable at once | Confirm card 1.13's deny list is still in place before doing anything else |
| W11 | "I changed the env var and nothing happened" | Env vars are read at build time only; a dashboard change does nothing to a running deployment | Redeploy, then grep the built output for the new value and the absence of the old |

---

## Where this stands right now

| | |
|---|---|
| **Live** | **https://jev-atlas-drab.vercel.app** — public, 200, every check green. Behind a noindex switch, so it is reachable but not findable |
| Deploys from | `git push origin main` → Vercel. Verified: the `git-main` alias exists and builds take 8–12s |
| Rows in the catalogue | 1,442 — jevable 359, GitHub 638, awesome-lists 387, Hacker News 24, dev.to 20, npm 14 |
| Covers | **1,442 of 1,442** (was 1,201). 92 recovered GitHub social cards, 149 deterministic monograms, 0 fabricated |
| Smoke suite | 14 of 14, locally and against the live host |
| Responsive | 8 of 8 widths clean, 320–1920px, measured over CDP — no sideways scroll, no tap target under 44px on touch, no text under 11.5px |
| Image verification | 60 of 60 sampled, fetched from the host, `Cache-Control: immutable` confirmed |
| Daily cron | Registered and active on GitHub Actions. Has not yet run on schedule |
| Cards | 85 · **43 done** · 3 in progress · 3 blocked · 36 backlog |
| Needs you | 17 |

### What the live run actually found

Three defects that no amount of reading the config would have surfaced:

| # | Defect | How it was caught | State |
|---|---|---|---|
| 1 | Every one of 1,442 images was served `must-revalidate` instead of a one-year `immutable` cache. Vercel applies all matching header rules and the **last** one to set a key wins, so the catch-all `/(.*)` was overwriting `/thumbs/` | Fetching a thumbnail from the deployed host and reading the header that came back | **Fixed and re-verified live** |
| 2 | An unknown key in `vercel.json` (`_note`) fails the deployment **before the build runs**, so there is no build log to read. The absence of a log is itself the diagnostic | A deploy that went to Error with zero log output | **Fixed** |
| 3 | `run.mjs` never calls `hardQA` — the harvest sweep only ever applied `relevance.judge()`, so the hard gate has been bypassed on every run to date | Reading the harvest path while wiring the cron | Card 4.10, open |

### Two claims in the old roadmap were wrong, and cost nothing to check

- *"The hash carries only view, family and category"* — it already carried query, capability, source, type and sort. Card 2.13 was done before it was written.
- *"Avatar plus author name. The data exists and is never rendered"* — **no row has an avatar field.** Zero of 1,442. Attribution ships as initials on a hue derived from the name, which is the honest version rather than the planned one.

### The next three things

1. **Card 1.37 (you, 2 min)** — decide the production hostname. `jev-atlas-drab.vercel.app` is what gets shared until then.
2. **Card 1.18 (you, 2 min)** — name two or three domains. Everything from Phase 4 onward is waiting on that one sentence, and nothing before it is.
3. **Card 2.20 (agent)** — the mobile pass at 390px, which is the last thing between here and card 1.35 going public.
