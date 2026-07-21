'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { studentFormSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface FormState {
  nome_completo: string
  data_nascimento: string
  sexo: 'M' | 'F'
  cpf: string
  rg: string
  endereco: string
  telefone: string
  email: string
  nome_mae: string
  nome_pai: string
  necessidades_especiais: string
}

const initialForm: FormState = {
  nome_completo: '',
  data_nascimento: '',
  sexo: 'M',
  cpf: '',
  rg: '',
  endereco: '',
  telefone: '',
  email: '',
  nome_mae: '',
  nome_pai: '',
  necessidades_especiais: '',
}

export default function EditarAlunoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from('alunos').select('*').eq('id', id).single()
      if (error || !data) {
        toast.error('Não foi possível carregar o aluno')
        router.replace('/dashboard/alunos')
        return
      }
      setForm({
        nome_completo: data.nome_completo,
        data_nascimento: data.data_nascimento,
        sexo: data.sexo as 'M' | 'F',
        cpf: data.cpf || '',
        rg: data.rg || '',
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        email: data.email || '',
        nome_mae: data.nome_mae || '',
        nome_pai: data.nome_pai || '',
        necessidades_especiais: data.necessidades_especiais || '',
      })
      setLoading(false)
    }
    void load()
  }, [id, router])

  const update = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm(previous => ({ ...previous, [field]: value }))
    setErrors(previous => {
      if (!previous[field]) return previous
      const next = { ...previous }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = studentFormSchema.safeParse({
      ...form,
      cpf: form.cpf || undefined,
      rg: form.rg || undefined,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      nome_pai: form.nome_pai || undefined,
      necessidades_especiais: form.necessidades_especiais || undefined,
    })

    if (!validation.success) {
      const next: Record<string, string> = {}
      for (const issue of validation.error.issues) {
        const field = String(issue.path[0] || 'form')
        if (!next[field]) next[field] = issue.message
      }
      setErrors(next)
      toast.error('Corrija os campos destacados')
      return
    }

    setSaving(true)
    const value = validation.data
    const { error } = await supabase
      .from('alunos')
      .update({
        nome_completo: value.nome_completo,
        data_nascimento: form.data_nascimento,
        sexo: value.sexo,
        cpf: value.cpf?.replace(/\D/g, '') || null,
        rg: value.rg || null,
        endereco: value.endereco,
        telefone: value.telefone?.replace(/\D/g, '') || null,
        email: value.email || null,
        nome_mae: value.nome_mae,
        nome_pai: value.nome_pai || null,
        necessidades_especiais: value.necessidades_especiais || null,
      })
      .eq('id', id)

    if (error) {
      toast.error(`Erro ao atualizar aluno: ${error.message}`)
      setSaving(false)
      return
    }

    toast.success('Aluno atualizado com sucesso!')
    router.push(`/dashboard/alunos/${id}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" aria-label="Carregando aluno">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  const fieldError = (field: keyof FormState) => errors[field] ? (
    <p className="text-sm text-red-600" role="alert">{errors[field]}</p>
  ) : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/alunos/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Aluno</h1>
          <p className="mt-1 text-gray-600">Atualize os dados cadastrais do aluno.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Aluno</CardTitle>
          <CardDescription>Campos com * são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-aluno-nome">Nome Completo *</Label>
                <Input id="edit-aluno-nome" value={form.nome_completo} onChange={event => update('nome_completo', event.target.value)} aria-invalid={Boolean(errors.nome_completo)} required />
                {fieldError('nome_completo')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-data">Data de Nascimento *</Label>
                <Input id="edit-aluno-data" type="date" value={form.data_nascimento} onChange={event => update('data_nascimento', event.target.value)} aria-invalid={Boolean(errors.data_nascimento)} required />
                {fieldError('data_nascimento')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-sexo">Sexo *</Label>
                <Select value={form.sexo} onValueChange={value => update('sexo', value as 'M' | 'F')}>
                  <SelectTrigger id="edit-aluno-sexo" aria-label="Sexo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-cpf">CPF</Label>
                <Input id="edit-aluno-cpf" value={form.cpf} onChange={event => update('cpf', event.target.value)} aria-invalid={Boolean(errors.cpf)} />
                {fieldError('cpf')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-rg">RG</Label>
                <Input id="edit-aluno-rg" value={form.rg} onChange={event => update('rg', event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-aluno-endereco">Endereço Completo *</Label>
                <Input id="edit-aluno-endereco" value={form.endereco} onChange={event => update('endereco', event.target.value)} aria-invalid={Boolean(errors.endereco)} required />
                {fieldError('endereco')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-telefone">Telefone</Label>
                <Input id="edit-aluno-telefone" value={form.telefone} onChange={event => update('telefone', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-email">E-mail</Label>
                <Input id="edit-aluno-email" type="email" value={form.email} onChange={event => update('email', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-mae">Nome da Mãe *</Label>
                <Input id="edit-aluno-mae" value={form.nome_mae} onChange={event => update('nome_mae', event.target.value)} aria-invalid={Boolean(errors.nome_mae)} required />
                {fieldError('nome_mae')}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-aluno-pai">Nome do Pai</Label>
                <Input id="edit-aluno-pai" value={form.nome_pai} onChange={event => update('nome_pai', event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-aluno-necessidades">Necessidades Educacionais Especiais</Label>
                <Textarea id="edit-aluno-necessidades" value={form.necessidades_especiais} onChange={event => update('necessidades_especiais', event.target.value)} />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild><Link href={`/dashboard/alunos/${id}`}>Cancelar</Link></Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
