'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface StudentEnrollment {
  id: string
  situacao: string
  aluno: { id: string; nome_completo: string }
}

export default function BoletimTurmaPage() {
  const params = useParams<{ turmaId: string }>()
  const router = useRouter()
  const turmaId = params.turmaId
  const [className, setClassName] = useState('')
  const [students, setStudents] = useState<StudentEnrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [classResult, enrollmentResult] = await Promise.all([
        supabase.from('turmas').select('nome, serie, ano_letivo').eq('id', turmaId).single(),
        supabase
          .from('matriculas')
          .select('id, situacao, aluno:alunos(id, nome_completo)')
          .eq('turma_id', turmaId)
          .order('data_matricula'),
      ])
      if (classResult.error || !classResult.data) {
        toast.error('Turma não encontrada')
        router.replace('/dashboard/notas')
        return
      }
      if (enrollmentResult.error) {
        toast.error('Erro ao carregar alunos da turma')
        router.replace('/dashboard/notas')
        return
      }
      setClassName(`${classResult.data.nome} - ${classResult.data.serie}`)
      setStudents((enrollmentResult.data || []) as unknown as StudentEnrollment[])
      setLoading(false)
    }
    void load()
  }, [router, turmaId])

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center" aria-label="Carregando boletins"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/dashboard/notas"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Link></Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Boletins da Turma</h1>
          <p className="mt-1 text-gray-600">{className}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Alunos</CardTitle><CardDescription>Abra o boletim individual para consultar notas e frequência.</CardDescription></CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-gray-500">Nenhum aluno matriculado nesta turma.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Boletim</TableHead></TableRow></TableHeader>
              <TableBody>
                {students.map(enrollment => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.aluno.nome_completo}</TableCell>
                    <TableCell><Badge variant="outline">{enrollment.situacao}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/alunos/${enrollment.aluno.id}/boletim`} aria-label={`Abrir boletim de ${enrollment.aluno.nome_completo}`}>
                          <FileText className="mr-2 h-4 w-4" />Abrir
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
