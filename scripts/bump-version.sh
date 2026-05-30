#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <patch|minor|major>" >&2
  echo "Example: $0 patch" >&2
  exit 1
fi

BUMP_TYPE="$1"

if ! [[ "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: '$BUMP_TYPE' is not valid. Expected: patch, minor, or major" >&2
  exit 1
fi

cd "$REPO_ROOT"

if ! git diff --quiet; then
  echo "Error: Working tree has unstaged changes. Commit or stash them first." >&2
  exit 1
fi

if ! git diff --cached --quiet; then
  echo "Error: Working tree has staged changes. Commit or stash them first." >&2
  exit 1
fi

if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  echo "Error: Working tree has untracked files. Commit or stash them first." >&2
  exit 1
fi

# Get current version from VERSION file
CURRENT_VERSION=$(cat "$REPO_ROOT/VERSION")

echo "Current version: $CURRENT_VERSION"
echo "Bumping $BUMP_TYPE..."

# Update version using npm (handles semver bumping)
npm version "$BUMP_TYPE" --no-git-tag-version

# Read the new version that npm wrote to package.json
NEW_VERSION=$(jq -r '.version' "$REPO_ROOT/package.json")

# Update VERSION file to match
echo "$NEW_VERSION" > "$REPO_ROOT/VERSION"

# Check if tag already exists
TAG_NAME="VERSION_${NEW_VERSION}"
if git tag -l "$TAG_NAME" | grep -q "$TAG_NAME"; then
  echo "Error: Tag '$TAG_NAME' already exists." >&2
  exit 1
fi

# Stage only VERSION and package.json (package-lock.json is gitignored)
git add VERSION package.json

git commit -m "Release $NEW_VERSION"
git tag -a "$TAG_NAME" -m "Release $NEW_VERSION"

echo ""
echo "Done. Bumped to version $NEW_VERSION and created tag '$TAG_NAME'."
echo ""
echo "To publish, run:"
echo "  git push && git push --tags"
echo "  npm publish"
echo ""
echo "Version is now: $NEW_VERSION"
