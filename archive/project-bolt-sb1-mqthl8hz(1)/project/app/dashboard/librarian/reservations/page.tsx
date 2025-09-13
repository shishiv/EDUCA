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
  Calendar,
  Search,
  Filter,
  CheckCircle,
  X,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { toast } from 'sonner';

const mockReservations = [
  {
    id: '1',
    userId: '1',
    userName: 'Ana Silva',
    userEmail: 'ana.silva@email.com',
    userPhone: '(11) 99999-0001',
    bookId: '3',
    bookTitle: 'Grande Sertão: Veredas',
    author: 'Guimarães Rosa',
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-08',
    status: 'pending',
    expiryDate: '2024-02-15',
    position: 2,
    notificationSent: false
  },
  {
    id: '2',
    userId: '4',
    userName: 'Pedro Costa',
    userEmail: 'pedro.costa@email.com',
    userPhone: '(11) 99999-0004',
    bookId: '10',
    bookTitle: 'O Tempo e o Vento',
    author: 'Erico Veríssimo',
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-09',
    status: 'ready',
    expiryDate: '2024-02-16',
    position: 0,
    notificationSent: true
  },
  {
    id: '3',
    userId: '5',
    userName: 'Lucia Ferreira',
    userEmail: 'lucia.ferreira@email.com',
    userPhone: '(11) 99999-0005',
    bookId: '1',
    bookTitle: 'Dom Casmurro',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-05',
    status: 'ready',
    expiryDate: '2024-02-12',
    position: 0,
    notificationSent: true
  },
  {
    id: '4',
    userId: '6',
    userName: 'João Almeida',
    userEmail: 'joao.almeida@email.com',
    userPhone: '(11) 99999-0006',
    bookId: '5',
    bookTitle: 'Iracema',
    author: 'José de Alencar',
    cover: 'https://images.pexels.com/photos/1834403/pexels-photo-1834403.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-10',
    status: 'pending',
    expiryDate: '2024-02-17',
    position: 1,
    notificationSent: false
  },
  {
    id: '5',
    userId: '7',
    userName: 'Maria Santos',
    userEmail: 'maria.santos@email.com',
    userPhone: '(11) 99999-0007',
    bookId: '7',
    bookTitle: 'Vidas Secas',
    author: 'Graciliano Ramos',
    cover: 'https://images.pexels.com/photos/1030778/pexels-photo-1030778.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-06',
    status: 'expired',
    expiryDate: '2024-02-13',
    position: 0,
    notificationSent: true
  }
];

export default function LibrarianReservations() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState(mockReservations);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'ready':
        return <Badge className="bg-green-500">Pronto</Badge>;
      case 'collected':
        return <Badge className="bg-blue-500">Retirado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleMarkAsReady = (reservationId: string, bookTitle: string) => {
    setReservations(prev => prev.map(reservation => 
      reservation.id === reservationId 
        ? { ...reservation, status: 'ready', notificationSent: false }
        : reservation
    ));
    toast.success(`Reserva de "${bookTitle}" marcada como pronta para retirada`);
  };

  const handleProcessCollection = (reservationId: string, bookTitle: string) => {
    setReservations(prev => prev.map(reservation => 
      reservation.id === reservationId 
        ? { ...reservation, status: 'collected' }
        : reservation
    ));
    toast.success(`Livro "${bookTitle}" entregue com sucesso!`);
  };

  const handleCancelReservation = (reservationId: string, bookTitle: string) => {
    if (confirm(`Tem certeza que deseja cancelar a reserva de "${bookTitle}"?`)) {
      setReservations(prev => prev.map(reservation => 
        reservation.id === reservationId 
          ? { ...reservation, status: 'cancelled' }
          : reservation
      ));
      toast.success(`Reserva de "${bookTitle}" cancelada`);
    }
  };

  const handleSendNotification = (reservationId: string, userName: string, type: 'email' | 'sms') => {
    setReservations(prev => prev.map(reservation => 
      reservation.id === reservationId 
        ? { ...reservation, notificationSent: true }
        : reservation
    ));
    toast.success(`Notificação ${type === 'email' ? 'por email' : 'por SMS'} enviada para ${userName}`);
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = reservation.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reservation.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         reservation.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.reservationDate).getTime() - new Date(a.reservationDate).getTime();
      case 'expiry':
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      case 'user':
        return a.userName.localeCompare(b.userName);
      case 'book':
        return a.bookTitle.localeCompare(b.bookTitle);
      default:
        return 0;
    }
  });

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const readyCount = reservations.filter(r => r.status === 'ready').length;
  const expiredCount = reservations.filter(r => r.status === 'expired').length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Gerenciar Reservas</h1>
          <p className="text-muted-foreground">
            Acompanhe e processe as reservas de livros dos usuários
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readyCount}</p>
                <p className="text-sm text-muted-foreground">Prontos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiredCount}</p>
                <p className="text-sm text-muted-foreground">Expirados</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reservations.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
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
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="ready">Pronto</SelectItem>
                  <SelectItem value="collected">Retirado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Data da Reserva</SelectItem>
                  <SelectItem value="expiry">Data de Expiração</SelectItem>
                  <SelectItem value="user">Nome do Usuário</SelectItem>
                  <SelectItem value="book">Título do Livro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reservations List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Reservas</CardTitle>
            <CardDescription>
              {filteredReservations.length} reserva{filteredReservations.length !== 1 ? 's' : ''} encontrada{filteredReservations.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <img
                  src={reservation.cover}
                  alt={reservation.bookTitle}
                  className="w-16 h-20 object-cover rounded"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{reservation.bookTitle}</h4>
                      <p className="text-sm text-muted-foreground">{reservation.author}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(reservation.status)}
                      {getStatusBadge(reservation.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{reservation.userName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Reservado: {new Date(reservation.reservationDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Expira: {new Date(reservation.expiryDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {reservation.status === 'pending' && reservation.position > 0 && (
                      <span className="text-muted-foreground">Posição na fila: {reservation.position}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{reservation.userEmail}</span>
                    <span>{reservation.userPhone}</span>
                    {reservation.notificationSent && (
                      <Badge variant="outline" className="text-xs">
                        Notificado
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {reservation.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkAsReady(reservation.id, reservation.bookTitle)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Marcar Pronto
                    </Button>
                  )}
                  
                  {reservation.status === 'ready' && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessCollection(reservation.id, reservation.bookTitle)}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Processar Retirada
                    </Button>
                  )}
                  
                  {(reservation.status === 'ready' || reservation.status === 'pending') && !reservation.notificationSent && (
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendNotification(reservation.id, reservation.userName, 'email')}
                      >
                        <Mail className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendNotification(reservation.id, reservation.userName, 'sms')}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {(reservation.status === 'pending' || reservation.status === 'ready') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelReservation(reservation.id, reservation.bookTitle)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {filteredReservations.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reserva encontrada</h3>
                <p className="text-muted-foreground">
                  Não há reservas com os filtros selecionados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}