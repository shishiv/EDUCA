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
  Calendar,
  MapPin,
  User,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { mockBooks, getCategories } from '@/lib/mock-data';
import { toast } from 'sonner';

export default function StudentSearch() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState('0');
  const [yearRange, setYearRange] = useState('all');

  const categories = getCategories();

  const filteredBooks = useMemo(() => {
    let filtered = mockBooks;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query) ||
        book.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }

    // Filter by rating
    if (minRating !== '0') {
      filtered = filtered.filter(book => book.rating >= parseFloat(minRating));
    }

    // Filter by year range
    if (yearRange !== 'all') {
      const currentYear = new Date().getFullYear();
      switch (yearRange) {
        case 'recent':
          filtered = filtered.filter(book => book.publishYear >= currentYear - 10);
          break;
        case 'classic':
          filtered = filtered.filter(book => book.publishYear < currentYear - 50);
          break;
        case 'modern':
          filtered = filtered.filter(book => book.publishYear >= currentYear - 50 && book.publishYear < currentYear - 10);
          break;
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
        case 'relevance':
        default:
          // Simple relevance based on search query matches
          if (!searchQuery) return 0;
          const aRelevance = (a.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0) +
                           (a.author.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0);
          const bRelevance = (b.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 2 : 0) +
                           (b.author.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0);
          return bRelevance - aRelevance;
      }
    });

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, minRating, yearRange]);

  const handleReserve = (bookId: string, bookTitle: string) => {
    toast.success(`Livro "${bookTitle}" reservado com sucesso!`);
  };

  const getAvailabilityStatus = (book: any) => {
    if (!book.available || book.availableCopies === 0) {
      return <Badge variant="destructive">Indisponível</Badge>;
    }
    if (book.availableCopies <= 2) {
      return <Badge className="bg-yellow-500">Últimas unidades</Badge>;
    }
    return <Badge className="bg-green-500">Disponível</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Pesquisar Livros</h1>
          <p className="text-muted-foreground">
            Encontre exatamente o que você está procurando
          </p>
        </div>

        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o título, autor, ou palavra-chave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12"
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros Avançados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoria</label>
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
                </div>

                {/* Rating Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avaliação Mínima</label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger>
                      <SelectValue placeholder="Avaliação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Qualquer avaliação</SelectItem>
                      <SelectItem value="3">3+ estrelas</SelectItem>
                      <SelectItem value="4">4+ estrelas</SelectItem>
                      <SelectItem value="4.5">4.5+ estrelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Período</label>
                  <Select value={yearRange} onValueChange={setYearRange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os períodos</SelectItem>
                      <SelectItem value="recent">Últimos 10 anos</SelectItem>
                      <SelectItem value="modern">Moderno (1970-2010)</SelectItem>
                      <SelectItem value="classic">Clássico (antes de 1970)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ordenar por</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevância</SelectItem>
                      <SelectItem value="title">Título</SelectItem>
                      <SelectItem value="author">Autor</SelectItem>
                      <SelectItem value="year">Ano</SelectItem>
                      <SelectItem value="rating">Avaliação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {filteredBooks.length} resultado{filteredBooks.length !== 1 ? 's' : ''} encontrado{filteredBooks.length !== 1 ? 's' : ''}
            {searchQuery && ` para "${searchQuery}"`}
          </p>
        </div>

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

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{book.location}</span>
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
                  
                  <Button
                    size="sm"
                    disabled={!book.available || book.availableCopies === 0}
                    onClick={() => handleReserve(book.id, book.title)}
                  >
                    {book.available && book.availableCopies > 0 ? (
                      <>
                        <Calendar className="mr-1 h-3 w-3" />
                        Reservar
                      </>
                    ) : (
                      'Indisponível'
                    )}
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
              <h3 className="text-lg font-medium mb-2">Nenhum resultado encontrado</h3>
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