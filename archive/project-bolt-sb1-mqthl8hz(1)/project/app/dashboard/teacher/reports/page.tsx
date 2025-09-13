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
  GraduationCap,
  Star,
  Clock
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const monthlyReadingData = [
  { month: 'Jan', '1º Ano': 45, '2º Ano': 38, '3º Ano': 52 },
  { month: 'Fev', '1º Ano': 52, '2º Ano': 41, '3º Ano': 48 },
  { month: 'Mar', '1º Ano': 48, '2º Ano': 45, '3º Ano': 55 },
  { month: 'Abr', '1º Ano': 61, '2º Ano': 52, '3º Ano': 49 },
  { month: 'Mai', '1º Ano': 55, '2º Ano': 48, '3º Ano': 58 },
  { month: 'Jun', '1º Ano': 67, '2º Ano': 55, '3º Ano': 62 }
];

const genreDistribution = [
  { name: 'Literatura Brasileira', value: 35, color: '#2563EB' },
  { name: 'Romance', value: 25, color: '#7C3AED' },
  { name: 'Ficção', value: 20, color: '#059669' },
  { name: 'Poesia', value: 12, color: '#DC2626' },
  { name: 'Outros', value: 8, color: '#D97706' }
];

const classPerformance = [
  {
    class: '1º Ano A',
    students: 32,
    booksRead: 156,
    averageRating: 4.2,
    completion: 87,
    trend: 'up'
  },
  {
    class: '1º Ano B',
    students: 30,
    booksRead: 142,
    averageRating: 4.0,
    completion: 82,
    trend: 'up'
  },
  {
    class: '2º Ano A',
    students: 28,
    booksRead: 168,
    averageRating: 4.4,
    completion: 89,
    trend: 'up'
  },
  {
    class: '2º Ano B',
    students: 29,
    booksRead: 151,
    averageRating: 4.1,
    completion: 85,
    trend: 'down'
  },
  {
    class: '3º Ano A',
    students: 35,
    booksRead: 189,
    averageRating: 4.3,
    completion: 86,
    trend: 'up'
  },
  {
    class: '3º Ano B',
    students: 33,
    booksRead: 172,
    averageRating: 4.2,
    completion: 84,
    trend: 'stable'
  }
];

const topBooks = [
  {
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    reads: 45,
    rating: 4.5,
    grade: '3º Ano'
  },
  {
    title: 'Capitães da Areia',
    author: 'Jorge Amado',
    reads: 38,
    rating: 4.3,
    grade: '2º Ano'
  },
  {
    title: 'Iracema',
    author: 'José de Alencar',
    reads: 35,
    rating: 4.1,
    grade: '1º Ano'
  },
  {
    title: 'Vidas Secas',
    author: 'Graciliano Ramos',
    reads: 32,
    rating: 4.6,
    grade: '2º Ano'
  },
  {
    title: 'A Moreninha',
    author: 'Joaquim Manuel de Macedo',
    reads: 28,
    rating: 3.9,
    grade: '1º Ano'
  }
];

export default function TeacherReports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('semester');
  const [selectedGrade, setSelectedGrade] = useState('all');

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
            <h1 className="text-3xl font-bold">Relatórios de Leitura</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho e progresso dos alunos
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="semester">Este Semestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
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
              <div className="p-3 rounded-full bg-primary/10 mr-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">187</p>
                <p className="text-sm text-muted-foreground">Total de Alunos</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +5% vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">978</p>
                <p className="text-sm text-muted-foreground">Livros Lidos</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +12% vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">4.2</p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +0.3 vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">86%</p>
                <p className="text-sm text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +8% vs mês anterior
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Reading Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Mensal por Série</CardTitle>
              <CardDescription>
                Livros lidos por mês em cada série
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyReadingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="1º Ano" fill="#2563EB" name="1º Ano" />
                  <Bar dataKey="2º Ano" fill="#7C3AED" name="2º Ano" />
                  <Bar dataKey="3º Ano" fill="#059669" name="3º Ano" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Genre Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Gênero</CardTitle>
              <CardDescription>
                Preferências de leitura dos alunos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genreDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {genreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Class Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Turma</CardTitle>
            <CardDescription>
              Estatísticas detalhadas de cada turma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {classPerformance.map((classData, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{classData.class}</h4>
                      <p className="text-sm text-muted-foreground">
                        {classData.students} alunos
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-medium">{classData.booksRead}</p>
                      <p className="text-muted-foreground">Livros Lidos</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{classData.averageRating}</p>
                      <p className="text-muted-foreground">Avaliação Média</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium">{classData.completion}%</p>
                      <p className="text-muted-foreground">Conclusão</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(classData.trend)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Books */}
        <Card>
          <CardHeader>
            <CardTitle>Livros Mais Lidos</CardTitle>
            <CardDescription>
              Ranking dos livros mais populares entre os alunos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topBooks.map((book, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{book.title}</h4>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <Badge variant="outline">{book.grade}</Badge>
                    <div className="text-center">
                      <p className="font-medium">{book.reads}</p>
                      <p className="text-muted-foreground">Leituras</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{book.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
