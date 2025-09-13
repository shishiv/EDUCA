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
  Calendar, 
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const monthlyData = [
  { month: 'Jan', emprestimos: 65, devolucoes: 59 },
  { month: 'Fev', emprestimos: 78, devolucoes: 71 },
  { month: 'Mar', emprestimos: 82, devolucoes: 76 },
  { month: 'Abr', emprestimos: 91, devolucoes: 85 },
  { month: 'Mai', emprestimos: 88, devolucoes: 82 },
  { month: 'Jun', emprestimos: 95, devolucoes: 89 }
];

const quickStats = [
  {
    title: 'Total de Livros',
    value: '2,847',
    change: '+12 este mês',
    icon: BookOpen,
    color: 'text-primary',
    bgColor: 'bg-primary/10'
  },
  {
    title: 'Usuários Ativos',
    value: '456',
    change: '+23 este mês',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  {
    title: 'Empréstimos Ativos',
    value: '189',
    change: '8 vencendo hoje',
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    urgent: true
  },
  {
    title: 'Taxa de Ocupação',
    value: '87%',
    change: '+5% vs mês anterior',
    icon: TrendingUp,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  }
];

const pendingReturns = [
  {
    id: 1,
    student: 'Ana Silva',
    book: 'Dom Casmurro',
    dueDate: '2024-02-08',
    daysOverdue: 2,
    contact: 'ana.silva@email.com'
  },
  {
    id: 2,
    student: 'Carlos Santos',
    book: 'O Cortiço',
    dueDate: '2024-02-10',
    daysOverdue: 0,
    contact: 'carlos.santos@email.com'
  },
  {
    id: 3,
    student: 'Maria Oliveira',
    book: 'Capitães da Areia',
    dueDate: '2024-02-12',
    daysOverdue: -2,
    contact: 'maria.oliveira@email.com'
  }
];

const recentReservations = [
  {
    id: 1,
    student: 'Pedro Costa',
    book: 'Grande Sertão: Veredas',
    requestDate: '2024-02-08',
    status: 'pending'
  },
  {
    id: 2,
    student: 'Lucia Ferreira',
    book: 'Memórias Póstumas de Brás Cubas',
    requestDate: '2024-02-09',
    status: 'ready'
  },
  {
    id: 3,
    student: 'João Almeida',
    book: 'Iracema',
    requestDate: '2024-02-10',
    status: 'pending'
  }
];

export default function LibrarianDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getReturnStatus = (daysOverdue: number) => {
    if (daysOverdue > 0) {
      return <Badge variant="destructive">Atrasado {daysOverdue}d</Badge>;
    } else if (daysOverdue === 0) {
      return <Badge className="bg-yellow-500">Vence Hoje</Badge>;
    } else {
      return <Badge variant="outline">Vence em {Math.abs(daysOverdue)}d</Badge>;
    }
  };

  const getReservationStatus = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-500">Pronto</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
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
            <h1 className="text-3xl font-bold">Painel do Bibliotecário</h1>
            <p className="text-muted-foreground">
              Gerencie a biblioteca e monitore as atividades
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/librarian/add-book">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Livro
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
                    <p className={`text-xs mt-1 ${stat.urgent ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                      {stat.change}
                    </p>
                  </div>
                  {stat.urgent && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly Activity Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Atividade Mensal</CardTitle>
              <CardDescription>
                Empréstimos e devoluções nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="emprestimos" fill="#1E40AF" name="Empréstimos" />
                  <Bar dataKey="devolucoes" fill="#2563EB" name="Devoluções" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/librarian/returns">
                  <Clock className="mr-2 h-4 w-4" />
                  Processar Devoluções
                  <Badge className="ml-auto bg-orange-500">3</Badge>
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/librarian/reservations">
                  <Calendar className="mr-2 h-4 w-4" />
                  Gerenciar Reservas
                  <Badge className="ml-auto bg-primary">8</Badge>
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/librarian/inventory">
                  <Package className="mr-2 h-4 w-4" />
                  Controle de Estoque
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/librarian/users">
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Returns */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Devoluções Pendentes</CardTitle>
                  <CardDescription>
                    Livros que precisam ser devolvidos
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/librarian/returns">
                    Ver Todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingReturns.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.student}</p>
                    <p className="text-sm text-muted-foreground">{item.book}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    {getReturnStatus(item.daysOverdue)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Reservations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Reservas Recentes</CardTitle>
                  <CardDescription>
                    Últimas solicitações de reserva
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/librarian/reservations">
                    Ver Todas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{reservation.student}</p>
                    <p className="text-sm text-muted-foreground">{reservation.book}</p>
                    <p className="text-xs text-muted-foreground">
                      Solicitado em: {new Date(reservation.requestDate).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    {getReservationStatus(reservation.status)}
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
