# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **CRITICAL**: Fixed CVE-2025-66478 (Next.js RCE in React flight protocol) - upgraded Next.js 15.5.3 → 15.5.7
- **HIGH**: Removed xlsx library vulnerable to Prototype Pollution (CVE-2023-30533) and ReDoS (CVE-2024-22363), replaced with secure exceljs 4.4.0
- **HIGH**: Fixed path-to-regexp ReDoS vulnerability (GHSA-9wv6-86v2-598j) via Vercel upgrade
- **MODERATE**: Fixed esbuild CORS vulnerability (GHSA-67mh-4wv8-2f99) and undici randomness/DoS vulnerabilities via Vercel upgrade
- Updated ESLint 8.49.0 → 9.39.1 for security maintenance
- Reduced production vulnerabilities from 19 to 4 (remaining are low-risk transitive dependencies in Vercel dev CLI)

### Changed
- gestao_fronteira: Next.js 15.5.3 → 15.5.7 (production security)
- gestao_fronteira: Replaced xlsx 0.18.5 with exceljs 4.4.0 (maintains Excel export compatibility)
- gestao_fronteira: Vercel CLI 48.2.0 → 48.12.1 (dev dependency)
- gestao_fronteira: ESLint 8.49.0 → 9.39.1 (dev dependency)

### Added
- gestao_fronteira: @types/exceljs for TypeScript support

### Notes
- **No breaking changes**: All upgrades maintain backward compatibility
- **Brazilian compliance maintained**: INEP exports, LGPD data protection features unchanged
- **Excel exports**: Migration from xlsx to exceljs is transparent, all report formats preserved
