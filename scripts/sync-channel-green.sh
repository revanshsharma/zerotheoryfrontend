#!/usr/bin/env bash
# Copy the approved parts of Channel Green into this site's working copy.
#
#   scripts/sync-channel-green.sh <path-to-Channel-Green-checkout> [git-ref]
#
# - Reads from the Channel-Green repo with `git archive <ref>`, so uncommitted edits in that
#   checkout are never picked up and that checkout is never changed.
# - Writes only inside client/src/channel-green/ of THIS repo.
# - Does not commit, push, build or deploy anything. You review `git diff`, test, then commit.
# - Needs: bash, git, tar, sha256sum, sed, find, python3. No network.
#
# See docs/channel-green-sync.md for the full workflow.
set -euo pipefail

SRC_REPO="${1:-}"
REF="${2:-}"
if [[ -z "$SRC_REPO" ]]; then
  echo "usage: $0 <path-to-Channel-Green-checkout> [git-ref]" >&2
  exit 2
fi
if ! git -C "$SRC_REPO" rev-parse --git-dir >/dev/null 2>&1; then
  echo "error: $SRC_REPO is not a git checkout" >&2
  exit 2
fi
if [[ -z "$REF" ]]; then
  echo "error: give an explicit ref (a commit, tag or branch that Revansh has approved)." >&2
  echo "       Example: $0 ../Channel-Green 3f2a9c1" >&2
  exit 2
fi

SITE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$SITE_ROOT/client/src/channel-green"
SHA="$(git -C "$SRC_REPO" rev-parse --verify "$REF^{commit}")"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$SRC_REPO" archive "$SHA" | tar -x -C "$TMP"

echo "Channel Green $SHA -> $DEST"

# Replace a synced folder wholesale so deleted upstream files disappear here too.
copy_dir() { # <src-relative> <dest-relative>
  local from="$TMP/$1" to="$DEST/$2"
  [[ -d "$from" ]] || { echo "error: missing upstream folder $1" >&2; exit 1; }
  rm -rf "$to"
  mkdir -p "$to"
  cp -R "$from"/. "$to"/
  # tests run in the Channel-Green repo, not here
  find "$to" -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -delete
  find "$to" -type d -name test -empty -delete
}

mkdir -p "$DEST/web/components/landing" "$DEST/packages/content"

copy_dir packages/shared/src               packages/shared/src
copy_dir packages/content/src              packages/content/src
copy_dir packages/content/packs            packages/content/packs
copy_dir packages/content/generated        packages/content/generated
copy_dir apps/web/src/game                 web/game
copy_dir apps/web/src/lib                  web/lib
copy_dir apps/web/src/components/play      web/components/play

for f in HeroScene.tsx MapThumb.tsx; do
  cp "$TMP/apps/web/src/components/landing/$f" "$DEST/web/components/landing/$f"
done

# Plain content pages: copied as they are (the Next.js page wrappers are not needed here).
mkdir -p "$DEST/web/pages"
cp "$TMP/apps/web/src/app/guidelines/page.tsx" "$DEST/web/pages/Guidelines.tsx"
cp "$TMP/apps/web/src/app/credits/page.tsx"    "$DEST/web/pages/Credits.tsx"

# The stylesheet, restricted so it can only affect the Channel Green section.
if command -v python3 >/dev/null 2>&1; then
  python3 -I "$SITE_ROOT/scripts/channel-green-scope-css.py" "$TMP/apps/web/src/app/globals.css" > "$DEST/web/globals.scoped.css"
else
  echo "error: python3 is needed to prepare the stylesheet" >&2; exit 1
fi

cp "$TMP/LICENSE"          "$DEST/LICENSE"
cp "$TMP/ATTRIBUTIONS.md"  "$DEST/ATTRIBUTIONS.md"

# Two mechanical edits so the Next.js source runs unchanged in this Vite site:
#   1. drop the 'use client' directive (meaningless outside Next.js)
#   2. the web app's "@/" import alias becomes "@cg/" (this site already owns "@/")
find "$DEST/web" -type f \( -name '*.ts' -o -name '*.tsx' \) | while read -r f; do
  sed -i -e "/^'use client';\$/d" -e "s#'@/#'@cg/#g" "$f"
done

# Files that are NOT copied because this site has its own version of them. If they changed
# upstream, someone has to port the change by hand. We record a fingerprint so we can say so.
HAND_PORTED=(
  apps/web/src/app/globals.css
  apps/web/src/app/layout.tsx
  apps/web/src/app/page.tsx
  apps/web/src/app/play/page.tsx
  apps/web/src/app/api/status/route.ts
  apps/web/src/components/landing/Landing.tsx
  apps/web/next.config.ts
  apps/web/package.json
)
FP_NEW="$TMP/fingerprints.txt"
: > "$FP_NEW"
for f in "${HAND_PORTED[@]}"; do
  [[ -f "$TMP/$f" ]] && (cd "$TMP" && sha256sum "$f") >> "$FP_NEW"
done

FP_FILE="$DEST/UPSTREAM.txt"
CHANGED=()
if [[ -f "$FP_FILE" ]]; then
  for f in "${HAND_PORTED[@]}"; do
    old="$(grep -F "  $f" "$FP_FILE" | awk '{print $1}' || true)"
    new="$(grep -F "  $f" "$FP_NEW" | awk '{print $1}' || true)"
    if [[ -n "$old" && "$old" != "$new" ]]; then CHANGED+=("$f"); fi
  done
fi

{
  echo "Channel Green source commit: $SHA"
  echo "Ref given: $REF"
  echo "Synced on: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "Fingerprints of upstream files that this site ports by hand (see docs/channel-green-sync.md):"
  cat "$FP_NEW"
} > "$FP_FILE"

echo
echo "Done. Nothing was committed or pushed."
if ((${#CHANGED[@]})); then
  echo
  echo "These upstream files changed since the last sync and are ported by hand here."
  echo "Look at them and update the matching site files (the mapping is in docs/channel-green-sync.md):"
  printf '  - %s\n' "${CHANGED[@]}"
fi
echo
echo "Next: git diff --stat; pnpm check; pnpm build; look at /channel-green in a preview; then commit on a branch."
