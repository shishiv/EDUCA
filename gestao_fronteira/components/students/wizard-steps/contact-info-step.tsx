/**
 * Contact Information Step - Student Registration Wizard
 * Collects contact and address information with automatic CEP lookup
 */

'use client'

import * as React from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  EnhancedPhoneInput,
  EnhancedCEPInput
} from '@/components/ui/enhanced-brazilian-inputs'
import {
  MapPin,
  Phone,
  Mail,
  Home,
  Navigation,
  Info,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react'
import { toast } from 'sonner'

export function ContactInfoStep() {
  const { register, watch, setValue, formState: { errors } } = useFormContext()
  const [addressData, setAddressData] = React.useState<any>(null)
  const [addressLoading, setAddressLoading] = React.useState(false)

  const cep = watch('cep')
  const endereco = watch('endereco')
  const bairro = watch('bairro')
  const cidade = watch('cidade')

  // Handle automatic address filling from CEP
  const handleAddressFound = (address: any) => {
    setAddressData(address)

    // Auto-fill address fields
    setValue('endereco', address.logradouro || '')
    setValue('bairro', address.bairro || '')
    setValue('cidade', address.localidade || '')
    setValue('estado', address.uf || 'MG')

    toast.success('Endereço encontrado e preenchido automaticamente!')
  }

  // Manual CEP lookup
  const lookupCEP = async () => {
    if (!cep || cep.length < 9) {
      toast.error('Digite um CEP válido')
      return
    }

    setAddressLoading(true)
    try {
      const cleanCEP = cep.replace(/\D/g, '')
      const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
      const data = await response.json()

      if (data.erro) {
        toast.error('CEP não encontrado')
      } else {
        handleAddressFound(data)
      }
    } catch (error) {
      console.error('CEP lookup failed:', error)
      toast.error('Erro ao buscar CEP. Verifique sua conexão.')
    } finally {
      setAddressLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Etapa 2 de 6:</strong> Informe os dados de contato e endereço do estudante.
          O CEP é usado para buscar automaticamente o endereço e facilitar o preenchimento.
        </AlertDescription>
      </Alert>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Informações de Contato
          </CardTitle>
          <CardDescription>
            Dados para comunicação com a família
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phone */}
            <EnhancedPhoneInput
              name="telefone"
              label="Telefone Principal"
              helpKey="phone"
              required
              placeholder="(31) 99999-8888"
              onPhoneValidated={(phone, type) => {
                if (type) {
                  console.log(`Telefone ${type} validado:`, phone)
                }
              }}
            />

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail (Opcional)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="estudante@email.com"
                {...register('email')}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email.message as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                E-mail para comunicação oficial e notificações escolares
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço Residencial
          </CardTitle>
          <CardDescription>
            Endereço completo para correspondência e localização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CEP with auto-lookup */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <EnhancedCEPInput
                name="cep"
                label="CEP"
                helpKey="cep"
                required
                placeholder="38880-000"
                onAddressFound={handleAddressFound}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={lookupCEP}
                disabled={addressLoading || !cep}
                className="mt-6"
              >
                {addressLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Address preview if found */}
          {addressData && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Endereço encontrado:</strong> {addressData.logradouro}, {addressData.bairro}, {addressData.localidade}/{addressData.uf}
              </AlertDescription>
            </Alert>
          )}

          {/* Address fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="endereco" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Logradouro (Rua, Avenida) *
              </Label>
              <Input
                id="endereco"
                placeholder="Rua das Flores, Av. Brasil, etc."
                {...register('endereco')}
                className={errors.endereco ? "border-red-500" : ""}
              />
              {errors.endereco && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.endereco.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                placeholder="123"
                {...register('numero')}
                className={errors.numero ? "border-red-500" : ""}
              />
              {errors.numero && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.numero.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="complemento">Complemento</Label>
              <Input
                id="complemento"
                placeholder="Apto 12, Casa B, Fundos"
                {...register('complemento')}
              />
              <p className="text-xs text-muted-foreground">
                Apartamento, casa, sala, etc. (opcional)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro *</Label>
              <Input
                id="bairro"
                placeholder="Centro, Jardim América, etc."
                {...register('bairro')}
                className={errors.bairro ? "border-red-500" : ""}
              />
              {errors.bairro && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.bairro.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade *</Label>
              <Input
                id="cidade"
                placeholder="Fronteira"
                {...register('cidade')}
                className={errors.cidade ? "border-red-500" : ""}
              />
              {errors.cidade && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.cidade.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input
                id="estado"
                value="MG"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Sistema configurado para Minas Gerais
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Validation Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Navigation className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900">Importância do Endereço Correto</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p>O endereço completo é utilizado para:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Definição da escola de referência (zoneamento escolar)</li>
                  <li>Organização do transporte escolar público</li>
                  <li>Correspondência oficial e comunicados</li>
                  <li>Estatísticas educacionais por região</li>
                  <li>Planejamento de políticas públicas educacionais</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-green-900">Informações de Contato e Endereço</h4>
              <p className="text-sm text-green-800">
                Preencha todos os campos obrigatórios e clique em "Próximo" para continuar com as informações familiares.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}