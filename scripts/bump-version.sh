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

# Get current version from VERSION file (single source of truth)
CURRENT_VERSION=$(cat "$REPO_ROOT/VERSION")

echo "Current version: $CURRENT_VERSION"
echo "Bumping $BUMP_TYPE..."

# Parse version: X.Y.Z
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump appropriate part
case "$BUMP_TYPE" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Update VERSION file
echo "$NEW_VERSION" > "$REPO_ROOT/VERSION"

# Let npm update package.json and package-lock.json with the computed version
npm version "$NEW_VERSION" --no-git-tag-version

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
