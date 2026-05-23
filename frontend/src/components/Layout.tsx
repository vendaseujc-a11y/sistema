import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Button } from './ui/button.tsx';
import { 
  Sparkles, LayoutDashboard, ShoppingCart, 
  Package, LogOut, Sun, Moon, User as UserIcon, Menu, X, Plug2
} from 'lucide-react';

interface LayoutProps {
  currentTab: 'dashboard' | 'pdv' | 'estoque' | 'integracoes';
  setCurrentTab: (tab: 'dashboard' | 'pdv' | 'estoque' | 'integracoes') => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const { user, signOut, isMockMode } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Padrão: Modo Escuro premium
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Inicializar o tema
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { id: 'pdv', label: 'PDV (Frente de Caixa)', icon: <ShoppingCart className="h-5 w-5" /> },
    { id: 'estoque', label: 'Estoque', icon: <Package className="h-5 w-5" /> },
    { id: 'integracoes', label: 'Integrações', icon: <Plug2 className="h-5 w-5" /> },
  ] as const;

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-300">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-md shrink-0">
        {/* Header da Sidebar */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              PDV & Estoque
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold">FREE TIER OPTIMIZED</p>
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-glow-primary' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground shrink-0 border border-border">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate leading-none mb-1">
                {user?.email?.split('@')[0] || 'Operador'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate" title={user?.email}>
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" 
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair do Sistema
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="fixed top-0 bottom-0 left-0 w-64 bg-card border-r border-border p-4 flex flex-col z-50 animate-pop-in duration-200">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm">PDV & Estoque</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs truncate">{user?.email}</span>
              </div>
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/30 backdrop-blur-md sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold capitalize tracking-tight md:text-xl">
              {currentTab === 'pdv' ? 'Frente de Caixa (PDV)' : currentTab === 'integracoes' ? 'Integrações' : currentTab}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador de Mock Mode */}
            {isMockMode && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                Modo Simulação
              </span>
            )}
            
            {/* Theme Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full w-9 h-9" 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-indigo-400" />
              ) : (
                <Moon className="h-5 w-5 text-slate-600" />
              )}
            </Button>
          </div>
        </header>

        {/* Page Inner Container */}
        <main className="flex-1 p-6 relative">
          {children}
        </main>
      </div>

    </div>
  );
};
