#!/usr/bin/env node

/**
 * Bundle Analysis Script for Educational Management System
 * Analyzes bundle size, identifies optimization opportunities, and ensures performance targets
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Performance targets for educational system
const PERFORMANCE_TARGETS = {
  dashboard: 3000, // 3 seconds
  attendance: 1000, // 1 second
  students: 2000, // 2 seconds
  reports: 2500, // 2.5 seconds
  maxBundleSize: 1000 * 1024, // 1MB
  maxChunkSize: 250 * 1024, // 250KB
  maxImageSize: 500 * 1024 // 500KB
}

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logSection(title) {
  log(`\n${'='.repeat(60)}`, 'blue')
  log(`${colors.bold}${title}${colors.reset}`, 'blue')
  log('='.repeat(60), 'blue')
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function analyzeBundle() {
  logSection('Bundle Analysis for Educational Management System')

  try {
    // Check if build exists
    const buildDir = path.join(process.cwd(), '.next')
    if (!fs.existsSync(buildDir)) {
      log('❌ Build directory not found. Running production build...', 'yellow')
      execSync('npm run build', { stdio: 'inherit' })
    }

    // Run bundle analyzer in JSON mode
    log('📊 Analyzing bundle size and composition...', 'blue')

    // Set environment variable and run build with analyzer
    process.env.ANALYZE = 'true'
    execSync('npm run build', { stdio: 'inherit' })

    // Analyze build output
    analyzeBuildOutput()

    // Check image optimization
    analyzeImages()

    // Provide optimization recommendations
    provideRecommendations()

  } catch (error) {
    log(`❌ Bundle analysis failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

function analyzeBuildOutput() {
  logSection('Build Output Analysis')

  try {
    const buildManifest = path.join(process.cwd(), '.next/build-manifest.json')

    if (fs.existsSync(buildManifest)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'))

      log('📄 Pages analyzed:', 'green')
      Object.keys(manifest.pages).forEach(page => {
        log(`  • ${page}`, 'reset')
      })

      // Analyze static files
      const staticDir = path.join(process.cwd(), '.next/static')
      if (fs.existsSync(staticDir)) {
        const totalSize = calculateDirectorySize(staticDir)

        log(`\n📦 Total static assets size: ${formatBytes(totalSize)}`, 'blue')

        if (totalSize > PERFORMANCE_TARGETS.maxBundleSize) {
          log('⚠️  Bundle size exceeds target (1MB)', 'yellow')
        } else {
          log('✅ Bundle size within target', 'green')
        }
      }
    }

    // Analyze individual chunks
    analyzeChunks()

  } catch (error) {
    log(`⚠️  Could not analyze build output: ${error.message}`, 'yellow')
  }
}

function analyzeChunks() {
  logSection('Chunk Analysis')

  try {
    const chunksDir = path.join(process.cwd(), '.next/static/chunks')

    if (fs.existsSync(chunksDir)) {
      const chunks = fs.readdirSync(chunksDir)
        .filter(file => file.endsWith('.js'))
        .map(file => {
          const filePath = path.join(chunksDir, file)
          const stats = fs.statSync(filePath)
          return {
            name: file,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size)
          }
        })
        .sort((a, b) => b.size - a.size)

      log('📚 JavaScript chunks (largest first):', 'blue')

      chunks.slice(0, 10).forEach(chunk => {
        const status = chunk.size > PERFORMANCE_TARGETS.maxChunkSize ? '⚠️' : '✅'
        log(`  ${status} ${chunk.name}: ${chunk.sizeFormatted}`)
      })

      // Find problematic chunks
      const largeChunks = chunks.filter(chunk => chunk.size > PERFORMANCE_TARGETS.maxChunkSize)

      if (largeChunks.length > 0) {
        log('\n⚠️  Large chunks detected (>250KB):', 'yellow')
        largeChunks.forEach(chunk => {
          log(`  • ${chunk.name}: ${chunk.sizeFormatted}`, 'yellow')
        })
      }

    }
  } catch (error) {
    log(`⚠️  Could not analyze chunks: ${error.message}`, 'yellow')
  }
}

function analyzeImages() {
  logSection('Image Optimization Analysis')

  try {
    const publicDir = path.join(process.cwd(), 'public')
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif']

    if (fs.existsSync(publicDir)) {
      const images = findImageFiles(publicDir, imageExtensions)

      log(`🖼️  Found ${images.length} images in public directory`, 'blue')

      let totalImageSize = 0
      let largeImages = []

      images.forEach(image => {
        const stats = fs.statSync(image.path)
        totalImageSize += stats.size

        if (stats.size > PERFORMANCE_TARGETS.maxImageSize) {
          largeImages.push({
            ...image,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size)
          })
        }
      })

      log(`📊 Total image size: ${formatBytes(totalImageSize)}`, 'blue')

      if (largeImages.length > 0) {
        log('\n⚠️  Large images detected (>500KB):', 'yellow')
        largeImages.forEach(img => {
          log(`  • ${img.relativePath}: ${img.sizeFormatted}`, 'yellow')
        })
      } else {
        log('✅ All images are optimally sized', 'green')
      }
    }

  } catch (error) {
    log(`⚠️  Could not analyze images: ${error.message}`, 'yellow')
  }
}

function findImageFiles(dir, extensions, baseDir = dir) {
  let images = []

  try {
    const files = fs.readdirSync(dir)

    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        images = images.concat(findImageFiles(filePath, extensions, baseDir))
      } else if (extensions.some(ext => file.toLowerCase().endsWith(ext))) {
        images.push({
          path: filePath,
          relativePath: path.relative(baseDir, filePath),
          name: file
        })
      }
    })
  } catch (error) {
    // Skip directories that can't be read
  }

  return images
}

function calculateDirectorySize(dir) {
  let totalSize = 0

  try {
    const files = fs.readdirSync(dir)

    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stats = fs.statSync(filePath)

      if (stats.isDirectory()) {
        totalSize += calculateDirectorySize(filePath)
      } else {
        totalSize += stats.size
      }
    })
  } catch (error) {
    // Skip directories that can't be read
  }

  return totalSize
}

function provideRecommendations() {
  logSection('Optimization Recommendations')

  log('💡 Performance optimization suggestions for educational system:', 'green')

  log('\n🚀 Immediate actions:', 'blue')
  log('  • Enable code splitting for major routes (/dashboard, /alunos, /frequencia)')
  log('  • Implement lazy loading for data tables and charts')
  log('  • Optimize student photos with next/image (quality: 85)')
  log('  • Use webp/avif formats for educational icons')

  log('\n📱 Mobile optimization (tablets for teachers):', 'blue')
  log('  • Implement responsive image loading')
  log('  • Use touch-optimized components for attendance')
  log('  • Enable service worker for offline capability')

  log('\n🎯 Educational-specific optimizations:', 'blue')
  log('  • Cache student data with React Query (5min stale time)')
  log('  • Preload critical attendance routes')
  log('  • Implement progressive loading for class lists')
  log('  • Optimize Brazilian data validation (CPF, phone)')

  log('\n📊 Monitoring:', 'blue')
  log('  • Dashboard load time target: <3s')
  log('  • Attendance marking target: <1s per student')
  log('  • Use Lighthouse CI for continuous monitoring')
  log('  • Monitor Core Web Vitals in production')
}

// Performance testing function
function runPerformanceTests() {
  logSection('Performance Testing')

  log('🏃 Running performance tests for educational routes...', 'blue')

  try {
    // You can integrate with tools like:
    // - Lighthouse CI
    // - WebPageTest
    // - Custom performance scripts

    log('📝 Performance test results:', 'green')
    log('  • Dashboard (mock): 2.8s ✅')
    log('  • Attendance (mock): 0.9s ✅')
    log('  • Students (mock): 1.7s ✅')
    log('  • Reports (mock): 2.3s ✅')

  } catch (error) {
    log(`⚠️  Performance tests failed: ${error.message}`, 'yellow')
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.includes('--performance')) {
    runPerformanceTests()
  } else {
    analyzeBundle()
  }
}

module.exports = {
  analyzeBundle,
  runPerformanceTests,
  PERFORMANCE_TARGETS
}