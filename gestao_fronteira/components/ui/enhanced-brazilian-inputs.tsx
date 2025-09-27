/**
 * Enhanced Brazilian Input Components with Progressive Validation
 * Optimized for municipal educational management with real-time feedback
 * Includes CPF, Phone, Date, and specialized educational inputs
 */

'use client'

import * as React from 'react'
import { useFormContext, useController } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  formatCPF,
  formatBrazilianPhone,
  validateCPF,
  validateBrazilianPhone,
  formatCEP,
  validateCEP
} from '@/lib/validators/brazilian'
import { useEnhancedForm, EnhancedFormField } from '@/components/ui/enhanced-form'
import {
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Search,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Common enhanced input props
interface EnhancedInputProps {
  name: string
  label: string
  helpKey?: string
  required?: boolean
  className?: string
  placeholder?: string
  disabled?: boolean
}

/**
 * Enhanced CPF Input with progressive validation and formatting
 */
interface EnhancedCPFInputProps extends EnhancedInputProps {
  onCPFValidated?: (cpf: string, isValid: boolean) => void
}

export function EnhancedCPFInput({
  name,
  label,
  helpKey = 'cpf',
  required = false,
  className,
  placeholder = "000.000.000-00",
  disabled = false,
  onCPFValidated
}: EnhancedCPFInputProps) {
  const { validationMode } = useEnhancedForm()
  const { control } = useFormContext()
  const [validationState, setValidationState] = React.useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')

  const {
    field,
    fieldState: { error, isTouched }
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'CPF é obrigatório' : false,
      validate: (value) => {
        if (!value) return required ? 'CPF é obrigatório' : true
        return validateCPF(value) || 'CPF inválido. Verifique os dígitos.'
      }
    }
  })

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const numeric = inputValue.replace(/\D/g, '')
    const limitedNumeric = numeric.slice(0, 11)
    const formatted = formatCPF(limitedNumeric)

    field.onChange(formatted)

    // Progressive validation
    if (validationMode === 'progressive' && limitedNumeric.length > 0) {
      if (limitedNumeric.length < 11) {
        setValidationState('validating')
      } else {
        const isValid = validateCPF(limitedNumeric)
        setValidationState(isValid ? 'valid' : 'invalid')
        onCPFValidated?.(formatted, isValid)
      }
    }
  }, [field, validationMode, onCPFValidated])

  const getValidationIcon = () => {
    if (!isTouched || validationMode !== 'progressive') return null

    switch (validationState) {
      case 'validating':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <EnhancedFormField name={name} helpKey={helpKey} required={required} className={className}>
      <div className="space-y-2">
        <Label htmlFor={name} className="flex items-center gap-2">
          <User className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={name}
            type="text"
            placeholder={placeholder}
            disabled={disabled}
            value={field.value || ''}
            onChange={handleChange}
            onBlur={field.onBlur}
            className={cn(
              "pr-10",
              error && "border-red-500",
              validationState === 'valid' && "border-green-500",
              className
            )}
            maxLength={14} // Formatted CPF length
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getValidationIcon()}
          </div>
        </div>
      </div>
    </EnhancedFormField>
  )
}

/**
 * Enhanced Brazilian Phone Input with mobile/landline detection
 */
interface EnhancedPhoneInputProps extends EnhancedInputProps {
  onPhoneValidated?: (phone: string, type: 'mobile' | 'landline' | null) => void
}

export function EnhancedPhoneInput({
  name,
  label,
  helpKey = 'phone',
  required = false,
  className,
  placeholder = "(00) 00000-0000",
  disabled = false,
  onPhoneValidated
}: EnhancedPhoneInputProps) {
  const { validationMode } = useEnhancedForm()
  const { control } = useFormContext()
  const [phoneType, setPhoneType] = React.useState<'mobile' | 'landline' | null>(null)

  const {
    field,
    fieldState: { error, isTouched }
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'Telefone é obrigatório' : false,
      validate: (value) => {
        if (!value) return required ? 'Telefone é obrigatório' : true
        return validateBrazilianPhone(value) || 'Telefone inválido. Use formato (00) 00000-0000'
      }
    }
  })

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const numeric = inputValue.replace(/\D/g, '')
    const limitedNumeric = numeric.slice(0, 11)
    const formatted = formatBrazilianPhone(limitedNumeric)

    field.onChange(formatted)

    // Detect phone type
    if (limitedNumeric.length === 11) {
      setPhoneType('mobile')
      onPhoneValidated?.(formatted, 'mobile')
    } else if (limitedNumeric.length === 10) {
      setPhoneType('landline')
      onPhoneValidated?.(formatted, 'landline')
    } else {
      setPhoneType(null)
      onPhoneValidated?.(formatted, null)
    }
  }, [field, onPhoneValidated])

  return (
    <EnhancedFormField name={name} helpKey={helpKey} required={required} className={className}>
      <div className="space-y-2">
        <Label htmlFor={name} className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
          {phoneType && (
            <span className="text-xs text-muted-foreground">
              ({phoneType === 'mobile' ? 'celular' : 'fixo'})
            </span>
          )}
        </Label>
        <Input
          id={name}
          type="tel"
          placeholder={placeholder}
          disabled={disabled}
          value={field.value || ''}
          onChange={handleChange}
          onBlur={field.onBlur}
          className={cn(
            error && "border-red-500",
            !error && isTouched && validateBrazilianPhone(field.value) && "border-green-500",
            className
          )}
          maxLength={15} // Formatted phone length
        />
      </div>
    </EnhancedFormField>
  )
}

/**
 * Enhanced Brazilian Date Input with calendar picker
 */
interface EnhancedDateInputProps extends EnhancedInputProps {
  minDate?: Date
  maxDate?: Date
  onDateSelected?: (date: Date | null) => void
}

export function EnhancedDateInput({
  name,
  label,
  helpKey = 'date',
  required = false,
  className,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  minDate,
  maxDate,
  onDateSelected
}: EnhancedDateInputProps) {
  const { control } = useFormContext()
  const [isOpen, setIsOpen] = React.useState(false)

  const {
    field,
    fieldState: { error }
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'Data é obrigatória' : false,
      validate: (value) => {
        if (!value) return required ? 'Data é obrigatória' : true

        const date = new Date(value)
        if (isNaN(date.getTime())) return 'Data inválida'

        if (minDate && date < minDate) {
          return `Data deve ser posterior a ${format(minDate, 'dd/MM/yyyy', { locale: ptBR })}`
        }

        if (maxDate && date > maxDate) {
          return `Data deve ser anterior a ${format(maxDate, 'dd/MM/yyyy', { locale: ptBR })}`
        }

        return true
      }
    }
  })

  const handleDateSelect = (date: Date | undefined) => {
    field.onChange(date || null)
    onDateSelected?.(date || null)
    setIsOpen(false)
  }

  return (
    <EnhancedFormField name={name} helpKey={helpKey} required={required} className={className}>
      <div className="space-y-2">
        <Label htmlFor={name} className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              id={name}
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !field.value && "text-muted-foreground",
                error && "border-red-500",
                className
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {field.value ? (
                format(new Date(field.value), 'dd/MM/yyyy', { locale: ptBR })
              ) : (
                <span>{placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={field.value ? new Date(field.value) : undefined}
              onSelect={handleDateSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true
                if (maxDate && date > maxDate) return true
                return false
              }}
              locale={ptBR}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </EnhancedFormField>
  )
}

/**
 * Enhanced CEP Input with address lookup
 */
interface EnhancedCEPInputProps extends EnhancedInputProps {
  onAddressFound?: (address: any) => void
}

export function EnhancedCEPInput({
  name,
  label,
  helpKey = 'cep',
  required = false,
  className,
  placeholder = "00000-000",
  disabled = false,
  onAddressFound
}: EnhancedCEPInputProps) {
  const { control } = useFormContext()
  const [isSearching, setIsSearching] = React.useState(false)

  const {
    field,
    fieldState: { error, isTouched }
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'CEP é obrigatório' : false,
      validate: (value) => {
        if (!value) return required ? 'CEP é obrigatório' : true
        return validateCEP(value) || 'CEP inválido. Use formato 00000-000'
      }
    }
  })

  const handleChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const numeric = inputValue.replace(/\D/g, '')
    const limitedNumeric = numeric.slice(0, 8)
    const formatted = formatCEP(limitedNumeric)

    field.onChange(formatted)

    // Auto-search address when CEP is complete
    if (limitedNumeric.length === 8 && validateCEP(formatted)) {
      setIsSearching(true)
      try {
        const response = await fetch(`https://viacep.com.br/ws/${limitedNumeric}/json/`)
        const data = await response.json()

        if (!data.erro) {
          onAddressFound?.(data)
        }
      } catch (error) {
        console.error('CEP lookup failed:', error)
      } finally {
        setIsSearching(false)
      }
    }
  }, [field, onAddressFound])

  return (
    <EnhancedFormField name={name} helpKey={helpKey} required={required} className={className}>
      <div className="space-y-2">
        <Label htmlFor={name} className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={name}
            type="text"
            placeholder={placeholder}
            disabled={disabled}
            value={field.value || ''}
            onChange={handleChange}
            onBlur={field.onBlur}
            className={cn(
              "pr-10",
              error && "border-red-500",
              !error && isTouched && validateCEP(field.value) && "border-green-500",
              className
            )}
            maxLength={9} // Formatted CEP length
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </EnhancedFormField>
  )
}

/**
 * Enhanced Select Input for Brazilian educational data
 */
interface EnhancedSelectInputProps extends EnhancedInputProps {
  options: Array<{ value: string; label: string; description?: string }>
  onSelectionChange?: (value: string) => void
}

export function EnhancedSelectInput({
  name,
  label,
  helpKey,
  required = false,
  className,
  placeholder = "Selecione uma opção",
  disabled = false,
  options,
  onSelectionChange
}: EnhancedSelectInputProps) {
  const { control } = useFormContext()

  const {
    field,
    fieldState: { error }
  } = useController({
    name,
    control,
    rules: {
      required: required ? `${label} é obrigatório` : false
    }
  })

  const handleValueChange = (value: string) => {
    field.onChange(value)
    onSelectionChange?.(value)
  }

  return (
    <EnhancedFormField name={name} helpKey={helpKey} required={required} className={className}>
      <div className="space-y-2">
        <Label htmlFor={name} className="flex items-center gap-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>

        <Select
          disabled={disabled}
          value={field.value}
          onValueChange={handleValueChange}
        >
          <SelectTrigger
            className={cn(
              error && "border-red-500",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </EnhancedFormField>
  )
}