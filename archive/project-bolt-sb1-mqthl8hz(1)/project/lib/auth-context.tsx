'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'student' | 'teacher' | 'librarian';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const MOCK_USERS: Record<string, User> = {
  'student@escola.com': {
    id: '1',
    name: 'Ana Silva',
    email: 'student@escola.com',
    role: 'student',
  },
  'teacher@escola.com': {
    id: '2',
    name: 'Prof. Carlos Santos',
    email: 'teacher@escola.com',
    role: 'teacher',
  },
  'librarian@escola.com': {
    id: '3',
    name: 'Maria Oliveira',
    email: 'librarian@escola.com',
    role: 'librarian',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem('library-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        localStorage.removeItem('library-user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string, role: UserRole): boolean => {
    const mockUser = MOCK_USERS[email];
    
    if (mockUser && password === 'password' && mockUser.role === role) {
      setUser(mockUser);
      localStorage.setItem('library-user', JSON.stringify(mockUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('library-user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}