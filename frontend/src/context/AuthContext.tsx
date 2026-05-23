import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isMockMode: boolean;
  signOut: () => Promise<void>;
  signInMock: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  useEffect(() => {
    // Verificar se as credenciais do Supabase são as de placeholder
    const isUrlPlaceholder = import.meta.env.VITE_SUPABASE_URL?.includes('placeholder-url') || !import.meta.env.VITE_SUPABASE_URL;
    
    if (isUrlPlaceholder) {
      console.log('Ambiente de demonstração ativo. Utilizando autenticação simulada local.');
      setIsMockMode(true);
      
      // Carregar sessão mock salva se houver
      const savedUser = localStorage.getItem('mock_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setSession({
          access_token: 'mock-jwt-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: parsedUser
        } as Session);
      }
      setLoading(false);
      return;
    }

    // Inicialização da sessão com Supabase real
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error('Erro ao buscar sessão:', err);
      setIsMockMode(true);
      setLoading(false);
    });

    // Escutar mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (isMockMode) {
      localStorage.removeItem('mock_user');
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const signInMock = (email: string) => {
    const mockUser = {
      id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
      email,
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated'
    } as User;

    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setSession({
      access_token: 'mock-jwt-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: mockUser
    } as Session);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isMockMode, signOut, signInMock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
