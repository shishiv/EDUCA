'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { z } from 'zod'
import { DescriptiveReportForm } from './DescriptiveReportForm'
import { NarrativeSources } from './NarrativeSources'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'
import type { DescriptiveReport, SemestreType } from '@/types/descriptive-report'
import type { transformFormDataToInput } from '@/lib/validation/descriptive-report'

type Report = Tables<'relatorios_descritivos'>
type FormInput = ReturnType<typeof transformFormDataToInput>
interface StudentContext {
  name: string
  enrollmentId: string
  classId: string
  year: number
}

async function loadStudent(studentId: string): Promise<StudentContext> {
  const { data, error } = await supabase.from('matriculas')
    .select('id, turma_id, ano_letivo, aluno:alunos!inner(id, nome_completo)')
    .eq('aluno_id', studentId).eq('situacao', 'ativa').order('created_at', { ascending: false }).limit(1).single()
  if (error) throw error
  return { name: data.aluno.nome_completo, enrollmentId: data.id, classId: data.turma_id, year: data.ano_letivo }
}

async function loadReports(enrollmentId: string) {
  const { data, error } = await supabase.from('relatorios_descritivos').select('*')
    .eq('matricula_id', enrollmentId).order('ano_letivo', { ascending: false }).order('semestre')
  if (error) throw error
  return data
}

function formReport(report: Report | null): Partial<DescriptiveReport> | undefined {
  if (!report) return undefined
  return { ...report, created_at: report.created_at ?? undefined, updated_at: report.updated_at ?? undefined, status: z.enum(['rascunho', 'finalizado']).parse(report.status), semestre: z.enum(['primeiro', 'segundo']).parse(report.semestre) }
}

function semesterLabel(semester: string) {
  return semester === 'primeiro' ? '1 Semestre' : '2 Semestre'
}

async function persistReport(student: StudentContext, report: Report | null, year: number, semester: SemestreType, data: FormInput, finalize: boolean) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth.user) throw new Error('Autenticação obrigatória.')
  const payload = { ...data, status: finalize ? 'finalizado' : 'rascunho' }
  const query = report
    ? supabase.from('relatorios_descritivos').update(payload).eq('id', report.id)
    : supabase.from('relatorios_descritivos').insert({ ...payload, matricula_id: student.enrollmentId, turma_id: student.classId,
      professor_id: auth.user.id, created_by: auth.user.id, ano_letivo: year, semestre: semester })
  const { data: saved, error } = await query.select('*').single()
  if (error) throw error
  return saved
}

function ReportEditor({ student, report, year, semester, canWrite, onSaved, onClose }: {
  student: StudentContext; report: Report | null; year: number; semester: SemestreType; canWrite: boolean
  onSaved(report: Report): void; onClose(): void
}) {
  const [sourcesReady, setSourcesReady] = useState(false)
  const [failure, setFailure] = useState('')
  const finalized = report?.status === 'finalizado'
  const initialValues = useMemo(() => formReport(report), [report])
  const active = report ? { year: report.ano_letivo, semester: report.semestre, snapshot: report.fontes_snapshot } : { year, semester, snapshot: null }
  async function save(data: FormInput, finalize: boolean) {
    setFailure('')
    try {
      onSaved(await persistReport(student, report, year, semester, data, finalize))
    } catch (error) {
      setFailure('O relatório não foi salvo. Confira as fontes e o período configurado e tente novamente.')
      throw error
    }
  }
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,350px)]">
      <div className="min-w-0">
        {failure && <p role="alert" className="mb-4 text-red-700">{failure}</p>}
        <DescriptiveReportForm studentName={student.name} semesterLabel={`${semesterLabel(active.semester)} de ${active.year}`}
          initialValues={initialValues} status={finalized ? 'finalizado' : 'rascunho'} disabled={!canWrite}
          onSaveDraft={canWrite ? data => save(data, false) : undefined}
          onFinalize={canWrite && sourcesReady ? data => save(data, true) : undefined} onCancel={onClose} />
      </div>
      <NarrativeSources key={`${student.enrollmentId}-${active.year}-${active.semester}-${finalized}`} enrollmentId={student.enrollmentId} year={active.year} semester={active.semester}
        finalized={finalized} snapshot={active.snapshot} onReady={setSourcesReady} />
    </div>
  )
}

async function downloadReport(reportId: string) {
  const response = await fetch(`/api/pilot/descriptive-reports/${reportId}/pdf`)
  if (!response.ok) throw new Error('PDF não emitido: exige relatório finalizado com captura verificável de Vivências.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'relatorio-descritivo.pdf'
  link.click()
  requestAnimationFrame(() => URL.revokeObjectURL(url))
}

function ReportList({ reports, onOpen }: { reports: Report[]; onOpen(report: Report): void }) {
  const [error, setError] = useState('')
  const [emitting, setEmitting] = useState<string | null>(null)
  async function emit(id: string) {
    setError('')
    setEmitting(id)
    try { await downloadReport(id) } catch (caught) { setError(caught instanceof Error ? caught.message : 'PDF não emitido.') }
    finally { setEmitting(null) }
  }
  return (
    <section className="space-y-3" aria-label="Relatórios salvos">
      {error && <p role="alert" data-testid="descriptive-report-emission-error">{error}</p>}
      {reports.map(report => (
        <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <Button variant="ghost" onClick={() => onOpen(report)}>{semesterLabel(report.semestre)} de {report.ano_letivo} · {report.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}</Button>
          {report.status === 'finalizado' && process.env.NEXT_PUBLIC_PILOT_DESCRIPTIVE_REPORT_DEMO === 'true' && <Button variant="outline" disabled={emitting !== null} onClick={() => void emit(report.id)}>Emitir PDF</Button>}
        </article>
      ))}
    </section>
  )
}

export function StudentNarrativeReports({ studentId }: { studentId: string }) {
  const { userProfile } = useAuth()
  const [student, setStudent] = useState<StudentContext | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [selected, setSelected] = useState<Report | null>(null)
  const [editing, setEditing] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [semester, setSemester] = useState<SemestreType>('primeiro')
  const [error, setError] = useState('')
  const canWrite = userProfile?.tipo_usuario === 'professor'

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const context = await loadStudent(studentId)
        const loadedReports = await loadReports(context.enrollmentId)
        if (!active) return
        setStudent(context)
        setYear(context.year)
        setReports(loadedReports)
      } catch { if (active) setError('Não foi possível carregar os relatórios do aluno.') }
    }
    void load()
    return () => { active = false }
  }, [studentId])

  const saved = useCallback((report: Report) => {
    setSelected(report)
    setReports(current => [report, ...current.filter(item => item.id !== report.id)])
  }, [])
  if (error) return <p role="alert">{error}</p>
  if (!student) return <p role="status">Carregando relatórios...</p>
  return (
    <div className="min-w-0 space-y-6 p-4">
      <Button variant="ghost" asChild><Link href={`/dashboard/alunos/${studentId}/diario`}>Diario Infantil</Link></Button>
      <header><h1 className="text-2xl font-semibold">Relatório de desenvolvimento</h1><h2 className="text-lg">{student.name}</h2></header>
      <ReportList reports={reports} onOpen={report => { setSelected(report); setEditing(true) }} />
      {canWrite && <Button onClick={() => { setSelected(null); setEditing(true) }}>Novo Relatorio</Button>}
      {editing && !selected && <div className="flex flex-wrap gap-4">
        <div><Label htmlFor="report-year">Ano</Label><Input id="report-year" type="number" min="1" max="9999" value={year} onChange={event => setYear(Number(event.target.value))} /></div>
        <div><Label htmlFor="report-semester">Semestre</Label><select id="report-semester" className="block rounded-md border bg-background p-2" value={semester} onChange={event => setSemester(z.enum(['primeiro', 'segundo']).parse(event.target.value))}><option value="primeiro">1 Semestre</option><option value="segundo">2 Semestre</option></select></div>
      </div>}
      {editing && <ReportEditor key={selected?.id ?? `${year}-${semester}`} student={student} report={selected} year={year} semester={semester} canWrite={canWrite} onSaved={saved} onClose={() => setEditing(false)} />}
    </div>
  )
}
