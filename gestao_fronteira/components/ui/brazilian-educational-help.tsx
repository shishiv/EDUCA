/**
 * Brazilian Educational Help System
 * Contextual tooltips and help components for Brazilian educational terminology
 * Optimized for teacher and administrative staff understanding
 */

'use client'

import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpCircle, Info, BookOpen, GraduationCap, FileText, Calendar, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Brazilian Educational Terminology Database
 * Contains official terms and their explanations for the Brazilian educational system
 */
const BRAZILIAN_EDU_TERMS = {
  // Student Documents and Identification
  cpf: {
    title: 'CPF - Cadastro de Pessoas Físicas',
    description: 'Documento oficial brasileiro para identificação fiscal. Obrigatório para alunos acima de 16 anos conforme legislação educacional.',
    context: 'Usado para matrícula em níveis superiores e para emissão de certificados oficiais.',
    example: 'Formato: 123.456.789-09'
  },

  rg: {
    title: 'RG - Registro Geral',
    description: 'Documento de identidade civil brasileiro. Principal documento de identificação para estudantes.',
    context: 'Necessário para todas as matrículas e transferências escolares.',
    example: 'Varia por estado: MG-12.345.678 ou 12.345.678'
  },

  // Educational Levels
  creche: {
    title: 'Creche',
    description: 'Atendimento educacional para crianças de até 3 anos de idade.',
    context: 'Primeira etapa da Educação Infantil conforme LDB (Lei de Diretrizes e Bases).',
    example: 'Idades: 0 a 3 anos'
  },

  pre_escola: {
    title: 'Pré-escola',
    description: 'Atendimento educacional para crianças de 4 a 5 anos de idade.',
    context: 'Segunda etapa da Educação Infantil. Matrícula obrigatória aos 4 anos.',
    example: 'Idades: 4 a 5 anos'
  },

  fundamental: {
    title: 'Ensino Fundamental',
    description: 'Etapa obrigatória da educação básica para crianças e adolescentes de 6 a 14 anos.',
    context: 'Dividido em Anos Iniciais (1º ao 5º ano) e Anos Finais (6º ao 9º ano).',
    example: 'Idades: 6 a 14 anos (9 anos de duração)'
  },

  // Attendance System
  frequencia: {
    title: 'Frequência Escolar',
    description: 'Registro oficial da presença do aluno nas atividades escolares. Mínimo de 75% exigido por lei.',
    context: 'Documento oficial obrigatório que não pode ser alterado após finalização.',
    example: 'Presente, Falta, Falta Justificada, Atestado Médico'
  },

  falta_justificada: {
    title: 'Falta Justificada',
    description: 'Ausência do aluno com justificativa válida apresentada pelos responsáveis.',
    context: 'Não conta para o cálculo de reprovação por frequência, mas é registrada.',
    example: 'Motivos familiares, compromissos médicos preventivos'
  },

  atestado_medico: {
    title: 'Atestado Médico',
    description: 'Ausência justificada por documento médico oficial.',
    context: 'Tem tratamento especial na legislação educacional, não conta como falta.',
    example: 'Apresentar atestado em até 48 horas após o retorno'
  },

  // School Organization
  turma: {
    title: 'Turma',
    description: 'Agrupamento de alunos da mesma série/ano para fins de organização pedagógica.',
    context: 'Unidade básica de organização escolar com professor regente definido.',
    example: '1º Ano A, 5º Ano B, 9º Ano Matutino'
  },

  serie: {
    title: 'Série/Ano',
    description: 'Subdivisão do ensino fundamental que indica o nível de aprendizagem do aluno.',
    context: 'Pode ser organizada por série (1ª a 8ª) ou ano (1º ao 9º).',
    example: '1º Ano, 5º Ano, 9º Ano'
  },

  turno: {
    title: 'Turno',
    description: 'Período de funcionamento das atividades escolares.',
    context: 'Organização temporal para otimizar uso de recursos e atender demanda.',
    example: 'Matutino (manhã), Vespertino (tarde), Integral (dia todo)'
  },

  // Academic Calendar
  ano_letivo: {
    title: 'Ano Letivo',
    description: 'Período de 200 dias letivos que compõe o calendário escolar oficial.',
    context: 'Definido pela Secretaria de Educação, geralmente de fevereiro a dezembro.',
    example: '2024: início em 05/02 e término em 20/12'
  },

  bimestre: {
    title: 'Bimestre',
    description: 'Período de avaliação de aproximadamente 2 meses para acompanhamento pedagógico.',
    context: 'Divisão do ano letivo em 4 períodos para avaliação e relatórios.',
    example: '1º Bim: fev-abr, 2º Bim: mai-jul, 3º Bim: ago-out, 4º Bim: nov-dez'
  },

  // Family Relations
  responsavel: {
    title: 'Responsável Legal',
    description: 'Pessoa autorizada legalmente a tomar decisões sobre a vida escolar do aluno.',
    context: 'Pais, tutores ou guardião legal conforme documentação oficial.',
    example: 'Pai, mãe, avó (com guarda), tutor legal'
  },

  grau_parentesco: {
    title: 'Grau de Parentesco',
    description: 'Relação familiar ou legal entre o responsável e o aluno.',
    context: 'Importante para definir autorização para decisões e emergências.',
    example: 'Mãe, pai, avó, tio/a, tutor legal'
  },

  // Special Education
  necessidades_especiais: {
    title: 'Necessidades Educacionais Especiais',
    description: 'Condições que requerem adaptações pedagógicas ou de infraestrutura.',
    context: 'Garante direito à educação inclusiva conforme legislação brasileira.',
    example: 'Deficiência física, intelectual, visual, auditiva, TEA, superdotação'
  },

  // Legal Compliance
  bncc: {
    title: 'BNCC - Base Nacional Comum Curricular',
    description: 'Documento oficial que define competências e habilidades essenciais para a educação básica.',
    context: 'Referência obrigatória para elaboração dos currículos escolares.',
    example: 'Competências gerais e específicas por área de conhecimento'
  },

  ldb: {
    title: 'LDB - Lei de Diretrizes e Bases',
    description: 'Lei 9.394/96 que estabelece as diretrizes e bases da educação nacional brasileira.',
    context: 'Principal marco legal da educação brasileira, define estrutura e funcionamento.',
    example: 'Organização da educação básica, direitos e deveres'
  }
}

type TermKey = keyof typeof BRAZILIAN_EDU_TERMS

interface EducationalTooltipProps {
  term: TermKey
  children: React.ReactNode
  className?: string
}

/**
 * Educational Tooltip Component
 * Provides contextual help for Brazilian educational terminology
 */
export function EducationalTooltip({ term, children, className }: EducationalTooltipProps) {
  const termData = BRAZILIAN_EDU_TERMS[term]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help border-b border-dotted border-gray-400", className)}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm p-4" side="top">
          <div className="space-y-2">
            <div className="font-semibold text-sm">{termData.title}</div>
            <div className="text-xs text-gray-600">{termData.description}</div>
            {termData.context && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                <strong>Contexto:</strong> {termData.context}
              </div>
            )}
            {termData.example && (
              <div className="text-xs text-green-600">
                <strong>Exemplo:</strong> {termData.example}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface EducationalHelpCardProps {
  term: TermKey
  className?: string
}

/**
 * Educational Help Card Component
 * Displays detailed information about Brazilian educational terms
 */
export function EducationalHelpCard({ term, className }: EducationalHelpCardProps) {
  const termData = BRAZILIAN_EDU_TERMS[term]

  const getTermIcon = (term: TermKey) => {
    if (['cpf', 'rg'].includes(term)) return <FileText className="h-5 w-5" />
    if (['creche', 'pre_escola', 'fundamental'].includes(term)) return <GraduationCap className="h-5 w-5" />
    if (['frequencia', 'falta_justificada', 'atestado_medico'].includes(term)) return <Calendar className="h-5 w-5" />
    if (['turma', 'serie', 'turno'].includes(term)) return <Users className="h-5 w-5" />
    return <BookOpen className="h-5 w-5" />
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {getTermIcon(term)}
          {termData.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription className="text-sm leading-relaxed">
          {termData.description}
        </CardDescription>

        {termData.context && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Contexto Educacional</AlertTitle>
            <AlertDescription className="text-sm">
              {termData.context}
            </AlertDescription>
          </Alert>
        )}

        {termData.example && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800 mb-1">Exemplo:</div>
            <div className="text-sm text-green-700">{termData.example}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface EducationalHelpIconProps {
  term: TermKey
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Educational Help Icon Component
 * Small help icon with tooltip for inline use
 */
export function EducationalHelpIcon({ term, size = 'sm', className }: EducationalHelpIconProps) {
  const sizeClass = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }[size]

  return (
    <EducationalTooltip term={term} className={className}>
      <HelpCircle className={cn(sizeClass, "text-gray-400 hover:text-blue-500 transition-colors")} />
    </EducationalTooltip>
  )
}

interface ComplianceAlertProps {
  type: 'frequency' | 'immutability' | 'documentation' | 'age_requirement'
  children?: React.ReactNode
  className?: string
}

/**
 * Brazilian Educational Compliance Alert
 * Displays important legal compliance information
 */
export function ComplianceAlert({ type, children, className }: ComplianceAlertProps) {
  const alerts = {
    frequency: {
      title: 'Frequência Mínima Obrigatória',
      description: 'Por lei, o aluno deve ter no mínimo 75% de frequência nas atividades escolares para aprovação.',
      icon: <Calendar className="h-4 w-4" />
    },
    immutability: {
      title: 'Registro Oficial Imutável',
      description: 'Atenção: Após finalizado, este registro não poderá ser alterado conforme legislação educacional brasileira.',
      icon: <FileText className="h-4 w-4" />
    },
    documentation: {
      title: 'Documentação Obrigatória',
      description: 'Todos os documentos são obrigatórios conforme diretrizes da Secretaria de Educação.',
      icon: <BookOpen className="h-4 w-4" />
    },
    age_requirement: {
      title: 'Critério de Idade',
      description: 'A idade deve estar dentro dos parâmetros estabelecidos pela LDB para o nível educacional.',
      icon: <GraduationCap className="h-4 w-4" />
    }
  }

  const alert = alerts[type]

  return (
    <Alert className={cn("border-orange-200 bg-orange-50", className)}>
      {alert.icon}
      <AlertTitle className="text-orange-800">{alert.title}</AlertTitle>
      <AlertDescription className="text-orange-700">
        {alert.description}
        {children}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Quick Reference Guide Component
 * Displays common Brazilian educational terms in a compact format
 */
export function EducationalQuickReference() {
  const commonTerms: TermKey[] = ['cpf', 'frequencia', 'turma', 'responsavel', 'ano_letivo']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" />
          Referência Rápida - Termos Educacionais
        </CardTitle>
        <CardDescription>
          Principais termos do sistema educacional brasileiro
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {commonTerms.map((term) => {
            const termData = BRAZILIAN_EDU_TERMS[term]
            return (
              <div key={term} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sm mb-1">{termData.title}</div>
                <div className="text-xs text-gray-600 leading-relaxed">{termData.description}</div>
                {termData.example && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {termData.example}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Export term keys for use in other components
export { BRAZILIAN_EDU_TERMS }
export type { TermKey }