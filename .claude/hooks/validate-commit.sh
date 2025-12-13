#!/bin/bash
# Hook: Validate CHANGELOG.md and apontamento before git commit
# This script checks if the required files are staged before allowing a commit

set -e

# Read JSON input from stdin
INPUT=$(cat)

# Extract command from JSON
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only check for git commit commands (anywhere in the command chain)
if [[ ! "$COMMAND" =~ git\ commit ]]; then
  # Not a commit, approve
  echo '{"decision": "approve"}'
  exit 0
fi

# Skip if it's an amend (might be fixing previous commit)
if [[ "$COMMAND" =~ --amend ]]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Get staged files
STAGED=$(git diff --cached --name-only 2>/dev/null || echo "")

# Check for CHANGELOG.md
HAS_CHANGELOG=false
if echo "$STAGED" | grep -q "^CHANGELOG.md$"; then
  HAS_CHANGELOG=true
fi

# Check for .apontamento (hidden directory)
HAS_APONTAMENTO=false
if echo "$STAGED" | grep -q "^\.apontamento/"; then
  HAS_APONTAMENTO=true
fi

# Build error message
MISSING=""
if [ "$HAS_CHANGELOG" = false ]; then
  MISSING="CHANGELOG.md"
fi
if [ "$HAS_APONTAMENTO" = false ]; then
  if [ -n "$MISSING" ]; then
    MISSING="$MISSING e .apontamento/[mes-ano].md"
  else
    MISSING=".apontamento/[mes-ano].md"
  fi
fi

# If any required file is missing, block
if [ -n "$MISSING" ]; then
  echo "{\"decision\": \"block\", \"reason\": \"REGRA DO PROJETO: Atualize $MISSING antes de commitar. Ver CLAUDE.md para detalhes.\"}"
  exit 0
fi

# All good, approve
echo '{"decision": "approve"}'
