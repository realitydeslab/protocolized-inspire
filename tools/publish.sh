#!/usr/bin/env bash
# Validate every batch, rebuild, refuse to publish on errors or silently removed works, then commit and push.
# Usage: tools/publish.sh "commit message"   (set ALLOW_REMOVED=1 to accept intentional removals)
set -euo pipefail
cd "$(dirname "$0")/.."
msg="${1:?commit message required}"
tmp="${TMPDIR:-/tmp}"
python3 tools/validate.py --all > "$tmp/proto-validate.txt" || { grep -v "^   note" "$tmp/proto-validate.txt" | grep -v "^✓"; echo "✗ validation failed — not publishing"; exit 1; }
python3 tools/build_data.py 2>&1 | tee "$tmp/proto-build.txt" | grep -E "creators=|REMOVED|unknown work" || true
if grep -q "REMOVED" "$tmp/proto-build.txt" && [ "${ALLOW_REMOVED:-0}" != "1" ]; then
  echo "✗ works were removed since the last build (see data/dropped.json) — set ALLOW_REMOVED=1 if intended"; exit 1
fi
if grep -q "unknown work" "$tmp/proto-build.txt"; then
  grep "unknown work" "$tmp/proto-build.txt"; echo "✗ a collection lists a work that does not exist — not publishing"; exit 1
fi
git rev-parse --git-dir > /dev/null 2>&1 || { echo "✗ not a git repository yet — run git init and add a remote first"; exit 1; }
git add -A
git commit -q -m "$msg

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
if git remote | grep -q .; then
  git pull --rebase --autostash -q   # GitHub may commit to CNAME when the Pages domain is changed
  git push -q
else
  echo "no git remote — committed locally only"
fi
git log --oneline | head -1
