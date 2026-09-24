# Deploying — Vercel, then Cloudflare

One sitting, about 35 minutes. Steps marked **YOU** need an account or a payment; everything else I can do once you have.

Repo: `D:\10. Apps\jev-atlas` · https://github.com/syedabbasshaheer-art/jev-atlas

---

## What is already true

- `vercel.json` declares `buildCommand: npm run build` and `outputDirectory: public`, so Vercel needs no configuration
- `npm run build` is green from a clean clone and has **no dependencies** — Node 20+ and nothing else
- The build fails rather than shipping an unreadable page: `src/tokens.mjs` audits 23 contrast pairs and `render.mjs` exits non-zero if one falls under 4.5:1
- `public/index.html` is ~1 MB and references 1,201 covers as files, which is the build Vercel serves
- Cache headers are set: covers immutable for a year, HTML always revalidated

---

## 1 · Vercel — **YOU**, 10 minutes

The dashboard is less error-prone than the CLI here because the repo is already on GitHub.

1. **vercel.com → Add New → Project**
2. **Import** `syedabbasshaheer-art/jev-atlas`
3. Accept every default. Vercel reads `vercel.json`; do not set a framework preset, it is deliberately `null`
4. **Deploy**

Check the build log says `BUILD OK`, `DOCS OK` and `RENDER OK`. If Node is too old, set **Node.js Version → 20.x** in Settings → General.

You get a `*.vercel.app` URL. **Send it to me** — I will run the checks in step 4.

> The CLI path, if you prefer: `npm i -g vercel`, then `vercel --prod` from the repo root.

---

## 2 · Domain — **YOU**, 5 minutes

Buy it at **Cloudflare Registrar** — at cost, WHOIS privacy included, no renewal markup. Same place as `ncertshorts.com`, so one dashboard.

Turn on, in the registrar tab: **auto-renew**, **WHOIS privacy**, **registrar lock**.

---

## 3 · Point the domain at Vercel — **YOU**, 10 minutes

Order matters: add it in Vercel first so Vercel tells you the exact record to create.

1. **Vercel → Project → Settings → Domains → Add** your apex, e.g. `jevatlas.com`
2. Vercel shows a record. Take the **CNAME** it recommends, not the legacy `76.76.21.21` A record — the same call recorded as card 1.52 on the other project
3. **Cloudflare → DNS → Add record**

| Type | Name | Value | Proxy |
|---|---|---|---|
| CNAME | `@` | the value Vercel gave | **DNS only (grey cloud)** |
| CNAME | `www` | the same value | **DNS only (grey cloud)** |

4. Back in Vercel, add `www` too and set it to **redirect to the apex**
5. **Cloudflare → SSL/TLS → Overview → Full (strict)**

**The grey cloud matters.** Proxy on (orange) puts Cloudflare in front of Vercel, which breaks Vercel's certificate issuance and hides real client IPs from its analytics. Cloudflare CNAME-flattens at the apex, which is why a CNAME is legal there at all.

> Two traps already paid for on `ncertshorts.com`, worth not repeating:
> **Delete any wildcard `*` A record** Cloudflare imports. It answers for every undefined subdomain and will intermittently shadow anything you add later.
> **Keep the CAA records** — they authorise certificate issuance.

---

## 4 · Verify — **ME**, 5 minutes

Send me the live URL and I will check:

- Every filter, the reading pane, deep links and the command palette on the real origin
- Covers load from `/thumbs/` with `Cache-Control: immutable`
- `www` redirects to the apex, and https works on both
- The page at 400px wide
- Response headers and first-paint timing

---

## 5 · After it is live — **ME**

- Fill the live URL into `README.md`, which still says "add your Vercel URL here"
- Add repo description and topics: `jev`, `typesafe`, `catalogue`, `system-one`, `capabilities`
- OG meta tags and a social preview image, so a shared link renders
- Submit to the six `awesome-jev` lists — they cross-link each other, which is how people will find this

---

## What I would not do yet

**Cloudflare proxy (orange cloud).** It adds caching and DDoS protection you do not need at launch, and it complicates the first certificate. Turn it on later, deliberately, when there is traffic to protect.

**Cloudflare Pages instead of Vercel.** It would work — the output is static. But the repo already carries a `vercel.json` that is correct, and moving hosts to save nothing is not a launch task.

**A spend cap.** Vercel's free tier has no runtime cost here because nothing runs: it is one HTML file and 1,201 images. There is no function, no database and no API key. That is worth knowing before you are asked to add a card.
