'use client';

import { useState, useMemo } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Star,
  BookOpen,
  Edit,
  Trash2,
  Plus,
  MapPin,
  User,
  Clock,
  Copy,
  Eye
} from 'lucide-react';
import { mockBooks, getCategories } from '@/lib/mock-data';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LibrarianCatalog() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('title');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const categories = getCategories();

  const filteredBooks = useMemo(() => {
    let filtered = mockBooks;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    // Filter by availability
    if (availabilityFilter !== 'all') {
      if (availabilityFilter === 'available') {
        filtered = filtered.filter(book => book.available && book.availableCopies > 0);
      } else if (availabilityFilter === 'unavailable') {
        filtered = filtered.filter(book => !book.available || book.availableCopies === 0);
      } else if (availabilityFilter === 'low-stock') {
        filtered = filtered.filter(book => book.availableCopies <= 2 && book.availableCopies > 0);
      }
    }

    // Sort books
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author':
          return a.author.localeCompare(b.author);
        case 'year':
          return b.publishYear - a.publishYear;
        case 'rating':
          return b.rating - a.rating;
        case 'isbn':
          return a.isbn.localeCompare(b.isbn);
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, availabilityFilter]);

  const handleEditBook = (bookId: string, bookTitle: string) => {
    toast.info(`Editar "${bookTitle}" - Funcionalidade em desenvolvimento`);
  };

  const handleDeleteBook = (bookId: string, bookTitle: string) => {
    if (confirm(`Tem certeza que deseja excluir o livro "${bookTitle}"?`)) {
      toast.success(`Livro "${bookTitle}" removido do catálogo`);
    }
  };

  const handleDuplicateBook = (bookId: string, bookTitle: string) => {
    toast.success(`Livro "${bookTitle}" duplicado com sucesso`);
  };

  const getAvailabilityStatus = (book: any) => {
    if (!book.available || book.availableCopies === 0) {
      return <Badge variant="destructive">Indisponível</Badge>;
    }
    if (book.availableCopies <= 2) {
      return <Badge className="bg-yellow-500">Estoque Baixo</Badge>;
    }
    return <Badge className="bg-green-500">Disponível</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Catálogo da Biblioteca</h1>
            <p className="text-muted-foreground">
              Gerencie o acervo completo da biblioteca
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/librarian/add-book">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Livro
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, autor, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Availability Filter */}
              <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Disponibilidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="unavailable">Indisponíveis</SelectItem>
                  <SelectItem value="low-stock">Estoque Baixo</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Título</SelectItem>
                  <SelectItem value="author">Autor</SelectItem>
                  <SelectItem value="year">Ano</SelectItem>
                  <SelectItem value="rating">Avaliação</SelectItem>
                  <SelectItem value="isbn">ISBN</SelectItem>
                </SelectContent>
              </Select>

              {/* Quick Stats */}
              <div className="text-sm text-muted-foreground">
                <p>{filteredBooks.length} livro{filteredBooks.length !== 1 ? 's' : ''}</p>
                <p>{filteredBooks.reduce((acc, book) => acc + book.totalCopies, 0)} exemplares</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[3/4] relative">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getAvailabilityStatus(book)}
                </div>
              </div>
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {book.author}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{book.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{book.publishYear}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    <span>{book.location}</span>
                  </div>
                  <div>
                    <span>ISBN: {book.isbn}</span>
                  </div>
                </div>

                <Badge variant="outline" className="w-fit">
                  {book.category}
                </Badge>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {book.description}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">
                    {book.availableCopies}/{book.totalCopies} disponível
                  </span>
                </div>

                {/* Librarian Actions */}
                <div className="flex gap-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEditBook(book.id, book.title)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateBook(book.id, book.title)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBook(book.id, book.title)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum livro encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar os filtros ou usar termos de busca diferentes.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}