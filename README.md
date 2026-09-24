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

**3. Projects** — the "Selected work" section is hidden for now: in `index.html` it sits inside `<template id="work-hidden">`. To show it, delete the `<template>` and `</template>` lines, then change each card's title, description, tool icons and year. To show a real clip, put a video inside `.card__media`:

```html
<video src="assets/work-1.mp4" muted loop playsinline></video>
```

It plays on hover (desktop) or when visible (phone). An `<img>` works too.

**4. Skills** — each tile in the "Software I think in" section has a label (`Daily driver`, `Advanced`…) and a bar length (`--lvl: .95`). Delete or duplicate tiles freely. Available icons: `ic-figma`, `ic-pr`, `ic-ae`, `ic-ps`, `ic-ai`, `ic-lr`, `ic-davinci`, `ic-blender`.

**5. Name, email, socials** — search `index.html` for:
- `Azhagar` (nav logo, hero name ×2, `data-name` on the reel section, title)
- `azhagar154@gmail.com` (4 places in the contact section)
- the Instagram / LinkedIn / YouTube links

## UAT and production

| Environment | URL | Updates when | Hosted by |
|---|---|---|---|
| UAT | https://uat.azhagar.com | **Automatically**, on every push to `main` | `azhagarvicky/portfolio` (this repo) |
| Production | https://azhagar.com | **Only when you release** | `azhagarvicky/portfolio-production` |

```bash
git add -A && git commit -m "Describe the change"
git push              # → uat.azhagar.com updates in ~1 minute
./release.sh          # → azhagar.com gets exactly what is on UAT (asks first)
```

- No terminal? On GitHub open **portfolio-production → Actions → Deploy production → Run workflow**.
- **Roll back:** `./release.sh <older-commit>`, or paste that commit into the workflow's "ref" box.
- UAT shows a red "UAT · commit" badge and `[UAT]` in the tab title, and is hidden from search engines. Both sites serve `/version.txt` with the live commit.
- `./build.sh uat dist/uat` builds a copy locally if you want to inspect the output.

### DNS (GoDaddy → Domain → DNS → DNS Records)

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | azhagarvicky.github.io |
| CNAME | uat | azhagarvicky.github.io |

Leave the NS, SOA, `_domainconnect` and `_dmarc` records as they are.
