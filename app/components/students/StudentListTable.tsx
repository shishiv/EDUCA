'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Edit, Eye, Plus, Search as SearchIcon, Trash2, Users } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TableEmptyState } from '@/components/ui/table-empty-state'
import { formatDateBR } from '@/lib/date-utils'
import type { StudentManagementProfile } from '@/lib/sensitive-family-access'

type StudentListTableProps = {
  students: StudentManagementProfile[]
  hasFilters: boolean
  onClearFilters: () => void
  onDeactivate: (student: StudentManagementProfile) => void
}

function getInitials(name: string): string {
  return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2)
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  const beforeBirthday = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  return today.getFullYear() - birth.getFullYear() - Number(beforeBirthday)
}

function activeEnrollment(student: StudentManagementProfile) {
  return student.matriculas?.find(enrollment => enrollment.situacao === 'ativa')
}

function StudentStatusBadge({ student }: { student: StudentManagementProfile }) {
  const t = useTranslations('registry')
  if (!student.ativo) return <Badge variant="secondary">{t('studentsList.inactive')}</Badge>
  if (activeEnrollment(student)) {
    return <Badge variant="default" className="bg-green-100 text-green-800">{t('studentsList.enrolled')}</Badge>
  }
  return <Badge variant="outline">{t('studentsList.notEnrolled')}</Badge>
}

function StudentIdentityCell({ student }: { student: StudentManagementProfile }) {
  const t = useTranslations('registry')
  const sexLabel = student.sexo === 'M' ? t('studentsList.male') : t('studentsList.female')
  return (
    <TableCell>
      <div className="flex items-center space-x-3">
        <Avatar><AvatarFallback>{getInitials(student.nome_completo)}</AvatarFallback></Avatar>
        <div>
          <div className="font-medium">{student.nome_completo}</div>
          <div className="text-sm text-gray-500">{sexLabel}{student.cpf ? ` • CPF: ${student.cpf}` : null}</div>
        </div>
      </div>
    </TableCell>
  )
}

function GuardianCell({ student }: { student: StudentManagementProfile }) {
  const t = useTranslations('registry')
  return (
    <TableCell>
      <div className="font-medium">{student.responsavel?.nome || t('studentsList.notProvided')}</div>
      {student.telefone ? <div className="text-sm text-gray-500">{student.telefone}</div> : null}
    </TableCell>
  )
}

function SchoolCell({ student }: { student: StudentManagementProfile }) {
  const t = useTranslations('registry')
  const enrollment = activeEnrollment(student)
  return (
    <TableCell>
      <div className="font-medium">{enrollment?.turmas?.escolas?.nome || t('studentsList.notEnrolled')}</div>
      {enrollment?.turmas?.nome ? <div className="text-sm text-gray-500">{enrollment.turmas.nome}</div> : null}
    </TableCell>
  )
}

function StatusCell({ student }: { student: StudentManagementProfile }) {
  return (
    <TableCell>
      <StudentStatusBadge student={student} />
      {student.necessidades_especiais ? <Badge variant="outline" className="ml-2 text-xs">NEE</Badge> : null}
    </TableCell>
  )
}

function StudentRow({
  student,
  onDeactivate,
}: {
  student: StudentManagementProfile
  onDeactivate: (student: StudentManagementProfile) => void
}) {
  const t = useTranslations('registry')

  return (
    <TableRow>
      <StudentIdentityCell student={student} />
      <TableCell>
        <div>{calculateAge(student.data_nascimento)} {t('studentsList.years')}</div>
        <div className="text-sm text-gray-500">{formatDateBR(student.data_nascimento)}</div>
      </TableCell>
      <GuardianCell student={student} />
      <SchoolCell student={student} />
      <StatusCell student={student} />
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/alunos/${student.id}`} aria-label={t('studentsList.view', { name: student.nome_completo })}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/alunos/${student.id}/editar`} aria-label={t('studentsList.edit', { name: student.nome_completo })}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            aria-label={t('studentsList.deactivate', { name: student.nome_completo })}
            onClick={() => onDeactivate(student)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EmptyStudents({ hasFilters, onClearFilters }: Pick<StudentListTableProps, 'hasFilters' | 'onClearFilters'>) {
  const t = useTranslations('registry')
  const filteredActions = [{
    label: t('studentsList.clearFilters'),
    variant: 'outline' as const,
    onClick: onClearFilters,
  }]
  const initialActions = [{
    label: t('labels.novo-aluno'),
    href: '/dashboard/alunos/novo',
    icon: Plus,
  }]

  return (
    <TableEmptyState
      colSpan={6}
      icon={hasFilters ? SearchIcon : Users}
      title={hasFilters ? t('ui.nenhum-aluno-encontrado') : t('labels.nenhum-aluno-cadastrado')}
      description={hasFilters
        ? t('ui.tente-ajustar-os-filtros-para-encontrar-o-que-procura')
        : t('ui.comece-adicionando-o-primeiro-aluno-ao-sistema')}
      actions={hasFilters ? filteredActions : initialActions}
    />
  )
}

export function StudentListTable(props: StudentListTableProps) {
  const t = useTranslations('registry')
  return (
    <div className="overflow-x-auto">
      <Table className="responsive-stack-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t('studentsList.student')}</TableHead>
            <TableHead>{t('studentsList.age')}</TableHead>
            <TableHead>{t('studentsList.guardian')}</TableHead>
            <TableHead>{t('studentsList.currentSchool')}</TableHead>
            <TableHead>{t('studentsList.status')}</TableHead>
            <TableHead className="text-right">{t('studentsList.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.students.map(student => (
            <StudentRow key={student.id} student={student} onDeactivate={props.onDeactivate} />
          ))}
          {props.students.length === 0 ? <EmptyStudents {...props} /> : null}
        </TableBody>
      </Table>
    </div>
  )
}
