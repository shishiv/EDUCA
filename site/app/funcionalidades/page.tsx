import type { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Smartphone,
  FileText,
  ClipboardList,
  Heart,
  BarChart3,
  BookOpen,
  Calendar,
  Shield,
  Globe,
  School,
  UserCheck,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Funcionalidades — EDUCA',
  description:
    'Conheça todas as funcionalidades do EDUCA: gestão de alunos, chamada digital, boletim, matrículas, Bolsa Família e relatórios.',
}

const featureSections = [
  {
    title: 'Gestão de Alunos',
    icon: Users,
    items: [
      'Cadastro completo com dados pessoais, endereço, contatos',
      'Histórico escolar por aluno',
      'Fotos e documentos anexados',
      'Busca avançada por nome, turma, escola',
      'Exportação de dados para sistemas municipais',
    ],
  },
  {
    title: 'Chamada Digital',
    icon: Smartphone,
    items: [
      'Registro de presença via tablet, celular ou computador',
      'Modo offline para salas sem internet',
      'Sincronização automática quando online',
      'Múltiplos tipos de ausência: justificada, não justificada',
      'Relatório de frequência por período',
    ],
  },
  {
    title: 'Boletim Escolar',
    icon: FileText,
    items: [
      'Boletins digitais com notas e frequência',
      'Acesso para pais e responsáveis via portal',
      'Média por disciplina e período',
      'Observações pedagógicas por aluno',
      'Impressão e exportação em PDF',
    ],
  },
  {
    title: 'Matrículas',
    icon: ClipboardList,
    items: [
      'Rematrícula automática de alunos existentes',
      'Controle de vagas por turma e escola',
      'Transferências entre escolas do município',
      'Documentação digitalizada',
      'Relatório de alunos matriculados por período',
    ],
  },
  {
    title: 'Bolsa Família',
    icon: Heart,
    items: [
      'Controle de frequência para condicionalidades',
      'Relatórios mensais prontos para o MEC',
      'Alertas de alunos em risco de desligamento',
      'Histórico de frequência por beneficiário',
      'Exportação no formato exigido pelo governo federal',
    ],
  },
  {
    title: 'Relatórios INEP',
    icon: BarChart3,
    items: [
      'Relatórios para o Censo Escolar',
      'Indicadores educacionais por escola e município',
      'Taxa de aprovação, reprovação e abandono',
      'Distorção idade-série',
      'Exportação nos formatos exigidos pelo INEP/MEC',
    ],
  },
  {
    title: 'Diário de Classe',
    icon: BookOpen,
    items: [
      'Registro de conteúdos e atividades por aula',
      'Plano de aula integrado',
      'Observações pedagógicas por turma',
      'Acompanhamento do currículo BNCC',
    ],
  },
  {
    title: 'Calendário Escolar',
    icon: Calendar,
    items: [
      'Calendário letivo por escola e município',
      'Feriados, recessos e eventos',
      'Períodos de avaliação e recuperação',
      'Notificações automáticas',
    ],
  },
  {
    title: 'Segurança e LGPD',
    icon: Shield,
    items: [
      'Controle de acesso por papel (admin, diretor, professor, secretaria)',
      'Logs de auditoria de todas as operações',
      'Dados isolados por município (multi-tenant)',
      'Criptografia em repouso e em trânsito',
      'Conformidade com a Lei Geral de Proteção de Dados',
    ],
  },
  {
    title: 'Multi-tenant',
    icon: Globe,
    items: [
      'Cada município com seus dados isolados',
      'Infraestrutura compartilhada, dados privados',
      'Customizações por tenant',
      'Escalabilidade horizontal',
    ],
  },
  {
    title: 'Gestão de Escolas',
    icon: School,
    items: [
      'Cadastro completo de escolas da rede municipal',
      'Alocação de turmas por escola',
      'Atribuição de professores e diretores',
      'Relatórios por unidade escolar',
    ],
  },
  {
    title: 'Portal do Responsável',
    icon: UserCheck,
    items: [
      'Acesso para pais e responsáveis',
      'Consulta de notas e frequência',
      'Comunicados da escola',
      'Solicitação de documentos',
    ],
  },
]

export default function FuncionalidadesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Funcionalidades
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          O EDUCA oferece um conjunto completo de ferramentas para gestão
          escolar municipal, do dia a dia da sala de aula aos relatórios
          exigidos pelo governo federal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {featureSections.map((section) => (
          <Card key={section.title} className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <section.icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
