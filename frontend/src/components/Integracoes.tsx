import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  Plug2, RefreshCw, CheckCircle2, XCircle, ShoppingBag,
  ExternalLink, AlertTriangle, Package, Clock, Zap
} from 'lucide-react';
import { MLStatus, VendaML } from '../types/index.ts';

// URL base do backend (ajuste conforme seu ambiente)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const Integracoes: React.FC = () => {
  const { isMockMode } = useAuth();
  const { toast } = useToast();

  const [mlStatus, setMlStatus] = useState<MLStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Verificar status da conexão com ML ao carregar
  const fetchMLStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      if (isMockMode) {
        // Modo simulação: mostrar como desconectado
        setMlStatus({ connected: false, seller_id: null, vendas_ml: [] });
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/ml/status`);
      if (!res.ok) throw new Error('Falha ao buscar status do ML');
      const data: MLStatus = await res.json();
      setMlStatus(data);
    } catch (err: any) {
      console.error('Erro ao buscar status ML:', err);
      setMlStatus({ connected: false, seller_id: null, vendas_ml: [] });
    } finally {
      setLoadingStatus(false);
    }
  }, [isMockMode]);

  useEffect(() => {
    fetchMLStatus();

    // Verificar parâmetros de URL (retorno do OAuth)
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const status = params.get('status');

    if (tab === 'integracoes' && status === 'connected') {
      toast('Mercado Livre Conectado!', 'Sua conta foi vinculada com sucesso.', 'success');
      // Limpar parâmetros da URL
      window.history.replaceState({}, '', window.location.pathname);
      fetchMLStatus();
    } else if (status === 'error') {
      const reason = params.get('reason') || 'Erro desconhecido';
      toast('Falha na Conexão', `Erro ao conectar com o ML: ${reason}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Sincronização manual de pedidos
  const handleSync = async () => {
    if (isMockMode) {
      toast('Modo Simulação', 'A sincronização real requer o backend configurado.', 'warning');
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/ml/sync`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Falha na sincronização');

      toast(
        'Sincronização Concluída!',
        `${data.imported} pedido(s) importado(s) · ${data.skipped} já existentes`,
        'success'
      );
      fetchMLStatus(); // Recarregar a lista
    } catch (err: any) {
      toast('Erro de Sincronização', err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Iniciar fluxo OAuth com o ML
  const handleConnectML = () => {
    if (isMockMode) {
      toast('Modo Simulação', 'Configure as credenciais do ML no backend para conectar.', 'warning');
      return;
    }
    // Redirecionar para a rota de auth do backend
    window.location.href = `${BACKEND_URL}/auth/mercadolivre`;
  };

  const isConnected = mlStatus?.connected ?? false;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Cabeçalho */}
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Plug2 className="h-5 w-5 text-yellow-500" />
          Integrações
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Conecte plataformas externas para sincronizar vendas automaticamente ao seu estoque.
        </p>
      </div>

      {/* Card Mercado Livre */}
      <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-transparent shadow-xl overflow-hidden relative">
        {/* Detalhe visual de fundo */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Logo Mercado Livre */}
              <div className="h-14 w-14 rounded-2xl bg-[#FFE600] flex items-center justify-center shadow-lg shadow-yellow-500/30 shrink-0">
                <ShoppingBag className="h-7 w-7 text-[#333333]" />
              </div>
              <div>
                <CardTitle className="text-lg">Mercado Livre</CardTitle>
                <CardDescription className="mt-0.5">
                  Importe pedidos pagos automaticamente e sincronize o estoque em tempo real.
                </CardDescription>
              </div>
            </div>

            {/* Badge de status */}
            <div className="shrink-0">
              {loadingStatus ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                  <span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectado · ID {mlStatus?.seller_id}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">
                  <XCircle className="h-3.5 w-3.5" />
                  Desconectado
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Aviso de Modo Simulação */}
          {isMockMode && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold">Modo Simulação Ativo</p>
                <p className="mt-0.5 opacity-80">Configure o Supabase e o backend para ativar a integração real com o Mercado Livre.</p>
              </div>
            </div>
          )}

          {/* Ações: Conectar + Sincronizar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleConnectML}
              disabled={isConnected && !isMockMode}
              className="bg-[#FFE600] hover:bg-[#FFD600] text-[#333333] font-bold shadow-md shadow-yellow-500/20 border-0 disabled:opacity-60"
            >
              <Plug2 className="h-4 w-4 mr-2" />
              {isConnected ? 'Reconectar Mercado Livre' : 'Conectar Mercado Livre'}
            </Button>

            <Button
              variant="outline"
              onClick={handleSync}
              disabled={!isConnected || syncing || isMockMode}
              className="border-yellow-500/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Vendas Agora'}
            </Button>
          </div>

          {/* Divisor */}
          <div className="border-t border-border/60" />

          {/* Features/Capacidades da integração */}
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: <Zap className="h-4 w-4 text-yellow-500" />, title: 'Webhook Automático', desc: 'Pedidos chegam ao sistema em tempo real via notificações ML' },
              { icon: <Package className="h-4 w-4 text-blue-500" />, title: 'Estoque Sincronizado', desc: 'A quantidade é abatida automaticamente ao importar um pedido' },
              { icon: <Clock className="h-4 w-4 text-emerald-500" />, title: 'Anti-Duplicata', desc: 'IDs de pedidos ML são verificados antes de qualquer inserção' },
            ].map((feat) => (
              <div key={feat.title} className="flex gap-3 p-3 rounded-lg bg-card/60 border border-border/40">
                <div className="shrink-0 mt-0.5">{feat.icon}</div>
                <div>
                  <p className="text-xs font-bold">{feat.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </CardContent>
      </Card>

      {/* Histórico de Vendas Importadas */}
      <Card className="border-border/60 shadow-md">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-yellow-500" />
                Vendas Importadas do Mercado Livre
              </CardTitle>
              <CardDescription className="mt-0.5">
                Últimas {mlStatus?.vendas_ml?.length ?? 0} vendas sincronizadas do ML.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchMLStatus} className="text-muted-foreground">
              <RefreshCw className={`h-4 w-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
              <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Carregando histórico...</p>
            </div>
          ) : !mlStatus?.vendas_ml?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
              <p className="text-sm font-semibold">Nenhuma venda importada ainda.</p>
              <p className="text-xs mt-1">
                {isConnected
                  ? 'Clique em "Sincronizar Vendas Agora" para importar pedidos pagos.'
                  : 'Conecte sua conta do Mercado Livre para começar.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Pedido ML</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Produto(s)</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Qtd</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Origem</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mlStatus.vendas_ml.map((venda: VendaML) => {
                    const primeiroItem = venda.itens_venda?.[0];
                    const totalItens = venda.itens_venda?.reduce((acc, i) => acc + i.quantidade, 0) ?? 0;
                    const nomeProduto = primeiroItem?.produtos?.nome || '—';
                    const maisItens = (venda.itens_venda?.length ?? 0) > 1
                      ? ` +${(venda.itens_venda?.length ?? 1) - 1}`
                      : '';

                    return (
                      <tr key={venda.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded font-bold">
                              #{venda.ml_order_id || '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-xs truncate max-w-[200px]">
                            {nomeProduto}{maisItens && <span className="text-muted-foreground">{maisItens} item(s)</span>}
                          </p>
                          {venda.cliente_email && (
                            <p className="text-[10px] text-muted-foreground truncate">{venda.cliente_email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold">{totalItens}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-extrabold text-sm text-yellow-600 dark:text-yellow-400">
                            R$ {venda.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                            <ShoppingBag className="h-2.5 w-2.5" />
                            ML
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] text-muted-foreground font-mono">
                          {new Date(venda.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guia de Configuração */}
      <Card className="border-indigo-500/20 bg-indigo-500/3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <ExternalLink className="h-4 w-4" />
            Como Criar seu App no Mercado Livre Developers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside leading-relaxed">
            <li>Acesse <a href="https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline font-semibold">developers.mercadolivre.com.br</a> e faça login com sua conta de vendedor.</li>
            <li>Clique em <strong>"Criar Aplicação"</strong> e dê um nome (ex: "Sistema PDV Estoque").</li>
            <li>Em <strong>"URL de Redirecionamento"</strong>, coloque a URL do seu backend: <code className="bg-muted px-1 rounded">http://localhost:3001/auth/callback</code> (ou sua URL de produção).</li>
            <li>Habilite os escopos: <code className="bg-muted px-1 rounded">read_orders</code>, <code className="bg-muted px-1 rounded">offline_access</code>.</li>
            <li>Copie o <strong>App ID</strong> e o <strong>Secret Key</strong> gerados.</li>
            <li>Adicione-os ao arquivo <code className="bg-muted px-1 rounded">backend/.env</code> como <code className="bg-muted px-1 rounded">ML_CLIENT_ID</code> e <code className="bg-muted px-1 rounded">ML_CLIENT_SECRET</code>.</li>
            <li>Reinicie o backend e clique em <strong>"Conectar Mercado Livre"</strong> acima.</li>
          </ol>
        </CardContent>
      </Card>

    </div>
  );
};
