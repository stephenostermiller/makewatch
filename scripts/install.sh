#!/bin/bash
set -e

# Determine default installation directory
if [ -z "$INSTALL_PREFIX" ]; then
    if [ -w /opt ]; then
        INSTALL_PREFIX=/opt/makewatch
    else
        INSTALL_PREFIX="$HOME/.local/opt/makewatch"
    fi
fi

# Determine default bin directory
if [ -z "$BIN_PREFIX" ]; then
    if [ -w /usr/local/bin ]; then
        BIN_PREFIX=/usr/local/bin
    else
        BIN_PREFIX="$HOME/.local/bin"
    fi
fi

TARGET_DIR="$INSTALL_PREFIX"
BIN_LINK="$BIN_PREFIX/makewatch"

# Parse required Node version from package.json
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUIRED_NODE_VERSION=$(grep -o '"node"[[:space:]]*:[[:space:]]*"[^"]*"' "$SCRIPT_DIR/package.json" | grep -o '[0-9.]*' | head -1)

# Check for required tools
echo "Checking dependencies..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo ""
    echo "makewatch requires Node.js $REQUIRED_NODE_VERSION"
    echo ""
    echo "Installation options:"
    echo "  • Using apt (Debian/Ubuntu):"
    echo "    sudo apt update && sudo apt install -y nodejs npm"
    echo ""
    echo "  • Using Homebrew (macOS):"
    echo "    brew install node"
    echo ""
    echo "  • Visit https://nodejs.org/ for other options"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed."
    echo ""
    echo "npm should be installed with Node.js."
    echo "Try reinstalling Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)
NODE_MINOR=$(echo $NODE_VERSION | cut -d'.' -f2)
NODE_PATCH=$(echo $NODE_VERSION | cut -d'.' -f3)

REQUIRED_MAJOR=$(echo $REQUIRED_NODE_VERSION | cut -d'.' -f1)
REQUIRED_MINOR=$(echo $REQUIRED_NODE_VERSION | cut -d'.' -f2)
REQUIRED_PATCH=$(echo $REQUIRED_NODE_VERSION | cut -d'.' -f3)

if [ "$NODE_MAJOR" -lt "$REQUIRED_MAJOR" ] || \
   ([ "$NODE_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$NODE_MINOR" -lt "$REQUIRED_MINOR" ]) || \
   ([ "$NODE_MAJOR" -eq "$REQUIRED_MAJOR" ] && [ "$NODE_MINOR" -eq "$REQUIRED_MINOR" ] && [ "$NODE_PATCH" -lt "$REQUIRED_PATCH" ]); then
    echo "ERROR: Node.js version is too old."
    echo ""
    echo "Found: v$NODE_VERSION"
    echo "Required: >= $REQUIRED_NODE_VERSION"
    echo ""
    echo "Update Node.js using your package manager or visit https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js v$NODE_VERSION"
echo "✓ npm $(npm --version)"
echo ""
echo "Installing makewatch to $TARGET_DIR..."

# Create target directory and copy files
mkdir -p "$TARGET_DIR"
cp -r . "$TARGET_DIR/"

# Install dependencies in target location
cd "$TARGET_DIR"
npm install --omit=dev

# Create symlink in PATH
if [ ! -w "$(dirname "$BIN_LINK")" ]; then
    echo "Creating symlink in $BIN_LINK requires elevated permissions."
    sudo ln -sf "$TARGET_DIR/bin/makewatch.js" "$BIN_LINK"
else
    ln -sf "$TARGET_DIR/bin/makewatch.js" "$BIN_LINK"
fi

echo ""
echo "✓ makewatch installed successfully!"
echo "  Location: $TARGET_DIR"
echo "  Command:  makewatch"
echo ""
echo "Try it out:"
echo "  makewatch --version"
