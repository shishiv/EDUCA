'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  CheckCircle,
  ArrowRight,
  School
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

type OnboardingStep = 'welcome' | 'school' | 'admin' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [loading, setLoading] = useState(false)

  // School data
  const [schoolName, setSchoolName] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [schoolType, setSchoolType] = useState<'creche' | 'pre_escola' | 'fundamental'>('fundamental')
  const [schoolAddress, setSchoolAddress] = useState('')
  const [schoolPhone, setSchoolPhone] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')

  // Admin data
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('')

  const handleCreateSchool = async () => {
    if (!schoolName || !schoolCode) {
      toast.error('Preencha os campos obrigatórios da escola')
      return
    }

    setLoading(true)
    try {
      const { data: school, error } = await supabase
        .from('escolas')
        .insert({
          nome: schoolName,
          codigo: schoolCode,
          tipo: schoolType,
          endereco: schoolAddress || null,
          telefone: schoolPhone || null,
          email: schoolEmail || null,
          ativo: true
        })
        .select()
        .single()

      if (error) throw error

      // Store school ID for admin creation
      sessionStorage.setItem('onboarding_escola_id', school.id)

      setCurrentStep('admin')
      toast.success('Escola criada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao criar escola:', error)
      toast.error(error.message || 'Erro ao criar escola')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!adminName || !adminEmail || !adminPassword) {
      toast.error('Preencha todos os campos do administrador')
      return
    }

    if (adminPassword !== adminPasswordConfirm) {
      toast.error('As senhas não coincidem')
      return
    }

    if (adminPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const escolaId = sessionStorage.getItem('onboarding_escola_id')

      if (!escolaId) {
        throw new Error('Escola não encontrada. Por favor, crie a escola primeiro.')
      }

      // Step 1: Create Supabase Auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          data: {
            nome: adminName,
            tipo_usuario: 'admin'
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Falha ao criar usuário de autenticação')

      // Step 2: Create user profile in database
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Use the same ID from Supabase Auth
          nome: adminName,
          email: adminEmail,
          tipo_usuario: 'admin',
          escola_id: escolaId,
          ativo: true
        })
        .select()
        .single()

      if (error) throw error

      setCurrentStep('complete')
      toast.success('Administrador criado com sucesso!')

      // Clean up session storage
      sessionStorage.removeItem('onboarding_escola_id')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar administrador')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <School className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sistema de Gestão Educacional Fronteira
          </h1>
          <p className="text-gray-600">
            Configure sua escola e crie o primeiro administrador
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${currentStep === 'welcome' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">
              {currentStep !== 'welcome' ? <CheckCircle className="h-5 w-5" /> : '1'}
            </div>
            <span className="ml-2 text-sm font-medium">Bem-vindo</span>
          </div>

          <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>

          <div className={`flex items-center ${currentStep === 'admin' || currentStep === 'complete' ? 'text-blue-600' : currentStep === 'school' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">
              {currentStep === 'admin' || currentStep === 'complete' ? <CheckCircle className="h-5 w-5" /> : '2'}
            </div>
            <span className="ml-2 text-sm font-medium">Escola</span>
          </div>

          <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>

          <div className={`flex items-center ${currentStep === 'complete' ? 'text-green-600' : currentStep === 'admin' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center">
              {currentStep === 'complete' ? <CheckCircle className="h-5 w-5" /> : '3'}
            </div>
            <span className="ml-2 text-sm font-medium">Admin</span>
          </div>
        </div>

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-6 w-6 mr-2 text-blue-600" />
                Bem-vindo ao Sistema
              </CardTitle>
              <CardDescription>
                Este assistente irá guiá-lo na configuração inicial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Primeiro acesso detectado!</strong>
                  <br />
                  Vamos configurar sua primeira escola e criar a conta de administrador do sistema.
                </AlertDescription>
              </Alert>

              <div className="space-y-3 pt-4">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Cadastro da Escola</h3>
                    <p className="text-sm text-gray-600">Informações da instituição de ensino</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Criação do Administrador</h3>
                    <p className="text-sm text-gray-600">Conta principal para gestão do sistema</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Acesso Imediato</h3>
                    <p className="text-sm text-gray-600">Login e início da configuração completa</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep('school')}
                className="w-full mt-6"
              >
                Começar Configuração
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* School Step */}
        {currentStep === 'school' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <School className="h-6 w-6 mr-2 text-blue-600" />
                Cadastro da Escola
              </CardTitle>
              <CardDescription>
                Preencha os dados da instituição de ensino
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="school-name">Nome da Escola *</Label>
                <Input
                  id="school-name"
                  placeholder="Ex: EMEF Professor João Silva"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-code">Código INEP *</Label>
                  <Input
                    id="school-code"
                    placeholder="Ex: 31234567"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-type">Tipo de Escola *</Label>
                  <Select value={schoolType} onValueChange={(value: any) => setSchoolType(value)}>
                    <SelectTrigger id="school-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="creche">Creche</SelectItem>
                      <SelectItem value="pre_escola">Pré-Escola</SelectItem>
                      <SelectItem value="fundamental">Ensino Fundamental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-address">Endereço</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="school-address"
                    placeholder="Rua, número, bairro, cidade - UF"
                    className="pl-10"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="school-phone"
                      placeholder="(00) 00000-0000"
                      className="pl-10"
                      value={schoolPhone}
                      onChange={(e) => setSchoolPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="school-email"
                      type="email"
                      placeholder="escola@exemplo.com"
                      className="pl-10"
                      value={schoolEmail}
                      onChange={(e) => setSchoolEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('welcome')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCreateSchool}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Criando...' : 'Continuar'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Step */}
        {currentStep === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-6 w-6 mr-2 text-blue-600" />
                Criar Administrador
              </CardTitle>
              <CardDescription>
                Configure a conta do administrador principal do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  Esta será a conta com permissões completas para gerenciar o sistema.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="admin-name">Nome Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="admin-name"
                    placeholder="Ex: João Silva"
                    className="pl-10"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@escola.com"
                    className="pl-10"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="pl-10"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password-confirm">Confirmar Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="admin-password-confirm"
                    type="password"
                    placeholder="Digite a senha novamente"
                    className="pl-10"
                    value={adminPasswordConfirm}
                    onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('school')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleCreateAdmin}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Criando...' : 'Criar Administrador'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Step */}
        {currentStep === 'complete' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="h-6 w-6 mr-2" />
                Configuração Concluída!
              </CardTitle>
              <CardDescription>
                Seu sistema está pronto para uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  <strong>Parabéns!</strong> A configuração inicial foi concluída com sucesso.
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h3 className="font-medium text-blue-900">Suas Credenciais de Acesso:</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>E-mail:</strong> {adminEmail}</p>
                  <p><strong>Senha:</strong> (a senha que você cadastrou)</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium">Próximos Passos:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <span>Fazer login com suas credenciais</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <span>Cadastrar turmas e professores</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <span>Registrar alunos no sistema</span>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    <span>Iniciar gestão de frequência</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleComplete}
                className="w-full"
                size="lg"
              >
                Ir para Login
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
