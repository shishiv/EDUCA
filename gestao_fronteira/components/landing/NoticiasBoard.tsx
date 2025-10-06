import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Calendar, Pin, TrendingUp } from 'lucide-react'

// Dados mock - futuramente virão do banco de dados
const avisos = [
  {
    id: 1,
    tipo: 'urgente',
    titulo: 'Início do Ano Letivo 2025',
    descricao: 'As aulas da rede municipal iniciarão no dia 03 de fevereiro de 2025. Todos os professores devem comparecer à reunião pedagógica no dia 30/01.',
    data: '2025-01-20',
    fixado: true
  },
  {
    id: 2,
    tipo: 'info',
    titulo: 'Censo Escolar 2025 - Prazo Estendido',
    descricao: 'O prazo para atualização dos dados do Censo Escolar foi estendido até 15 de fevereiro. Diretores, favor verificar todos os dados cadastrais dos alunos.',
    data: '2025-01-18',
    fixado: true
  },
  {
    id: 3,
    tipo: 'info',
    titulo: 'Capacitação: Uso do Sistema de Gestão',
    descricao: 'Será realizada capacitação para todos os professores sobre o uso do sistema de frequência digital. Data: 25/01 às 14h no auditório da SME.',
    data: '2025-01-15',
    fixado: false
  },
  {
    id: 4,
    tipo: 'sucesso',
    titulo: 'IDEB 2024 - Resultados Positivos',
    descricao: 'Fronteira alcançou a meta do IDEB com nota 6.2 nos anos iniciais. Parabéns a todos os profissionais da educação!',
    data: '2025-01-10',
    fixado: false
  },
  {
    id: 5,
    tipo: 'info',
    titulo: 'Manutenção Programada do Sistema',
    descricao: 'O sistema ficará indisponível para manutenção no dia 27/01 das 22h às 2h. Planeje suas atividades considerando este período.',
    data: '2025-01-12',
    fixado: false
  }
]

const tipoConfig = {
  urgente: {
    color: 'bg-red-100 text-red-700 border-red-200',
    badgeVariant: 'destructive' as const,
    label: 'Urgente',
    icon: Bell
  },
  info: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeVariant: 'default' as const,
    label: 'Informação',
    icon: TrendingUp
  },
  sucesso: {
    color: 'bg-green-100 text-green-700 border-green-200',
    badgeVariant: 'outline' as const,
    label: 'Boa Notícia',
    icon: TrendingUp
  }
}

export function NoticiasBoard() {
  const formatarData = (dataString: string) => {
    const data = new Date(dataString + 'T00:00:00')
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const avisosFixados = avisos.filter(a => a.fixado)
  const outrosAvisos = avisos.filter(a => !a.fixado)

  return (
    <div className="space-y-6">
      {/* Header do Quadro de Avisos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Bell className="h-6 w-6 text-blue-600" />
                Avisos e Notícias
              </CardTitle>
              <CardDescription className="mt-1">
                Informações importantes da Secretaria Municipal de Educação
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Avisos Fixados */}
      {avisosFixados.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Pin className="h-4 w-4" />
            Avisos Fixados
          </div>
          {avisosFixados.map((aviso) => {
            const config = tipoConfig[aviso.tipo as keyof typeof tipoConfig]
            const IconComponent = config.icon

            return (
              <Card key={aviso.id} className={`border-l-4 ${config.color}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {config.label}
                        </Badge>
                        {aviso.fixado && (
                          <Pin className="h-3.5 w-3.5 text-gray-500" />
                        )}
                      </div>
                      <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                    </div>
                    <IconComponent className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {aviso.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatarData(aviso.data)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Outros Avisos */}
      {outrosAvisos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Bell className="h-4 w-4" />
            Avisos Recentes
          </div>
          {outrosAvisos.map((aviso) => {
            const config = tipoConfig[aviso.tipo as keyof typeof tipoConfig]
            const IconComponent = config.icon

            return (
              <Card key={aviso.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Badge variant={config.badgeVariant} className="text-xs mb-2">
                        {config.label}
                      </Badge>
                      <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                    </div>
                    <IconComponent className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    {aviso.descricao}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatarData(aviso.data)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty State (caso não haja avisos) */}
      {avisos.length === 0 && (
        <Card className="py-12">
          <CardContent className="text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum aviso no momento</p>
            <p className="text-sm text-gray-400 mt-1">
              Novos avisos aparecerão aqui quando publicados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
