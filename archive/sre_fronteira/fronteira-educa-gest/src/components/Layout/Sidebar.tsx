
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  BookOpen,
  School,
  LogOut,
  Settings,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/avatar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Alunos', href: '/students', icon: Users },
  { name: 'Presença', href: '/attendance', icon: UserCheck },
  { name: 'Diário', href: '/diary', icon: BookOpen },
  { name: 'Escolas', href: '/schools', icon: School },
  { name: 'Relatórios', href: '/reports', icon: Calendar },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">EduFronteira</h1>
            <p className="text-xs text-gray-500">Prefeitura de Fronteira/MG</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User menu */}
      <SidebarUserMenu />
    </div>
  );
};

// Bloco de usuário centralizado no Sidebar
const SidebarUserMenu = () => {
  const { name, role, email, signOut } = useAuth();
  const navigate = useNavigate();

  // Gera iniciais do nome
  const getInitials = (nome: string) => {
    if (!nome) return '';
    const parts = nome.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex flex-col items-center mb-3">
        <Avatar className="w-12 h-12 text-white bg-blue-600 mb-2">
          <span className="font-bold text-lg">{getInitials(name)}</span>
        </Avatar>
        <div className="flex flex-col items-center min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name || 'Usuário'}</p>
          <p className="text-xs text-gray-500 truncate capitalize">{role}</p>
          <p className="text-xs text-gray-400 truncate">{email}</p>
        </div>
      </div>
      <div className="space-y-1">
        <Link
          to="/settings"
          className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-50"
        >
          <Settings className="mr-3 h-4 w-4 text-gray-400" />
          Configurações
        </Link>
        <button
          className="w-full group flex items-center px-3 py-2 text-sm font-medium text-red-700 rounded-md hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-3 h-4 w-4 text-red-400" />
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
