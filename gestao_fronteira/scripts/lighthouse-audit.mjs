/**
 * Lighthouse Audit Script - Task 4.7
 *
 * Automated accessibility audit for Task 3 components
 * Target: Accessibility score > 95, Performance > 90
 *
 * Usage: node scripts/lighthouse-audit.mjs
 */

import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import fs from 'fs'
import path from 'path'

const URLS_TO_AUDIT = [
  {
    url: 'http://localhost:3000/showcase',
    name: 'showcase-page'
  }
]

const SCORE_THRESHOLDS = {
  accessibility: 95,
  performance: 90,
  'best-practices': 90,
  seo: 80
}

async function runLighthouseAudit(url, name) {
  console.log(`\n🔍 Running Lighthouse audit for: ${url}`)

  // Launch Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  })

  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['accessibility', 'performance', 'best-practices', 'seo'],
    port: chrome.port
  }

  try {
    // Run Lighthouse
    const runnerResult = await lighthouse(url, options)

    // Extract scores
    const { lhr } = runnerResult
    const scores = {
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      performance: Math.round(lhr.categories.performance.score * 100),
      'best-practices': Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100)
    }

    // Save HTML report
    const reportPath = path.join(process.cwd(), 'lighthouse-reports', `${name}-${Date.now()}.html`)
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, runnerResult.report)

    console.log(`\n📊 Lighthouse Scores for ${name}:`)
    console.log(`   Accessibility: ${scores.accessibility}/100 ${scores.accessibility >= SCORE_THRESHOLDS.accessibility ? '✅' : '❌'}`)
    console.log(`   Performance:   ${scores.performance}/100 ${scores.performance >= SCORE_THRESHOLDS.performance ? '✅' : '❌'}`)
    console.log(`   Best Practices: ${scores['best-practices']}/100 ${scores['best-practices'] >= SCORE_THRESHOLDS['best-practices'] ? '✅' : '❌'}`)
    console.log(`   SEO:           ${scores.seo}/100 ${scores.seo >= SCORE_THRESHOLDS.seo ? '✅' : '❌'}`)
    console.log(`\n📄 Report saved: ${reportPath}`)

    // Extract accessibility issues
    const a11yAudits = lhr.categories.accessibility.auditRefs
      .map(ref => lhr.audits[ref.id])
      .filter(audit => audit.score !== null && audit.score < 1)

    if (a11yAudits.length > 0) {
      console.log(`\n⚠️  Accessibility Issues Found (${a11yAudits.length}):`)
      a11yAudits.forEach(audit => {
        console.log(`   - ${audit.title}`)
        if (audit.description) {
          console.log(`     ${audit.description.substring(0, 100)}...`)
        }
      })
    }

    await chrome.kill()

    return {
      name,
      url,
      scores,
      passed: Object.entries(scores).every(([category, score]) =>
        score >= SCORE_THRESHOLDS[category]
      ),
      reportPath
    }
  } catch (error) {
    await chrome.kill()
    throw error
  }
}

async function main() {
  console.log('🚀 Starting Lighthouse Audit for Task 4')
  console.log('=' .repeat(60))

  const results = []

  for (const { url, name } of URLS_TO_AUDIT) {
    try {
      const result = await runLighthouseAudit(url, name)
      results.push(result)
    } catch (error) {
      console.error(`❌ Error auditing ${url}:`, error.message)
      results.push({
        name,
        url,
        error: error.message,
        passed: false
      })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📋 Audit Summary:')
  console.log('='.repeat(60))

  const allPassed = results.every(r => r.passed)

  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED'
    console.log(`\n${status} - ${result.name}`)
    if (result.scores) {
      console.log(`   URL: ${result.url}`)
      console.log(`   Scores: A11y ${result.scores.accessibility}, Perf ${result.scores.performance}, BP ${result.scores['best-practices']}, SEO ${result.scores.seo}`)
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })

  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('✅ All audits passed! Task 4.7 complete.')
    process.exit(0)
  } else {
    console.log('❌ Some audits failed. Review reports and fix issues.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
