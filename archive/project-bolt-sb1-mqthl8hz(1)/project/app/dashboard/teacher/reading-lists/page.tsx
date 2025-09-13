'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Calendar,
  Search,
  Filter,
  Eye,
  Share
} from 'lucide-react';
import { toast } from 'sonner';

const mockReadingLists = [
  {
    id: '1',
    title: 'Literatura Brasileira - 3º Ano',
    description: 'Seleção de obras clássicas da literatura brasileira para o 3º ano do ensino médio.',
    targetGrade: '3º Ano',
    books: [
      { id: '1', title: 'Dom Casmurro', author: 'Machado de Assis', completed: 28 },
      { id: '4', title: 'Memórias Póstumas de Brás Cubas', author: 'Machado de Assis', completed: 25 },
      { id: '3', title: 'Grande Sertão: Veredas', author: 'Guimarães Rosa', completed: 15 }
    ],
    students: 35,
    completion: 68,
    status: 'active',
    createdDate: '2024-01-15',
    dueDate: '2024-06-30'
  },
  {
    id: '2',
    title: 'Clássicos Universais - 2º Ano',
    description: 'Obras fundamentais da literatura mundial adaptadas para o 2º ano.',
    targetGrade: '2º Ano',
    books: [
      { id: '5', title: 'Iracema', author: 'José de Alencar', completed: 26 },
      { id: '6', title: 'Capitães da Areia', author: 'Jorge Amado', completed: 24 },
      { id: '7', title: 'Vidas Secas', author: 'Graciliano Ramos', completed: 22 }
    ],
    students: 28,
    completion: 82,
    status: 'active',
    createdDate: '2024-01-20',
    dueDate: '2024-07-15'
  },
  {
    id: '3',
    title: 'Poesia Moderna - 1º Ano',
    description: 'Introdução à poesia brasileira moderna para despertar o interesse pela literatura.',
    targetGrade: '1º Ano',
    books: [
      { id: '8', title: 'O Quinze', author: 'Rachel de Queiroz', completed: 18 },
      { id: '9', title: 'A Moreninha', author: 'Joaquim Manuel de Macedo', completed: 20 }
    ],
    students: 32,
    completion: 45,
    status: 'draft',
    createdDate: '2024-02-01',
    dueDate: '2024-08-30'
  }
];

export default function TeacherReadingLists() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [readingLists, setReadingLists] = useState(mockReadingLists);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newList, setNewList] = useState({
    title: '',
    description: '',
    targetGrade: '',
    dueDate: ''
  });

  const handleCreateList = () => {
    if (!newList.title || !newList.targetGrade || !newList.dueDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const list = {
      id: Date.now().toString(),
      ...newList,
      books: [],
      students: 0,
      completion: 0,
      status: 'draft',
      createdDate: new Date().toISOString().split('T')[0]
    };

    setReadingLists(prev => [list, ...prev]);
    setNewList({ title: '', description: '', targetGrade: '', dueDate: '' });
    setShowCreateForm(false);
    toast.success('Lista de leitura criada com sucesso!');
  };

  const handleDeleteList = (id: string, title: string) => {
    setReadingLists(prev => prev.filter(list => list.id !== id));
    toast.success(`Lista "${title}" removida com sucesso`);
  };

  const handlePublishList = (id: string, title: string) => {
    setReadingLists(prev => prev.map(list => 
      list.id === id ? { ...list, status: 'active' } : list
    ));
    toast.success(`Lista "${title}" publicada com sucesso!`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'draft':
        return <Badge variant="outline">Rascunho</Badge>;
      case 'completed':
        return <Badge className="bg-primary">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLists = readingLists.filter(list => {
    const matchesSearch = list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         list.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === 'all' || list.targetGrade === filterGrade;
    const matchesStatus = filterStatus === 'all' || list.status === filterStatus;
    
    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Listas de Leitura</h1>
            <p className="text-muted-foreground">
              Crie e gerencie listas de leitura para suas turmas
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Lista
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Lista de Leitura</CardTitle>
              <CardDescription>
                Crie uma nova lista de leitura para seus alunos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título da Lista *</label>
                  <Input
                    placeholder="Ex: Literatura Brasileira - 3º Ano"
                    value={newList.title}
                    onChange={(e) => setNewList(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Série/Turma *</label>
                  <Select value={newList.targetGrade} onValueChange={(value) => setNewList(prev => ({ ...prev, targetGrade: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a série" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1º Ano">1º Ano</SelectItem>
                      <SelectItem value="2º Ano">2º Ano</SelectItem>
                      <SelectItem value="3º Ano">3º Ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  placeholder="Descreva o objetivo e conteúdo da lista de leitura..."
                  value={newList.description}
                  onChange={(e) => setNewList(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Conclusão *</label>
                <Input
                  type="date"
                  value={newList.dueDate}
                  onChange={(e) => setNewList(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateList}>
                  Criar Lista
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  placeholder="Buscar listas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por série" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as séries</SelectItem>
                  <SelectItem value="1º Ano">1º Ano</SelectItem>
                  <SelectItem value="2º Ano">2º Ano</SelectItem>
                  <SelectItem value="3º Ano">3º Ano</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-primary/10 mr-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingLists.length}</p>
                <p className="text-sm text-muted-foreground">Total de Listas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingLists.filter(l => l.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Listas Ativas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingLists.reduce((acc, l) => acc + l.students, 0)}</p>
                <p className="text-sm text-muted-foreground">Alunos Participando</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingLists.reduce((acc, l) => acc + l.books.length, 0)}</p>
                <p className="text-sm text-muted-foreground">Total de Livros</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reading Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLists.map((list) => (
            <Card key={list.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{list.title}</CardTitle>
                    <CardDescription>{list.description}</CardDescription>
                  </div>
                  {getStatusBadge(list.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{list.targetGrade}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(list.dueDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>{list.books.length} livros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{list.students} alunos</span>
                  </div>
                </div>
                
                {list.status === 'active' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progresso da Turma</span>
                      <span>{list.completion}%</span>
                    </div>
                    <Progress value={list.completion} className="h-2" />
                  </div>
                )}
                
                {list.books.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Livros da Lista:</h4>
                    <div className="space-y-1">
                      {list.books.slice(0, 3).map((book) => (
                        <div key={book.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {book.title} - {book.author}
                          </span>
                          {list.status === 'active' && (
                            <span className="text-xs text-muted-foreground">
                              {book.completed}/{list.students} concluído
                            </span>
                          )}
                        </div>
                      ))}
                      {list.books.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{list.books.length - 3} livros adicionais
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="mr-1 h-3 w-3" />
                    Ver Detalhes
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  {list.status === 'draft' && (
                    <Button 
                      size="sm"
                      onClick={() => handlePublishList(list.id, list.title)}
                    >
                      <Share className="mr-1 h-3 w-3" />
                      Publicar
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteList(list.id, list.title)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredLists.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma lista encontrada</h3>
              <p className="text-muted-foreground">
                {readingLists.length === 0 
                  ? 'Crie sua primeira lista de leitura para os alunos.'
                  : 'Tente ajustar os filtros ou termos de busca.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
