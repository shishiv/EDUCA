#!/usr/bin/env bun

/**
 * Automated Console.log Cleanup Script
 * Replaces console.log/error/warn/info with proper logger calls
 *
 * Usage: bun run scripts/cleanup-console-logs.ts
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

interface FileReplacement {
  file: string
  replacements: number
  errors: string[]
}

const results: FileReplacement[] = []

// Files to process (production code only, excluding tests)
const targetFiles = [
  // API Routes
  'app/api/sessoes-aula/[id]/status/route.ts',
  'app/api/sessoes-aula/[id]/frequencia/batch/route.ts',
  'app/api/sessoes-aula/[id]/cancelar/route.ts',
  'app/api/sessions/route.ts',
  'app/api/sessions/dashboard/route.ts',
  'app/api/sessions/batch/route.ts',
  'app/api/sessions/[id]/status/route.ts',
  'app/api/sessions/[id]/route.ts',
  'app/api/sessions/[id]/attendance/route.ts',
  'app/api/frequencia/sessao/[aula_id]/route.ts',
  'app/api/frequencia/marcar/route.ts',
  'app/api/aulas/[aula_id]/status/route.ts',
  'app/api/aulas/fechar/route.ts',
  'app/api/aulas/ativas/route.ts',

  // Dashboard Pages
  'app/(dashboard)/dashboard/usuarios/page.tsx',
  'app/(dashboard)/dashboard/usuarios/novo/page.tsx',
  'app/(dashboard)/dashboard/usuarios/[id]/page.tsx',
  'app/(dashboard)/dashboard/page.tsx',
  'app/(dashboard)/dashboard/escolas/nova/page.tsx',
  'app/(dashboard)/dashboard/escolas/[id]/editar/page.tsx',
  'app/(dashboard)/dashboard/escolas/page.tsx',
  'app/(dashboard)/dashboard/configuracoes/page.tsx',
  'app/(dashboard)/dashboard/alunos/page.tsx',
  'app/(dashboard)/dashboard/alunos/novo/page.tsx',
  'app/(dashboard)/dashboard/alunos/[id]/page.tsx',
  'app/(dashboard)/dashboard/relatorios/page.tsx',
  'app/(dashboard)/dashboard/notas/page.tsx',
  'app/(dashboard)/dashboard/diario/page.tsx',

  // Components
  'components/attendance/FrequenciaWorkflow.tsx',
  'components/attendance/AttendanceGrid.tsx',
  'components/attendance/AbrirAulaWorkflow.tsx',
  'components/attendance/FecharAulaDialog.tsx',
  'components/diary/class-diary-filter.tsx',
  'components/diary/class-diary-detail.tsx',
  'components/dashboard/teacher-dashboard-enhanced.tsx',

  // Contexts
  'contexts/session-realtime-context.tsx',
  'contexts/search-context.tsx',

  // Hooks
  'hooks/use-service-worker.ts',
  'hooks/use-attendance-hooks.ts',
  'hooks/use-aula-realtime.ts',
  'hooks/use-users-query.ts',

  // Lib
  'lib/middleware/auth-middleware.ts',
  'lib/api/class-diary.ts',
  'lib/logger.ts',
]

async function processFile(filePath: string): Promise<FileReplacement> {
  const result: FileReplacement = {
    file: filePath,
    replacements: 0,
    errors: []
  }

  try {
    const fullPath = join(process.cwd(), filePath)
    let content = await readFile(fullPath, 'utf-8')
    let modified = false

    // Check if logger is already imported
    const hasLoggerImport = content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')

    // Count console statements
    const consoleMatches = content.match(/console\.(log|error|warn|info)\(/g)
    if (!consoleMatches || consoleMatches.length === 0) {
      return result // No console statements found
    }

    // Add logger import if not present
    if (!hasLoggerImport) {
      // Find the last import statement
      const importRegex = /^import .+ from .+$/gm
      const imports = content.match(importRegex)

      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1]
        content = content.replace(lastImport, `${lastImport}\nimport { logger } from '@/lib/logger'`)
        modified = true
      } else {
        result.errors.push('Could not find import statements')
        return result
      }
    }

    // Replace console.error with logger.error
    const errorRegex = /console\.error\((.*?)\)/g
    content = content.replace(errorRegex, (match, args) => {
      result.replacements++
      modified = true

      // Try to parse the arguments
      const argList = args.split(',').map((a: string) => a.trim())

      if (argList.length === 1) {
        // Single argument: console.error('message')
        return `logger.error(${args})`
      } else if (argList.length === 2) {
        // Two arguments: console.error('message', error)
        const message = argList[0]
        const errorVar = argList[1]
        return `logger.error(${message}, { error: ${errorVar} })`
      } else {
        // Multiple arguments - try to convert to context object
        const message = argList[0]
        const contextArgs = argList.slice(1).join(', ')
        return `logger.error(${message}, { ${contextArgs} })`
      }
    })

    // Replace console.log with logger.info
    const logRegex = /console\.log\((.*?)\)/g
    content = content.replace(logRegex, (match, args) => {
      result.replacements++
      modified = true

      const argList = args.split(',').map((a: string) => a.trim())

      if (argList.length === 1) {
        return `logger.info(${args})`
      } else {
        const message = argList[0]
        const contextArgs = argList.slice(1).join(', ')
        return `logger.info(${message}, { ${contextArgs} })`
      }
    })

    // Replace console.warn with logger.warn
    const warnRegex = /console\.warn\((.*?)\)/g
    content = content.replace(warnRegex, (match, args) => {
      result.replacements++
      modified = true

      const argList = args.split(',').map((a: string) => a.trim())

      if (argList.length === 1) {
        return `logger.warn(${args})`
      } else {
        const message = argList[0]
        const contextArgs = argList.slice(1).join(', ')
        return `logger.warn(${message}, { ${contextArgs} })`
      }
    })

    // Replace console.info with logger.info
    const infoRegex = /console\.info\((.*?)\)/g
    content = content.replace(infoRegex, (match, args) => {
      result.replacements++
      modified = true
      return `logger.info(${args})`
    })

    // Write the modified file if changes were made
    if (modified) {
      await writeFile(fullPath, content, 'utf-8')
    }

  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error))
  }

  return result
}

async function main() {
  console.log('🧹 Starting console.log cleanup...\n')

  for (const file of targetFiles) {
    const result = await processFile(file)
    results.push(result)

    if (result.replacements > 0) {
      console.log(`✅ ${file}: ${result.replacements} replacements`)
    } else if (result.errors.length > 0) {
      console.log(`❌ ${file}: ${result.errors.join(', ')}`)
    } else {
      console.log(`⏭️  ${file}: no console statements found`)
    }
  }

  console.log('\n📊 Summary:')
  const totalReplacements = results.reduce((sum, r) => sum + r.replacements, 0)
  const filesModified = results.filter(r => r.replacements > 0).length
  const filesWithErrors = results.filter(r => r.errors.length > 0).length

  console.log(`   Total files processed: ${targetFiles.length}`)
  console.log(`   Files modified: ${filesModified}`)
  console.log(`   Total replacements: ${totalReplacements}`)
  console.log(`   Files with errors: ${filesWithErrors}`)

  if (filesWithErrors > 0) {
    console.log('\n⚠️  Files with errors:')
    results
      .filter(r => r.errors.length > 0)
      .forEach(r => {
        console.log(`   - ${r.file}: ${r.errors.join(', ')}`)
      })
  }

  console.log('\n✨ Cleanup complete!')
}

main().catch(console.error)
