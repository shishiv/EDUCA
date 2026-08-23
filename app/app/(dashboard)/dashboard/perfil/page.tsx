'use client'

import { useTranslations } from 'next-intl'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  User,
  Save,
  Key,
  Shield,
  Clock,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'

export default function PerfilPage() {
  const t = useTranslations('platform')
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    nome: userProfile?.nome || '',
    email: userProfile?.email || '',
    telefone: '(34) 99999-0000',
    endereco: 'Rua da Educação, 123 - Centro - Cidade/UF'
  })
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getRoleLabel = (role: string) => {
    const roles = {
      admin: t('profile.roleAdmin'),
      diretor: t('profile.roleDirector'),
      secretario: t('profile.roleSecretary'),
      professor: t('profile.roleTeacher'),
      responsavel: t('profile.roleGuardian')
    }
    return roles[role as keyof typeof roles] || role
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simular atualização do perfil
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success(t('profile.updated'))
    } catch (error) {
      toast.error(t('profile.updateError'))
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast.error(t('profile.passwordMismatch'))
      return
    }

    if (passwordData.novaSenha.length < 6) {
      toast.error(t('profile.passwordLength'))
      return
    }

    setLoading(true)

    try {
      // Simular alteração de senha
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success(t('profile.passwordChanged'))
      setPasswordData({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch (error) {
      toast.error(t('profile.passwordError'))
    } finally {
      setLoading(false)
    }
  }

  const acessosRecentes = [
    { data: '28/01/2024 14:30', ip: '192.168.1.100', dispositivo: 'Chrome - Windows' },
    { data: '28/01/2024 08:15', ip: '192.168.1.100', dispositivo: 'Chrome - Windows' },
    { data: '27/01/2024 16:45', ip: '192.168.1.100', dispositivo: 'Chrome - Windows' },
    { data: '27/01/2024 09:20', ip: '192.168.1.100', dispositivo: 'Chrome - Windows' },
    { data: '26/01/2024 15:30', ip: '192.168.1.100', dispositivo: 'Chrome - Windows' }
  ]

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
        <p className="text-gray-600 mt-1">{t('profile.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações do Usuário */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-primary text-white">
                    {userProfile?.nome ? getInitials(userProfile.nome) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardTitle>{userProfile?.nome || t('dashboard.user')}</CardTitle>
              <div className="flex justify-center mt-2">
                <Badge variant="secondary">
                  {getRoleLabel(userProfile?.tipo_usuario || '')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{userProfile?.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{profileData.telefone}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{profileData.endereco}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{t('profile.lastAccess')}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configurações */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="perfil" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="perfil" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>{t('profile.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="senha" className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>{t('profile.password')}</span>
              </TabsTrigger>
              <TabsTrigger value="seguranca" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>{t('profile.security')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perfil">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.personalInfo')}</CardTitle>
                  <CardDescription>{t('profile.updatePersonal')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome">{t('profile.fullName')}</Label>
                        <Input
                          id="nome"
                          value={profileData.nome}
                          onChange={(e) => setProfileData({...profileData, nome: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t('profile.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="telefone">{t('profile.phone')}</Label>
                        <Input
                          id="telefone"
                          value={profileData.telefone}
                          onChange={(e) => setProfileData({...profileData, telefone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endereco">{t('profile.address')}</Label>
                        <Input
                          id="endereco"
                          value={profileData.endereco}
                          onChange={(e) => setProfileData({...profileData, endereco: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('profile.saving')}
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {t('profile.saveChanges')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="senha">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.changePassword')}</CardTitle>
                  <CardDescription>{t('profile.keepSecure')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="senhaAtual">{t('profile.currentPassword')}</Label>
                      <Input
                        id="senhaAtual"
                        type="password"
                        value={passwordData.senhaAtual}
                        onChange={(e) => setPasswordData({...passwordData, senhaAtual: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="novaSenha">{t('profile.newPassword')}</Label>
                      <Input
                        id="novaSenha"
                        type="password"
                        value={passwordData.novaSenha}
                        onChange={(e) => setPasswordData({...passwordData, novaSenha: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmarSenha">{t('profile.confirmPassword')}</Label>
                      <Input
                        id="confirmarSenha"
                        type="password"
                        value={passwordData.confirmarSenha}
                        onChange={(e) => setPasswordData({...passwordData, confirmarSenha: e.target.value})}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('profile.changing')}
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            {t('profile.changePassword')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seguranca">
              <Card>
                <CardHeader>
                  <CardTitle>{t('profile.accessHistory')}</CardTitle>
                  <CardDescription>{t('profile.monitorAccess')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {acessosRecentes.map((acesso, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <div className="font-medium">{acesso.dispositivo}</div>
                          <div className="text-sm text-gray-500">IP: {acesso.ip}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {acesso.data}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
