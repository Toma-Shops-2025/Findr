#!/bin/sh
# Point this clone at repo-managed git hooks (OAuth pre-push guard).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x scripts/git-hooks/pre-push
git config core.hooksPath scripts/git-hooks

echo "Installed git hooks:"
echo "  core.hooksPath = scripts/git-hooks"
echo ""
echo "Before each push that changes Google OAuth files, test:oauth runs automatically."
echo "One-time setup per machine/clone. Skip once: SKIP_OAUTH_HOOK=1 git push"
