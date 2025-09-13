'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookPlus,
  Save,
  X,
  Upload,
  Scan
} from 'lucide-react';
import { toast } from 'sonner';

export default function LibrarianAddBook() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    description: '',
    publishYear: '',
    publisher: '',
    pages: '',
    language: 'Português',
    totalCopies: '1',
    location: '',
    tags: ''
  });

  const categories = [
    'Literatura Brasileira',
    'Literatura Estrangeira',
    'Romance',
    'Ficção Científica',
    'Fantasia',
    'Mistério',
    'Biografia',
    'História',
    'Ciências',
    'Filosofia',
    'Poesia',
    'Teatro',
    'Ensaio',
    'Crônica',
    'Infantil',
    'Juvenil',
    'Didático',
    'Técnico',
    'Religioso',
    'Autoajuda'
  ];

  const handleInputChange = (field: string, value: string) => {
    setBookData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBook = () => {
    // Validate required fields
    const requiredFields = ['title', 'author', 'isbn', 'category', 'publishYear', 'publisher', 'totalCopies', 'location'];
    const missingFields = requiredFields.filter(field => !bookData[field]);

    if (missingFields.length > 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validate ISBN format (basic check)
    if (bookData.isbn && !/^[\d-]+$/.test(bookData.isbn)) {
      toast.error('ISBN deve conter apenas números e hífens');
      return;
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    const year = parseInt(bookData.publishYear);
    if (year < 1000 || year > currentYear) {
      toast.error('Ano de publicação inválido');
      return;
    }

    // Validate pages
    if (bookData.pages && (parseInt(bookData.pages) < 1 || parseInt(bookData.pages) > 10000)) {
      toast.error('Número de páginas inválido');
      return;
    }

    // Validate copies
    if (parseInt(bookData.totalCopies) < 1 || parseInt(bookData.totalCopies) > 100) {
      toast.error('Número de exemplares deve estar entre 1 e 100');
      return;
    }

    // Here you would typically save to a database
    console.log('Saving book:', bookData);
    toast.success('Livro adicionado com sucesso!');
    
    // Reset form
    setBookData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      description: '',
      publishYear: '',
      publisher: '',
      pages: '',
      language: 'Português',
      totalCopies: '1',
      location: '',
      tags: ''
    });
  };

  const handleScanISBN = () => {
    // This would integrate with a barcode scanner or ISBN lookup service
    toast.info('Funcionalidade de escaneamento será implementada em breve');
  };

  const handleClearForm = () => {
    setBookData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      description: '',
      publishYear: '',
      publisher: '',
      pages: '',
      language: 'Português',
      totalCopies: '1',
      location: '',
      tags: ''
    });
    toast.info('Formulário limpo');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Adicionar Novo Livro</h1>
          <p className="text-muted-foreground">
            Cadastre um novo livro no acervo da biblioteca
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookPlus className="h-5 w-5" />
              Informações do Livro
            </CardTitle>
            <CardDescription>
              Preencha as informações básicas do livro. Campos marcados com * são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título *</label>
                <Input
                  placeholder="Digite o título do livro"
                  value={bookData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Autor *</label>
                <Input
                  placeholder="Digite o nome do autor"
                  value={bookData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                />
              </div>
            </div>

            {/* ISBN and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ISBN *</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="978-85-359-0277-5"
                    value={bookData.isbn}
                    onChange={(e) => handleInputChange('isbn', e.target.value)}
                  />
                  <Button variant="outline" onClick={handleScanISBN}>
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoria *</label>
                <Select value={bookData.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                placeholder="Digite uma breve descrição do livro..."
                value={bookData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Publication Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano de Publicação *</label>
                <Input
                  type="number"
                  placeholder="2024"
                  min="1000"
                  max={new Date().getFullYear()}
                  value={bookData.publishYear}
                  onChange={(e) => handleInputChange('publishYear', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Editora *</label>
                <Input
                  placeholder="Nome da editora"
                  value={bookData.publisher}
                  onChange={(e) => handleInputChange('publisher', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Páginas</label>
                <Input
                  type="number"
                  placeholder="256"
                  min="1"
                  max="10000"
                  value={bookData.pages}
                  onChange={(e) => handleInputChange('pages', e.target.value)}
                />
              </div>
            </div>

            {/* Language and Copies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Idioma</label>
                <Select value={bookData.language} onValueChange={(value) => handleInputChange('language', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Português">Português</SelectItem>
                    <SelectItem value="Inglês">Inglês</SelectItem>
                    <SelectItem value="Espanhol">Espanhol</SelectItem>
                    <SelectItem value="Francês">Francês</SelectItem>
                    <SelectItem value="Alemão">Alemão</SelectItem>
                    <SelectItem value="Italiano">Italiano</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Número de Exemplares *</label>
                <Input
                  type="number"
                  placeholder="1"
                  min="1"
                  max="100"
                  value={bookData.totalCopies}
                  onChange={(e) => handleInputChange('totalCopies', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Localização *</label>
                <Input
                  placeholder="Ex: Seção A - Prateleira 1"
                  value={bookData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags (separadas por vírgula)</label>
              <Input
                placeholder="Ex: clássico, romance, literatura brasileira"
                value={bookData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tags ajudam na busca e categorização do livro
              </p>
            </div>

            {/* Cover Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Capa do Livro</label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Clique para fazer upload ou arraste a imagem aqui
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, GIF (máx. 5MB)
                </p>
                <Button variant="outline" className="mt-2">
                  Selecionar Arquivo
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button onClick={handleSaveBook} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Salvar Livro
              </Button>
              <Button variant="outline" onClick={handleClearForm}>
                <X className="mr-2 h-4 w-4" />
                Limpar Formulário
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}