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
  Users,
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Ban
} from 'lucide-react';
import { toast } from 'sonner';

const mockUsers = [
  {
    id: '1',
    name: 'Ana Silva',
    email: 'ana.silva@email.com',
    phone: '(11) 99999-0001',
    role: 'student',
    registrationDate: '2024-01-15',
    isActive: true,
    activeLoans: 2,
    totalLoans: 8,
    overdueBooks: 0,
    fines: 0,
    lastActivity: '2024-02-08'
  },
  {
    id: '2',
    name: 'Prof. Carlos Santos',
    email: 'carlos.santos@email.com',
    phone: '(11) 99999-0002',
    role: 'teacher',
    registrationDate: '2023-08-20',
    isActive: true,
    activeLoans: 1,
    totalLoans: 15,
    overdueBooks: 0,
    fines: 0,
    lastActivity: '2024-02-09'
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'pedro.costa@email.com',
    phone: '(11) 99999-0003',
    role: 'student',
    registrationDate: '2024-01-20',
    isActive: true,
    activeLoans: 3,
    totalLoans: 5,
    overdueBooks: 1,
    fines: 5.00,
    lastActivity: '2024-02-07'
  },
  {
    id: '4',
    name: 'Maria Oliveira',
    email: 'maria.oliveira@email.com',
    phone: '(11) 99999-0004',
    role: 'student',
    registrationDate: '2023-12-10',
    isActive: false,
    activeLoans: 0,
    totalLoans: 12,
    overdueBooks: 0,
    fines: 0,
    lastActivity: '2024-01-15'
  },
  {
    id: '5',
    name: 'João Almeida',
    email: 'joao.almeida@email.com',
    phone: '(11) 99999-0005',
    role: 'student',
    registrationDate: '2024-02-01',
    isActive: true,
    activeLoans: 1,
    totalLoans: 2,
    overdueBooks: 0,
    fines: 0,
    lastActivity: '2024-02-10'
  }
];

export default function LibrarianUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'student':
        return <Badge className="bg-green-500">Estudante</Badge>;
      case 'teacher':
        return <Badge className="bg-blue-500">Professor</Badge>;
      case 'librarian':
        return <Badge className="bg-purple-500">Bibliotecário</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, overdueBooks: number, fines: number) => {
    if (!isActive) {
      return <Badge variant="destructive">Inativo</Badge>;
    }
    if (overdueBooks > 0 || fines > 0) {
      return <Badge className="bg-yellow-500">Pendências</Badge>;
    }
    return <Badge className="bg-green-500">Ativo</Badge>;
  };

  const getStatusIcon = (isActive: boolean, overdueBooks: number, fines: number) => {
    if (!isActive) {
      return <Ban className="h-4 w-4 text-red-500" />;
    }
    if (overdueBooks > 0 || fines > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const handleEditUser = (userId: string, userName: string) => {
    toast.info(`Editar usuário "${userName}" - Funcionalidade em desenvolvimento`);
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      setUsers(prev => prev.filter(user => user.id !== userId));
      toast.success(`Usuário "${userName}" removido com sucesso`);
    }
  };

  const handleToggleUserStatus = (userId: string, userName: string, currentStatus: boolean) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isActive: !currentStatus } : user
    ));
    toast.success(`Usuário "${userName}" ${currentStatus ? 'desativado' : 'ativado'} com sucesso`);
  };

  const handleSendEmail = (userEmail: string, userName: string) => {
    toast.success(`Email enviado para ${userName} (${userEmail})`);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive) ||
                         (statusFilter === 'inactive' && !user.isActive) ||
                         (statusFilter === 'pending' && (user.overdueBooks > 0 || user.fines > 0));
    
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'email':
        return a.email.localeCompare(b.email);
      case 'registration':
        return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
      case 'activity':
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      case 'loans':
        return b.totalLoans - a.totalLoans;
      default:
        return 0;
    }
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.isActive).length;
  const usersWithPendencies = users.filter(u => u.overdueBooks > 0 || u.fines > 0).length;
  const totalFines = users.reduce((acc, u) => acc + u.fines, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
            <p className="text-muted-foreground">
              Administre usuários da biblioteca e suas permissões
            </p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeUsers}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{usersWithPendencies}</p>
                <p className="text-sm text-muted-foreground">Com Pendências</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-red-100 mr-4">
                <BookOpen className="h-6 w-6 text-red-600" />
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="student">Estudantes</SelectItem>
                  <SelectItem value="teacher">Professores</SelectItem>
                  <SelectItem value="librarian">Bibliotecários</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="pending">Com Pendências</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="registration">Data de Cadastro</SelectItem>
                  <SelectItem value="activity">Última Atividade</SelectItem>
                  <SelectItem value="loans">Total de Empréstimos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center space-x-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{user.name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(user.isActive, user.overdueBooks, user.fines)}
                      {getStatusBadge(user.isActive, user.overdueBooks, user.fines)}
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{user.phone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Cadastro: {new Date(user.registrationDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      <span>{user.activeLoans} ativo{user.activeLoans !== 1 ? 's' : ''} / {user.totalLoans} total</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Última atividade: {new Date(user.lastActivity).toLocaleDateString('pt-BR')}
                    </span>
                    {user.overdueBooks > 0 && (
                      <span className="text-red-600 font-medium">
                        {user.overdueBooks} livro{user.overdueBooks !== 1 ? 's' : ''} atrasado{user.overdueBooks !== 1 ? 's' : ''}
                      </span>
                    )}
                    {user.fines > 0 && (
                      <span className="text-red-600 font-medium">
                        Multa: R$ {user.fines.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendEmail(user.email, user.name)}
                    >
                      <Mail className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user.id, user.name)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.name)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Button
                    variant={user.isActive ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleUserStatus(user.id, user.name, user.isActive)}
                  >
                    {user.isActive ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum usuário encontrado</h3>
                <p className="text-muted-foreground">
                  Não há usuários com os filtros selecionados.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}