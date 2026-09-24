#!/usr/bin/env bash
# Build the site and publish it to GitHub Pages.
#
#   ./deploy.sh uat     →  https://uat.azhagar.com   (test here first)
#   ./deploy.sh prod    →  https://azhagar.com       (asks before going live)
#
# Each environment is its own GitHub repo, served from its gh-pages branch.
# Only committed work can be deployed, so every release maps to a commit.
set -euo pipefail

DOMAIN="azhagar.com"
GH_USER="azhagarvicky"
PROD_REPO="$GH_USER/portfolio"
UAT_REPO="$GH_USER/portfolio-uat"
SITE_FILES=(index.html style.css script.js assets)

ENV="${1:-}"
case "$ENV" in
  uat)  REPO="$UAT_REPO";  HOST="uat.$DOMAIN" ;;
  prod) REPO="$PROD_REPO"; HOST="$DOMAIN" ;;
  *) echo "Usage: ./deploy.sh uat|prod"; exit 1 ;;
esac

cd "$(dirname "$0")"
git_gh() { git -c credential.helper= -c credential.helper='!gh auth git-credential' "$@"; }

if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ Uncommitted changes — commit them before deploying:"
  git status --short
  exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"

if [[ "$ENV" == prod ]]; then
  UAT_MSG="$(gh api "repos/$UAT_REPO/commits/gh-pages" --jq .commit.message 2>/dev/null || true)"
  if [[ "$UAT_MSG" != *"$COMMIT"* ]]; then
    echo "⚠ Commit $COMMIT has not been deployed to UAT yet (UAT has: ${UAT_MSG:-nothing})."
  fi
  if [[ "${2:-}" != "--yes" ]]; then
    read -r -p "Deploy $COMMIT to PRODUCTION ($HOST)? [y/N] " answer
    [[ "$answer" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }
  fi
fi

# ---------- Build ----------
OUT="dist/$ENV"
rm -rf "$OUT"
mkdir -p "$OUT"
cp -R "${SITE_FILES[@]}" "$OUT"/
find "$OUT" -name '.gitkeep' -delete
touch "$OUT/.nojekyll"
echo "$HOST" > "$OUT/CNAME"
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

# ---------- Publish ----------
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R "$OUT"/. "$TMP"/
git -C "$TMP" init -q -b gh-pages
git -C "$TMP" add -A
git -C "$TMP" -c user.name="$(git config user.name)" -c user.email="$(git config user.email)" \
  commit -q -m "Deploy $COMMIT to $ENV"
git_gh -C "$TMP" push -q -f "https://github.com/$REPO.git" gh-pages

# First deploy: switch GitHub Pages on (pushing gh-pages often does this by
# itself, so "already enabled" is fine). Every deploy: keep the domain set and
# turn on HTTPS-only once GitHub has issued the certificate.
if ! gh api "repos/$REPO/pages" >/dev/null 2>&1; then
  gh api -X POST "repos/$REPO/pages" -f "source[branch]=gh-pages" -f "source[path]=/" >/dev/null 2>&1 || true
fi
gh api -X PUT "repos/$REPO/pages" -f cname="$HOST" >/dev/null 2>&1 || true
gh api -X PUT "repos/$REPO/pages" -F https_enforced=true >/dev/null 2>&1 || true

echo "✓ Deployed $COMMIT to $ENV → https://$HOST  (live in about a minute)"
