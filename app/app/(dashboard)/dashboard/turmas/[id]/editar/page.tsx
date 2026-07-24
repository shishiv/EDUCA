'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface Option {
  id: string
  nome: string
}

interface ClassForm {
  nome: string
  serie: string
  turno: 'matutino' | 'vespertino' | 'integral'
  capacidade: string
  ano_letivo: string
  escola_id: string
  professor_id: string
  ativo: boolean
}

const initialForm: ClassForm = {
  nome: '',
  serie: '',
  turno: 'matutino',
  capacidade: '30',
  ano_letivo: String(new Date().getFullYear()),
  escola_id: '',
  professor_id: 'none',
  ativo: true,
}

export default function EditarTurmaPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [form, setForm] = useState(initialForm)
  const [schools, setSchools] = useState<Option[]>([])
  const [teachers, setTeachers] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [classResult, schoolsResult, teachersResult] = await Promise.all([
        supabase.from('turmas').select('*').eq('id', id).single(),
        supabase.from('escolas').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('users').select('id, nome').eq('tipo_usuario', 'professor').eq('ativo', true).order('nome'),
      ])

      if (classResult.error || !classResult.data) {
        toast.error('Não foi possível carregar a turma')
        router.replace('/dashboard/turmas')
        return
      }

      const turma = classResult.data
      setForm({
        nome: turma.nome,
        serie: turma.serie,
        turno: turma.turno as ClassForm['turno'],
        capacidade: String(turma.capacidade),
        ano_letivo: String(turma.ano_letivo),
        escola_id: turma.escola_id,
        professor_id: turma.professor_id || 'none',
        ativo: turma.ativo ?? true,
      })
      setSchools(schoolsResult.data || [])
      setTeachers(teachersResult.data || [])
      setLoading(false)
    }

    void load()
  }, [id, router])

  const update = <K extends keyof ClassForm>(field: K, value: ClassForm[K]) => {
    setForm(previous => ({ ...previous, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('turmas')
      .update({
        nome: form.nome.trim(),
        serie: form.serie.trim(),
        turno: form.turno,
        capacidade: Number(form.capacidade),
        ano_letivo: Number(form.ano_letivo),
        escola_id: form.escola_id,
        professor_id: form.professor_id === 'none' ? null : form.professor_id,
        ativo: form.ativo,
      })
      .eq('id', id)

    if (error) {
      toast.error(`Erro ao atualizar turma: ${error.message}`)
      setSaving(false)
      return
    }

    toast.success('Turma atualizada com sucesso!')
    router.push(`/dashboard/turmas/${id}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center" aria-label="Carregando turma">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/turmas/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Editar Turma</h1>
          <p className="mt-1 text-gray-600">Atualize os dados e a atribuição da turma.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Turma</CardTitle>
          <CardDescription>Campos com * são obrigatórios.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-nome">Nome da Turma *</Label>
                <Input id="edit-nome" value={form.nome} onChange={event => update('nome', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-serie">Série *</Label>
                <Input id="edit-serie" value={form.serie} onChange={event => update('serie', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ano">Ano Letivo *</Label>
                <Input id="edit-ano" type="number" min="2020" max="2100" value={form.ano_letivo} onChange={event => update('ano_letivo', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-turno">Turno *</Label>
                <Select value={form.turno} onValueChange={value => update('turno', value as ClassForm['turno'])}>
                  <SelectTrigger id="edit-turno" aria-label="Turno">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="matutino">Matutino</SelectItem>
                    <SelectItem value="vespertino">Vespertino</SelectItem>
                    <SelectItem value="integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-capacidade">Capacidade *</Label>
                <Input id="edit-capacidade" type="number" min="1" max="100" value={form.capacidade} onChange={event => update('capacidade', event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-escola">Escola *</Label>
                <Select value={form.escola_id} onValueChange={value => update('escola_id', value)}>
                  <SelectTrigger id="edit-escola" aria-label="Escola">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(school => <SelectItem key={school.id} value={school.id}>{school.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-professor">Professor</Label>
                <Select value={form.professor_id} onValueChange={value => update('professor_id', value)}>
                  <SelectTrigger id="edit-professor" aria-label="Professor">
                    <SelectValue placeholder="Sem professor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem professor</SelectItem>
                    {teachers.map(teacher => <SelectItem key={teacher.id} value={teacher.id}>{teacher.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch id="edit-ativo" checked={form.ativo} onCheckedChange={value => update('ativo', value)} />
              <Label htmlFor="edit-ativo">Turma ativa</Label>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/turmas/${id}`}>Cancelar</Link>
              </Button>
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
