'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  BookOpen,
  X,
  CheckCircle,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const mockReservations = [
  {
    id: '1',
    bookId: '3',
    bookTitle: 'Grande Sertão: Veredas',
    author: 'Guimarães Rosa',
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-08',
    status: 'pending',
    expiryDate: '2024-02-15',
    position: 2
  },
  {
    id: '2',
    bookId: '10',
    bookTitle: 'O Tempo e o Vento',
    author: 'Erico Veríssimo',
    cover: 'https://images.pexels.com/photos/2041540/pexels-photo-2041540.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-09',
    status: 'ready',
    expiryDate: '2024-02-16',
    position: 0
  },
  {
    id: '3',
    bookId: '1',
    bookTitle: 'Dom Casmurro',
    author: 'Machado de Assis',
    cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
    reservationDate: '2024-02-05',
    status: 'collected',
    expiryDate: '2024-02-12',
    position: 0,
    collectedDate: '2024-02-10'
  }
];

export default function StudentReservations() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reservations, setReservations] = useState(mockReservations);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">Pendente</Badge>;
      case 'ready':
        return <Badge className="bg-green-500">Pronto para Retirada</Badge>;
      case 'collected':
        return <Badge className="bg-blue-500">Retirado</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
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
      case 'collected':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleCancelReservation = (reservationId: string, bookTitle: string) => {
    setReservations(prev => prev.filter(r => r.id !== reservationId));
    toast.success(`Reserva de "${bookTitle}" cancelada com sucesso`);
  };

  const handleCollectBook = (reservationId: string, bookTitle: string) => {
    setReservations(prev => prev.map(r => 
      r.id === reservationId 
        ? { ...r, status: 'collected', collectedDate: new Date().toISOString().split('T')[0] }
        : r
    ));
    toast.success(`Livro "${bookTitle}" retirado com sucesso!`);
  };

  const activeReservations = reservations.filter(r => r.status !== 'collected' && r.status !== 'expired');
  const historyReservations = reservations.filter(r => r.status === 'collected' || r.status === 'expired');

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Minhas Reservas</h1>
          <p className="text-muted-foreground">
            Acompanhe o status das suas reservas de livros
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reservations.filter(r => r.status === 'pending').length}
                </p>
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
                <p className="text-2xl font-bold">
                  {reservations.filter(r => r.status === 'ready').length}
                </p>
                <p className="text-sm text-muted-foreground">Prontos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reservations.filter(r => r.status === 'collected').length}
                </p>
                <p className="text-sm text-muted-foreground">Retirados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Reservations */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas Ativas</CardTitle>
            <CardDescription>
              Livros reservados aguardando retirada
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeReservations.length > 0 ? (
              activeReservations.map((reservation) => (
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
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Reservado em: {new Date(reservation.reservationDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Expira em: {new Date(reservation.expiryDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {reservation.status === 'pending' && reservation.position > 0 && (
                        <span>Posição na fila: {reservation.position}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {reservation.status === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => handleCollectBook(reservation.id, reservation.bookTitle)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Retirar
                      </Button>
                    )}
                    {reservation.status !== 'collected' && (
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
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma reserva ativa</h3>
                <p className="text-muted-foreground">
                  Você não possui reservas pendentes no momento.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reservation History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Reservas</CardTitle>
            <CardDescription>
              Reservas anteriores e livros já retirados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {historyReservations.length > 0 ? (
              historyReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center space-x-4 p-4 rounded-lg border opacity-75"
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
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Reservado em: {new Date(reservation.reservationDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {reservation.collectedDate && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          <span>Retirado em: {new Date(reservation.collectedDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum histórico</h3>
                <p className="text-muted-foreground">
                  Você ainda não possui histórico de reservas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}