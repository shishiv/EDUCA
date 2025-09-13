
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/lib/types';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Busca o perfil do usuário logado na tabela 'profiles'
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('[useAuth] fetchProfile resultado', { userId, data, error });

      if (error) throw error;
      if (!data) {
        console.warn('[useAuth] Nenhum perfil encontrado para o user_id:', userId);
      }
      setProfile(data);
    } catch (error) {
      setProfile(null);
      console.error('Error fetching profile:', error);
    }
  };

  // Login real via Supabase Auth
  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] signIn chamado', { email });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('[useAuth] signInWithPassword retorno', { data, error });
    return { error };
  };

  // Logout real via Supabase Auth
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user,
    // Papéis
    isAdmin: profile?.role === 'admin',
    isSecretary: profile?.role === 'secretaria',
    isTeacher: profile?.role === 'professor',
    isDirector: profile?.role === 'diretor',
    // isSuperAdmin removido até suporte real no enum
    // Dados do perfil para exibição
    name: profile?.name ?? '',
    email: user?.email ?? '',
    phone: profile?.phone ?? '',
    role: profile?.role ?? '',
    schoolId: profile?.school_id ?? null,
    userId: profile?.user_id ?? '',
    profileId: profile?.id ?? '',
  };
};
