'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Star,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Users,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const mockRecommendations = [
  {
    id: '1',
    bookTitle: 'Vidas Secas',
    author: 'Graciliano Ramos',
    cover: 'https://images.pexels.com/photos/1030778/pexels-photo-1030778.jpeg?auto=compress&cs=tinysrgb&w=400',
    targetGrade: '2º Ano',
    reason: 'Excelente para discussões sobre realismo e questões sociais do Nordeste brasileiro.',
    tags: ['Realismo', 'Literatura Brasileira', 'Questões Sociais'],
    createdDate: '2024-02-08',
    status: 'active',
    views: 45,
    likes: 12
  },
  {
    id: '2',
    bookTitle: 'O Quinze',
    author: 'Rachel de Queiroz',
    cover: 'https://images.pexels.com/photos/1181772/pexels-photo-1181772.jpeg?auto=compress&cs=tinysrgb&w=400',
    targetGrade: '3º Ano',
    reason: 'Importante obra do regionalismo nordestino, ideal para análise de personagens femininas fortes.',
    tags: ['Regionalismo', 'Protagonista Feminina', 'Seca'],
    createdDate: '2024-02-07',
    status: 'active',
    views: 38,
    likes: 9
  },
  {
    id: '3',
    bookTitle: 'A Moreninha',
    author: 'Joaquim Manuel de Macedo',
    cover: 'https://images.pexels.com/photos/1301585/pexels-photo-1301585.jpeg?auto=compress&cs=tinysrgb&w=400',
    targetGrade: '1º Ano',
    reason: 'Primeiro romance urbano brasileiro, perfeito para introduzir o Romantismo.',
    tags: ['Romantismo', 'Romance Urbano', 'Século XIX'],
    createdDate: '2024-02-05',
    status: 'draft',
    views: 0,
    likes: 0
  }
];

export default function TeacherRecommendations() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recommendations, setRecommendations] = useState(mockRecommendations);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newRecommendation, setNewRecommendation] = useState({
    bookTitle: '',
    author: '',
    targetGrade: '',
    reason: '',
    tags: ''
  });

  const handleCreateRecommendation = () => {
    if (!newRecommendation.bookTitle || !newRecommendation.author || !newRecommendation.targetGrade || !newRecommendation.reason) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const recommendation = {
      id: Date.now().toString(),
      ...newRecommendation,
      cover: 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=400',
      tags: newRecommendation.tags.split(',').map(tag => tag.trim()),
      createdDate: new Date().toISOString().split('T')[0],
      status: 'active',
      views: 0,
      likes: 0
    };

    setRecommendations(prev => [recommendation, ...prev]);
    setNewRecommendation({ bookTitle: '', author: '', targetGrade: '', reason: '', tags: '' });
    setShowCreateForm(false);
    toast.success('Recomendação criada com sucesso!');
  };

  const handleDeleteRecommendation = (id: string, title: string) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== id));
    toast.success(`Recomendação "${title}" removida com sucesso`);
  };

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

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesSearch = rec.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rec.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade === 'all' || rec.targetGrade === filterGrade;
    const matchesStatus = filterStatus === 'all' || rec.status === filterStatus;
    
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
            <h1 className="text-3xl font-bold">Recomendações de Livros</h1>
            <p className="text-muted-foreground">
              Crie e gerencie recomendações de leitura para seus alunos
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Recomendação
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>Nova Recomendação</CardTitle>
              <CardDescription>
                Crie uma nova recomendação de livro para seus alunos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Título do Livro *</label>
                  <Input
                    placeholder="Digite o título do livro"
                    value={newRecommendation.bookTitle}
                    onChange={(e) => setNewRecommendation(prev => ({ ...prev, bookTitle: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Autor *</label>
                  <Input
                    placeholder="Digite o nome do autor"
                    value={newRecommendation.author}
                    onChange={(e) => setNewRecommendation(prev => ({ ...prev, author: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Série/Turma *</label>
                <Select value={newRecommendation.targetGrade} onValueChange={(value) => setNewRecommendation(prev => ({ ...prev, targetGrade: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a série" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1º Ano">1º Ano</SelectItem>
                    <SelectItem value="2º Ano">2º Ano</SelectItem>
                    <SelectItem value="3º Ano">3º Ano</SelectItem>
                    <SelectItem value="Todas">Todas as séries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo da Recomendação *</label>
                <Textarea
                  placeholder="Explique por que está recomendando este livro..."
                  value={newRecommendation.reason}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
                <Input
                  placeholder="Ex: Romance, Clássico, Literatura Brasileira"
                  value={newRecommendation.tags}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, tags: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCreateRecommendation}>
                  Criar Recomendação
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
                  placeholder="Buscar recomendações..."
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
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Star className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recommendations.length}</p>
                <p className="text-sm text-muted-foreground">Total de Recomendações</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recommendations.filter(r => r.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Ativas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recommendations.reduce((acc, r) => acc + r.views, 0)}</p>
                <p className="text-sm text-muted-foreground">Total de Visualizações</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <Star className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recommendations.reduce((acc, r) => acc + r.likes, 0)}</p>
                <p className="text-sm text-muted-foreground">Total de Curtidas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecommendations.map((recommendation) => (
            <Card key={recommendation.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <img
                    src={recommendation.cover}
                    alt={recommendation.bookTitle}
                    className="w-20 h-28 object-cover rounded"
                  />
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{recommendation.bookTitle}</h3>
                        <p className="text-muted-foreground">{recommendation.author}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(recommendation.status)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <Badge variant="outline">{recommendation.targetGrade}</Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(recommendation.createdDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {recommendation.reason}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {recommendation.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{recommendation.views} visualizações</span>
                        <span>{recommendation.likes} curtidas</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRecommendation(recommendation.id, recommendation.bookTitle)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredRecommendations.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma recomendação encontrada</h3>
              <p className="text-muted-foreground">
                {recommendations.length === 0 
                  ? 'Crie sua primeira recomendação de livro para os alunos.'
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