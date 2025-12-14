'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ExternalLink, Shield } from 'lucide-react'
import Link from 'next/link'

interface ConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  disabled?: boolean
}

export function ConsentCheckbox({
  checked,
  onCheckedChange,
  error,
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start space-x-3 p-4 border rounded-lg bg-amber-50 border-amber-200">
        <Checkbox
          id="lgpd-consent"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
          className="mt-1"
          aria-describedby="lgpd-consent-description"
        />
        <div className="space-y-1">
          <Label
            htmlFor="lgpd-consent"
            className="text-sm font-medium leading-relaxed cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              Consentimento LGPD <span className="text-red-500">*</span>
            </span>
          </Label>
          <p
            id="lgpd-consent-description"
            className="text-sm text-gray-600 leading-relaxed"
          >
            Declaro que li e concordo com a{' '}
            <Link
              href="/politica-privacidade"
              target="_blank"
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
            >
              Política de Privacidade
              <ExternalLink className="h-3 w-3" />
            </Link>
            {' '}e autorizo o tratamento dos dados pessoais do(s) aluno(s) sob minha
            responsabilidade, conforme Art. 14 da Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 ml-1">{error}</p>
      )}
    </div>
  )
}

// Versão simplificada para formulários inline
export function ConsentCheckboxSimple({
  checked,
  onCheckedChange,
  error,
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="lgpd-consent-simple"
          checked={checked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          disabled={disabled}
        />
        <Label
          htmlFor="lgpd-consent-simple"
          className="text-sm font-medium cursor-pointer"
        >
          Li e concordo com a{' '}
          <Link
            href="/politica-privacidade"
            target="_blank"
            className="text-blue-600 hover:underline"
          >
            Política de Privacidade
          </Link>
          {' '}<span className="text-red-500">*</span>
        </Label>
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
