'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Calendar, 
  History, 
  TrendingUp, 
  Clock,
  Star,
  Eye,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

const recentBooks = [
  {
    id: 1,
    title: 'Dom Casmurro',
    author: 'Machado de Assis',
    status: 'reading',
    progress: 65,
    dueDate: '2024-02-15',
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 2,
    title: 'O Cortiço',
    author: 'Aluísio Azevedo',
    status: 'reserved',
    dueDate: '2024-02-10',
    cover: 'https://images.pexels.com/photos/1301585/pexels-photo-1301585.jpeg?auto=compress&cs=tinysrgb&w=400'
  },
  {
    id: 3,
    title: 'Grande Sertão: Veredas',
    author: 'Guimarães Rosa',
    status: 'completed',
    completedDate: '2024-01-20',
    rating: 5,
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400'
  }
];

const quickStats = [
  {
    title: 'Livros Emprestados',
    value: '3',
    icon: BookOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    title: 'Reservas Ativas',
    value: '2',
    icon: Calendar,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Livros Lidos',
    value: '12',
    icon: History,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  {
    title: 'Meta de Leitura',
    value: '80%',
    icon: TrendingUp,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100'
  }
];

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reading':
        return <Badge className="bg-primary">Lendo</Badge>;
      case 'reserved':
        return <Badge className="bg-yellow-500">Reservado</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Bem-vinda, Ana!</h1>
          <p className="text-muted-foreground">
            Aqui está um resumo da sua atividade na biblioteca
          </p>
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
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Reading */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Meus Livros</CardTitle>
                  <CardDescription>
                    Acompanhe o progresso dos seus livros atuais
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/student/history">
                    Ver Todos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{book.title}</h4>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    {book.status === 'reading' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>Progresso</span>
                          <span>{book.progress}%</span>
                        </div>
                        <Progress value={book.progress} className="h-2" />
                      </div>
                    )}
                    {book.status === 'completed' && book.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < book.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(book.status)}
                    {book.dueDate && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="mr-1 h-3 w-3" />
                        {new Date(book.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Reading Goals & Quick Actions */}
          <div className="space-y-6">
            {/* Reading Goal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meta de Leitura 2024</CardTitle>
                <CardDescription>12 de 15 livros lidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={80} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">80% concluído</span>
                  <span className="font-medium">3 livros restantes</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você está à frente do cronograma! Continue assim! 📚
                </p>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/student/search">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Buscar Livros
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/student/reservations">
                    <Calendar className="mr-2 h-4 w-4" />
                    Ver Reservas
                  </Link>
                </Button>
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/dashboard/student/catalog">
                    <Eye className="mr-2 h-4 w-4" />
                    Explorar Catálogo
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
