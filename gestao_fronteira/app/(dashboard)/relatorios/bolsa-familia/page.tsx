'use client';

/**
 * Bolsa Família Report Page
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.2: Alerta Bolsa Família
 *
 * Page for viewing and exporting Bolsa Família compliance reports.
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

// ============================================================================
// TYPES
// ============================================================================

interface School {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
  serie: string;
  escola_id: string;
}

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
      return 'Mês Atual';
    case 'last_month':
      return 'Mês Anterior';
    case 'bimester_1':
      return '1º Bimestre';
    case 'bimester_2':
      return '2º Bimestre';
    case 'bimester_3':
      return '3º Bimestre';
    case 'bimester_4':
      return '4º Bimestre';
    case 'custom':
      return 'Personalizado';
    default:
      return 'Período';
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
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome')
          .order('nome');

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('Error fetching schools:', error);
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
        const { data, error } = await supabase
          .from('turmas')
          .select('id, nome, serie, escola_id')
          .eq('escola_id', selectedSchool)
          .order('serie')
          .order('nome');

        if (error) throw error;
        setTurmas(data || []);
        setSelectedTurma('all');
      } catch (error) {
        console.error('Error fetching turmas:', error);
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
      console.error('Error fetching report:', error);
      toast.error('Erro ao gerar relatório');
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
      toast.error('Nenhum relatório para exportar');
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
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao gerar Excel', { id: 'export-excel' });
    }
  };

  const handleExportPDF = () => {
    if (!report) {
      toast.error('Nenhum relatório para exportar');
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
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao gerar PDF', { id: 'export-pdf' });
    }
  };

  // Get period label for display
  const { start, end } = getPeriodDates(selectedPeriod, customStartDate, customEndDate);
  const periodLabel = selectedPeriod === 'custom' && customStartDate && customEndDate
    ? `${format(customStartDate, 'dd/MM/yyyy')} - ${format(customEndDate, 'dd/MM/yyyy')}`
    : `${format(new Date(start), 'dd/MM/yyyy')} - ${format(new Date(end), 'dd/MM/yyyy')}`;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Relatório Bolsa Família
          </h1>
          <p className="text-gray-600 mt-1">
            Monitoramento de frequência para alunos do programa
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* School Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Escola</label>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as escolas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as escolas</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Turma Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Turma</label>
              <Select
                value={selectedTurma}
                onValueChange={setSelectedTurma}
                disabled={selectedSchool === 'all'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome} ({turma.serie})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Período</label>
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as PeriodOption)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Mês Atual</SelectItem>
                  <SelectItem value="last_month">Mês Anterior</SelectItem>
                  <SelectItem value="bimester_1">1º Bimestre</SelectItem>
                  <SelectItem value="bimester_2">2º Bimestre</SelectItem>
                  <SelectItem value="bimester_3">3º Bimestre</SelectItem>
                  <SelectItem value="bimester_4">4º Bimestre</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {selectedPeriod === 'custom' && (
              <div className="space-y-2 lg:col-span-1">
                <label className="text-sm font-medium text-gray-700">Datas</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'dd/MM', { locale: ptBR }) : 'Início'}
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
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
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

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {report.resumo.totalAlunosBolsaFamilia}
                  </div>
                  <p className="text-sm text-gray-600">Alunos Bolsa Família</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Conformes */}
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {report.resumo.conformes}
                  </div>
                  <p className="text-sm text-gray-600">Conformes (&gt;{BOLSA_FAMILIA_WARNING_THRESHOLD}%)</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Em Alerta */}
          <Card className="border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600">
                    {report.resumo.emAlerta}
                  </div>
                  <p className="text-sm text-gray-600">Em Alerta ({BOLSA_FAMILIA_THRESHOLD}-{BOLSA_FAMILIA_WARNING_THRESHOLD}%)</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          {/* Críticos */}
          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {report.resumo.emRiscoCritico}
                  </div>
                  <p className="text-sm text-gray-600">Críticos (&lt;{BOLSA_FAMILIA_THRESHOLD}%)</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Content */}
      <Tabs defaultValue="alert" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alert">Alerta Visual</TabsTrigger>
          <TabsTrigger value="table">Tabela Completa</TabsTrigger>
        </TabsList>

        <TabsContent value="alert">
          {loading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
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
            <CardHeader>
              <CardTitle>Lista Completa de Alunos</CardTitle>
              <CardDescription>
                Período: {periodLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : report && report.alunos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum aluno do Bolsa Família encontrado</p>
                  <p className="text-sm mt-1">Verifique os filtros ou se os alunos possuem NIS cadastrado</p>
                </div>
              ) : report && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>NIS</TableHead>
                        <TableHead>Turma</TableHead>
                        <TableHead>Escola</TableHead>
                        <TableHead className="text-center">P</TableHead>
                        <TableHead className="text-center">F</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">%</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.alunos.map((aluno) => (
                        <TableRow
                          key={aluno.matriculaId}
                          className={
                            aluno.status === 'CRITICO'
                              ? 'bg-red-50'
                              : aluno.status === 'ALERTA'
                              ? 'bg-amber-50'
                              : ''
                          }
                        >
                          <TableCell className="font-medium">{aluno.nome}</TableCell>
                          <TableCell className="font-mono text-sm">{aluno.nis || '-'}</TableCell>
                          <TableCell>{aluno.turmaNome}</TableCell>
                          <TableCell>{aluno.escolaNome}</TableCell>
                          <TableCell className="text-center text-green-600">{aluno.presencas}</TableCell>
                          <TableCell className="text-center text-red-600">{aluno.faltas}</TableCell>
                          <TableCell className="text-center text-amber-600">{aluno.atestados}</TableCell>
                          <TableCell className="text-center">{aluno.totalAulas}</TableCell>
                          <TableCell className="text-center font-bold">
                            <span
                              className={
                                aluno.status === 'CRITICO'
                                  ? 'text-red-600'
                                  : aluno.status === 'ALERTA'
                                  ? 'text-amber-600'
                                  : 'text-green-600'
                              }
                            >
                              {aluno.percentual}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {aluno.status === 'CRITICO' && (
                              <Badge variant="destructive">Crítico</Badge>
                            )}
                            {aluno.status === 'ALERTA' && (
                              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                                Alerta
                              </Badge>
                            )}
                            {aluno.status === 'CONFORME' && (
                              <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
                                OK
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

      {/* Info Footer */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Legenda:</strong> P = Presença, F = Falta, A = Atestado
            </p>
            <p>
              <strong>Cálculo de Frequência:</strong> Atestados médicos (A) contam como presença
              para o cálculo de conformidade do Bolsa Família.
            </p>
            <p>
              <strong>Thresholds:</strong> Crítico &lt;{BOLSA_FAMILIA_THRESHOLD}% | Alerta {BOLSA_FAMILIA_THRESHOLD}-{BOLSA_FAMILIA_WARNING_THRESHOLD}% | Conforme &gt;{BOLSA_FAMILIA_WARNING_THRESHOLD}%
            </p>
            {report && (
              <p className="text-gray-400">
                Relatório gerado em: {format(new Date(report.geradoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
