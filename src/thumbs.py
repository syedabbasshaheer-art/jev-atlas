"""thumbs.py - fetch each project's poster image, shrink it, keep it locally.

Why this exists: 356 of 359 projects already carry a poster image URL, and the
catalogue was ignoring all of them. A wall of text next to a gallery of
screenshots is the whole difference between "reference document" and "product".

Two outputs, because the two targets have different rules:
  public/thumbs/<id>.jpg   files, for the Vercel deploy
  data/thumbs.json         base64 data URIs, for the published artifact,
                           whose CSP blocks every cross-origin image

Run:  python src/thumbs.py            (all, skips what it already has)
      python src/thumbs.py --limit 5  (sample, for measuring)
"""
import io, json, os, re, sys, time, urllib.request, urllib.error
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_DIR = os.path.join(ROOT, "public", "thumbs")
CORPUS = os.path.join(ROOT, "data", "corpus.json")
MANIFEST = os.path.join(ROOT, "data", "thumbs.json")

# Sized against the 16 MB single-page ceiling, not against taste.
WIDTH = 380
QUALITY = 62
UA = "jev-atlas/1.0 (+https://github.com/syedabbasshaheer-art/jev-atlas)"

limit = None
if "--limit" in sys.argv:
    limit = int(sys.argv[sys.argv.index("--limit") + 1])

os.makedirs(OUT_DIR, exist_ok=True)
posts = json.load(open(CORPUS, encoding="utf-8"))

GH_REPO = re.compile(r"^https://github\.com/([^/]+)/([^/?#]+)/?$")

def poster(p):
    """Where a cover can come from, best first."""
    m = p.get("media") or []
    if m and m[0].get("poster"):
        return m[0]["poster"]
    if m and m[0].get("type") == "photo" and m[0].get("src"):
        return m[0]["src"]
    # GitHub renders a social card for every repo: owner, name, description,
    # language and stars on a branded background. Not a screenshot of the
    # project, but real, specific to the repo, and far better than a monogram.
    g = GH_REPO.match(str(p.get("url") or ""))
    if g:
        return "https://opengraph.githubassets.com/1/%s/%s" % (g.group(1), g.group(2))
    return None

targets = [(str(p["id"]), poster(p)) for p in posts]
targets = [(i, u) for i, u in targets if u]
if limit:
    targets = targets[:limit]

print(f"{len(targets)} project(s) with a poster image")
got = skipped = failed = 0
total_bytes = 0

for pid, url in targets:
    dest = os.path.join(OUT_DIR, pid + ".jpg")
    if os.path.exists(dest):
        skipped += 1
        total_bytes += os.path.getsize(dest)
        continue
    # twimg serves sized variants; ask for the small one rather than the original
    src = url if "opengraph.githubassets" in url else url + ("&" if "?" in url else "?") + "format=jpg&name=small"
    try:
        req = urllib.request.Request(src, headers={"User-Agent": UA})
        raw = urllib.request.urlopen(req, timeout=25).read()
        im = Image.open(io.BytesIO(raw))
        im = im.convert("RGB")
        if im.width > WIDTH:
            im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
        im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        got += 1
        total_bytes += os.path.getsize(dest)
    except Exception as e:
        failed += 1
        print(f"  fail {pid}: {type(e).__name__}")
    time.sleep(0.12)

print(f"\nfetched {got}, already had {skipped}, failed {failed}")
if got + skipped:
    print(f"total {total_bytes/1024/1024:.2f} MB, average {total_bytes/(got+skipped)/1024:.1f} KB")

# manifest of data URIs for the artifact build
man = {}
for pid, _ in targets:
    dest = os.path.join(OUT_DIR, pid + ".jpg")
    if os.path.exists(dest):
        import base64
        man[pid] = "data:image/jpeg;base64," + base64.b64encode(open(dest, "rb").read()).decode()
json.dump(man, open(MANIFEST, "w", encoding="utf-8"))
size = os.path.getsize(MANIFEST) / 1024 / 1024
print(f"data/thumbs.json: {len(man)} images, {size:.2f} MB inline")
if size > 12:
    print("  WARNING: approaching the 16 MB single-page ceiling. Lower WIDTH or QUALITY.")
