# Prompt: Create Beads Tracking Hook

## Objective
Create a Claude Code PostToolUse hook that automatically creates Beads issues when specific files are created, enabling automatic work tracking.

## Context
- Existing hooks: `.claude/hooks.json` (has PreToolUse for commit validation)
- Existing hook script: `.claude/hooks/validate-commit.sh`
- Beads CLI: `bd` command available
- Issue types: task, feature, bug, epic

## Requirements

### Hook Script
Create file: `.claude/hooks/beads-tracking.sh`

**Pattern Matching (7 patterns):**

| Path Pattern | Type | Title Template |
|--------------|------|----------------|
| `.prompts/**/*.md` | task | `[PROMPT] {filename}` |
| `.planning/**/*.md` | task | `[PLAN] {filename}` |
| `*-PLAN.md` | task | `[PLAN] {filename}` |
| `.claude/skills/*.md` | feature | `[SKILL] {name}` |
| `ROADMAP*.md` | epic | `[ROADMAP] {heading}` |
| `components/**/README.md` | task | `[DOC] {component} docs` |
| `lib/**/*-service.ts` | feature | `[SERVICE] {name}` |

**Implementation Details:**

1. **Input Parsing**
   - Hook receives JSON on stdin with `tool_input.file_path`
   - Only trigger on Write tool completions
   - Extract file path from input

2. **Pattern Matching**
   ```bash
   case "$FILEPATH" in
     .prompts/*.md) TYPE="task"; PREFIX="[PROMPT]" ;;
     .planning/*.md) TYPE="task"; PREFIX="[PLAN]" ;;
     *-PLAN.md) TYPE="task"; PREFIX="[PLAN]" ;;
     .claude/skills/*.md) TYPE="feature"; PREFIX="[SKILL]" ;;
     ROADMAP*.md) TYPE="epic"; PREFIX="[ROADMAP]" ;;
     components/*/README.md) TYPE="task"; PREFIX="[DOC]" ;;
     lib/*-service.ts) TYPE="feature"; PREFIX="[SERVICE]" ;;
     *) exit 0 ;; # No match, skip
   esac
   ```

3. **Metadata Extraction**
   ```bash
   # Extract name from YAML frontmatter
   NAME=$(head -20 "$FILE" | grep -E "^(name|title):" | head -1 | cut -d: -f2 | xargs)
   # Fallback: first heading
   if [ -z "$NAME" ]; then
     NAME=$(grep -m1 "^#" "$FILE" | sed 's/^#* //')
   fi
   # Fallback: filename
   if [ -z "$NAME" ]; then
     NAME=$(basename "$FILEPATH" .md)
   fi
   ```

4. **Deduplication**
   ```bash
   # Check if issue already exists with this path
   EXISTING=$(bd list --status=open 2>/dev/null | grep -F "$FILEPATH" || true)
   if [ -n "$EXISTING" ]; then
     # Already tracked, skip
     exit 0
   fi
   ```

5. **Issue Creation**
   ```bash
   bd create \
     --title="$PREFIX $NAME" \
     --type="$TYPE" \
     --description="Auto-created from file: $FILEPATH"
   ```

### Update hooks.json
Add PostToolUse hook for Write tool:

```json
{
  "hooks": {
    "PreToolUse": [...existing...],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/beads-tracking.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### Script Template

```bash
#!/bin/bash
# Hook: Auto-create Beads issues for tracked file patterns
# Type: PostToolUse (after Write tool)

set -e

# Read JSON input
INPUT=$(cat)

# Extract file path from Write tool output
FILEPATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Must have a file path
if [ -z "$FILEPATH" ]; then
  exit 0
fi

# Pattern matching
case "$FILEPATH" in
  # ... pattern matching logic ...
esac

# Metadata extraction
# ... extraction logic ...

# Deduplication check
# ... check logic ...

# Create issue
bd create --title="$PREFIX $NAME" --type="$TYPE" --description="📁 $FILEPATH"
```

## Output
1. Create: `.claude/hooks/beads-tracking.sh` (executable)
2. Update: `.claude/hooks.json` (add PostToolUse section)

## Success Criteria
- [ ] Hook script created and executable (`chmod +x`)
- [ ] All 7 patterns implemented
- [ ] Metadata extraction works (YAML, heading, filename fallback)
- [ ] Deduplication prevents duplicate issues
- [ ] hooks.json updated with PostToolUse section
- [ ] Test: Creating a file in `.prompts/` triggers issue creation
