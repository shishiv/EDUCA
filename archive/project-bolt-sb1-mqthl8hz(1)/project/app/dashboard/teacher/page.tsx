'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Users, 
  FileText, 
  Star,
  TrendingUp,
  Plus,
  ArrowRight,
  GraduationCap,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

const quickStats = [
  {
    title: 'Listas de Leitura',
    value: '8',
    change: '+2 este mês',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  {
    title: 'Alunos Ativos',
    value: '124',
    change: '3 turmas',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Recomendações',
    value: '23',
    change: '15 este mês',
    icon: Star,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  },
  {
    title: 'Taxa de Leitura',
    value: '78%',
    change: '+12% vs anterior',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
];

const readingLists = [
  {
    id: 1,
    title: 'Literatura Brasileira - 3º Ano',
    books: 12,
    students: 35,
    completion: 68,
    status: 'active'
  },
  {
    id: 2,
    title: 'Clássicos Universais - 2º Ano',
    books: 8,
    students: 28,
    completion: 82,
    status: 'active'
  },
  {
    id: 3,
    title: 'Poesia Moderna - 1º Ano',
    books: 6,
    students: 32,
    completion: 45,
    status: 'draft'
  }
];

const recommendedBooks = [
  {
    id: 1,
    title: 'Vidas Secas',
    author: 'Graciliano Ramos',
    grade: '2º Ano',
    category: 'Literatura Brasileira',
    rating: 4.8,
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 2,
    title: 'O Quinze',
    author: 'Rachel de Queiroz',
    grade: '3º Ano',
    category: 'Literatura Brasileira',
    rating: 4.6,
    cover: 'https://images.pexels.com/photos/1301585/pexels-photo-1301585.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 3,
    title: 'A Moreninha',
    author: 'Joaquim Manuel de Macedo',
    grade: '1º Ano',
    category: 'Romance',
    rating: 4.3,
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

const classProgress = [
  {
    class: '1º Ano A',
    students: 32,
    activeReaders: 28,
    averageBooks: 3.2,
    completion: 87
  },
  {
    class: '2º Ano B',
    students: 28,
    activeReaders: 25,
    averageBooks: 4.1,
    completion: 89
  },
  {
    class: '3º Ano C',
    students: 35,
    activeReaders: 30,
    averageBooks: 2.8,
    completion: 86
  }
];

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Painel do Professor</h1>
            <p className="text-muted-foreground">
              Gerencie listas de leitura e acompanhe o progresso dos alunos
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/teacher/reading-lists">
              <Plus className="mr-2 h-4 w-4" />
              Nova Lista de Leitura
            </Link>
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="transition-all hover:shadow-md">
                <CardContent className="flex items-center p-6">
                  <div className={`p-3 rounded-full ${stat.bgColor} mr-4`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reading Lists */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Listas de Leitura</CardTitle>
                  <CardDescription>
                    Gerencie as listas de leitura das suas turmas
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/teacher/reading-lists">
                    Ver Todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {readingLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <h4 className="font-medium">{list.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{list.books} livros</span>
                      <span>{list.students} alunos</span>
                      <span>{list.completion}% concluído</span>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(list.status)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/teacher/recommendations">
                  <Star className="mr-2 h-4 w-4" />
                  Fazer Recomendação
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/teacher/reading-lists">
                  <FileText className="mr-2 h-4 w-4" />
                  Criar Lista
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/teacher/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Relatórios
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/teacher/catalog">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Explorar Catálogo
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommended Books */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Livros Recomendados</CardTitle>
                  <CardDescription>
                    Suas últimas recomendações para os alunos
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/teacher/recommendations">
                    Ver Todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center space-x-4 p-3 rounded-lg border"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{book.title}</h4>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {book.grade}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{book.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Class Progress */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Progresso das Turmas</CardTitle>
                  <CardDescription>
                    Acompanhe o desempenho de leitura por turma
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/teacher/reports">
                    Relatório Completo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {classProgress.map((classData, index) => (
                <div
                  key={index}
                  className="space-y-2 p-3 rounded-lg border"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      {classData.class}
                    </h4>
                    <Badge variant="outline">{classData.completion}%</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span>Alunos: {classData.students}</span>
                    </div>
                    <div>
                      <span>Leitores: {classData.activeReaders}</span>
                    </div>
                    <div className="col-span-2">
                      <span>Média de livros: {classData.averageBooks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}