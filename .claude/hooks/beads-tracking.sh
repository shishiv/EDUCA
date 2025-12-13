#!/bin/bash
# Hook: Auto-create Beads issues for tracked file patterns
# Type: PostToolUse (after Write tool)

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract file path from Write tool output
FILEPATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Must have a file path
if [ -z "$FILEPATH" ]; then
  exit 0
fi

# Convert to relative path if absolute
if [[ "$FILEPATH" == /* ]]; then
  # Remove project path prefix if present
  FILEPATH="${FILEPATH#$CLAUDE_PROJECT_DIR/}"
  FILEPATH="${FILEPATH#/home/shiv/repos/EDUCA/}"
fi

# Pattern matching - determine type and prefix
TYPE=""
PREFIX=""

case "$FILEPATH" in
  .prompts/*.md|.prompts/**/*.md)
    TYPE="task"
    PREFIX="[PROMPT]"
    ;;
  .planning/*.md|.planning/**/*.md)
    TYPE="task"
    PREFIX="[PLAN]"
    ;;
  *-PLAN.md)
    TYPE="task"
    PREFIX="[PLAN]"
    ;;
  .claude/skills/*.md)
    TYPE="feature"
    PREFIX="[SKILL]"
    ;;
  ROADMAP*.md)
    TYPE="epic"
    PREFIX="[ROADMAP]"
    ;;
  components/*/README.md|components/*/*/README.md)
    TYPE="task"
    PREFIX="[DOC]"
    ;;
  lib/*-service.ts|lib/**/*-service.ts)
    TYPE="feature"
    PREFIX="[SERVICE]"
    ;;
  *)
    # No match, skip
    exit 0
    ;;
esac

# Get absolute path for reading file
if [[ "$FILEPATH" == /* ]]; then
  ABSOLUTE_PATH="$FILEPATH"
else
  ABSOLUTE_PATH="$CLAUDE_PROJECT_DIR/$FILEPATH"
fi

# Check if file exists (might be deleted)
if [ ! -f "$ABSOLUTE_PATH" ]; then
  exit 0
fi

# Metadata extraction
NAME=""

# Try to extract from YAML frontmatter (name or title field)
if head -20 "$ABSOLUTE_PATH" 2>/dev/null | grep -q "^---"; then
  NAME=$(head -20 "$ABSOLUTE_PATH" | grep -E "^(name|title):" | head -1 | cut -d: -f2- | xargs)
fi

# Fallback: first heading
if [ -z "$NAME" ]; then
  NAME=$(grep -m1 "^#" "$ABSOLUTE_PATH" 2>/dev/null | sed 's/^#* *//' || true)
fi

# Fallback: filename without extension
if [ -z "$NAME" ]; then
  BASENAME=$(basename "$FILEPATH")
  NAME="${BASENAME%.*}"
fi

# If still no name, use filepath
if [ -z "$NAME" ]; then
  NAME="$FILEPATH"
fi

# Deduplication check - see if an issue already exists with this path
EXISTING=$(bd list --status=open 2>/dev/null | grep -F "$FILEPATH" || true)

if [ -n "$EXISTING" ]; then
  # Issue already exists, skip
  exit 0
fi

# Create the issue
bd create \
  --title="$PREFIX $NAME" \
  --type="$TYPE" \
  --description="Auto-tracked file: $FILEPATH" \
  2>/dev/null || true

exit 0
