# Azhagar — portfolio site

A scroll-animated portfolio in plain HTML/CSS/JS (GSAP + ScrollTrigger + Lenis from CDN, no build step).

```
index.html   page content — edit text here
style.css    colours, fonts, layout
script.js    all animation
assets/      your photo and videos go here
```

## Preview locally

```bash
python3 -m http.server 5173
```

Then open http://localhost:5173. (Opening `index.html` directly also works, but video scrubbing is smoother through a server.)

## Make it yours

**1. Your photo** — save a portrait as `assets/me.jpg` (3:4, about 1200×1600). It replaces the silhouette automatically.

**2. Your showreel** — save it as `assets/showreel.mp4`. It replaces the canvas preview and scrubs as people scroll.
For buttery scrubbing, re-encode it with frequent keyframes (install ffmpeg with `brew install ffmpeg`):

```bash
ffmpeg -i my-reel.mov -vf "scale=1920:-2" -c:v libx264 -crf 23 -g 6 -keyint_min 6 -an -movflags +faststart assets/showreel.mp4
```

Aim for 10–30 seconds and under ~25 MB.

**3. Projects** — the five cards under "Selected work" are samples. In `index.html`, change each card's title, description, tool icons and year. To show a real clip, put a video inside `.card__media`:

```html
<video src="assets/work-1.mp4" muted loop playsinline></video>
```

It plays on hover (desktop) or when visible (phone). An `<img>` works too.

**4. Skills** — each tile in the "Software I think in" section has a label (`Daily driver`, `Advanced`…) and a bar length (`--lvl: .95`). Delete or duplicate tiles freely. Available icons: `ic-figma`, `ic-pr`, `ic-ae`, `ic-ps`, `ic-ai`, `ic-lr`, `ic-davinci`, `ic-blender`.

**5. Name, email, socials** — search `index.html` for:
- `Azhagar` (nav logo, hero name ×2, `data-name` on the reel section, title)
- `hello@example.com` (appears 4 times in the contact section)
- the Instagram / Behance / LinkedIn / YouTube links

## Deploying: UAT and production

| Environment | URL | GitHub repo (served from `gh-pages`) |
|---|---|---|
| UAT | https://uat.azhagar.com | `azhagarvicky/portfolio-uat` |
| Production | https://azhagar.com | `azhagarvicky/portfolio` (source code lives on `main`) |

Release flow — always UAT first:

```bash
git add -A && git commit -m "Describe the change"
./deploy.sh uat        # check it on uat.azhagar.com
./deploy.sh prod       # asks for confirmation, then goes live
git push               # back up the source code
```

- Only committed work can be deployed; `./deploy.sh prod` warns if that commit hasn't been on UAT.
- UAT shows a red "UAT · commit" badge, has `[UAT]` in the tab title, and tells search engines not to index it.
- Each site serves `/version.txt` showing which commit is live.
- **Roll back** production: `git checkout <older-commit> && ./deploy.sh prod --yes && git checkout main`.

### DNS (GoDaddy → Domain → DNS → DNS Records)

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | azhagarvicky.github.io |
| CNAME | uat | azhagarvicky.github.io |

Delete GoDaddy's default `A @ → Parked` record, and change an existing `CNAME www → @` to the value above. Don't touch MX/TXT records if you use email on the domain. HTTPS turns on automatically within about an hour once DNS resolves; the next `./deploy.sh` run then forces HTTPS.
