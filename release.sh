#!/usr/bin/env bash
# Release to production (https://azhagar.com). Production never changes on its own.
#   ./release.sh              release the version that is live on UAT right now
#   ./release.sh <commit>     release — or roll back to — a specific commit
#   add --yes to skip the confirmation question
set -euo pipefail

SOURCE_REPO="azhagarvicky/portfolio"
PROD_REPO="azhagarvicky/portfolio-production"

REF=""
YES=""
for arg in "$@"; do
  case "$arg" in
    --yes) YES=1 ;;
    *) REF="$arg" ;;
  esac
done

cd "$(dirname "$0")"
if [[ -n "$REF" ]]; then
  SHA="$(git rev-parse --verify "$REF^{commit}")"
else
  SHA="$(gh run list -R "$SOURCE_REPO" -w uat.yml -s success -L 1 --json headSha --jq '.[0].headSha // empty')"
  [[ -n "$SHA" ]] || { echo "✗ Nothing has been deployed to UAT yet."; exit 1; }
fi

echo "Release ${SHA:0:7}: $(git log -1 --format=%s "$SHA" 2>/dev/null || echo '(run git pull to see this commit locally)')"
if [[ -z "$YES" ]]; then
  read -r -p "Deploy to PRODUCTION (azhagar.com)? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }
fi

gh workflow run production.yml -R "$PROD_REPO" -f ref="$SHA"
echo "✓ Production release started — live in about a minute."
echo "  Progress: https://github.com/$PROD_REPO/actions"
