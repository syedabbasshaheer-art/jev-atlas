# Design roadmap

Every known design gap in one numbered list, so nothing is argued about twice.

**Sources collated here:** the owner's own review (marked `OWNER`), the visual-QA audit against this project's MASTER-TRACKER rubric (`VQA`), the card/interaction fix spec (`CARD`), the information-architecture fix spec (`IA`), the reference-site teardown (`REF`), the component-capability inventory (`COMP`), and the scored intervention log in `Edtech/web/design/assessments/MASTER-TRACKER.md` (`T0xx`).

**Priority:** P0 blocks launch · P1 before anyone shares it · P2 makes it good · P3 someday.
**Status:** `[ ]` open · `[~]` in progress · `[x]` done · `[-]` rejected, with a reason.

---

## The verdict being fixed

The audit scored the page against the project's own ten parameters. The damning row:

> **Content Presentation 3/10** — "Pure text. Zero `<img>` tags in the whole file. 356 local thumbnails exist and are never referenced."

Consistency scored 8. The system is disciplined; it is pointed at the wrong goal. **Correct, not wanted.**

| Parameter | Score | Parameter | Score |
|---|---:|---|---:|
| Design Consistency | 8 | Component Design | 5 |
| Typography | 7 | Depth & Elevation | 5 |
| Micro-interactions | 7 | Overall Polish | 5 |
| Colour Palette | 6 | **Content Presentation** | **3** |
| Layout & Spacing | 5 | Visual Hierarchy | 5 |

---

## P0 — blocks launch

### Imagery
1. `[ ]` Render the 356 thumbnails. Zero `<img>` in the file today. `VQA` `OWNER` — the single largest cause of the "web 1" verdict
2. `[ ]` Image full-bleed at card top, first element painted `CARD` `REF`
3. `[ ]` Fixed `aspect-ratio` box so the grid never reflows as images load `REF`
4. `[ ]` Monogram placeholder for the 3 projects with no image. Never a broken-image icon `VQA`
5. `[ ]` `loading="lazy"` on every thumbnail; 1,055 cards
6. `[ ]` Thumbnails for GitHub rows via `opengraph.githubassets.com/1/<owner>/<repo>` — 638 rows currently have no image at all
7. `[ ]` Decide artifact vs Vercel image strategy: the artifact CSP blocks cross-origin images, so the artifact needs inlined data URIs while Vercel can use files

### Cards are dead
8. `[ ]` Every card opens a detail view. Discover, Build and Matrix all reach the same one `OWNER` `CARD`
9. `[ ]` Build the shared detail overlay: `<dialog>`, scrim, Escape, focus trap, restore focus `CARD` `COMP`
10. `[ ]` Guard the click so the external `<a>` still opens in a new tab without triggering the overlay `CARD`
11. `[ ]` `tabindex="0"` and Enter/Space on every card — it is an interactive element now

### The chips say nothing
12. `[ ]` Drop the capability chip row from Discover cards. "Typed classification & decision" appears on nearly every card and carries no information `OWNER`
13. `[ ]` Description becomes the primary read on the card `OWNER` `CARD`
14. `[ ]` Cap any remaining chips at 2–4 with a `+N` overflow `REF`

### Contrast between a card and the things inside it
15. `[ ]` Every nested level differs by a combination of fill, border, elevation and text colour, never one signal alone `OWNER` `CARD`
16. `[ ]` Card `--surface-container-low`; meta strip `--surface-container-high`; chip a container role `CARD`
17. `[ ]` Default Discover cards to real elevation `--e2`, not the flat `.card-out` border `VQA`

### Metrics that are made up
18. `[ ]` Remove Effort entirely: rail facet, both sort options, the pip meter `OWNER` `IA`
19. `[ ]` Remove Usefulness/impact entirely: sort option, pip meter, card scorebar `OWNER` `IA`
20. `[x]` Stop displaying npm's popularity score as a star count. It was fabricated; 281 dropped
21. `[ ]` Keep only objective metrics: GitHub stars, X likes, date, source, author `IA`
22. `[ ]` Sort becomes: Most starred · Newest · A to Z

### Navigation confusion
23. `[ ]` Merge Family and Field into one tree. Family is the parent row, fields nest under it. Not two filter groups `OWNER` `IA`
24. `[ ]` Delete the dynamic "Field in <Family>" re-titling — the parent row already says it `IA`
25. `[ ]` Keep Build shape and Capability separate but fix the copy: *"A build shape is the pipeline; a capability is one job inside it"* `IA`
26. `[ ]` Rename "Capability used" to "Capabilities in this build" `IA`
27. `[ ]` New capability definition for the UI: *"one job a build needs done, independent of which vendor does it"* `IA`
28. `[ ]` Default view becomes Discover, not Build `OWNER`

### Matrix unreadable
29. `[ ]` Transpose it: capabilities become rows with horizontal labels, the 6 families become columns `OWNER` `IA`
30. `[ ]` Delete every `writing-mode` and `rotate` rule `OWNER`
31. `[ ]` Sticky row labels on horizontal scroll `IA`
32. `[ ]` Matrix cells become buttons that open the same detail view `CARD`

### Text
33. `[ ]` Fix wrapping in blueprint cards: `overflow-wrap:break-word`, `word-break:normal`, `hyphens:auto` `OWNER` `CARD`
34. `[ ]` `min-width:0` on flex and grid children — its absence is what causes mid-word overflow `CARD`
35. `[ ]` `text-wrap:balance` on headings `T009`

---

## P1 — before anyone shares it

### Density and grid
36. `[ ]` Tile min-width 272 → 340px `VQA` `REF`
37. `[ ]` Grid gap 12 → 24px `VQA`
38. `[ ]` Card radius 16 → 20px `VQA`
39. `[ ]` Text padding below the image 20–24px; the image itself edge to edge `VQA`
40. `[ ]` Compact density stays a toggle, never the default — it fights an image-led layout `VQA`

### Attribution
41. `[ ]` Avatar plus author name under each thumbnail. The data exists and is never rendered `VQA` `REF`
42. `[ ]` Initials-circle fallback when there is no avatar `COMP`
43. `[ ]` Author is always secondary, never the primary line `REF`

### Category colour
44. `[ ]` Category-based card colouring, light Material `OWNER`
45. `[ ]` Only three M3 container roles exist, so cycle deterministically by category index `CARD`
46. `[ ]` Validate any categorical hue set before shipping it. A warm palette already failed this once: olive against caramel measured ΔE 5.9 for normal vision
47. `[ ]` Category badge as a ribbon on the image rather than its own row, to save vertical space at 1,055 items `REF`

### Actions
48. `[ ]` Circular filled FAB, 56–64px, bottom right `OWNER` `VQA`
49. `[ ]` Wire `src/submit.js` in. It is 21KB with no entry point in the template `COMP`
50. `[ ]` Submission dialog: native `<dialog>`, `required`, `pattern` validation `COMP`
51. `[ ]` Copy-link-to-this-view affordance — core to an atlas `COMP`

### Deep links and sharing
52. `[ ]` The hash carries only view, family and category. Search, capability, pattern and sort are lost on reload `COMP`
53. `[ ]` Consider route-based detail (`/project/<slug>`) over modal-only, so a project can be shared `REF`
54. `[ ]` OG image and meta tags per view for link previews
55. `[ ]` Detail view carries its own hero image matching the card, for continuity `REF`

### Scale
56. `[ ]` 1,055 cards render at once with no pagination or virtualisation `COMP`
57. `[ ]` Windowing or a "load more" at ~60 cards
58. `[ ]` Measure first paint and interaction latency after images land

---

## P2 — makes it good

### Accessibility
59. `[ ]` Focus trap in the command palette. Tab currently escapes to the page behind `COMP`
60. `[ ]` `aria-live` on the result count so a screen reader hears filter changes `COMP`
61. `[ ]` `role="tablist"` and `tabpanel` on the segmented control `COMP`
62. `[ ]` Colour-blind-safe redundant encoding on the heatmap — it is hue intensity alone `COMP`
63. `[ ]` Visible focus ring audit across every interactive element
64. `[ ]` Full keyboard pass: every action reachable without a mouse

### Search
65. `[ ]` Fuzzy search. It is plain `indexOf` today; Fuse.js is ~12KB from cdnjs `COMP`
66. `[ ]` Group the command palette by kind instead of a flat list `COMP`
67. `[ ]` Recent and frequent items in the palette — it cold-starts every time `COMP`
68. `[ ]` Relevance-mode indicator: sort still says "Most useful" while a query is active `COMP`

### Feedback
69. `[ ]` Success and error variants for the snackbar — one generic style today `COMP`
70. `[ ]` Styled tooltips; only native `title=` today, which has a 1s delay and no touch support `COMP`
71. `[ ]` Empty state should say what the filters were relaxed *to*, not only that N were dropped `COMP`
72. `[ ]` Keyboard shortcut legend — `/` and `⌘K` are discoverable only by accident `COMP`

### Polish
73. `[ ]` Persist facet-group open state; only theme and density are saved `COMP`
74. `[ ]` Cross-fade the theme toggle instead of flashing `COMP`
75. `[ ]` Skeletons sized exactly like the real card so nothing shifts `REF`
76. `[ ]` Motion budget: 150–200ms ease-out for hover and press, 300–400ms for panels, nothing on filter toggles `REF`
77. `[ ]` Audit generated tokens for any blue or purple drift — T007 purged those and scored +0.73 for it `T007`

---

## P3 — someday

78. `[ ]` Print or export a blueprint's build steps `COMP`
79. `[ ]` Bulk "select all in group" on facets `COMP`
80. `[ ]` Breadcrumb for family → field drill-down `COMP`
81. `[ ]` Masonry for image-led browsing `REF`
82. `[ ]` Light and dark preview toggle on cards that show a UI `REF`
83. `[ ]` Two-tab sort (Recently Added / Most Popular) instead of a dropdown `REF`

---

## Rejected, and why

84. `[-]` **Demote the left rail to a drawer.** `VQA` and `REF` both recommend a horizontal pill bar. Rejected: the owner has twice said the left list is the part that works. Widen the grid another way.
85. `[-]` **React or shadcn via CDN.** `COMP` — needs a JSX transform and 130KB+ before a single component. The constraint is one static file.
86. `[-]` **Chart.js.** `COMP` — the heatmap already serves the comparison need. No dependency for a hypothetical.
87. `[-]` **Lucide icon library.** `COMP` — the hand-drawn inline SVGs are zero-dependency and sufficient at this icon count. T006 also proved icons need restraint.
88. `[-]` **Aceternity gradient or aurora backgrounds.** T007 purged exactly this class of effect as AI slop, for the second-largest score gain in the log.
89. `[-]` **`/frontend-design` command.** T002 ran it and measured no effect. Marked REJECTED in the tracker.
90. `[-]` **Skeleton loaders, for now.** Data is inlined at build time, so there is no loading state to skeleton. Revisit if fetching goes async.

---

## Open questions

| # | Question | Blocking |
|---|---|---|
| 91 | Modal detail or routed page? Routing is shareable; a modal is cheaper and keeps scroll position | P0 items 8–9 |
| 92 | Do the 638 GitHub rows get OG images, or a generated cover? | P0 item 6 |
| 93 | Is the artifact or the Vercel site the primary surface? They have different image rules | P0 item 7 |
| 94 | Keep the Matrix view at all, once cards are clickable and filters work? | P0 items 29–32 |

---

## What the numbers say about sequencing

Items 1–7 are one change — render the images — and the audit puts them at the root of nine of its top ten defects. Items 8–11 are one change too: make a card a button. Between them they account for most of the gap between what this is and what it looked like next to a modern gallery.

Everything in P2 is real, and none of it will be noticed while the cards are still grey rectangles of text.
