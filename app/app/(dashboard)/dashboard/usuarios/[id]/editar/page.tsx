'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

interface Option { id: string; nome: string }
interface UserForm {
  nome: string
  email: string
  tipo_usuario: 'admin' | 'diretor' | 'secretario' | 'professor' | 'responsavel'
  escola_id: string
  ativo: boolean
}

const initialForm: UserForm = {
  nome: '', email: '', tipo_usuario: 'professor', escola_id: 'none', ativo: true,
}

export default function EditarUsuarioPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [form, setForm] = useState(initialForm)
  const [schools, setSchools] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [userResult, schoolsResult] = await Promise.all([
        supabase.from('users').select('*').eq('id', id).single(),
        supabase.from('escolas').select('id, nome').eq('ativo', true).order('nome'),
      ])
      if (userResult.error || !userResult.data) {
        toast.error('Não foi possível carregar o usuário')
        router.replace('/dashboard/usuarios')
        return
      }
      const user = userResult.data
      setForm({
        nome: user.nome,
        email: user.email || '',
        tipo_usuario: user.tipo_usuario as UserForm['tipo_usuario'],
        escola_id: user.escola_id || 'none',
        ativo: user.ativo ?? true,
      })
      setSchools(schoolsResult.data || [])
      setLoading(false)
    }
    void load()
  }, [id, router])

  const update = <K extends keyof UserForm>(field: K, value: UserForm[K]) => {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    const schoolRequired = form.tipo_usuario === 'diretor' || form.tipo_usuario === 'professor'
    if (schoolRequired && form.escola_id === 'none') {
      toast.error('Selecione a escola para este tipo de usuário')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('users').update({
      nome: form.nome.trim(),
      email: form.email.trim(),
      tipo_usuario: form.tipo_usuario,
      escola_id: form.escola_id === 'none' ? null : form.escola_id,
      ativo: form.ativo,
    }).eq('id', id)

    if (error) {
      toast.error(`Erro ao atualizar usuário: ${error.message}`)
      setSaving(false)
      return
    }
    toast.success('Usuário atualizado com sucesso!')
    router.push(`/dashboard/usuarios/${id}`)
  }

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center" aria-label="Carregando usuário"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/usuarios/${id}`}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Usuário</h1>
          <p className="mt-1 text-gray-600">Atualize perfil, escola e status de acesso.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do Usuário</CardTitle><CardDescription>Campos com * são obrigatórios.</CardDescription></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="edit-user-name">Nome Completo *</Label><Input id="edit-user-name" value={form.nome} onChange={event => update('nome', event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="edit-user-email">E-mail *</Label><Input id="edit-user-email" type="email" value={form.email} onChange={event => update('email', event.target.value)} required /></div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-role">Tipo de Usuário *</Label>
                <Select value={form.tipo_usuario} onValueChange={value => update('tipo_usuario', value as UserForm['tipo_usuario'])}>
                  <SelectTrigger id="edit-user-role" aria-label="Tipo de Usuário"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="diretor">Diretor</SelectItem>
                    <SelectItem value="secretario">Secretário</SelectItem>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="responsavel">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-user-school">Escola</Label>
                <Select value={form.escola_id} onValueChange={value => update('escola_id', value)}>
                  <SelectTrigger id="edit-user-school" aria-label="Escola"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Todas as escolas</SelectItem>
                    {schools.map(school => <SelectItem key={school.id} value={school.id}>{school.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3"><Switch id="edit-user-active" checked={form.ativo} onCheckedChange={value => update('ativo', value)} /><Label htmlFor="edit-user-active">Usuário ativo</Label></div>
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild><Link href={`/dashboard/usuarios/${id}`}>Cancelar</Link></Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}{saving ? 'Salvando...' : 'Salvar alterações'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
