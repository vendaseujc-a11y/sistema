import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './components/ui/toast.tsx';
import { Login } from './components/Login.tsx';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { PDV } from './components/PDV.tsx';
import { Estoque } from './components/Estoque.tsx';

// Componente Core interno para gerenciar visualização condicional baseada na autenticação
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'pdv' | 'estoque'>('dashboard');

  // Tela de Carregamento Premium
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin shadow-glow-primary" />
        <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase animate-pulse">
          Inicializando Sessão Segura...
        </p>
      </div>
    );
  }

  // Se não estiver logado, renderiza a tela de login
  if (!user) {
    return <Login />;
  }

  // Renderiza as telas baseado na Tab ativa na Sidebar
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'pdv':
        return <PDV />;
      case 'estoque':
        return <Estoque />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderTabContent()}
    </Layout>
  );
};

// Componente raiz que injeta os Providers globais
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
