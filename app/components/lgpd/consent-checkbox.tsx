'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ExternalLink, Shield, Info } from 'lucide-react'
import Link from 'next/link'

// ---------------------------------------------------------------------------
// Operational Notice (ciência): informs the user about data treatment for
// necessary school routines. Does NOT block registration. No checkbox needed.
// ---------------------------------------------------------------------------

export function OperationalDataNotice() {
  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200" role="note" aria-label="Aviso de tratamento de dados">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">
            Aviso sobre tratamento de dados
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Os dados informados neste cadastro são utilizados para as rotinas
            administrativas e educacionais da escola, conforme definido pelo
            município adotante. Para mais informações, consulte a{' '}
            <Link
              href="/politica-privacidade"
              target="_blank"
              className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
            >
              Política de Privacidade
              <ExternalLink className="h-3 w-3" />
            </Link>.
          </p>
          <p className="text-xs text-gray-500">
            Este aviso é informativo e não constitui coleta de consentimento.
            A base legal do tratamento é definida pelo controlador municipal.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Optional Consent: for purposes BEYOND necessary school operation (e.g.,
// WhatsApp notifications, communication preferences). NOT required.
// ---------------------------------------------------------------------------

interface OptionalConsentProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export function OptionalConsentCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
}: OptionalConsentProps) {
  return (
    <div className="flex items-start space-x-3 p-4 border rounded-lg bg-gray-50 border-gray-200">
      <Checkbox
        id="lgpd-optional-consent"
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="mt-1"
        aria-describedby="lgpd-optional-consent-description"
      />
      <div className="space-y-1">
        <Label
          htmlFor="lgpd-optional-consent"
          className="text-sm font-medium leading-relaxed cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-600" />
            Comunicações opcionais
          </span>
        </Label>
        <p
          id="lgpd-optional-consent-description"
          className="text-sm text-gray-600 leading-relaxed"
        >
          Autorizo o envio de comunicações escolares por canais adicionais
          (ex.: WhatsApp, e-mail informativo). Este consentimento é opcional
          e pode ser revogado a qualquer momento.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Legacy re-export: ConsentCheckbox kept as a wrapper around the new
// components for backward compatibility. It no longer blocks form submission.
// ---------------------------------------------------------------------------

interface ConsentCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  error?: string
  disabled?: boolean
}

/** @deprecated Use OperationalDataNotice + OptionalConsentCheckbox instead */
export function ConsentCheckbox({
  checked,
  onCheckedChange,
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <div className="space-y-4">
      <OperationalDataNotice />
      <OptionalConsentCheckbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  )
}

/** @deprecated Use OperationalDataNotice + OptionalConsentCheckbox instead */
export function ConsentCheckboxSimple({
  checked,
  onCheckedChange,
  disabled = false,
}: ConsentCheckboxProps) {
  return (
    <ConsentCheckbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  )
}
