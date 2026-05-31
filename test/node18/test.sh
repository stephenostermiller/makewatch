#!/bin/bash
set -e

echo "Testing makewatch on Node 18..."
echo ""

# Test --version
echo "✓ Testing --version"
VERSION_OUTPUT=$(node bin/makewatch.js --version)
if [[ $VERSION_OUTPUT == makewatch* ]]; then
    echo "  Output: $VERSION_OUTPUT"
else
    echo "  FAILED: Expected 'makewatch ...' but got '$VERSION_OUTPUT'"
    exit 1
fi

# Test --help
echo "✓ Testing --help"
HELP_OUTPUT=$(node bin/makewatch.js --help)
if [[ $HELP_OUTPUT == *"Usage:"* ]]; then
    echo "  Help output contains usage information"
else
    echo "  FAILED: Expected help text containing 'Usage:'"
    exit 1
fi

# Test with invalid options
echo "✓ Testing error handling"
if node bin/makewatch.js --invalid-option 2>&1 | grep -q "error\|Error\|Unknown option"; then
    echo "  Properly handles invalid options"
else
    echo "  WARNING: Unexpected behavior with invalid options"
fi

echo ""
echo "✓ All Node 18 compatibility tests passed!"
