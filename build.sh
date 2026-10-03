#!/usr/bin/env bash
# Build the site for one environment into a folder.
#   ./build.sh uat  dist/uat     → noindex, "UAT" badge, for uat.azhagar.com
#   ./build.sh prod dist/prod    → clean build with sitemap, for azhagar.com
# The GitHub Actions workflows call this; you can also run it locally to look.
set -euo pipefail

ENV="${1:-}"
[[ "$ENV" == uat || "$ENV" == prod ]] && [[ -n "${2:-}" ]] || { echo "Usage: ./build.sh uat|prod <out-dir>"; exit 1; }

DOMAIN="azhagar.com"
[[ "$ENV" == uat ]] && HOST="uat.$DOMAIN" || HOST="$DOMAIN"

ROOT="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$2"
OUT="$(cd "$2" && pwd)"
if [[ "$OUT" == "/" || "$OUT" == "$ROOT" || "$ROOT" == "$OUT"/* ]]; then
  echo "✗ Refusing to build into $OUT — pick an empty folder like dist/$ENV"; exit 1
fi

COMMIT="$(git -C "$ROOT" rev-parse --short HEAD)"

# Every page on the site, as a path under the domain. Add new pages here.
PAGES=("" "aruvi-ice-cream/")

rm -rf "${OUT:?}"/* "$OUT"/.[!.]* 2>/dev/null || true
cp -R "$ROOT"/index.html "$ROOT"/style.css "$ROOT"/script.js "$ROOT"/assets "$ROOT"/aruvi-ice-cream "$OUT"/
find "$OUT" \( -name '.gitkeep' -o -name '.DS_Store' \) -delete
echo "$COMMIT $(date -u +%Y-%m-%dT%H:%M:%SZ) $ENV" > "$OUT/version.txt"
# Make browsers fetch the Aruvi page's CSS and JS afresh after every deploy
COMMIT="$COMMIT" perl -pi -e 's#((?:href|src)="(?:css/style\.css|js/main\.js))"#$1?v=$ENV{COMMIT}"#g' "$OUT/aruvi-ice-cream/index.html"

if [[ "$ENV" == uat ]]; then
  # Keep UAT out of search results with noindex on every page. Crawlers have to be able
  # to fetch a page to see its noindex, so robots.txt blocks only the image folders.
  printf 'User-agent: *\nDisallow: /assets/\nDisallow: /aruvi-ice-cream/images/\n' > "$OUT/robots.txt"
  BADGE="<div style=\"position:fixed;top:calc(env(safe-area-inset-top,0px) + 62px);left:50%;transform:translateX(-50%);z-index:300;padding:6px 10px;border-radius:999px;background:#FF4B3E;color:#fff;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;pointer-events:none\">UAT · $COMMIT</div>"
  for page in "${PAGES[@]}"; do
    perl -0pi -e 's#<head>#<head>\n<meta name="robots" content="noindex, nofollow">#; s#<title>#<title>[UAT] #' "$OUT/${page}index.html"
    BADGE="$BADGE" perl -0pi -e 's#</body>#$ENV{BADGE}\n</body>#' "$OUT/${page}index.html"
  done
  # Link previews of a UAT page should show UAT's own image, which exists before release
  perl -pi -e 's#(<meta (?:property="og:(?:url|image)"|name="twitter:image") content=")https://azhagar\.com/#$1https://uat.azhagar.com/#' "$OUT/aruvi-ice-cream/index.html"
else
  printf 'User-agent: *\nAllow: /\n\nSitemap: https://%s/sitemap.xml\n' "$HOST" > "$OUT/robots.txt"
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    for page in "${PAGES[@]}"; do
      echo "  <url><loc>https://$HOST/$page</loc><lastmod>$(date -u +%Y-%m-%d)</lastmod></url>"
    done
    echo '</urlset>'
  } > "$OUT/sitemap.xml"
fi

echo "Built $ENV ($COMMIT) into $OUT"
