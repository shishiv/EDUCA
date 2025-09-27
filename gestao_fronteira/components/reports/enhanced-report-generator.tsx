/**
 * Enhanced Report Generator
 * Streamlined government reporting with INEP compliance and preview functionality
 * Optimized for Brazilian educational management and municipal workflows
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  FileText,
  Download,
  Eye,
  Calendar as CalendarIcon,
  Filter,
  BarChart3,
  Users,
  GraduationCap,
  School,
  MapPin,
  Heart,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Settings,
  Send,
  Save,
  Printer,
  Mail,
  Upload,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  FileX,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

// Report types and configurations
interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'inep' | 'attendance' | 'academic' | 'social' | 'administrative'
  type: 'predefined' | 'custom'
  requiredFields: string[]
  outputFormats: ('pdf' | 'excel' | 'csv' | 'json')[]
  estimatedTime: number // in minutes
  compliance: string[]
  icon: React.ComponentType<any>
  priority: 'high' | 'medium' | 'low'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on-demand'
}

interface ReportFilter {
  id: string
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number' | 'boolean'
  label: string
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  required: boolean
  category: string
  validation?: (value: any) => boolean
  helpText?: string
}

interface GeneratedReport {
  id: string
  templateId: string
  name: string
  parameters: Record<string, any>
  status: 'generating' | 'ready' | 'failed' | 'expired'
  createdAt: Date
  completedAt?: Date
  downloadUrl?: string
  previewUrl?: string
  size?: number
  format: string
  generatedBy: string
  expiresAt?: Date
}

// Report templates configuration
const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'educacenso_basico',
    name: 'Educacenso - Situação Básica',
    description: 'Relatório básico para envio ao INEP com dados de matrícula e frequência',
    category: 'inep',
    type: 'predefined',
    requiredFields: ['period', 'schools'],
    outputFormats: ['excel', 'csv'],
    estimatedTime: 5,
    compliance: ['INEP', 'MEC'],
    icon: GraduationCap,
    priority: 'high',
    frequency: 'monthly'
  },
  {
    id: 'educacenso_completo',
    name: 'Educacenso - Relatório Completo',
    description: 'Relatório completo para censo escolar com todos os dados obrigatórios',
    category: 'inep',
    type: 'predefined',
    requiredFields: ['period', 'schools', 'include_teachers', 'include_infrastructure'],
    outputFormats: ['excel', 'json'],
    estimatedTime: 15,
    compliance: ['INEP', 'MEC', 'Censo Escolar'],
    icon: FileSpreadsheet,
    priority: 'high',
    frequency: 'annual'
  },
  {
    id: 'frequencia_mensal',
    name: 'Relatório de Frequência Mensal',
    description: 'Controle mensal de frequência por turma e estudante',
    category: 'attendance',
    type: 'predefined',
    requiredFields: ['month', 'year', 'schools', 'classes'],
    outputFormats: ['pdf', 'excel'],
    estimatedTime: 8,
    compliance: ['Municipal', 'Bolsa Família'],
    icon: BarChart3,
    priority: 'high',
    frequency: 'monthly'
  },
  {
    id: 'bolsa_familia',
    name: 'Condicionalidades Bolsa Família',
    description: 'Relatório de frequência para programa Bolsa Família',
    category: 'social',
    type: 'predefined',
    requiredFields: ['period', 'minimum_frequency'],
    outputFormats: ['excel', 'csv'],
    estimatedTime: 10,
    compliance: ['Bolsa Família', 'MDS'],
    icon: DollarSign,
    priority: 'high',
    frequency: 'monthly'
  },
  {
    id: 'matriculas_ativas',
    name: 'Matrículas Ativas por Período',
    description: 'Listagem de estudantes matriculados por escola e série',
    category: 'academic',
    type: 'predefined',
    requiredFields: ['date_start', 'date_end', 'schools'],
    outputFormats: ['pdf', 'excel', 'csv'],
    estimatedTime: 5,
    compliance: ['Municipal'],
    icon: Users,
    priority: 'medium',
    frequency: 'on-demand'
  },
  {
    id: 'necessidades_especiais',
    name: 'Estudantes com Necessidades Especiais',
    description: 'Relatório de inclusão e necessidades educacionais especiais',
    category: 'academic',
    type: 'predefined',
    requiredFields: ['schools', 'include_medical_data'],
    outputFormats: ['pdf', 'excel'],
    estimatedTime: 7,
    compliance: ['Municipal', 'Inclusão'],
    icon: Heart,
    priority: 'medium',
    frequency: 'quarterly'
  },
  {
    id: 'transporte_escolar',
    name: 'Transporte Escolar Municipal',
    description: 'Estudantes que utilizam transporte escolar por rota',
    category: 'administrative',
    type: 'predefined',
    requiredFields: ['schools', 'include_routes'],
    outputFormats: ['pdf', 'excel'],
    estimatedTime: 6,
    compliance: ['Municipal'],
    icon: MapPin,
    priority: 'medium',
    frequency: 'quarterly'
  },
  {
    id: 'custom_report',
    name: 'Relatório Personalizado',
    description: 'Crie seu próprio relatório com campos customizados',
    category: 'administrative',
    type: 'custom',
    requiredFields: ['data_fields', 'filters'],
    outputFormats: ['pdf', 'excel', 'csv'],
    estimatedTime: 12,
    compliance: ['Municipal'],
    icon: Settings,
    priority: 'low',
    frequency: 'on-demand'
  }
]

// Report filters configuration
const REPORT_FILTERS: Record<string, ReportFilter[]> = {
  common: [
    {
      id: 'schools',
      type: 'multiselect',
      label: 'Escolas',
      required: true,
      category: 'basic',
      options: [
        { value: 'all', label: 'Todas as Escolas' },
        { value: 'escola1', label: 'E.M. José de Alencar' },
        { value: 'escola2', label: 'E.M. Santos Dumont' },
        { value: 'escola3', label: 'E.M. Monteiro Lobato' }
      ],
      helpText: 'Selecione as escolas para incluir no relatório'
    },
    {
      id: 'period',
      type: 'daterange',
      label: 'Período',
      required: true,
      category: 'basic',
      helpText: 'Período de referência para os dados'
    },
    {
      id: 'format',
      type: 'select',
      label: 'Formato de Saída',
      required: true,
      category: 'output',
      options: [
        { value: 'pdf', label: 'PDF' },
        { value: 'excel', label: 'Excel (XLSX)' },
        { value: 'csv', label: 'CSV' }
      ],
      helpText: 'Formato do arquivo final'
    }
  ],
  academic: [
    {
      id: 'series',
      type: 'multiselect',
      label: 'Séries/Anos',
      required: false,
      category: 'academic',
      options: [
        { value: '1ef', label: '1º Ano EF' },
        { value: '2ef', label: '2º Ano EF' },
        { value: '3ef', label: '3º Ano EF' },
        { value: '4ef', label: '4º Ano EF' },
        { value: '5ef', label: '5º Ano EF' },
        { value: '6ef', label: '6º Ano EF' },
        { value: '7ef', label: '7º Ano EF' },
        { value: '8ef', label: '8º Ano EF' },
        { value: '9ef', label: '9º Ano EF' },
        { value: '1em', label: '1º Ano EM' },
        { value: '2em', label: '2º Ano EM' },
        { value: '3em', label: '3º Ano EM' }
      ]
    },
    {
      id: 'turnos',
      type: 'multiselect',
      label: 'Turnos',
      required: false,
      category: 'academic',
      options: [
        { value: 'matutino', label: 'Matutino' },
        { value: 'vespertino', label: 'Vespertino' },
        { value: 'noturno', label: 'Noturno' },
        { value: 'integral', label: 'Integral' }
      ]
    }
  ],
  social: [
    {
      id: 'bolsa_familia',
      type: 'boolean',
      label: 'Apenas Beneficiários Bolsa Família',
      required: false,
      category: 'social'
    },
    {
      id: 'minimum_frequency',
      type: 'number',
      label: 'Frequência Mínima (%)',
      placeholder: '75',
      required: false,
      category: 'social',
      helpText: 'Frequência mínima para filtrar estudantes'
    }
  ]
}

interface EnhancedReportGeneratorProps {
  className?: string
  onReportGenerated?: (report: GeneratedReport) => void
}

export function EnhancedReportGenerator({
  className,
  onReportGenerated
}: EnhancedReportGeneratorProps) {
  const router = useRouter()

  // State management
  const [selectedTemplate, setSelectedTemplate] = React.useState<ReportTemplate | null>(null)
  const [reportFilters, setReportFilters] = React.useState<Record<string, any>>({})
  const [generatedReports, setGeneratedReports] = React.useState<GeneratedReport[]>([])
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationProgress, setGenerationProgress] = React.useState(0)
  const [previewData, setPreviewData] = React.useState<any>(null)
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('templates')
  const [filterCategory, setFilterCategory] = React.useState('all')

  // Quick date ranges
  const quickRanges = [
    {
      label: 'Mês Atual',
      value: { start: startOfMonth(new Date()), end: endOfMonth(new Date()) }
    },
    {
      label: 'Mês Anterior',
      value: {
        start: startOfMonth(addDays(startOfMonth(new Date()), -1)),
        end: endOfMonth(addDays(startOfMonth(new Date()), -1))
      }
    },
    {
      label: 'Ano Atual',
      value: { start: startOfYear(new Date()), end: endOfYear(new Date()) }
    },
    {
      label: 'Último Trimestre',
      value: {
        start: addDays(new Date(), -90),
        end: new Date()
      }
    }
  ]

  // Load saved reports on mount
  React.useEffect(() => {
    loadSavedReports()
  }, [])

  const loadSavedReports = async () => {
    try {
      // In real implementation, load from API
      const mockReports: GeneratedReport[] = [
        {
          id: '1',
          templateId: 'educacenso_basico',
          name: 'Educacenso Básico - Setembro 2024',
          parameters: { period: 'September 2024', schools: ['escola1', 'escola2'] },
          status: 'ready',
          createdAt: new Date(Date.now() - 86400000),
          completedAt: new Date(Date.now() - 86200000),
          downloadUrl: '/reports/educacenso-basico-set2024.xlsx',
          size: 2048576,
          format: 'excel',
          generatedBy: 'Admin',
          expiresAt: new Date(Date.now() + 2592000000) // 30 days
        },
        {
          id: '2',
          templateId: 'frequencia_mensal',
          name: 'Frequência Mensal - Agosto 2024',
          parameters: { month: 8, year: 2024, schools: ['all'] },
          status: 'ready',
          createdAt: new Date(Date.now() - 172800000),
          completedAt: new Date(Date.now() - 172600000),
          downloadUrl: '/reports/frequencia-ago2024.pdf',
          size: 1024768,
          format: 'pdf',
          generatedBy: 'Admin'
        }
      ]
      setGeneratedReports(mockReports)
    } catch (error) {
      console.error('Failed to load reports:', error)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setReportFilters({})
    setActiveTab('configure')
  }

  // Handle filter change
  const handleFilterChange = (filterId: string, value: any) => {
    setReportFilters(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  // Generate preview
  const generatePreview = async () => {
    if (!selectedTemplate) return

    setIsPreviewLoading(true)
    try {
      // Simulate preview generation
      await new Promise(resolve => setTimeout(resolve, 2000))

      const mockPreview = {
        summary: {
          totalRecords: 1247,
          schools: 3,
          period: '01/09/2024 - 30/09/2024'
        },
        sampleData: [
          { nome: 'João Silva', escola: 'E.M. José de Alencar', serie: '5º EF', frequencia: '92%' },
          { nome: 'Maria Santos', escola: 'E.M. Santos Dumont', serie: '3º EF', frequencia: '88%' },
          { nome: 'Pedro Oliveira', escola: 'E.M. Monteiro Lobato', serie: '7º EF', frequencia: '95%' }
        ]
      }

      setPreviewData(mockPreview)
      toast.success('Preview gerado com sucesso!')
    } catch (error) {
      console.error('Preview failed:', error)
      toast.error('Erro ao gerar preview')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  // Generate report
  const generateReport = async () => {
    if (!selectedTemplate) return

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Simulate report generation with progress
      const steps = [
        'Validando parâmetros...',
        'Coletando dados...',
        'Processando informações...',
        'Aplicando filtros...',
        'Gerando relatório...',
        'Finalizando...'
      ]

      for (let i = 0; i < steps.length; i++) {
        toast.info(steps[i])
        setGenerationProgress((i + 1) * (100 / steps.length))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        templateId: selectedTemplate.id,
        name: `${selectedTemplate.name} - ${format(new Date(), 'dd/MM/yyyy')}`,
        parameters: reportFilters,
        status: 'ready',
        createdAt: new Date(),
        completedAt: new Date(),
        downloadUrl: `/reports/${selectedTemplate.id}-${Date.now()}.${reportFilters.format}`,
        size: Math.floor(Math.random() * 5000000) + 500000,
        format: reportFilters.format || 'pdf',
        generatedBy: 'Admin'
      }

      setGeneratedReports(prev => [newReport, ...prev])
      onReportGenerated?.(newReport)

      toast.success('Relatório gerado com sucesso!')
      setActiveTab('reports')
    } catch (error) {
      console.error('Report generation failed:', error)
      toast.error('Erro ao gerar relatório')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  // Validate current configuration
  const isConfigurationValid = () => {
    if (!selectedTemplate) return false

    return selectedTemplate.requiredFields.every(field => {
      const value = reportFilters[field]
      return value !== undefined && value !== null && value !== ''
    })
  }

  // Get available filters for current template
  const getAvailableFilters = () => {
    if (!selectedTemplate) return []

    let filters: ReportFilter[] = [...REPORT_FILTERS.common]

    if (selectedTemplate.category === 'academic') {
      filters.push(...REPORT_FILTERS.academic)
    }
    if (selectedTemplate.category === 'social') {
      filters.push(...REPORT_FILTERS.social)
    }

    return filters
  }

  // Filter templates by category
  const getFilteredTemplates = () => {
    if (filterCategory === 'all') return REPORT_TEMPLATES

    return REPORT_TEMPLATES.filter(template => template.category === filterCategory)
  }

  // Render filter input
  const renderFilterInput = (filter: ReportFilter) => {
    const value = reportFilters[filter.id]

    switch (filter.type) {
      case 'select':
        return (
          <Select value={value || ''} onValueChange={(val) => handleFilterChange(filter.id, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {filter.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${filter.id}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value)
                    handleFilterChange(filter.id, newValues)
                  }}
                />
                <Label htmlFor={`${filter.id}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        )

      case 'daterange':
        return (
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {quickRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange(filter.id, range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value?.start ? format(value.start, 'dd/MM/yyyy', { locale: ptBR }) : 'Data início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={value?.start}
                    onSelect={(date) => handleFilterChange(filter.id, { ...value, start: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value?.end ? format(value.end, 'dd/MM/yyyy', { locale: ptBR }) : 'Data fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={value?.end}
                    onSelect={(date) => handleFilterChange(filter.id, { ...value, end: date })}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )

      case 'text':
        return (
          <Input
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={filter.placeholder}
            value={value || ''}
            onChange={(e) => handleFilterChange(filter.id, Number(e.target.value))}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={filter.id}
              checked={value || false}
              onCheckedChange={(checked) => handleFilterChange(filter.id, checked)}
            />
            <Label htmlFor={filter.id}>Sim</Label>
          </div>
        )

      default:
        return null
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Gerador de Relatórios Avançado
          </CardTitle>
          <CardDescription>
            Sistema completo de relatórios educacionais com conformidade INEP e automação municipal
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="configure" className="flex items-center gap-2" disabled={!selectedTemplate}>
            <Settings className="h-4 w-4" />
            Configurar
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2" disabled={!selectedTemplate}>
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Selecionar Template de Relatório</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      <SelectItem value="inep">INEP / Governo</SelectItem>
                      <SelectItem value="attendance">Frequência</SelectItem>
                      <SelectItem value="academic">Acadêmico</SelectItem>
                      <SelectItem value="social">Programas Sociais</SelectItem>
                      <SelectItem value="administrative">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getFilteredTemplates().map((template) => {
                  const Icon = template.icon
                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md",
                        selectedTemplate?.id === template.id && "ring-2 ring-primary"
                      )}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-5 w-5 text-primary" />
                              <Badge variant={template.priority === 'high' ? 'default' : 'secondary'}>
                                {template.priority === 'high' ? 'Prioritário' : 'Normal'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {template.estimatedTime}min
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-sm">{template.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {template.compliance.map((comp) => (
                                <Badge key={comp} variant="outline" className="text-xs">
                                  {comp}
                                </Badge>
                              ))}
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Formatos: {template.outputFormats.join(', ').toUpperCase()}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {template.frequency}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configure Tab */}
        <TabsContent value="configure">
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <selectedTemplate.icon className="h-5 w-5" />
                  {selectedTemplate.name}
                </CardTitle>
                <CardDescription>
                  Configure os parâmetros para gerar seu relatório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Template Info */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p><strong>Descrição:</strong> {selectedTemplate.description}</p>
                      <p><strong>Tempo estimado:</strong> {selectedTemplate.estimatedTime} minutos</p>
                      <p><strong>Conformidade:</strong> {selectedTemplate.compliance.join(', ')}</p>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Configuration Form */}
                <div className="space-y-4">
                  {getAvailableFilters().map((filter) => (
                    <div key={filter.id} className="space-y-2">
                      <Label className="flex items-center gap-2">
                        {filter.label}
                        {filter.required && <span className="text-red-500">*</span>}
                      </Label>
                      {renderFilterInput(filter)}
                      {filter.helpText && (
                        <p className="text-xs text-muted-foreground">{filter.helpText}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {isConfigurationValid() ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Configuração válida
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        Preencha todos os campos obrigatórios
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={generatePreview}
                      disabled={!isConfigurationValid() || isPreviewLoading}
                    >
                      {isPreviewLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview
                    </Button>

                    <Button
                      onClick={generateReport}
                      disabled={!isConfigurationValid() || isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Gerar Relatório
                    </Button>
                  </div>
                </div>

                {/* Generation Progress */}
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Gerando relatório...</span>
                      <span>{Math.round(generationProgress)}%</span>
                    </div>
                    <Progress value={generationProgress} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview do Relatório
                </CardTitle>
                <CardDescription>
                  Visualização prévia dos dados que serão incluídos no relatório
                </CardDescription>
              </CardHeader>
              <CardContent>
                {previewData ? (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">
                            {previewData.summary.totalRecords}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total de Registros
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-primary">
                            {previewData.summary.schools}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Escolas Incluídas
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-lg font-bold text-primary">
                            {previewData.summary.period}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Período
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Sample Data */}
                    <div>
                      <h4 className="font-semibold mb-3">Amostra dos Dados (3 primeiros registros):</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              {Object.keys(previewData.sampleData[0]).map((key) => (
                                <th key={key} className="text-left p-3 text-sm font-medium">
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.sampleData.map((row: any, index: number) => (
                              <tr key={index} className="border-t">
                                {Object.values(row).map((value: any, cellIndex) => (
                                  <td key={cellIndex} className="p-3 text-sm">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Esta é apenas uma prévia. O relatório completo conterá todos os registros
                        que atendem aos critérios especificados.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground mb-4">
                      <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      Nenhum preview disponível
                    </div>
                    <Button onClick={generatePreview} disabled={!isConfigurationValid()}>
                      Gerar Preview
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Relatórios Gerados
                  <Badge variant="secondary">{generatedReports.length}</Badge>
                </CardTitle>
                <Button variant="outline" onClick={loadSavedReports}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {generatedReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileX className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Nenhum relatório gerado ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedReports.map((report) => (
                    <Card key={report.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{report.name}</h4>
                              <Badge
                                variant={
                                  report.status === 'ready' ? 'default' :
                                    report.status === 'generating' ? 'secondary' : 'destructive'
                                }
                              >
                                {report.status === 'ready' ? 'Pronto' :
                                  report.status === 'generating' ? 'Gerando' : 'Erro'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {report.format.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Criado em {format(report.createdAt, 'dd/MM/yyyy HH:mm', { locale: ptBR })} por {report.generatedBy}
                              {report.size && ` • ${formatFileSize(report.size)}`}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {report.status === 'ready' && (
                              <>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  Visualizar
                                </Button>
                                <Button size="sm">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}