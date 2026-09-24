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

rm -rf "${OUT:?}"/* "$OUT"/.[!.]* 2>/dev/null || true
cp -R "$ROOT"/index.html "$ROOT"/style.css "$ROOT"/script.js "$ROOT"/assets "$OUT"/
find "$OUT" -name '.gitkeep' -delete
echo "$COMMIT $(date -u +%Y-%m-%dT%H:%M:%SZ) $ENV" > "$OUT/version.txt"

if [[ "$ENV" == uat ]]; then
  # Keep UAT out of search engines and make it obvious which site you're on
  printf 'User-agent: *\nDisallow: /\n' > "$OUT/robots.txt"
  perl -0pi -e 's#<head>#<head>\n<meta name="robots" content="noindex, nofollow">#; s#<title>#<title>[UAT] #' "$OUT/index.html"
  BADGE="<div style=\"position:fixed;top:calc(env(safe-area-inset-top,0px) + 62px);left:50%;transform:translateX(-50%);z-index:300;padding:6px 10px;border-radius:999px;background:#FF4B3E;color:#fff;font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;pointer-events:none\">UAT · $COMMIT</div>"
  BADGE="$BADGE" perl -0pi -e 's#</body>#$ENV{BADGE}\n</body>#' "$OUT/index.html"
else
  printf 'User-agent: *\nAllow: /\n\nSitemap: https://%s/sitemap.xml\n' "$HOST" > "$OUT/robots.txt"
  cat > "$OUT/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://$HOST/</loc><lastmod>$(date -u +%Y-%m-%d)</lastmod></url>
</urlset>
EOF
fi

echo "Built $ENV ($COMMIT) into $OUT"
