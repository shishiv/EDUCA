'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, GraduationCap, Users, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export default function LoginPage() {
  const [userType, setUserType] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userType || !email || !password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const success = login(email, password, userType as 'student' | 'teacher' | 'librarian');
      
      if (success) {
        toast.success('Login realizado com sucesso!');
        router.push(`/dashboard/${userType}`);
      } else {
        toast.error('Credenciais inválidas');
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'student':
        return <GraduationCap className="h-6 w-6" />;
      case 'teacher':
        return <Users className="h-6 w-6" />;
      case 'librarian':
        return <UserCheck className="h-6 w-6" />;
      default:
        return <BookOpen className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-school-blue-50 via-white to-school-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <img
                src="/logo_jk.jpeg"
                alt="Escola Estadual João Kopke"
                className="school-logo-large shadow-lg"
              />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-school-blue-600/20 to-school-red-600/20"></div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-school-blue-800 mb-2">
            Escola Estadual João Kopke
          </h1>
          <p className="text-lg text-school-blue-600 mb-1">
            Sistema de Biblioteca
          </p>
          <p className="text-sm text-muted-foreground">
            Fronteira - MG
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl text-school-blue-800">Fazer Login</CardTitle>
            <CardDescription className="text-school-blue-600">
              Acesse sua conta para gerenciar a biblioteca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="userType" className="text-school-blue-700 font-medium">Tipo de Usuário</Label>
                <Select value={userType} onValueChange={setUserType} required>
                  <SelectTrigger className="h-12 border-school-blue-200 focus:border-school-blue-500 focus:ring-school-blue-500">
                    <div className="flex items-center gap-2">
                      {getUserTypeIcon(userType)}
                      <SelectValue placeholder="Selecione seu tipo de usuário" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-school-blue-600" />
                        Estudante
                      </div>
                    </SelectItem>
                    <SelectItem value="teacher">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-school-blue-600" />
                        Professor
                      </div>
                    </SelectItem>
                    <SelectItem value="librarian">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-school-blue-600" />
                        Bibliotecário
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-school-blue-700 font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-school-blue-200 focus:border-school-blue-500 focus:ring-school-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-school-blue-700 font-medium">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 border-school-blue-200 focus:border-school-blue-500 focus:ring-school-blue-500"
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 font-medium bg-school-blue-700 hover:bg-school-blue-800 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-school-blue-50 rounded-lg border border-school-blue-200">
              <p className="text-sm font-medium mb-2 text-school-blue-800">Credenciais de demonstração:</p>
              <div className="text-xs space-y-1 text-school-blue-600">
                <p><strong>Estudante:</strong> student@escola.com / password</p>
                <p><strong>Professor:</strong> teacher@escola.com / password</p>
                <p><strong>Bibliotecário:</strong> librarian@escola.com / password</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-school-blue-600">
          <p>© 2024 Escola Estadual João Kopke. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
}