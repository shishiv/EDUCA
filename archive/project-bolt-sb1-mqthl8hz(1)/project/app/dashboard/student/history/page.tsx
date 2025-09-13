'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History,
  BookOpen,
  Calendar,
  Star,
  Clock,
  TrendingUp,
  Filter,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';

const mockHistory = [
  {
    id: '1',
    bookId: '1',
    bookTitle: 'Dom Casmurro',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-20',
    dueDate: '2024-02-20',
    returnDate: null,
    status: 'active',
    renewals: 0,
    progress: 65,
    rating: null
  },
  {
    id: '2',
    bookId: '4',
    bookTitle: 'Memórias Póstumas de Brás Cubas',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/694740/pexels-photo-694740.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-25',
    dueDate: '2024-02-25',
    returnDate: null,
    status: 'active',
    renewals: 1,
    progress: 30,
    rating: null
  },
  {
    id: '3',
    bookId: '6',
    bookTitle: 'Capitães da Areia',
    author: 'Jorge Amado',
    cover: 'https://images.pexels.com/photos/1029141/pexels-photo-1029141.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2024-01-10',
    dueDate: '2024-02-10',
    returnDate: '2024-02-08',
    status: 'returned',
    renewals: 0,
    progress: 100,
    rating: 5
  },
  {
    id: '4',
    bookId: '5',
    bookTitle: 'Iracema',
    author: 'José de Alencar',
    cover: 'https://images.pexels.com/photos/1834403/pexels-photo-1834403.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2023-12-15',
    dueDate: '2024-01-15',
    returnDate: '2024-01-12',
    status: 'returned',
    renewals: 0,
    progress: 100,
    rating: 4
  },
  {
    id: '5',
    bookId: '7',
    bookTitle: 'Vidas Secas',
    author: 'Graciliano Ramos',
    cover: 'https://images.pexels.com/photos/1030778/pexels-photo-1030778.jpeg?auto=compress&cs=tinysrgb&w=400',
    loanDate: '2023-11-20',
    dueDate: '2023-12-20',
    returnDate: '2023-12-18',
    status: 'returned',
    renewals: 1,
    progress: 100,
    rating: 5
  }
];

export default function StudentHistory() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState(mockHistory);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">Ativo</Badge>;
      case 'returned':
        return <Badge className="bg-green-500">Devolvido</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Atrasado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleRenewLoan = (loanId: string, bookTitle: string) => {
    setHistory(prev => prev.map(loan => 
      loan.id === loanId 
        ? { ...loan, renewals: loan.renewals + 1, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        : loan
    ));
    toast.success(`Empréstimo de "${bookTitle}" renovado com sucesso!`);
  };

  const handleRateBook = (loanId: string, rating: number) => {
    setHistory(prev => prev.map(loan => 
      loan.id === loanId ? { ...loan, rating } : loan
    ));
    toast.success('Avaliação salva com sucesso!');
  };

  const filteredHistory = history.filter(loan => {
    if (filter === 'all') return true;
    return loan.status === filter;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime();
      case 'title':
        return a.bookTitle.localeCompare(b.bookTitle);
      case 'author':
        return a.author.localeCompare(b.author);
      default:
        return 0;
    }
  });

  const activeLoans = history.filter(loan => loan.status === 'active');
  const completedLoans = history.filter(loan => loan.status === 'returned');
  const totalBooksRead = completedLoans.length;
  const averageRating = completedLoans.filter(loan => loan.rating).reduce((acc, loan) => acc + (loan.rating || 0), 0) / completedLoans.filter(loan => loan.rating).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Histórico de Leitura</h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e histórico de empréstimos
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
                <p className="text-sm text-muted-foreground">Empréstimos Ativos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <History className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalBooksRead}</p>
                <p className="text-sm text-muted-foreground">Livros Lidos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round((totalBooksRead / 15) * 100)}%</p>
                <p className="text-sm text-muted-foreground">Meta Anual</p>
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
            <div className="flex gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="returned">Devolvidos</SelectItem>
                  <SelectItem value="overdue">Atrasados</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recente</SelectItem>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="author">Autor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Empréstimos</CardTitle>
            <CardDescription>
              {filteredHistory.length} empréstimo{filteredHistory.length !== 1 ? 's' : ''} encontrado{filteredHistory.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredHistory.map((loan) => (
              <div
                key={loan.id}
                className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <img
                  src={loan.cover}
                  alt={loan.bookTitle}
                  className="w-16 h-20 object-cover rounded"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{loan.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">{loan.author}</p>
                    </div>
                    {getStatusBadge(loan.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Emprestado: {new Date(loan.loanDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {loan.status === 'active' 
                          ? `Vence: ${new Date(loan.dueDate).toLocaleDateString('pt-BR')}`
                          : `Devolvido: ${new Date(loan.returnDate!).toLocaleDateString('pt-BR')}`
                        }
                      </span>
                    </div>
                    {loan.renewals > 0 && (
                      <span>Renovações: {loan.renewals}</span>
                    )}
                  </div>
                  
                  {loan.status === 'active' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>Progresso de Leitura</span>
                        <span>{loan.progress}%</span>
                      </div>
                      <Progress value={loan.progress} className="h-2" />
                    </div>
                  )}
                  
                  {loan.status === 'returned' && loan.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">Sua avaliação:</span>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < loan.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  {loan.status === 'active' && loan.renewals < 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRenewLoan(loan.id, loan.bookTitle)}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Renovar
                    </Button>
                  )}
                  
                  {loan.status === 'returned' && !loan.rating && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                          onClick={() => handleRateBook(loan.id, rating)}
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredHistory.length === 0 && (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">
                  Não há empréstimos com os filtros selecionados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}