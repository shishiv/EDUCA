'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3,
  Download,
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Star,
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const monthlyData = [
  { month: 'Jan', emprestimos: 65, devolucoes: 59, reservas: 23, multas: 120 },
  { month: 'Fev', emprestimos: 78, devolucoes: 71, reservas: 31, multas: 95 },
  { month: 'Mar', emprestimos: 82, devolucoes: 76, reservas: 28, multas: 110 },
  { month: 'Abr', emprestimos: 91, devolucoes: 85, reservas: 35, multas: 85 },
  { month: 'Mai', emprestimos: 88, devolucoes: 82, reservas: 32, multas: 75 },
  { month: 'Jun', emprestimos: 95, devolucoes: 89, reservas: 38, multas: 60 }
];

const categoryData = [
  { name: 'Literatura Brasileira', value: 35, color: '#2563EB' },
  { name: 'Romance', value: 25, color: '#7C3AED' },
  { name: 'Ficção', value: 20, color: '#059669' },
  { name: 'História', value: 12, color: '#DC2626' },
  { name: 'Outros', value: 8, color: '#D97706' }
];

const userTypeData = [
  { type: 'Estudantes', total: 156, active: 142, percentage: 91 },
  { type: 'Professores', total: 23, active: 21, percentage: 91 },
  { type: 'Bibliotecários', total: 3, active: 3, percentage: 100 }
];

const topBooks = [
  {
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    loans: 45,
    rating: 4.5,
    category: 'Literatura Brasileira'
  },
  {
    title: 'Capitães da Areia',
    author: 'Jorge Amado',
    loans: 38,
    rating: 4.3,
    category: 'Literatura Brasileira'
  },
  {
    title: 'Vidas Secas',
    author: 'Graciliano Ramos',
    loans: 35,
    rating: 4.6,
    category: 'Literatura Brasileira'
  },
  {
    title: 'Iracema',
    author: 'José de Alencar',
    loans: 32,
    rating: 4.1,
    category: 'Romance'
  },
  {
    title: 'A Moreninha',
    author: 'Joaquim Manuel de Macedo',
    loans: 28,
    rating: 3.9,
    category: 'Romance'
  }
];

const overdueAnalysis = [
  { period: 'Última semana', count: 12, trend: 'down' },
  { period: 'Último mês', count: 45, trend: 'down' },
  { period: 'Últimos 3 meses', count: 156, trend: 'up' }
];

export default function LibrarianReports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('semester');
  const [reportType, setReportType] = useState('general');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const handleExportReport = () => {
    // Export logic would go here
    alert('Relatório exportado com sucesso!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Relatórios da Biblioteca</h1>
            <p className="text-muted-foreground">
              Análise completa das atividades e estatísticas da biblioteca
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="semester">Este Semestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="loans">Empréstimos</SelectItem>
                <SelectItem value="users">Usuários</SelectItem>
                <SelectItem value="inventory">Inventário</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExportReport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">2,847</p>
                <p className="text-sm text-muted-foreground">Total de Livros</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12 este mês
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">182</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +8 este mês
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-orange-100 mr-4">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">189</p>
                <p className="text-sm text-muted-foreground">Empréstimos Ativos</p>
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  -5 vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ 245</p>
                <p className="text-sm text-muted-foreground">Multas Pendentes</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-3 w-3" />
                  -15% vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Mensal</CardTitle>
              <CardDescription>
                Empréstimos, devoluções e reservas por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="emprestimos" fill="#2563EB" name="Empréstimos" />
                  <Bar dataKey="devolucoes" fill="#059669" name="Devoluções" />
                  <Bar dataKey="reservas" fill="#7C3AED" name="Reservas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Categoria</CardTitle>
              <CardDescription>
                Empréstimos por categoria de livro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* User Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Usuários</CardTitle>
            <CardDescription>
              Distribuição e atividade por tipo de usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userTypeData.map((userType, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{userType.type}</h4>
                    <Badge variant="outline">{userType.percentage}% ativo</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span className="font-medium">{userType.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ativos:</span>
                      <span className="font-medium text-green-600">{userType.active}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Books */}
          <Card>
            <CardHeader>
              <CardTitle>Livros Mais Emprestados</CardTitle>
              <CardDescription>
                Ranking dos livros mais populares
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topBooks.map((book, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{book.title}</h4>
                        <p className="text-xs text-muted-foreground">{book.author}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline" className="text-xs">{book.category}</Badge>
                      <div className="text-center">
                        <p className="font-medium">{book.loans}</p>
                        <p className="text-xs text-muted-foreground">empréstimos</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{book.rating}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overdue Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Atrasos</CardTitle>
              <CardDescription>
                Tendências de livros em atraso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueAnalysis.map((period, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{period.period}</h4>
                        <p className="text-sm text-muted-foreground">Livros em atraso</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{period.count}</span>
                      {getTrendIcon(period.trend)}
                    </div>
                  </div>
                ))}
                
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Recomendações</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Enviar lembretes automáticos 3 dias antes do vencimento</li>
                    <li>• Implementar sistema de notificações por SMS</li>
                    <li>• Revisar política de renovações</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro</CardTitle>
            <CardDescription>
              Multas e taxas coletadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${value}`, 'Multas']} />
                <Line 
                  type="monotone" 
                  dataKey="multas" 
                  stroke="#DC2626" 
                  strokeWidth={2}
                  name="Multas (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}