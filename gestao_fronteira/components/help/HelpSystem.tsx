/**
 * Enhanced Help System with Documentation and Step-by-Step Guides
 * Comprehensive Brazilian educational context help system
 * Searchable documentation with video tutorials
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  BookOpen,
  Play,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Star,
  Clock,
  Users,
  Shield,
  AlertTriangle,
  CheckCircle,
  Smartphone,
  Monitor,
  Download,
  Phone,
  Mail,
  MessageCircle,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpArticle {
  id: string
  title: string
  description: string
  content: string
  category: string
  tags: string[]
  difficulty: 'basic' | 'intermediate' | 'advanced'
  estimatedTime: string
  videoUrl?: string
  lastUpdated: string
  featured?: boolean
  steps?: Array<{
    title: string
    description: string
    image?: string
    code?: string
  }>
}

interface HelpCategory {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  color: string
}

interface HelpSystemProps {
  onClose: () => void
  initialSection?: string
  searchQuery?: string
}

const helpCategories: HelpCategory[] = [
  {
    id: 'abrir-aula',
    name: 'Abrir Aula',
    icon: <Play className="h-4 w-4" />,
    description: 'Como criar e gerenciar sessões de aula',
    color: 'bg-blue-500'
  },
  {
    id: 'frequencia',
    name: 'Chamada',
    icon: <Users className="h-4 w-4" />,
    description: 'Marcar presença e ausência dos alunos',
    color: 'bg-green-500'
  },
  {
    id: 'compliance',
    name: 'Conformidade Legal',
    icon: <Shield className="h-4 w-4" />,
    description: 'Normas educacionais brasileiras',
    color: 'bg-purple-500'
  },
  {
    id: 'troubleshooting',
    name: 'Solução de Problemas',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Resolvendo erros e dificuldades',
    color: 'bg-orange-500'
  },
  {
    id: 'mobile',
    name: 'Uso Mobile',
    icon: <Smartphone className="h-4 w-4" />,
    description: 'Otimização para tablets e celulares',
    color: 'bg-indigo-500'
  },
  {
    id: 'reports',
    name: 'Relatórios',
    icon: <FileText className="h-4 w-4" />,
    description: 'Gerar e exportar relatórios',
    color: 'bg-teal-500'
  }
]

const helpArticles: HelpArticle[] = [
  {
    id: 'como-abrir-aula',
    title: 'Como Abrir uma Aula',
    description: 'Passo a passo para criar e abrir uma sessão de aula',
    content: `
## Como Abrir uma Aula

### Visão Geral
O sistema de "Abrir Aula" segue as normas educacionais brasileiras, implementando um fluxo de três fases: **PLANEJADA** → **ABERTA** → **FECHADA**.

### Passo a Passo

#### 1. Criar Nova Sessão
1. Acesse o painel da sua turma
2. Clique em **"Criar Nova Sessão"**
3. Verifique se a data está correta
4. Confirme a disciplina (se aplicável)

#### 2. Abrir a Aula
1. Após criar, clique em **"Abrir Aula"**
2. A sessão mudará para status **ABERTA**
3. O timer de fechamento automático será iniciado (18h horário de São Paulo)

#### 3. Realizar a Chamada
1. Use a grade de alunos para marcar presença/falta
2. Clique em **P** para presente ou **F** para falta
3. Use seleção múltipla para marcar vários alunos de uma vez

#### 4. Fechar a Aula
1. Clique em **"Fechar Aula"**
2. Informe o conteúdo ministrado (obrigatório)
3. Confirme o fechamento

### ⚠️ Importante
- Após fechada, a aula **não pode** ser modificada (princípio "não existe o esquecer")
- Aulas são fechadas automaticamente às 18h (horário de São Paulo)
- Cada turma pode ter apenas uma sessão por dia
    `,
    category: 'abrir-aula',
    tags: ['básico', 'workflow', 'sessão'],
    difficulty: 'basic',
    estimatedTime: '5 min',
    videoUrl: '/videos/como-abrir-aula.mp4',
    lastUpdated: '2025-09-26',
    featured: true,
    steps: [
      {
        title: 'Acessar Painel',
        description: 'Navegue até o painel da turma desejada'
      },
      {
        title: 'Criar Sessão',
        description: 'Clique no botão "Criar Nova Sessão"'
      },
      {
        title: 'Abrir Aula',
        description: 'Clique em "Abrir Aula" para iniciar a chamada'
      },
      {
        title: 'Marcar Presença',
        description: 'Use os botões P/F para marcar presença dos alunos'
      },
      {
        title: 'Fechar Aula',
        description: 'Informe o conteúdo e feche a sessão'
      }
    ]
  },
  {
    id: 'chamada-rapida',
    title: 'Chamada Rápida e Eficiente',
    description: 'Técnicas para marcar presença rapidamente',
    content: `
## Chamada Rápida e Eficiente

### Técnicas de Marcação Rápida

#### Seleção Múltipla
1. Use as caixas de seleção ao lado dos nomes
2. Selecione vários alunos
3. Clique em "Marcar Presentes" ou "Marcar Ausentes"

#### Botões de Ação Rápida
- **Selecionar Não Marcados**: Seleciona apenas alunos sem presença marcada
- **Limpar Seleção**: Remove todas as seleções

#### Busca de Alunos
- Use a barra de busca para encontrar alunos específicos
- Digite parte do nome para filtrar a lista

### 🎯 Dicas de Performance
- O sistema suporta até 50 marcações simultâneas
- Tempo objetivo: menos de 1 segundo por aluno
- Use tablets em modo paisagem para melhor visualização

### ⚡ Atalhos do Teclado
- **Enter**: Confirmar marcação
- **Espaço**: Alternar seleção
- **Esc**: Limpar seleções
    `,
    category: 'frequencia',
    tags: ['eficiência', 'atalhos', 'performance'],
    difficulty: 'intermediate',
    estimatedTime: '3 min',
    lastUpdated: '2025-09-26'
  },
  {
    id: 'compliance-legal',
    title: 'Conformidade Legal Brasileira',
    description: 'Entenda as normas educacionais implementadas',
    content: `
## Conformidade Legal Brasileira

### Princípio "Não Existe o Esquecer"
Este é o princípio fundamental do sistema:
- **Registros não podem ser alterados** após o fechamento da aula
- **Hash criptográfico** garante a integridade dos dados
- **Trilha de auditoria** completa para todos os eventos

### Horário Oficial
- Fechamento automático às **18h (horário de São Paulo)**
- Timezone oficial: **America/Sao_Paulo**
- Avisos são exibidos próximo ao horário limite

### Documentação Legal
- Cada sessão gera um **hash SHA-256** único
- Registros são **documentos oficiais** para fins legais
- **Auditoria completa** de todas as ações

### Direitos do Aluno
- Transparência nos registros de frequência
- Acesso aos próprios dados (via responsáveis)
- Conformidade com LGPD

### Para Diretores e Secretários
- Visibilidade completa das sessões da escola
- Relatórios de conformidade
- Alertas de não conformidade

### 📋 Checklist de Conformidade
- [ ] Aula aberta no horário correto
- [ ] Chamada realizada e registrada
- [ ] Conteúdo ministrado documentado
- [ ] Aula fechada dentro do prazo
- [ ] Hash de integridade gerado
    `,
    category: 'compliance',
    tags: ['legal', 'auditoria', 'brasil'],
    difficulty: 'advanced',
    estimatedTime: '10 min',
    lastUpdated: '2025-09-26',
    featured: true
  },
  {
    id: 'problemas-comuns',
    title: 'Problemas Comuns e Soluções',
    description: 'Resolvendo erros e dificuldades do dia a dia',
    content: `
## Problemas Comuns e Soluções

### ❌ Não Consigo Criar Sessão
**Possíveis Causas:**
- Já existe uma sessão para esta turma hoje
- Data muito no futuro (máximo 30 dias)
- Permissões insuficientes

**Soluções:**
1. Verifique se já há sessão criada
2. Confirme a data selecionada
3. Entre em contato com a direção se persistir

### ❌ Botão "Abrir Aula" Não Aparece
**Possíveis Causas:**
- Sessão não foi criada
- Você não é o professor da turma
- Sessão já foi aberta

**Soluções:**
1. Crie uma nova sessão primeiro
2. Verifique se está na turma correta
3. Atualize a página

### ❌ Chamada Não Está Salvando
**Possíveis Causas:**
- Conexão com internet instável
- Sessão não está aberta
- Muitas marcações simultâneas

**Soluções:**
1. Verifique sua conexão
2. Confirme que a sessão está ABERTA
3. Marque presença de poucos alunos por vez

### ❌ Não Consigo Fechar a Aula
**Possíveis Causas:**
- Campo "Conteúdo Ministrado" vazio
- Sessão não está aberta
- Perda de conexão

**Soluções:**
1. Preencha o conteúdo ministrado
2. Verifique o status da sessão
3. Tente novamente após reconectar

### 📱 Problemas no Mobile/Tablet
**Otimizações:**
- Use em modo paisagem quando possível
- Certifique-se de que o zoom está em 100%
- Limpe o cache do navegador regularmente

### 🆘 Quando Buscar Ajuda
Entre em contato conosco se:
- O problema persistir após tentar as soluções
- Você receber mensagens de erro não documentadas
- Precisar recuperar dados perdidos
    `,
    category: 'troubleshooting',
    tags: ['erros', 'soluções', 'suporte'],
    difficulty: 'basic',
    estimatedTime: '8 min',
    lastUpdated: '2025-09-26',
    featured: true
  },
  {
    id: 'uso-tablet',
    title: 'Otimização para Tablet',
    description: 'Como usar o sistema em tablets e dispositivos móveis',
    content: `
## Otimização para Tablet

### 🔧 Configurações Recomendadas
- **Orientação**: Paisagem (horizontal)
- **Zoom**: 100% (padrão do navegador)
- **Navegador**: Chrome, Safari ou Firefox atualizados

### 📱 Interface Touch-Friendly
- **Botões grandes**: Mínimo 44px para toque fácil
- **Espaçamento adequado**: Evita toques acidentais
- **Feedback visual**: Animações confirmam ações

### ⚡ Gestos e Navegação
- **Toque simples**: Marcar presença/falta
- **Toque longo**: Selecionar múltiplos alunos
- **Arraste**: Navegação suave pela lista

### 🎯 Dicas de Uso
1. **Posicione o tablet horizontalmente**
2. **Use ambas as mãos** para marcação rápida
3. **Mantenha o tablet limpo** para melhor resposta ao toque
4. **Carregue antes das aulas** para evitar problemas

### 📊 Performance no Tablet
- **Tempo de resposta**: < 300ms por toque
- **Capacidade**: Até 50 alunos por tela
- **Sincronização**: Automática a cada ação

### 🔋 Economia de Bateria
- Sistema otimizado para baixo consumo
- Use modo escuro quando disponível
- Feche outras abas do navegador durante o uso

### 📶 Conectividade
- **Wi-Fi preferencial**: Para melhor estabilidade
- **4G/5G**: Funciona perfeitamente
- **Modo offline**: Limitado (apenas visualização)
    `,
    category: 'mobile',
    tags: ['tablet', 'touch', 'mobile'],
    difficulty: 'basic',
    estimatedTime: '6 min',
    lastUpdated: '2025-09-26'
  }
]

export function HelpSystem({
  onClose,
  initialSection = '',
  searchQuery = ''
}: HelpSystemProps) {
  const [activeTab, setActiveTab] = useState('articles')
  const [selectedCategory, setSelectedCategory] = useState(initialSection)
  const [searchTerm, setSearchTerm] = useState(searchQuery)
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  // Filter articles based on search and category
  const filteredArticles = useMemo(() => {
    let filtered = helpArticles

    if (selectedCategory) {
      filtered = filtered.filter(article => article.category === selectedCategory)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(term) ||
        article.description.toLowerCase().includes(term) ||
        article.tags.some(tag => tag.toLowerCase().includes(term)) ||
        article.content.toLowerCase().includes(term)
      )
    }

    return filtered.sort((a, b) => {
      // Featured articles first
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1

      // Then by difficulty (basic first)
      const difficultyOrder = { basic: 0, intermediate: 1, advanced: 2 }
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
    })
  }, [selectedCategory, searchTerm])

  // Toggle step expansion
  const toggleStep = (stepIndex: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepIndex)) {
      newExpanded.delete(stepIndex)
    } else {
      newExpanded.add(stepIndex)
    }
    setExpandedSteps(newExpanded)
  }

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              <DialogTitle className="text-xl font-bold">
                Central de Ajuda
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-80 border-r bg-muted/30 p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ajuda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Ações Rápidas
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('articles')
                  setSelectedCategory('abrir-aula')
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Como Abrir Aula
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('articles')
                  setSelectedCategory('troubleshooting')
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Problemas Comuns
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setActiveTab('contact')}
              >
                <Phone className="h-4 w-4 mr-2" />
                Falar com Suporte
              </Button>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Categorias
              </h3>
              <Button
                variant={!selectedCategory ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSelectedCategory('')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Todos os Artigos
              </Button>
              {helpCategories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className={cn("h-3 w-3 rounded-full mr-2", category.color)} />
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="w-full justify-start rounded-none border-b px-6">
                <TabsTrigger value="articles">Artigos</TabsTrigger>
                <TabsTrigger value="videos">Vídeos</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
              </TabsList>

              <TabsContent value="articles" className="flex-1 m-0">
                {selectedArticle ? (
                  // Article View
                  <div className="h-full flex flex-col">
                    <div className="p-6 border-b">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedArticle(null)}
                        className="mb-4"
                      >
                        <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                        Voltar aos artigos
                      </Button>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getDifficultyColor(selectedArticle.difficulty)}>
                            {selectedArticle.difficulty === 'basic' && 'Básico'}
                            {selectedArticle.difficulty === 'intermediate' && 'Intermediário'}
                            {selectedArticle.difficulty === 'advanced' && 'Avançado'}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {selectedArticle.estimatedTime}
                          </Badge>
                          {selectedArticle.featured && (
                            <Badge variant="default">
                              <Star className="h-3 w-3 mr-1" />
                              Destaque
                            </Badge>
                          )}
                        </div>

                        <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>
                        <p className="text-muted-foreground">{selectedArticle.description}</p>

                        {selectedArticle.videoUrl && (
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4 mr-2" />
                            Assistir Vídeo
                          </Button>
                        )}
                      </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                      {/* Step-by-step view */}
                      {selectedArticle.steps && (
                        <div className="space-y-4 mb-6">
                          <h2 className="text-lg font-semibold">Passo a Passo</h2>
                          {selectedArticle.steps.map((step, index) => (
                            <Card key={index} className="border-l-4 border-l-primary">
                              <CardHeader
                                className="cursor-pointer pb-2"
                                onClick={() => toggleStep(index)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                      {index + 1}
                                    </div>
                                    <CardTitle className="text-base">{step.title}</CardTitle>
                                  </div>
                                  {expandedSteps.has(index) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </div>
                              </CardHeader>

                              {expandedSteps.has(index) && (
                                <CardContent className="pt-0">
                                  <p className="text-muted-foreground">{step.description}</p>
                                  {step.code && (
                                    <pre className="mt-2 p-3 bg-muted rounded-md text-sm overflow-x-auto">
                                      <code>{step.code}</code>
                                    </pre>
                                  )}
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Article content */}
                      <div className="prose prose-sm max-w-none">
                        <div dangerouslySetInnerHTML={{
                          __html: selectedArticle.content.replace(/\n/g, '<br />')
                        }} />
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  // Articles List
                  <ScrollArea className="h-full p-6">
                    <div className="space-y-4">
                      {/* Category description */}
                      {selectedCategory && (
                        <div className="mb-6">
                          {(() => {
                            const category = helpCategories.find(c => c.id === selectedCategory)
                            return category ? (
                              <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center text-white", category.color)}>
                                  {category.icon}
                                </div>
                                <div>
                                  <h2 className="text-lg font-semibold">{category.name}</h2>
                                  <p className="text-muted-foreground">{category.description}</p>
                                </div>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}

                      {/* Search results info */}
                      {searchTerm && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">
                            {filteredArticles.length} resultado(s) para "{searchTerm}"
                          </p>
                        </div>
                      )}

                      {/* Articles grid */}
                      {filteredArticles.length > 0 ? (
                        <div className="grid gap-4">
                          {filteredArticles.map(article => (
                            <Card
                              key={article.id}
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => setSelectedArticle(article)}
                            >
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                      {article.featured && (
                                        <Badge variant="default" className="text-xs">
                                          <Star className="h-3 w-3 mr-1" />
                                          Destaque
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {article.estimatedTime}
                                      </Badge>
                                      <Badge className={cn("text-xs", getDifficultyColor(article.difficulty))}>
                                        {article.difficulty === 'basic' && 'Básico'}
                                        {article.difficulty === 'intermediate' && 'Intermediário'}
                                        {article.difficulty === 'advanced' && 'Avançado'}
                                      </Badge>
                                    </div>
                                    <CardTitle className="text-lg">{article.title}</CardTitle>
                                    <CardDescription className="mt-1">
                                      {article.description}
                                    </CardDescription>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
                                </div>
                              </CardHeader>

                              <CardContent className="pt-0">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-wrap gap-1">
                                    {article.tags.slice(0, 3).map(tag => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>

                                  {article.videoUrl && (
                                    <div className="flex items-center text-xs text-muted-foreground">
                                      <Play className="h-3 w-3 mr-1" />
                                      Vídeo
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Nenhum artigo encontrado</h3>
                          <p className="text-muted-foreground mb-4">
                            Tente alterar os filtros ou termos de busca.
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSearchTerm('')
                              setSelectedCategory('')
                            }}
                          >
                            Limpar Filtros
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="videos" className="flex-1 m-0 p-6">
                <div className="text-center py-12">
                  <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Vídeos Tutoriais</h3>
                  <p className="text-muted-foreground mb-4">
                    Esta seção estará disponível em breve com vídeos explicativos.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="faq" className="flex-1 m-0 p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-bold">Perguntas Frequentes</h2>

                  <div className="space-y-3">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Posso modificar a presença depois de fechar a aula?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Não. Seguindo o princípio educacional brasileiro "não existe o esquecer",
                          os registros se tornam imutáveis após o fechamento da aula.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">O que acontece se eu esquecer de fechar a aula?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          O sistema fecha automaticamente todas as aulas às 18h (horário de São Paulo).
                          Você receberá avisos próximo a este horário.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Posso usar o sistema no meu tablet?</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          Sim! O sistema foi otimizado especialmente para tablets.
                          Recomendamos usar em modo paisagem para melhor experiência.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="flex-1 m-0 p-6">
                <div className="space-y-6">
                  <h2 className="text-xl font-bold">Entre em Contato</h2>

                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Phone className="h-5 w-5" />
                          <span>Suporte Telefônico</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-2">
                          Ligue para nossa central de atendimento
                        </p>
                        <p className="font-semibold">(38) 3423-1234</p>
                        <p className="text-sm text-muted-foreground">
                          Segunda a Sexta: 8h às 17h
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Mail className="h-5 w-5" />
                          <span>E-mail</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-2">
                          Envie sua dúvida por e-mail
                        </p>
                        <p className="font-semibold">suporte@fronteira.mg.gov.br</p>
                        <p className="text-sm text-muted-foreground">
                          Respondemos em até 24 horas
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <MessageCircle className="h-5 w-5" />
                          <span>Chat Online</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-4">
                          Converse conosco em tempo real
                        </p>
                        <Button>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Iniciar Chat
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}