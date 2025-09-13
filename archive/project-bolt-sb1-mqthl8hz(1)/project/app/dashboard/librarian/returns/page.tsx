'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  DollarSign,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const mockReturns = [
  {
    id: '1',
    userId: '1',
    userName: 'Ana Silva',
    userEmail: 'ana.silva@email.com',
    bookId: '1',
    bookTitle: 'Dom Casmurro',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-20',
    dueDate: '2024-02-08',
    returnDate: null,
    status: 'overdue',
    daysOverdue: 2,
    fine: 4.00,
    renewals: 0,
    maxRenewals: 2
  },
  {
    id: '2',
    userId: '2',
    userName: 'Carlos Santos',
    userEmail: 'carlos.santos@email.com',
    bookId: '4',
    bookTitle: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-25',
    dueDate: '2024-02-10',
    returnDate: null,
    status: 'due_today',
    daysOverdue: 0,
    fine: 0,
    renewals: 1,
    maxRenewals: 2
  },
  {
    id: '3',
    userId: '3',
    userName: 'Maria Oliveira',
    userEmail: 'maria.oliveira@email.com',
    bookId: '6',
    bookTitle: 'Capitães da Areia',
    author: 'Jorge Amado',
    cover: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-30',
    dueDate: '2024-02-12',
    returnDate: null,
    status: 'due_soon',
    daysOverdue: -2,
    fine: 0,
    renewals: 0,
    maxRenewals: 2
  },
  {
    id: '4',
    userId: '4',
    userName: 'Pedro Costa',
    userEmail: 'pedro.costa@email.com',
    bookId: '7',
    bookTitle: 'Vidas Secas',
    author: 'Graciliano Ramos',
    cover: 'https://images.pexels.com/photos/1030778/pexels-photo-1030778.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-15',
    dueDate: '2024-02-05',
    returnDate: null,
    status: 'overdue',
    daysOverdue: 5,
    fine: 10.00,
    renewals: 2,
    maxRenewals: 2
  }
];

export default function LibrarianReturns() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [returns, setReturns] = useState(mockReturns);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_date');

  const getStatusBadge = (status: string, daysOverdue: number) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive">Atrasado {daysOverdue}d</Badge>;
      case 'due_today':
        return <Badge className="bg-yellow-500">Vence Hoje</Badge>;
      case 'due_soon':
        return <Badge className="bg-orange-500">Vence em {Math.abs(daysOverdue)}d</Badge>;
      case 'returned':
        return <Badge className="bg-green-500">Devolvido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'due_today':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'due_soon':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'returned':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleProcessReturn = (returnId: string, bookTitle: string, fine: number) => {
    if (fine > 0) {
      const payFine = confirm(`Este livro possui uma multa de R$ ${fine.toFixed(2)}. Confirma o pagamento?`);
      if (!payFine) return;
    }

    setReturns(prev => prev.map(returnItem => 
      returnItem.id === returnId 
        ? { 
            ...returnItem, 
            status: 'returned', 
            returnDate: new Date().toISOString().split('T')[0],
            fine: 0
          }
        : returnItem
    ));
    toast.success(`Devolução de "${bookTitle}" processada com sucesso!`);
  };

  const handleRenewLoan = (returnId: string, bookTitle: string) => {
    setReturns(prev => prev.map(returnItem => 
      returnItem.id === returnId 
        ? { 
            ...returnItem, 
            renewals: returnItem.renewals + 1,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'due_soon',
            daysOverdue: -30,
            fine: 0
          }
        : returnItem
    ));
    toast.success(`Empréstimo de "${bookTitle}" renovado com sucesso!`);
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesSearch = returnItem.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         returnItem.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         returnItem.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || returnItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      case 'overdue':
        return b.daysOverdue - a.daysOverdue;
      case 'user':
        return a.userName.localeCompare(b.userName);
      case 'book':
        return a.bookTitle.localeCompare(b.bookTitle);
      case 'fine':
        return b.fine - a.fine;
      default:
        return 0;
    }
  });

  const overdueCount = returns.filter(r => r.status === 'overdue').length;
  const dueTodayCount = returns.filter(r => r.status === 'due_today').length;
  const dueSoonCount = returns.filter(r => r.status === 'due_soon').length;
  const totalFines = returns.reduce((acc, r) => acc + r.fine, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Processar Devoluções</h1>
          <p className="text-muted-foreground">
            Gerencie devoluções de livros e controle de multas
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Atrasados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueTodayCount}</p>
                <p className="text-sm text-muted-foreground">Vencem Hoje</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-orange-100 mr-4">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dueSoonCount}</p>
                <p className="text-sm text-muted-foreground">Vencem em Breve</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ {totalFines.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Multas Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário ou livro..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                  <SelectItem value="due_today">Vencem Hoje</SelectItem>
                  <SelectItem value="due_soon">Vencem em Breve</SelectItem>
                  <SelectItem value="returned">Devolvidos</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Data de Vencimento</SelectItem>
                  <SelectItem value="overdue">Dias de Atraso</SelectItem>
                  <SelectItem value="user">Nome do Usuário</SelectItem>
                  <SelectItem value="book">Título do Livro</SelectItem>
                  <SelectItem value="fine">Valor da Multa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Returns List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Devoluções</CardTitle>
            <CardDescription>
              {filteredReturns.length} empréstimo{filteredReturns.length !== 1 ? 's' : ''} encontrado{filteredReturns.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredReturns.map((returnItem) => (
              <div
                key={returnItem.id}
                className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <img
                  src={returnItem.cover}
                  alt={returnItem.bookTitle}
                  className="w-16 h-20 object-cover rounded"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{returnItem.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">{returnItem.author}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(returnItem.status)}
                      {getStatusBadge(returnItem.status, returnItem.daysOverdue)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{returnItem.userName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Emprestado: {new Date(returnItem.loanDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Vencimento: {new Date(returnItem.dueDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {returnItem.renewals > 0 && (
                      <span className="text-muted-foreground">
                        Renovações: {returnItem.renewals}/{returnItem.maxRenewals}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{returnItem.userEmail}</span>
                    {returnItem.fine > 0 && (
                      <div className="flex items-center gap-1 text-red-600 font-medium">
                        <DollarSign className="h-3 w-3" />
                        <span>Multa: R$ {returnItem.fine.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {returnItem.status !== 'returned' && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessReturn(returnItem.id, returnItem.bookTitle, returnItem.fine)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Processar Devolução
                    </Button>
                  )}
                  
                  {returnItem.status !== 'returned' && returnItem.renewals < returnItem.maxRenewals && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRenewLoan(returnItem.id, returnItem.bookTitle)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Renovar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredReturns.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma devolução encontrada</h3>
                <p className="text-muted-foreground">
                  Não há devoluções com os filtros selecionados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}