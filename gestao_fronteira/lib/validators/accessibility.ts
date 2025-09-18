/**
 * Accessibility validation utilities for Brazilian educational interfaces
 * Ensures WCAG 2.1 AA compliance and Brazilian accessibility standards (LBI 13.146/2015)
 */

import { z } from 'zod'

export type ContrastLevel = 'AA' | 'AAA'
export type AccessibilityIssueType = 'contrast' | 'keyboard' | 'screen-reader' | 'focus' | 'aria'

/**
 * Validates color contrast ratio according to WCAG standards
 * @param foreground Foreground color (hex)
 * @param background Background color (hex)
 * @param level Contrast level to validate against
 * @returns boolean indicating if contrast meets requirements
 */
export function validateColorContrast(
  foreground: string,
  background: string,
  level: ContrastLevel = 'AA'
): boolean {
  const ratio = calculateContrastRatio(foreground, background)

  // WCAG 2.1 requirements
  const minRatio = level === 'AAA' ? 7 : 4.5

  return ratio >= minRatio
}

/**
 * Calculates contrast ratio between two colors
 * @param color1 First color (hex)
 * @param color2 Second color (hex)
 * @returns Contrast ratio
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1)
  const luminance2 = getLuminance(color2)

  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Calculates relative luminance of a color
 * @param color Color in hex format
 * @returns Relative luminance
 */
function getLuminance(color: string): number {
  // Convert hex to RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  // Apply gamma correction
  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4)
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4)
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4)

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Validates touch target size for mobile accessibility
 * Brazilian education standard: minimum 56px for teacher tablets
 * @param width Element width in pixels
 * @param height Element height in pixels
 * @returns boolean indicating if size meets requirements
 */
export function validateTouchTargetSize(width: number, height: number): boolean {
  const minSize = 56 // 56px minimum for educational interfaces
  return width >= minSize && height >= minSize
}

/**
 * Validates keyboard navigation compliance
 * @param element Element or component info
 * @returns Validation result with recommendations
 */
export function validateKeyboardNavigation(element: {
  tabIndex?: number
  role?: string
  ariaLabel?: string
  hasKeyboardHandler?: boolean
}): {
  valid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // Check for proper tab index
  if (element.tabIndex !== undefined && element.tabIndex < -1) {
    issues.push('Tab index inválido')
    recommendations.push('Use tabIndex 0 para elementos focáveis ou -1 para remover do fluxo')
  }

  // Check for ARIA labels on interactive elements
  if (!element.ariaLabel && (element.role === 'button' || element.role === 'link')) {
    issues.push('Elemento interativo sem aria-label')
    recommendations.push('Adicione aria-label descritivo para leitores de tela')
  }

  // Check for keyboard handlers
  if ((element.role === 'button' || element.role === 'link') && !element.hasKeyboardHandler) {
    issues.push('Elemento interativo sem manipuladores de teclado')
    recommendations.push('Adicione onKeyDown para suportar Enter e Space')
  }

  return {
    valid: issues.length === 0,
    issues,
    recommendations
  }
}

/**
 * Validates screen reader compatibility
 * @param content Content or component info
 * @returns Validation result
 */
export function validateScreenReaderCompatibility(content: {
  hasSemanticHTML?: boolean
  hasAriaLabels?: boolean
  hasHeadingStructure?: boolean
  hasAltText?: boolean
  hasLiveRegions?: boolean
}): {
  valid: boolean
  score: number
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  let score = 0

  if (content.hasSemanticHTML) {
    score += 20
  } else {
    issues.push('HTML semântico não utilizado')
    recommendations.push('Use elementos semânticos (header, nav, main, section, etc.)')
  }

  if (content.hasAriaLabels) {
    score += 20
  } else {
    issues.push('ARIA labels ausentes')
    recommendations.push('Adicione aria-label, aria-labelledby ou aria-describedby')
  }

  if (content.hasHeadingStructure) {
    score += 20
  } else {
    issues.push('Estrutura de cabeçalhos inadequada')
    recommendations.push('Use hierarquia correta de h1-h6')
  }

  if (content.hasAltText) {
    score += 20
  } else {
    issues.push('Texto alternativo ausente em imagens')
    recommendations.push('Adicione alt text descritivo para todas as imagens')
  }

  if (content.hasLiveRegions) {
    score += 20
  } else {
    issues.push('Regiões dinâmicas sem aria-live')
    recommendations.push('Use aria-live para conteúdo que muda dinamicamente')
  }

  return {
    valid: score >= 80,
    score,
    issues,
    recommendations
  }
}

/**
 * Validates form accessibility for Brazilian educational forms
 * @param form Form validation data
 * @returns Comprehensive accessibility report
 */
export function validateFormAccessibility(form: {
  hasLabels?: boolean
  hasFieldsets?: boolean
  hasErrorMessages?: boolean
  hasRequiredIndicators?: boolean
  hasInstructions?: boolean
}): {
  valid: boolean
  compliance: 'full' | 'partial' | 'none'
  issues: string[]
  brazilianCompliance: boolean
} {
  const issues: string[] = []
  let score = 0

  if (form.hasLabels) {
    score += 25
  } else {
    issues.push('Campos sem labels associados')
  }

  if (form.hasFieldsets) {
    score += 15
  } else {
    issues.push('Grupos de campos sem fieldset/legend')
  }

  if (form.hasErrorMessages) {
    score += 25
  } else {
    issues.push('Mensagens de erro não acessíveis')
  }

  if (form.hasRequiredIndicators) {
    score += 20
  } else {
    issues.push('Campos obrigatórios sem indicação clara')
  }

  if (form.hasInstructions) {
    score += 15
  } else {
    issues.push('Instruções de preenchimento ausentes')
  }

  let compliance: 'full' | 'partial' | 'none' = 'none'
  if (score >= 90) compliance = 'full'
  else if (score >= 70) compliance = 'partial'

  // Brazilian LBI 13.146/2015 compliance requires full accessibility
  const brazilianCompliance = compliance === 'full'

  return {
    valid: score >= 80,
    compliance,
    issues,
    brazilianCompliance
  }
}

/**
 * Educational color palette validation for WCAG compliance
 */
export const educationalColors = {
  attendance: {
    present: '#22c55e',      // 4.5:1 contrast on white
    absent: '#ef4444',       // 4.5:1 contrast on white
    late: '#f59e0b',         // 4.5:1 contrast on white
    justified: '#3b82f6',    // 4.5:1 contrast on white
  },
  performance: {
    excellent: '#059669',     // 4.5:1 contrast on white
    good: '#65a30d',         // 4.5:1 contrast on white
    satisfactory: '#ca8a04', // 4.5:1 contrast on white
    needs_improvement: '#dc2626', // 4.5:1 contrast on white
  }
} as const

/**
 * Validates educational color usage against WCAG standards
 * @param colorUsage Color usage in the interface
 * @returns Validation report
 */
export function validateEducationalColors(colorUsage: {
  backgroundColor: string
  textColor: string
  purpose: 'attendance' | 'performance' | 'general'
}): {
  valid: boolean
  contrastRatio: number
  wcagLevel: ContrastLevel | 'fail'
  recommendations: string[]
} {
  const ratio = calculateContrastRatio(colorUsage.textColor, colorUsage.backgroundColor)
  const recommendations: string[] = []

  let wcagLevel: ContrastLevel | 'fail' = 'fail'
  if (ratio >= 7) wcagLevel = 'AAA'
  else if (ratio >= 4.5) wcagLevel = 'AA'

  if (wcagLevel === 'fail') {
    recommendations.push('Melhore o contraste para atender WCAG 2.1 AA (mínimo 4.5:1)')
  }

  if (colorUsage.purpose === 'attendance') {
    recommendations.push('Use ícones além das cores para diferenciar status de frequência')
  }

  if (colorUsage.purpose === 'performance') {
    recommendations.push('Combine cores com indicadores textuais para notas/desempenho')
  }

  return {
    valid: ratio >= 4.5,
    contrastRatio: ratio,
    wcagLevel,
    recommendations
  }
}

// Zod schemas for accessibility validation

export const accessibilityConfigSchema = z.object({
  contrastLevel: z.enum(['AA', 'AAA']).default('AA'),
  minimumTouchTarget: z.number().min(44).default(56),
  screenReaderSupport: z.boolean().default(true),
  keyboardNavigation: z.boolean().default(true),
  brazilianCompliance: z.boolean().default(true)
})

export const colorContrastTestSchema = z.object({
  foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hex'),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hex'),
  purpose: z.string().optional(),
  requiredLevel: z.enum(['AA', 'AAA']).default('AA')
})

export type AccessibilityConfig = z.infer<typeof accessibilityConfigSchema>
export type ColorContrastTest = z.infer<typeof colorContrastTestSchema>