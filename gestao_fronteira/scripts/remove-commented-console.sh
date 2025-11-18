#!/bin/bash

# Script to remove all commented console.* calls from TypeScript files
# Phase 1 of console.* cleanup - Quick Win!

echo "🧹 Removing commented console.* calls from codebase..."
echo ""

# Counter
removed_count=0
files_modified=0

# Find all TS/TSX files (excluding node_modules, .next, etc.)
files=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/build/*" \
  -not -path "*/.git/*")

# Process each file
for file in $files; do
  # Check if file contains commented console.*
  if grep -q "^\s*//\s*console\.\(log\|error\|warn\|info\|debug\)" "$file"; then
    echo "📝 Processing: $file"

    # Count lines before
    lines_before=$(wc -l < "$file")

    # Remove commented console.* lines (in-place, with backup)
    sed -i.bak '/^[[:space:]]*\/\/[[:space:]]*console\.\(log\|error\|warn\|info\|debug\)/d' "$file"

    # Count lines after
    lines_after=$(wc -l < "$file")

    # Calculate removed lines
    removed=$((lines_before - lines_after))

    if [ $removed -gt 0 ]; then
      removed_count=$((removed_count + removed))
      files_modified=$((files_modified + 1))
      echo "  ✅ Removed $removed commented console.* lines"

      # Remove backup file
      rm "${file}.bak"
    else
      # Restore backup if nothing was removed
      mv "${file}.bak" "$file"
    fi
  fi
done

echo ""
echo "✅ Cleanup complete!"
echo "📊 Summary:"
echo "  - Files modified: $files_modified"
echo "  - Lines removed: $removed_count"
echo "  - Quick win achieved! 🎉"
