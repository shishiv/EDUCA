'use client'

import { useTranslations } from 'next-intl';

/**
 * Bolsa Família Alert Component
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.2: Alerta Bolsa Família
 *
 * Displays alert for students at risk of losing Bolsa Família benefits
 * due to low attendance (< 80% threshold).
 */

import { AlertTriangle, AlertCircle, CheckCircle, ExternalLink, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import type { BolsaFamiliaStudent, BolsaFamiliaStatus } from '@/lib/reports/bolsa-familia-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface BolsaFamiliaAlertProps {
  students: BolsaFamiliaStudent[];
  showDetails?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
  loading?: boolean;
  compact?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function getOverallStatus(student: BolsaFamiliaStudent): BolsaFamiliaStatus {
  return student.statusLegal === 'CRITICO' ? 'CRITICO' : student.status;
}

function StatusBadge({ status }: { status: BolsaFamiliaStatus }) {
  const t = useTranslations('platform')
  switch (status) {
    case 'CRITICO':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t('components.bolsa.critical')}
        </Badge>
      );
    case 'ALERTA':
      return (
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 bg-amber-50">
          <AlertCircle className="h-3 w-3" />
          {t('components.bolsa.alert')}
        </Badge>
      );
    case 'CONFORME':
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          {t('components.bolsa.compliant')}
        </Badge>
      );
  }
}

function AttendanceBar({
  percentual,
  criticalPercent,
  warningPercent,
}: {
  percentual: number;
  criticalPercent: number | null;
  warningPercent: number | null;
}) {
  const getColor = () => {
    if (criticalPercent !== null && percentual < criticalPercent) return 'bg-red-500';
    if (warningPercent !== null && percentual < warningPercent) return 'bg-amber-500';
    if (criticalPercent === null || warningPercent === null) return 'bg-slate-400';
    return 'bg-green-500';
  };

  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={`h-full ${getColor()} transition-all duration-300`}
        style={{ width: `${Math.min(percentual, 100)}%` }}
      />
    </div>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function BolsaFamiliaAlertSkeleton({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="p-3 border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPACT VERSION
// ============================================================================

function BolsaFamiliaAlertCompact({
  students,
  maxItems = 3,
  onViewAll,
}: BolsaFamiliaAlertProps) {
  const t = useTranslations('platform')
  const atRisk = students.filter((student) => getOverallStatus(student) !== 'CONFORME');
  const criticos = atRisk.filter((student) => getOverallStatus(student) === 'CRITICO');
  const displayStudents = atRisk.slice(0, maxItems);

  if (atRisk.length === 0) {
    return (
      <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{t('components.bolsa.allCompliant')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {t('components.bolsa.riskSummary', { count: atRisk.length })}
          </span>
        </div>
        {criticos.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {t('components.bolsa.criticalSummary', { count: criticos.length })}
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        {displayStudents.map((student) => (
          <div
            key={student.matriculaId}
            className="flex items-center justify-between text-sm py-1"
          >
            <span className="text-gray-700 truncate max-w-[150px]">{student.nome}</span>
            <span
              className={`font-medium ${
                getOverallStatus(student) === 'CRITICO' ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              {student.percentual}%
            </span>
          </div>
        ))}
      </div>

      {atRisk.length > maxItems && onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-amber-700 hover:text-amber-800 hover:bg-amber-100"
          onClick={onViewAll}
        >
          Ver todos ({atRisk.length})
        </Button>
      )}
    </div>
  );
}

function getResolvedMargins(students: BolsaFamiliaStudent[]): string[] {
  return Array.from(new Set(
    students
      .filter((student) => student.margemMunicipalCriticaPercent !== null && student.margemMunicipalAlertaPercent !== null)
      .map((student) => `${student.margemMunicipalCriticaPercent}:${student.margemMunicipalAlertaPercent}`),
  ));
}

function StudentAlertDetails({ student }: { student: BolsaFamiliaStudent }) {
  const t = useTranslations('platform')
  const municipalMargin = student.margemMunicipalCriticaPercent !== null && student.margemMunicipalAlertaPercent !== null
    ? ` (${student.margemMunicipalCriticaPercent}/${student.margemMunicipalAlertaPercent}%)`
    : ''

  return (
    <div className="mt-1 text-sm text-gray-600 space-y-0.5">
      <div>NIS: {student.nis || t('components.bolsa.notInformed')}</div>
      <div>{t('components.studentReport.class')} {student.turmaNome} ({student.turmaSerie})</div>
      {student.escolaNome && <div>Escola: {student.escolaNome}</div>}
      <div>
        Condicionalidade legal: {student.statusLegal}
        {student.pisoLegalPercent !== null ? ` (${student.pisoLegalPercent}%)` : ''}
      </div>
      <div>Margem municipal: {student.margemMunicipalStatus}{municipalMargin}</div>
    </div>
  )
}

function StudentAttendanceDetails({
  student,
  showDetails,
  status,
}: {
  student: BolsaFamiliaStudent
  showDetails: boolean
  status: BolsaFamiliaStatus
}) {
  const t = useTranslations('platform')
  const isCritical = status === 'CRITICO'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{t('components.bolsa.frequency')}</span>
        <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
          {student.percentual}%
        </span>
      </div>
      <AttendanceBar
        percentual={student.percentual}
        criticalPercent={student.margemMunicipalCriticaPercent}
        warningPercent={student.margemMunicipalAlertaPercent}
      />
      {showDetails && (
        <div className="flex justify-between text-xs text-gray-500 pt-1">
          <span>P: {student.presencas} | F: {student.faltas} | A: {student.atestados}</span>
          {!isCritical && student.faltasParaCritico > 0 && (
            <span className="text-amber-600">
              {student.faltasParaCritico} falta{student.faltasParaCritico > 1 ? 's' : ''}{' '}
              {t('components.bolsa.toCritical')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function BolsaFamiliaStudentCard({
  student,
  showDetails,
}: {
  student: BolsaFamiliaStudent
  showDetails: boolean
}) {
  const status = getOverallStatus(student)
  const isCritical = status === 'CRITICO'

  return (
    <div className={`p-3 border rounded-lg ${isCritical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{student.nome}</span>
          </div>
          {showDetails && <StudentAlertDetails student={student} />}
        </div>
        <StatusBadge status={status} />
      </div>
      <StudentAttendanceDetails student={student} showDetails={showDetails} status={status} />
      <div className="mt-3 pt-2 border-t border-gray-200">
        <Link href={`/dashboard/alunos/${student.alunoId}`}>
          <Button variant="ghost" size="sm" className="w-full gap-1 text-gray-600">
            Ver detalhes do aluno
            <ExternalLink className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function AlertLegend({ resolvedMargins }: { resolvedMargins: string[] }) {
  const t = useTranslations('platform')
  const marginLabel = resolvedMargins.length === 1
    ? (() => {
      const [critical, warning] = resolvedMargins[0].split(':')
      return t('components.bolsa.marginSummary', { critical, warning })
    })()
    : t('components.bolsa.margins')
  const marginParts = marginLabel.split(' | ')

  return (
    <div className="mt-4 pt-4 border-t">
      <div className="text-xs text-gray-500 space-y-1">
        {resolvedMargins.length === 1 ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500" /><span>{marginParts[0]}</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>{marginParts[1]}</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span>{marginParts[2]}</span></div>
          </div>
        ) : <p>{marginLabel}</p>}
        <p className="text-gray-400">* Atestados médicos (A) contam como presença para o Bolsa Família</p>
      </div>
    </div>
  )
}

function BolsaFamiliaAlertCard({
  atRisk,
  criticos,
  emAlerta,
  displayStudents,
  resolvedMargins,
  showDetails,
  maxItems,
  onViewAll,
}: {
  atRisk: BolsaFamiliaStudent[]
  criticos: BolsaFamiliaStudent[]
  emAlerta: BolsaFamiliaStudent[]
  displayStudents: BolsaFamiliaStudent[]
  resolvedMargins: string[]
  showDetails: boolean
  maxItems: number
  onViewAll?: () => void
}) {
  const t = useTranslations('platform')
  const hasCriticalStudents = criticos.length > 0

  if (atRisk.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" /><CardTitle className="text-green-800">{t('components.bolsa.noAlerts')}</CardTitle></div>
          <CardDescription className="text-green-700">{t('components.bolsa.aboveMargin')}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className={hasCriticalStudents ? 'border-red-200' : 'border-amber-200'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${hasCriticalStudents ? 'text-red-600' : 'text-amber-600'}`} />
            <CardTitle className={hasCriticalStudents ? 'text-red-800' : 'text-amber-800'}>{t('components.bolsa.alertTitle')}</CardTitle>
          </div>
          <div className="flex gap-2">
            {hasCriticalStudents && <Badge variant="destructive">{t('components.bolsa.criticalSummary', { count: criticos.length })}</Badge>}
            {emAlerta.length > 0 && <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">{t('components.bolsa.alertSummary', { count: emAlerta.length })}</Badge>}
          </div>
        </div>
        <CardDescription className={hasCriticalStudents ? 'text-red-700' : 'text-amber-700'}>
          {t('components.bolsa.legalAlert', { count: atRisk.length })} {t('components.bolsa.separate')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayStudents.map((student) => <BolsaFamiliaStudentCard key={student.matriculaId} student={student} showDetails={showDetails} />)}
        </div>
        {atRisk.length > maxItems && onViewAll && <Button variant="outline" className="w-full mt-4" onClick={onViewAll}>Ver todos os {atRisk.length} alunos em risco</Button>}
        <AlertLegend resolvedMargins={resolvedMargins} />
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BolsaFamiliaAlert({
  students,
  showDetails = true,
  maxItems = 10,
  onViewAll,
  loading = false,
  compact = false,
}: BolsaFamiliaAlertProps) {
  if (loading) {
    return <BolsaFamiliaAlertSkeleton compact={compact} />;
  }

  if (compact) {
    return (
      <BolsaFamiliaAlertCompact
        students={students}
        maxItems={maxItems}
        onViewAll={onViewAll}
      />
    );
  }

  const atRisk = students.filter((student) => getOverallStatus(student) !== 'CONFORME');
  const criticos = atRisk.filter((student) => getOverallStatus(student) === 'CRITICO');
  const emAlerta = atRisk.filter((student) => getOverallStatus(student) === 'ALERTA');
  const displayStudents = atRisk.slice(0, maxItems);
  const resolvedMargins = getResolvedMargins(students)

  return (
    <BolsaFamiliaAlertCard
      atRisk={atRisk}
      criticos={criticos}
      emAlerta={emAlerta}
      displayStudents={displayStudents}
      resolvedMargins={resolvedMargins}
      showDetails={showDetails}
      maxItems={maxItems}
      onViewAll={onViewAll}
    />
  )
}

export default BolsaFamiliaAlert;
