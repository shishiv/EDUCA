'use client'
import { useTranslations } from 'next-intl'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { schoolsApi } from '@/lib/api/schools'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, User } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface SchoolOption {
  id: string
  nome: string
}

export default function NovoUsuarioPage() {
  const t = useTranslations('registry')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    tipo_usuario: '',
    escola_id: ''
  })

  const [escolas, setEscolas] = useState<SchoolOption[]>([])
  const loadEscolas = useCallback(async () => {
    try {
      const data = await schoolsApi.getAll<SchoolOption>()
      setEscolas(data)
    } catch {
      toast.error(t('ui.erro-ao-carregar-lista-de-escolas'))
    }
  }, [t])

  useEffect(() => {
    void loadEscolas()
  }, [loadEscolas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/pilot/invitations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: formData.nome,
          email: formData.email,
          role: formData.tipo_usuario,
          schoolId: formData.tipo_usuario === 'secretario' ? null : formData.escola_id || null,
        }),
      })
      const result = await response.json().catch(() => ({}))

      if (response.status === 409 && result.error === 'PILOT_INVITE_ALREADY_PENDING') {
        toast.warning(t('ui.este-e-mail-ja-tem-um-convite-pendente-nenhum-novo-e-mail-foi-enviado-e'))
        return
      }
      if (response.status === 409 && result.error === 'PILOT_INVITE_ALREADY_ACCEPTED') {
        toast.warning(t('ui.este-e-mail-ja-concluiu-o-primeiro-acesso-nenhum-convite-foi-enviado'))
        return
      }
      if (!response.ok) throw new Error(result.error || 'PILOT_INVITE_FAILED')

      toast.success(t('ui.convite-enviado-com-sucesso'))
      router.push('/dashboard/usuarios')
    } catch {
      toast.error(t('ui.erro-ao-criar-usuario'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/usuarios">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('ui.voltar')}
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('labels.novo-usuario')}</h1>
          <p className="text-gray-600 mt-1">
            {t('ui.cadastre-um-novo-usuario-no-sistema')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{t('labels.dados-do-usuario')}</span>
              </CardTitle>
              <CardDescription>
                {t('ui.preencha-as-informacoes-basicas-do-usuario')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">{t('labels.nome-completo-2')}</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      placeholder={t('labels.digite-o-nome-completo')}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('labels.email-2')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="usuario@municipio.edu.br"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_usuario">{t('labels.tipo-de-usuario-2')}</Label>
                    <Select value={formData.tipo_usuario} onValueChange={(value) => handleInputChange('tipo_usuario', value)}>
                      <SelectTrigger id="tipo_usuario">
                        <SelectValue placeholder={t('labels.selecione-o-tipo')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diretor">{t('labels.diretor')}</SelectItem>
                        <SelectItem value="secretario">{t('labels.secretario')}</SelectItem>
                        <SelectItem value="professor">{t('labels.professor')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="escola">{t('labels.escola')}</Label>
                    <Select
                      value={formData.escola_id}
                      onValueChange={(value) => handleInputChange('escola_id', value)}
                      disabled={formData.tipo_usuario === 'secretario'}
                    >
                      <SelectTrigger id="escola">
                        <SelectValue placeholder={t('labels.selecione-a-escola')} />
                      </SelectTrigger>
                      <SelectContent>
                        {escolas.map((escola) => (
                          <SelectItem key={escola.id} value={escola.id}>
                            {escola.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.tipo_usuario === 'secretario' && (
                      <p className="text-sm text-gray-500">
                        {t('ui.este-tipo-de-usuario-tem-acesso-a-todas-as-escolas')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/dashboard/usuarios">
                      {t('labels.cancelar')}
                    </Link>
                  </Button>
                  <Button type="submit" disabled={loading} aria-label={t('labels.criar-usuario')}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Enviar Convite
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('labels.informacoes-importantes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('labels.tipos-de-usuario')}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><strong>{t('labels.diretor-2')}</strong>{t('labels.gestao-da-escola-especifica')}</div>
                  <div><strong>{t('labels.secretario-2')}</strong>{t('labels.operacoes-administrativas')}</div>
                  <div><strong>{t('labels.professor-2')}</strong>{t('labels.gestao-de-turmas-e-alunos')}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">{t('labels.primeiro-acesso')}</h4>
                <p className="text-sm text-gray-600">
                  {t('ui.o-usuario-recebera-um-convite-individual-e-definira-a-senha-no-primeiro')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
