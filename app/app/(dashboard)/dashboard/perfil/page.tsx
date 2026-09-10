'use client'

import { useLocale, useTranslations } from 'next-intl'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/auth'
import type { LucideIcon } from 'lucide-react'
import { z } from 'zod'

const selfProfileResponseSchema = z.object({
  profile: z.object({
    id: z.string().uuid(),
    nome: z.string(),
    email: z.string().nullable(),
    tipo_usuario: z.string(),
    escola_id: z.string().uuid().nullable(),
    ativo: z.boolean().nullable(),
  }),
})

interface ProfileSummaryProps {
  userProfile: UserProfile | null
  fallbackName: string
  roleLabel: string
  lastSignInAt?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function ProfileSummary({ userProfile, fallbackName, roleLabel, lastSignInAt }: ProfileSummaryProps) {
  const name = userProfile?.nome ?? fallbackName
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="text-2xl bg-primary text-white">{getInitials(name)}</AvatarFallback>
          </Avatar>
        </div>
        <CardTitle>{name}</CardTitle>
        <div className="flex justify-center mt-2"><Badge variant="secondary">{roleLabel}</Badge></div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-3 text-sm">
          <Mail className="h-4 w-4 text-gray-500" />
          <span>{userProfile?.email}</span>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          <Clock className="h-4 w-4 text-gray-500" />
          <LastAccess lastSignInAt={lastSignInAt} />
        </div>
      </CardContent>
    </Card>
  )
}

function LastAccess({ lastSignInAt }: { lastSignInAt?: string }) {
  const t = useTranslations('platform.profile')
  const locale = useLocale()
  const timestamp = z.string().datetime().safeParse(lastSignInAt)
  if (!timestamp.success) return <span>{t('lastAccessUnavailable')}</span>

  const date = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(timestamp.data))
  return <time dateTime={timestamp.data}>{t('lastAccess', { date })}</time>
}

function SubmitButton({ loading, loadingLabel, readyLabel, icon: Icon }: {
  loading: boolean
  loadingLabel: string
  readyLabel: string
  icon: LucideIcon
}) {
  return (
    <Button type="submit" disabled={loading}>
      {loading ? (
        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />{loadingLabel}</>
      ) : (
        <><Icon className="h-4 w-4 mr-2" />{readyLabel}</>
      )}
    </Button>
  )
}

export default function PerfilPage() {
  const t = useTranslations('platform')
  const { user, userProfile, signIn, applyProfileUpdate } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    nome: userProfile?.nome || '',
    email: userProfile?.email || '',
  })
  const [passwordData, setPasswordData] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  })

  useEffect(() => {
    if (!userProfile) return
    setProfileData({ nome: userProfile.nome, email: userProfile.email ?? '' })
  }, [userProfile])

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return t('profile.roleAdmin')
    if (role === 'diretor') return t('profile.roleDirector')
    if (role === 'secretario') return t('profile.roleSecretary')
    if (role === 'professor') return t('profile.roleTeacher')
    if (role === 'responsavel') return t('profile.roleGuardian')
    return role
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nome: profileData.nome }),
      })
      if (!response.ok) throw new Error('PROFILE_UPDATE_FAILED')
      const result = selfProfileResponseSchema.parse(await response.json())
      applyProfileUpdate(result.profile)
      toast.success(t('profile.updated'))
    } catch {
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

    const email = userProfile?.email ?? profileData.email
    if (!email || !passwordData.senhaAtual) {
      toast.error(t('profile.passwordError'))
      return
    }

    setLoading(true)

    try {
      await signIn(email, passwordData.senhaAtual)
      const { error } = await supabase.auth.updateUser({ password: passwordData.novaSenha })
      if (error) throw error
      toast.success(t('profile.passwordChanged'))
      setPasswordData({ senhaAtual: '', novaSenha: '', confirmarSenha: '' })
    } catch {
      toast.error(t('profile.passwordError'))
    } finally {
      setLoading(false)
    }
  }

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
          <ProfileSummary
            userProfile={userProfile}
            fallbackName={t('dashboard.user')}
            roleLabel={getRoleLabel(userProfile?.tipo_usuario ?? '')}
            lastSignInAt={user?.last_sign_in_at}
          />
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
                          disabled
                          aria-describedby="email-help"
                        />
                        <p id="email-help" className="text-sm text-muted-foreground">{t('profile.email')}</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <SubmitButton loading={loading} loadingLabel={t('profile.saving')} readyLabel={t('profile.saveChanges')} icon={Save} />
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
                      <SubmitButton loading={loading} loadingLabel={t('profile.changing')} readyLabel={t('profile.changePassword')} icon={Key} />
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
                  <p className="text-sm text-muted-foreground"><LastAccess lastSignInAt={user?.last_sign_in_at} /></p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
