'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Menu, 
  X, 
  LogOut, 
  Settings, 
  User,
  Bell
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

interface NavigationProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Navigation({ sidebarOpen, setSidebarOpen }: NavigationProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [notifications] = useState(3); // Mock notification count

  const handleLogout = () => {
    logout();
    toast.success('Logout realizado com sucesso');
    router.push('/');
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
        return 'Estudante';
      case 'teacher':
        return 'Professor';
      case 'librarian':
        return 'Bibliotecário';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'student':
        return 'bg-green-500';
      case 'teacher':
        return 'bg-school-blue-600';
      case 'librarian':
        return 'bg-school-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="flex h-16 items-center px-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          className="mr-2 px-2 lg:hidden hover:bg-school-blue-50"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? (
            <X className="h-6 w-6 text-school-blue-700" />
          ) : (
            <Menu className="h-6 w-6 text-school-blue-700" />
          )}
        </Button>

        {/* Logo and title */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src="/logo_jk.jpeg"
              alt="Escola Estadual João Kopke"
              className="school-logo"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-school-blue-800">João Kopke</h1>
            <p className="text-xs text-school-blue-600">Sistema de Biblioteca</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Right side - Notifications and user menu */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative hover:bg-school-blue-50">
            <Bell className="h-5 w-5 text-school-blue-700" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-school-red-600 hover:bg-school-red-700">
                {notifications}
              </Badge>
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-school-blue-50">
                <Avatar className="h-10 w-10 border-2 border-school-blue-200">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className={`${getRoleColor(user?.role || '')} text-white font-semibold`}>
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-school-blue-800">{user?.name}</p>
                  <p className="text-xs leading-none text-school-blue-600">
                    {user?.email}
                  </p>
                  <Badge variant="outline" className="w-fit border-school-blue-300 text-school-blue-700">
                    {getRoleLabel(user?.role || '')}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="hover:bg-school-blue-50">
                <User className="mr-2 h-4 w-4 text-school-blue-600" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-school-blue-50">
                <Settings className="mr-2 h-4 w-4 text-school-blue-600" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-50 text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}