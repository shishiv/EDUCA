'use client';

import { useState } from 'react';
import { Navigation } from '@/components/layout/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { 
  TrendingUp,
  BookOpen,
  Target,
  Calendar,
  Star,
  Trophy,
  Plus,
  Edit,
  Award
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';

const readingGoal = {
  target: 15,
  current: 12,
  deadline: '2024-12-31'
};

const monthlyProgress = [
  { month: 'Jan', books: 2, pages: 450 },
  { month: 'Fev', books: 1, pages: 320 },
  { month: 'Mar', books: 3, pages: 680 },
  { month: 'Abr', books: 2, pages: 520 },
  { month: 'Mai', books: 2, pages: 480 },
  { month: 'Jun', books: 2, pages: 510 }
];

const readingStats = {
  totalBooks: 12,
  totalPages: 2960,
  averageRating: 4.3,
  favoriteGenre: 'Literatura Brasileira',
  readingStreak: 45,
  fastestRead: 3,
  longestRead: 14
};

const achievements = [
  {
    id: 1,
    title: 'Primeiro Livro',
    description: 'Complete sua primeira leitura',
    icon: BookOpen,
    earned: true,
    earnedDate: '2024-01-15'
  },
  {
    id: 2,
    title: 'Leitor Dedicado',
    description: 'Leia 5 livros',
    icon: Target,
    earned: true,
    earnedDate: '2024-03-20'
  },
  {
    id: 3,
    title: 'Crítico Literário',
    description: 'Avalie 10 livros',
    icon: Star,
    earned: true,
    earnedDate: '2024-04-10'
  },
  {
    id: 4,
    title: 'Maratonista',
    description: 'Leia 10 livros em um ano',
    icon: Trophy,
    earned: true,
    earnedDate: '2024-05-15'
  },
  {
    id: 5,
    title: 'Especialista',
    description: 'Leia 15 livros em um ano',
    icon: Award,
    earned: false,
    progress: 80
  },
  {
    id: 6,
    title: 'Sequência Perfeita',
    description: 'Mantenha uma sequência de 30 dias',
    icon: Calendar,
    earned: true,
    earnedDate: '2024-04-25'
  }
];

export default function StudentProgress() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(readingGoal.target.toString());
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const progressPercentage = Math.round((readingGoal.current / readingGoal.target) * 100);
  const booksRemaining = readingGoal.target - readingGoal.current;
  const daysRemaining = Math.ceil((new Date(readingGoal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const handleUpdateGoal = () => {
    // Update goal logic here
    setIsEditingGoal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <main className="lg:ml-64 p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Progresso de Leitura</h1>
          <p className="text-muted-foreground">
            Acompanhe suas metas e conquistas de leitura
          </p>
        </div>

        {/* Reading Goal */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Meta de Leitura 2024
                </CardTitle>
                <CardDescription>
                  {readingGoal.current} de {readingGoal.target} livros lidos
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingGoal(!isEditingGoal)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Meta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingGoal ? (
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="w-32"
                />
                <Button onClick={handleUpdateGoal}>Salvar</Button>
                <Button variant="outline" onClick={() => setIsEditingGoal(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <>
                <Progress value={progressPercentage} className="h-4" />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{progressPercentage}% concluído</span>
                  <span className="font-medium">
                    {booksRemaining > 0 ? `${booksRemaining} livros restantes` : 'Meta alcançada! 🎉'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{daysRemaining}</p>
                    <p className="text-sm text-muted-foreground">dias restantes</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">
                      {booksRemaining > 0 ? Math.ceil(booksRemaining / (daysRemaining / 30)) : 0}
                    </p>
                    <p className="text-sm text-muted-foreground">livros/mês necessários</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingStats.totalBooks}</p>
                <p className="text-sm text-muted-foreground">Livros Lidos</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-green-100 mr-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingStats.totalPages.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Páginas Lidas</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-yellow-100 mr-4">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingStats.averageRating}</p>
                <p className="text-sm text-muted-foreground">Avaliação Média</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="p-3 rounded-full bg-purple-100 mr-4">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{readingStats.readingStreak}</p>
                <p className="text-sm text-muted-foreground">Dias Consecutivos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Mensal</CardTitle>
              <CardDescription>
                Livros lidos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="books" fill="#2563EB" name="Livros" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reading Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights de Leitura</CardTitle>
              <CardDescription>
                Estatísticas sobre seus hábitos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Gênero Favorito</span>
                <Badge variant="outline">{readingStats.favoriteGenre}</Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Leitura Mais Rápida</span>
                <span className="text-sm">{readingStats.fastestRead} dias</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Leitura Mais Longa</span>
                <span className="text-sm">{readingStats.longestRead} dias</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Média de Páginas/Livro</span>
                <span className="text-sm">{Math.round(readingStats.totalPages / readingStats.totalBooks)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Conquistas
            </CardTitle>
            <CardDescription>
              Desbloqueie conquistas conforme você lê mais livros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement) => {
                const Icon = achievement.icon;
                return (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border transition-all ${
                      achievement.earned 
                        ? 'bg-primary/5 border-primary/20' 
                        : 'bg-muted/50 border-muted'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${
                        achievement.earned 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${
                          achievement.earned ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {achievement.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        {achievement.earned ? (
                          <Badge className="mt-2 bg-green-500">
                            Conquistado em {new Date(achievement.earnedDate!).toLocaleDateString('pt-BR')}
                          </Badge>
                        ) : achievement.progress ? (
                          <div className="mt-2 space-y-1">
                            <Progress value={achievement.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {achievement.progress}% concluído
                            </p>
                          </div>
                        ) : (
                          <Badge variant="outline" className="mt-2">
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}