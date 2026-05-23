import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { LogIn, Key, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export const Login: React.FC = () => {
  const { isMockMode, signInMock } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Campos obrigatórios', 'Por favor preencha e-mail e senha.', 'warning');
      return;
    }

    setLoading(true);

    if (isMockMode) {
      // Login simulado instantâneo
      setTimeout(() => {
        signInMock(email);
        setLoading(false);
        toast('Bem-vindo!', 'Você entrou no modo de simulação offline com sucesso.', 'success');
      }, 800);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast('Cadastro solicitado', 'Verifique seu e-mail para confirmar a ativação do seu usuário.', 'info');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast('Login efetuado', 'Conexão segura estabelecida com o Supabase.', 'success');
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      toast('Falha na autenticação', err.message || 'Erro inesperado ao autenticar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Decorative blurred gradients for rich aesthetics */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-violet-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand / Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mb-3 hover:scale-105 transition-transform duration-300">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            PDV & Estoque Inteligente
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão atômica e eficiente a custo zero.
          </p>
        </div>

        <Card className="border border-border/60 shadow-2xl backdrop-blur-md bg-card/95">
          <CardHeader className="text-center">
            <CardTitle>{isSignUp ? 'Criar Nova Conta' : 'Acesse Sua Conta'}</CardTitle>
            <CardDescription>
              {isMockMode 
                ? 'Insira qualquer credencial para entrar no modo de testes.' 
                : 'Conecte-se com sua identidade do Supabase Auth.'}
            </CardDescription>
          </CardHeader>
          
          {isMockMode && (
            <div className="mx-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Modo de Simulação Ativo:</span> Nenhuma conexão foi configurada com o Supabase. Você pode usar qualquer e-mail/senha para testar a interface completa localmente.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 mt-4">
              <Input
                label="Endereço de E-mail"
                type="email"
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Senha de Acesso"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Carregando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isSignUp ? <Key className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    {isSignUp ? 'Registrar Operador' : 'Entrar no Sistema'}
                  </span>
                )}
              </Button>

              {!isMockMode && (
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors text-center w-full"
                >
                  {isSignUp 
                    ? 'Já possui uma conta? Faça login aqui' 
                    : 'Não possui conta? Cadastre-se no banco de dados'}
                </button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
