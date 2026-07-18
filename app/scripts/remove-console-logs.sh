#!/bin/bash
# Script to remove console.log/error/warn from production files
# Run with: bash scripts/remove-console-logs.sh

echo "🧹 Removing console.log statements from production files..."
echo "This will add logger imports and convert console statements to logger calls"
echo ""

# Files to process (39 total)
FILES=(
  "app/(dashboard)/dashboard/usuarios/page.tsx"
  "app/(dashboard)/dashboard/page.tsx"
  "app/(dashboard)/dashboard/diario/page.tsx"
  "app/(dashboard)/dashboard/escolas/page.tsx"
  "app/(dashboard)/dashboard/escolas/nova/page.tsx"
  "app/(dashboard)/dashboard/escolas/[id]/editar/page.tsx"
  "app/(dashboard)/dashboard/alunos/page.tsx"
  "app/(dashboard)/dashboard/alunos/novo/page.tsx"
  "app/(dashboard)/dashboard/alunos/[id]/page.tsx"
  "app/(dashboard)/dashboard/turmas/page.tsx"
  "app/(dashboard)/dashboard/usuarios/novo/page.tsx"
  "app/(dashboard)/dashboard/usuarios/[id]/page.tsx"
  "app/(dashboard)/dashboard/configuracoes/page.tsx"
  "app/(dashboard)/dashboard/relatorios/page.tsx"
  "app/(dashboard)/dashboard/notas/page.tsx"
  "app/(dashboard)/dashboard/matriculas/page.tsx"
  "app/api/sessoes-aula/abrir/route.ts"
  "app/api/sessoes-aula/[id]/status/route.ts"
  "app/api/sessoes-aula/[id]/frequencia/batch/route.ts"
  "app/api/sessoes-aula/[id]/cancelar/route.ts"
  "app/api/sessions/route.ts"
  "app/api/sessions/dashboard/route.ts"
  "app/api/sessions/batch/route.ts"
  "app/api/sessions/[id]/status/route.ts"
  "app/api/sessions/[id]/route.ts"
  "app/api/sessions/[id]/attendance/route.ts"
  "app/api/frequencia/sessao/[aula_id]/route.ts"
  "app/api/frequencia/marcar/route.ts"
  "app/api/aulas/[aula_id]/status/route.ts"
  "app/api/aulas/fechar/route.ts"
  "app/api/aulas/ativas/route.ts"
  "app/api/aulas/abrir/route.ts"
  "app/actions/attendance/open-session.ts"
  "app/actions/attendance/mark-attendance.ts"
  "app/actions/attendance/check-lock-status.ts"
  "app/actions/attendance/close-session.ts"
  "app/(auth)/login/page.tsx"
  "app/(auth)/role-selection/page.tsx"
  "app/onboarding/page.tsx"
)

PROCESSED=0
SKIPPED=0

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Check if file has console statements
    if grep -q "console\.\(log\|error\|warn\)" "$file"; then
      # Create backup
      cp "$file" "$file.backup"

      # Add logger import if not present (only for TS/TSX files)
      if ! grep -q "import.*logger.*from.*@/lib/logger" "$file"; then
        # Insert after the last import or at the beginning
        sed -i "1i import { logger } from '@/lib/logger'" "$file"
      fi

      # Replace console.error with logger.error
      sed -i "s/console\.error(/logger.error(/g" "$file"

      # Replace console.warn with logger.warn
      sed -i "s/console\.warn(/logger.warn(/g" "$file"

      # Replace console.log with logger.debug (for production, we demote logs to debug level)
      sed -i "s/console\.log(/logger.debug(/g" "$file"

      ((PROCESSED++))
      echo "  ✓ Processed"
    else
      echo "  ⊘ No console statements found"
      ((SKIPPED++))
    fi
  else
    echo "  ✗ File not found: $file"
    ((SKIPPED++))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cleanup complete!"
echo "📊 Files processed: $PROCESSED"
echo "⊘ Files skipped: $SKIPPED"
echo ""
echo "🔍 Next steps:"
echo "1. Review changes: git diff"
echo "2. Test the application: pnpm run dev"
echo "3. Commit changes: git add . && git commit -m 'refactor: replace console statements with logger'"
echo ""
echo "💡 Note: Backup files created with .backup extension"
echo "   To restore: for f in **/*.backup; do mv \"\$f\" \"\${f%.backup}\"; done"
