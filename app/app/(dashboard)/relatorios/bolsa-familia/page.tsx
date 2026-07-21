'use client';

/**
 * Bolsa Familia Report Page
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.2: Alerta Bolsa Familia
 * Task Group 5.1.2: Mobile responsiveness fixes
 *
 * Page for viewing and exporting Bolsa Familia compliance reports.
 * Shows students with NIS who are at risk of losing benefits due to
 * low attendance (< 80% threshold).
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Filter,
  Building2,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { reportsApi, type ReportSchool, type ReportTurma } from '@/lib/api/reports';
import { logger } from '@/lib/logger';
import { BolsaFamiliaAlert } from '@/components/reports/BolsaFamiliaAlert';
import {
  getBolsaFamiliaStudents,
  getBolsaFamiliaSummary,
  type BolsaFamiliaStudent,
  type BolsaFamiliaReport,
  BOLSA_FAMILIA_THRESHOLD,
  BOLSA_FAMILIA_WARNING_THRESHOLD,
} from '@/lib/reports/bolsa-familia-reports';
import {
  generateBolsaFamiliaReportPDF,
  generateBolsaFamiliaReportExcel,
} from '@/lib/export';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

// Using types from lib/api/reports.ts
type School = ReportSchool
type Turma = ReportTurma

type PeriodOption = 'current_month' | 'last_month' | 'bimester_1' | 'bimester_2' | 'bimester_3' | 'bimester_4' | 'custom';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPeriodDates(period: PeriodOption, customStart?: Date, customEnd?: Date): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();

  switch (period) {
    case 'current_month':
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    case 'bimester_1':
      return { start: `${year}-02-01`, end: `${year}-04-30` };
    case 'bimester_2':
      return { start: `${year}-05-01`, end: `${year}-06-30` };
    case 'bimester_3':
      return { start: `${year}-08-01`, end: `${year}-09-30` };
    case 'bimester_4':
      return { start: `${year}-10-01`, end: `${year}-12-15` };
    case 'custom':
      return {
        start: customStart ? format(customStart, 'yyyy-MM-dd') : format(startOfMonth(now), 'yyyy-MM-dd'),
        end: customEnd ? format(customEnd, 'yyyy-MM-dd') : format(endOfMonth(now), 'yyyy-MM-dd'),
      };
    default:
      return {
        start: format(startOfMonth(now), 'yyyy-MM-dd'),
        end: format(endOfMonth(now), 'yyyy-MM-dd'),
      };
  }
}

function getPeriodLabel(period: PeriodOption): string {
  switch (period) {
    case 'current_month':
      return 'Mes Atual';
    case 'last_month':
      return 'Mes Anterior';
    case 'bimester_1':
      return '1o Bimestre';
    case 'bimester_2':
      return '2o Bimestre';
    case 'bimester_3':
      return '3o Bimestre';
    case 'bimester_4':
      return '4o Bimestre';
    case 'custom':
      return 'Personalizado';
    default:
      return 'Periodo';
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BolsaFamiliaReportPage() {
  const router = useRouter();

  // Filters state
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedTurma, setSelectedTurma] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('current_month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  // Data state
  const [schools, setSchools] = useState<School[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [report, setReport] = useState<BolsaFamiliaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(true);

  // Fetch schools on mount
  useEffect(() => {
    async function fetchSchools() {
      try {
        const schoolsData = await reportsApi.getSchoolsForFilters();
        setSchools(schoolsData);
      } catch (error) {
        logger.error('Error fetching schools', error as Error, {
          feature: 'reports',
          action: 'load_bolsa_familia_schools'
        });
        toast.error('Erro ao carregar escolas');
      } finally {
        setLoadingSchools(false);
      }
    }

    fetchSchools();
  }, []);

  // Fetch turmas when school changes
  useEffect(() => {
    async function fetchTurmas() {
      if (selectedSchool === 'all') {
        setTurmas([]);
        setSelectedTurma('all');
        return;
      }

      try {
        const turmasData = await reportsApi.getTurmasBySchool(selectedSchool);
        setTurmas(turmasData);
        setSelectedTurma('all');
      } catch (error) {
        logger.error('Error fetching turmas', error as Error, {
          feature: 'reports',
          action: 'load_bolsa_familia_turmas',
          metadata: { escolaId: selectedSchool }
        });
        toast.error('Erro ao carregar turmas');
      }
    }

    fetchTurmas();
  }, [selectedSchool]);

  // Fetch report data
  const fetchReport = useCallback(async () => {
    setLoading(true);

    try {
      const { start, end } = getPeriodDates(selectedPeriod, customStartDate, customEndDate);

      const result = await getBolsaFamiliaStudents(supabase, {
        startDate: start,
        endDate: end,
        escolaId: selectedSchool !== 'all' ? selectedSchool : undefined,
        turmaId: selectedTurma !== 'all' ? selectedTurma : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      setReport(result.data);
    } catch (error) {
      logger.error('Error fetching report', error as Error, {
        feature: 'reports',
        action: 'generate_bolsa_familia_report',
        metadata: { escolaId: selectedSchool, turmaId: selectedTurma }
      });
      toast.error('Erro ao gerar relatorio');
    } finally {
      setLoading(false);
    }
  }, [selectedSchool, selectedTurma, selectedPeriod, customStartDate, customEndDate]);

  // Fetch report when filters change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Export handlers
  const handleExportExcel = async () => {
    if (!report) {
      toast.error('Nenhum relatorio para exportar');
      return;
    }
    try {
      toast.loading('Gerando Excel...', { id: 'export-excel' });
      const selectedSchoolName = selectedSchool !== 'all'
        ? schools.find((s) => s.id === selectedSchool)?.nome
        : undefined;
      await generateBolsaFamiliaReportExcel(report, selectedSchoolName, true);
      toast.success('Excel gerado com sucesso!', { id: 'export-excel' });
    } catch (error) {
      logger.error('Error exporting Excel', error as Error, {
        feature: 'reports',
        action: 'export_bolsa_familia_excel'
      });
      toast.error('Erro ao gerar Excel', { id: 'export-excel' });
    }
  };

  const handleExportPDF = () => {
    if (!report) {
      toast.error('Nenhum relatorio para exportar');
      return;
    }
    try {
      toast.loading('Gerando PDF...', { id: 'export-pdf' });
      const selectedSchoolName = selectedSchool !== 'all'
        ? schools.find((s) => s.id === selectedSchool)?.nome
        : undefined;
      generateBolsaFamiliaReportPDF(report, selectedSchoolName, true);
      toast.success('PDF gerado com sucesso!', { id: 'export-pdf' });
    } catch (error) {
      logger.error('Error exporting PDF', error as Error, {
        feature: 'reports',
        action: 'export_bolsa_familia_pdf'
      });
      toast.error('Erro ao gerar PDF', { id: 'export-pdf' });
    }
  };

  // Get period label for display
  const { start, end } = getPeriodDates(selectedPeriod, customStartDate, customEndDate);
  const periodLabel = selectedPeriod === 'custom' && customStartDate && customEndDate
    ? `${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`
    : `${format(new Date(start), 'dd/MM/yyyy')} - ${format(new Date(end), 'dd/MM/yyyy')}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header - Mobile optimized */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            <span className="hidden xs:inline">Relatorio </span>Bolsa Familia
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            <span className="hidden sm:inline">Monitoramento de frequencia para alunos do programa</span>
            <span className="sm:hidden">Frequencia alunos BF</span>
          </p>
        </div>

        {/* Action buttons - Touch-friendly */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            aria-label="Atualizar relatório"
            onClick={fetchReport}
            disabled={loading}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button
            variant="outline"
            aria-label="Exportar Excel"
            onClick={handleExportExcel}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            aria-label="Exportar PDF"
            onClick={handleExportPDF}
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      {/* Filters - Mobile optimized */}
      <Card>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-sm sm:text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* School Filter */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Escola</label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger aria-label="Escola" className="min-h-[44px]">
                  <SelectValue placeholder="Todas as escolas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="py-3">Todas as escolas</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id} className="py-3">
                      {school.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma Filter */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Turma</label>
              <Select
                value={selectedTurma}
                onValueChange={setSelectedTurma}
                disabled={selectedSchool === 'all'}
              >
                <SelectTrigger aria-label="Turma" className="min-h-[44px]">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="py-3">Todas as turmas</SelectItem>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id} className="py-3">
                      {turma.nome} ({turma.serie})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Filter */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">Periodo</label>
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodOption)}>
                <SelectTrigger aria-label="Periodo" className="min-h-[44px]">
                  <SelectValue placeholder="Selecione o periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month" className="py-3">Mes Atual</SelectItem>
                  <SelectItem value="last_month" className="py-3">Mes Anterior</SelectItem>
                  <SelectItem value="bimester_1" className="py-3">1o Bimestre</SelectItem>
                  <SelectItem value="bimester_2" className="py-3">2o Bimestre</SelectItem>
                  <SelectItem value="bimester_3" className="py-3">3o Bimestre</SelectItem>
                  <SelectItem value="bimester_4" className="py-3">4o Bimestre</SelectItem>
                  <SelectItem value="custom" className="py-3">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-xs sm:text-sm font-medium text-gray-700">Datas</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal min-h-[44px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'dd/MM', { locale: ptBR }) : 'Inicio'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal min-h-[44px]">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'dd/MM', { locale: ptBR }) : 'Fim'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards - Mobile optimized grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                <Skeleton className="h-6 sm:h-8 w-12 sm:w-16 mb-2" />
                <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total */}
          <Card>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-gray-900">
                    {report.resumo.totalAlunosBolsaFamilia}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Alunos Bolsa Familia</span>
                    <span className="sm:hidden">Total BF</span>
                  </p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 hidden xs:block" />
              </div>
            </CardContent>
          </Card>

          {/* Conformes */}
          <Card className="border-green-200">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {report.resumo.conformes}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Conformes (&gt;{BOLSA_FAMILIA_WARNING_THRESHOLD}%)</span>
                    <span className="sm:hidden">OK</span>
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 hidden xs:block" />
              </div>
            </CardContent>
          </Card>

          {/* Em Alerta */}
          <Card className="border-amber-200">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-600">
                    {report.resumo.emAlerta}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Em Alerta ({BOLSA_FAMILIA_THRESHOLD}-{BOLSA_FAMILIA_WARNING_THRESHOLD}%)</span>
                    <span className="sm:hidden">Alerta</span>
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500 hidden xs:block" />
              </div>
            </CardContent>
          </Card>

          {/* Criticos */}
          <Card className="border-red-200">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {report.resumo.emRiscoCritico}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600">
                    <span className="hidden sm:inline">Criticos (&lt;{BOLSA_FAMILIA_THRESHOLD}%)</span>
                    <span className="sm:hidden">Critico</span>
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 hidden xs:block" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Content - Mobile optimized tabs */}
      <Tabs defaultValue="alert" className="space-y-4">
        <TabsList className="grid w-full sm:w-auto sm:max-w-[280px] grid-cols-2">
          <TabsTrigger value="alert" className="min-h-[44px]">
            <span className="hidden sm:inline">Alerta Visual</span>
            <span className="sm:hidden">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="min-h-[44px]">
            <span className="hidden sm:inline">Tabela Completa</span>
            <span className="sm:hidden">Tabela</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alert">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 sm:h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : report && (
            <BolsaFamiliaAlert
              students={report.alunos}
              showDetails={true}
              maxItems={20}
            />
          )}
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader className="px-3 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Lista Completa de Alunos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Periodo: {periodLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {loading ? (
                <div className="space-y-2 px-3 sm:px-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 sm:h-12 w-full" />
                  ))}
                </div>
              ) : report && report.alunos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 px-3">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">Nenhum aluno do Bolsa Familia encontrado</p>
                  <p className="text-xs sm:text-sm mt-1">Verifique os filtros ou se os alunos possuem NIS cadastrado</p>
                </div>
              ) : report && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[150px]">Nome</TableHead>
                        <TableHead className="hidden sm:table-cell">NIS</TableHead>
                        <TableHead className="hidden lg:table-cell">Turma</TableHead>
                        <TableHead className="hidden xl:table-cell">Escola</TableHead>
                        <TableHead className="text-center w-10">P</TableHead>
                        <TableHead className="text-center w-10">F</TableHead>
                        <TableHead className="text-center w-10 hidden xs:table-cell">A</TableHead>
                        <TableHead className="text-center w-12 hidden sm:table-cell">Total</TableHead>
                        <TableHead className="text-center w-14">%</TableHead>
                        <TableHead className="text-center w-16 sm:w-20">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.alunos.map((aluno) => (
                        <TableRow
                          key={aluno.matriculaId}
                          className={cn(
                            'min-h-[44px]',
                            aluno.status === 'CRITICO' && 'bg-red-50',
                            aluno.status === 'ALERTA' && 'bg-amber-50'
                          )}
                        >
                          <TableCell className="font-medium text-xs sm:text-sm py-3">
                            {aluno.nome}
                          </TableCell>
                          <TableCell className="font-mono text-xs hidden sm:table-cell">
                            {aluno.nis || '-'}
                          </TableCell>
                          <TableCell className="text-xs hidden lg:table-cell">{aluno.turmaNome}</TableCell>
                          <TableCell className="text-xs hidden xl:table-cell">{aluno.escolaNome}</TableCell>
                          <TableCell className="text-center text-green-600 text-xs sm:text-sm">{aluno.presencas}</TableCell>
                          <TableCell className="text-center text-red-600 text-xs sm:text-sm">{aluno.faltas}</TableCell>
                          <TableCell className="text-center text-amber-600 text-xs sm:text-sm hidden xs:table-cell">{aluno.atestados}</TableCell>
                          <TableCell className="text-center text-xs sm:text-sm hidden sm:table-cell">{aluno.totalAulas}</TableCell>
                          <TableCell className="text-center font-bold text-xs sm:text-sm">
                            <span
                              className={cn(
                                aluno.status === 'CRITICO' && 'text-red-600',
                                aluno.status === 'ALERTA' && 'text-amber-600',
                                aluno.status === 'CONFORME' && 'text-green-600'
                              )}
                            >
                              {aluno.percentual}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {aluno.status === 'CRITICO' && (
                              <Badge variant="destructive" className="text-[10px] sm:text-xs px-1 sm:px-2">
                                <span className="hidden sm:inline">Critico</span>
                                <AlertTriangle className="h-3 w-3 sm:hidden" />
                              </Badge>
                            )}
                            {aluno.status === 'ALERTA' && (
                              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px] sm:text-xs px-1 sm:px-2">
                                <span className="hidden sm:inline">Alerta</span>
                                <AlertCircle className="h-3 w-3 sm:hidden" />
                              </Badge>
                            )}
                            {aluno.status === 'CONFORME' && (
                              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50 text-[10px] sm:text-xs px-1 sm:px-2">
                                <span className="hidden sm:inline">OK</span>
                                <CheckCircle className="h-3 w-3 sm:hidden" />
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Footer - Mobile optimized */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
          <div className="text-xs sm:text-sm text-gray-600 space-y-1.5 sm:space-y-2">
            <p>
              <strong>Legenda:</strong> P = Presenca, F = Falta, A = Atestado
            </p>
            <p className="hidden sm:block">
              <strong>Calculo de Frequencia:</strong> Atestados medicos (A) contam como presenca
              para o calculo de conformidade do Bolsa Familia.
            </p>
            <p>
              <strong>Thresholds:</strong> Critico &lt;{BOLSA_FAMILIA_THRESHOLD}% | Alerta {BOLSA_FAMILIA_THRESHOLD}-{BOLSA_FAMILIA_WARNING_THRESHOLD}% | Conforme &gt;{BOLSA_FAMILIA_WARNING_THRESHOLD}%
            </p>
            {report && (
              <p className="text-gray-400">
                Gerado em: {format(new Date(report.geradoEm), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
