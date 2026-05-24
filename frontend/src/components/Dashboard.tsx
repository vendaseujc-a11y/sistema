import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card.tsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  TrendingUp, DollarSign, AlertTriangle, 
  ShoppingBag, Sparkles, RefreshCw, Clock, Trash2,
  Package, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { 
  getMockProducts, saveMockProducts, 
  getMockSales, saveMockSales, 
  getMockLogs, saveMockLogs,
  getMockEmpresa
} from '../lib/mockData.ts';
import { Produto, Venda, EstoqueLog } from '../types/index.ts';

export const Dashboard: React.FC = () => {
  const { isMockMode, user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vendasHoje: 0,
    faturamentoHoje: 0,
    produtosBaixoEstoque: 0,
  });
  const [baixoEstoqueAlertas, setBaixoEstoqueAlertas] = useState<Produto[]>([]);
  const [vendasRecentes, setVendasRecentes] = useState<Venda[]>([]);
  
  // Novos Estados
  const [custoTotalEstoque, setCustoTotalEstoque] = useState(0);
  const [metrics, setMetrics] = useState({
    faturamento7d: 0, prevFaturamento7d: 0, change7d: 0,
    faturamento15d: 0, prevFaturamento15d: 0, change15d: 0,
    faturamento30d: 0, prevFaturamento30d: 0, change30d: 0,
  });
  const [top10Produtos, setTop10Produtos] = useState<any[]>([]);
  const [empresaName, setEmpresaName] = useState('Operador');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        // Obter dados simulados do localStorage
        const products = getMockProducts();
        const sales = getMockSales();
        const company = getMockEmpresa();
        
        if (company?.nome_fantasia) {
          setEmpresaName(company.nome_fantasia);
        } else {
          setEmpresaName('Operador');
        }

        // 1. Filtrar vendas feitas hoje
        const hojeStr = new Date().toDateString();
        const vendasDeHoje = sales.filter(s => new Date(s.created_at).toDateString() === hojeStr);
        const totalVendas = vendasDeHoje.length;
        const totalFaturado = vendasDeHoje.reduce((acc, curr) => acc + Number(curr.total), 0);

        // 2. Filtrar produtos com estoque baixo
        const produtosAlerta = products.filter(p => p.estoque <= p.estoque_minimo);
        
        setStats({
          vendasHoje: totalVendas,
          faturamentoHoje: totalFaturado,
          produtosBaixoEstoque: produtosAlerta.length,
        });

        setBaixoEstoqueAlertas(produtosAlerta.slice(0, 5));
        setVendasRecentes(sales.slice(0, 5));

        // 3. Custo Total de Estoque
        const costSum = products.reduce((acc, curr) => acc + (curr.estoque * (curr.preco_custo || 0)), 0);
        setCustoTotalEstoque(costSum);

        // 4. Métricas Comparativas
        const getPeriodFaturamento = (salesList: Venda[], daysStart: number, daysEnd: number) => {
          const nowTime = Date.now();
          const start = nowTime - 1000 * 60 * 60 * 24 * daysStart;
          const end = nowTime - 1000 * 60 * 60 * 24 * daysEnd;
          return salesList
            .filter(s => {
              const d = new Date(s.created_at).getTime();
              return d >= start && d < end;
            })
            .reduce((acc, curr) => acc + Number(curr.total), 0);
        };

        const f7 = getPeriodFaturamento(sales, 7, 0);
        const p7 = getPeriodFaturamento(sales, 14, 7);
        const diff7 = p7 > 0 ? ((f7 - p7) / p7) * 100 : f7 > 0 ? 100 : 0;

        const f15 = getPeriodFaturamento(sales, 15, 0);
        const p15 = getPeriodFaturamento(sales, 30, 15);
        const diff15 = p15 > 0 ? ((f15 - p15) / p15) * 100 : f15 > 0 ? 100 : 0;

        const f30 = getPeriodFaturamento(sales, 30, 0);
        const p30 = getPeriodFaturamento(sales, 60, 30);
        const diff30 = p30 > 0 ? ((f30 - p30) / p30) * 100 : f30 > 0 ? 100 : 0;

        setMetrics({
          faturamento7d: f7, prevFaturamento7d: p7, change7d: diff7,
          faturamento15d: f15, prevFaturamento15d: p15, change15d: diff15,
          faturamento30d: f30, prevFaturamento30d: p30, change30d: diff30,
        });

        // 5. Top 10 Produtos Mais Vendidos
        const productQtyMap: { [key: string]: { produto_nome: string, quantidade_vendida: number, total_faturado: number } } = {};
        sales.forEach(sale => {
          (sale.itens || []).forEach(item => {
            const pid = item.produto_id;
            const pName = item.produto?.nome || 'Produto';
            if (!productQtyMap[pid]) {
              productQtyMap[pid] = { produto_nome: pName, quantidade_vendida: 0, total_faturado: 0 };
            }
            productQtyMap[pid].quantidade_vendida += item.quantidade;
            productQtyMap[pid].total_faturado += item.quantidade * item.preco_unitario;
          });
        });

        const top10 = Object.values(productQtyMap)
          .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
          .slice(0, 10);
        setTop10Produtos(top10);

        setLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE --
      // Buscar dados da empresa
      try {
        let compQuery = supabase
          .from('empresa_fiscal')
          .select('nome_fantasia');

        if (user?.id) {
          compQuery = compQuery.eq('usuario_id', user.id);
        }

        const { data: companyData, error: companyErr } = await compQuery.maybeSingle();

        if (companyErr) throw companyErr;

        if (companyData?.nome_fantasia) {
          setEmpresaName(companyData.nome_fantasia);
        } else {
          setEmpresaName('Operador');
        }
      } catch (companyErr) {
        console.warn('Erro ao buscar dados da empresa no Dashboard:', companyErr);
        const company = getMockEmpresa();
        if (company?.nome_fantasia) {
          setEmpresaName(company.nome_fantasia);
        } else {
          setEmpresaName('Operador');
        }
      }

      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      const hojeIso = hoje.toISOString();

      // 1. Buscar vendas de hoje
      let salesQuery = supabase
        .from('vendas')
        .select('total')
        .gte('created_at', hojeIso);

      if (user?.id) {
        salesQuery = salesQuery.eq('usuario_id', user.id);
      }

      const { data: salesToday, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      const totalVendas = salesToday?.length || 0;
      const totalFaturado = salesToday?.reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

      // 2. Buscar contagem de estoque baixo
      let stockQuery = supabase
        .from('produtos')
        .select('*');

      if (user?.id) {
        stockQuery = stockQuery.eq('usuario_id', user.id);
      }

      const { data: lowStockProducts, error: stockError } = await stockQuery;

      if (stockError) throw stockError;

      const produtosAlerta = (lowStockProducts || []).filter(p => p.estoque <= p.estoque_minimo);

      setStats({
        vendasHoje: totalVendas,
        faturamentoHoje: totalFaturado,
        produtosBaixoEstoque: produtosAlerta.length,
      });
      setBaixoEstoqueAlertas(produtosAlerta.slice(0, 5));

      // 3. Buscar vendas recentes
      let recentSalesQuery = supabase
        .from('vendas')
        .select(`
          id,
          total,
          cliente_email,
          created_at,
          itens_venda (
            quantidade,
            preco_unitario,
            produtos (nome, sku)
          )
        `);

      if (user?.id) {
        recentSalesQuery = recentSalesQuery.eq('usuario_id', user.id);
      }

      const { data: recentSales, error: recentError } = await recentSalesQuery
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      
      // Formatar itens para bater com a interface
      const formattedSales: Venda[] = (recentSales || []).map((sale: any) => ({
        id: sale.id,
        total: Number(sale.total),
        cliente_email: sale.cliente_email,
        usuario_id: '',
        created_at: sale.created_at,
        itens: sale.itens_venda.map((item: any) => ({
          produto: {
            nome: item.produtos?.nome || 'Produto',
            sku: item.produtos?.sku || ''
          }
        }))
      }));

      setVendasRecentes(formattedSales);

      // 4. Custo Total de Estoque no Supabase
      let allProdsQuery = supabase
        .from('produtos')
        .select('estoque, preco_custo');

      if (user?.id) {
        allProdsQuery = allProdsQuery.eq('usuario_id', user.id);
      }

      const { data: allProds, error: allProdsErr } = await allProdsQuery;
        
      if (allProdsErr) throw allProdsErr;
      const costSum = (allProds || []).reduce((acc, curr) => acc + (curr.estoque * (curr.preco_custo || 0)), 0);
      setCustoTotalEstoque(costSum);

      // 5. Métricas Comparativas no Supabase
      let allSalesQuery = supabase
        .from('vendas')
        .select('total, created_at');

      if (user?.id) {
        allSalesQuery = allSalesQuery.eq('usuario_id', user.id);
      }

      const { data: allSales, error: allSalesErr } = await allSalesQuery;

      if (allSalesErr) throw allSalesErr;

      const getPeriodFaturamentoReal = (salesList: any[], daysStart: number, daysEnd: number) => {
        const nowTime = Date.now();
        const start = nowTime - 1000 * 60 * 60 * 24 * daysStart;
        const end = nowTime - 1000 * 60 * 60 * 24 * daysEnd;
        return salesList
          .filter(s => {
            const d = new Date(s.created_at).getTime();
            return d >= start && d < end;
          })
          .reduce((acc, curr) => acc + Number(curr.total), 0);
      };

      const rf7 = getPeriodFaturamentoReal(allSales || [], 7, 0);
      const rp7 = getPeriodFaturamentoReal(allSales || [], 14, 7);
      const rdiff7 = rp7 > 0 ? ((rf7 - rp7) / rp7) * 100 : rf7 > 0 ? 100 : 0;

      const rf15 = getPeriodFaturamentoReal(allSales || [], 15, 0);
      const rp15 = getPeriodFaturamentoReal(allSales || [], 30, 15);
      const rdiff15 = rp15 > 0 ? ((rf15 - rp15) / rp15) * 100 : rf15 > 0 ? 100 : 0;

      const rf30 = getPeriodFaturamentoReal(allSales || [], 30, 0);
      const rp30 = getPeriodFaturamentoReal(allSales || [], 60, 30);
      const rdiff30 = rp30 > 0 ? ((rf30 - rp30) / rp30) * 100 : rf30 > 0 ? 100 : 0;

      setMetrics({
        faturamento7d: rf7, prevFaturamento7d: rp7, change7d: rdiff7,
        faturamento15d: rf15, prevFaturamento15d: rp15, change15d: rdiff15,
        faturamento30d: rf30, prevFaturamento30d: rp30, change30d: rdiff30,
      });

      // 6. Top 10 Produtos Mais Vendidos no Supabase
      let allItensQuery = supabase
        .from('itens_venda')
        .select('quantidade, preco_unitario, produtos!inner(nome, usuario_id)');

      if (user?.id) {
        allItensQuery = allItensQuery.eq('produtos.usuario_id', user.id);
      }

      const { data: allItens, error: allItensErr } = await allItensQuery;

      if (!allItensErr && allItens) {
        const productQtyMapReal: { [key: string]: { produto_nome: string, quantidade_vendida: number, total_faturado: number } } = {};
        allItens.forEach((item: any) => {
          const pName = item.produtos?.nome || 'Produto';
          if (!productQtyMapReal[pName]) {
            productQtyMapReal[pName] = { produto_nome: pName, quantidade_vendida: 0, total_faturado: 0 };
          }
          productQtyMapReal[pName].quantidade_vendida += item.quantidade;
          productQtyMapReal[pName].total_faturado += item.quantidade * item.preco_unitario;
        });

        const rTop10 = Object.values(productQtyMapReal)
          .sort((a, b) => b.quantidade_vendida - a.quantidade_vendida)
          .slice(0, 10);
        setTop10Produtos(rTop10);
      }

    } catch (err: any) {
      console.error('Erro no dashboard:', err);
      toast('Erro de carregamento', 'Falha ao buscar indicadores em tempo real.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSale = async (vendaId: string) => {
    const confirm = window.confirm(`Deseja realmente cancelar/excluir a Venda #${vendaId.substring(0, 8)}? Esta ação irá deletar os itens e reajustar o estoque.`);
    if (!confirm) return;

    try {
      if (isMockMode) {
        // --- PROCESSAMENTO LOCAL DE EXCLUSÃO MOCK ---
        const salesList = getMockSales();
        const productsList = getMockProducts();
        const logsList = getMockLogs();

        const saleToDelete = salesList.find(s => s.id === vendaId);
        if (!saleToDelete) return;

        // Reverter estoque para cada produto vendido
        const updatedProducts = productsList.map(prod => {
          const item = saleToDelete.itens?.find(i => i.produto_id === prod.id);
          if (item) {
            return {
              ...prod,
              estoque: prod.estoque + item.quantidade,
              updated_at: new Date().toISOString()
            };
          }
          return prod;
        });

        // Gravar log de cancelamento
        const newLogs: EstoqueLog[] = (saleToDelete.itens || []).map(item => ({
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          tipo: 'entrada' as const,
          descricao: `Retorno por Cancelamento da Venda #${vendaId.substring(0, 8)}`,
          usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
          created_at: new Date().toISOString(),
          produto: item.produto
        }));

        saveMockProducts(updatedProducts);
        saveMockSales(salesList.filter(s => s.id !== vendaId));
        saveMockLogs([...newLogs, ...logsList]);

        toast('Venda Cancelada', 'Estoque reabastecido localmente.', 'success');
        fetchDashboardData();
        return;
      }

      // --- PROCESSAMENTO REAL DO SUPABASE ---
      // 1. Buscar os itens da venda antes de deletar para repor o estoque
      const { data: itens, error: itensError } = await supabase
        .from('itens_venda')
        .select('produto_id, quantidade')
        .eq('venda_id', vendaId);

      if (itensError) throw itensError;

      // 2. Devolver a quantidade ao estoque de cada produto
      if (itens && itens.length > 0) {
        for (const item of itens) {
          // Obter estoque atual do produto
          const { data: prod } = await supabase
            .from('produtos')
            .select('estoque')
            .eq('id', item.produto_id)
            .single();

          if (prod) {
            await supabase
              .from('produtos')
              .update({ estoque: prod.estoque + item.quantidade, updated_at: new Date().toISOString() })
              .eq('id', item.produto_id);

            // Criar log de retorno
            await supabase
              .from('estoque_logs')
              .insert({
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                tipo: 'entrada',
                descricao: `Devolução por exclusão de Venda #${vendaId.substring(0, 8)}`,
                usuario_id: (await supabase.auth.getUser()).data.user?.id
              });
          }
        }
      }

      // 3. Excluir a venda (os itens de venda serão excluídos em cascata no Postgres)
      const { error: deleteError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', vendaId);

      if (deleteError) throw deleteError;

      toast('Venda Excluída', 'Registro removido e estoque restabelecido no Supabase.', 'success');
      fetchDashboardData();

    } catch (err: any) {
      console.error('Erro ao excluir venda:', err);
      toast('Erro de Exclusão', err.message || 'Erro inesperado ao excluir venda.', 'error');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isMockMode]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 to-violet-950/20 dark:from-indigo-950/50 dark:to-background p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-md shadow-premium">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            Olá, {empresaName} <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" />
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Aqui está a visão geral das operações do seu PDV e Estoque hoje.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchDashboardData} 
          disabled={loading}
          className="self-start md:self-auto flex items-center gap-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Dados
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/60 hover:border-primary/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Faturamento de Hoje</span>
            <DollarSign className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {stats.faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> +12.3% em relação a ontem
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-emerald-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estoque (Preço Custo)</span>
            <Package className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {custoTotalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total investido em mercadoria
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 hover:border-indigo-500/30 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendas Efetuadas</span>
            <ShoppingBag className="h-5 w-5 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{stats.vendasHoje}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Frente de caixa ativa no balcão
            </p>
          </CardContent>
        </Card>

        <Card className={`border-border/60 hover:border-amber-500/30 transition-all duration-300 ${stats.produtosBaixoEstoque > 0 ? 'bg-amber-500/5 dark:bg-amber-500/2 border-amber-500/20' : ''}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alertas de Estoque</span>
            <AlertTriangle className={`h-5 w-5 ${stats.produtosBaixoEstoque > 0 ? 'text-amber-500 animate-bounce' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{stats.produtosBaixoEstoque}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.produtosBaixoEstoque > 0 
                ? 'Itens atingiram o limite mínimo de alerta' 
                : 'Todos os níveis dentro do esperado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Comparativas */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Últimos 7 Dias', value: metrics.faturamento7d, prev: metrics.prevFaturamento7d, diff: metrics.change7d },
          { label: 'Últimos 15 Dias', value: metrics.faturamento15d, prev: metrics.prevFaturamento15d, diff: metrics.change15d },
          { label: 'Últimos 30 Dias', value: metrics.faturamento30d, prev: metrics.prevFaturamento30d, diff: metrics.change30d }
        ].map((m, idx) => {
          const isUp = m.diff >= 0;
          return (
            <Card key={idx} className="border-border/60 shadow-sm relative overflow-hidden bg-card/60 backdrop-blur-md">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className="text-xl font-black mt-1 text-indigo-500">
                    R$ {m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Anterior: R$ {m.prev.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-bold shrink-0 ${
                  isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {isUp ? '+' : ''}{m.diff.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid: Low stock vs Recent sales */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Alertas de Estoque Baixo */}
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas de Estoque Baixo
            </CardTitle>
            <CardDescription>
              Adquira mercadoria para os produtos abaixo para evitar desabastecimento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {baixoEstoqueAlertas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                🎉 Excelente! Nenhum produto com estoque crítico no momento.
              </div>
            ) : (
              <div className="space-y-4">
                {baixoEstoqueAlertas.map((prod) => (
                  <div 
                    key={prod.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{prod.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">SKU: {prod.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-destructive">{prod.estoque} unidades</p>
                      <p className="text-[10px] text-muted-foreground">Mínimo: {prod.estoque_minimo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendas Recentes */}
        <Card className="border-border/60 shadow-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Vendas Recentes
            </CardTitle>
            <CardDescription>
              Listagem das últimas saídas concluídas no caixa do PDV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vendasRecentes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma venda registrada hoje. Comece a vender no menu PDV!
              </div>
            ) : (
              <div className="space-y-4">
                {vendasRecentes.map((venda) => (
                  <div 
                    key={venda.id} 
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {venda.itens && venda.itens.length > 0 
                          ? venda.itens.map(i => i.produto?.nome || 'Item').join(', ') 
                          : 'Venda Geral'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {venda.cliente_email || 'Cliente não identificado'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-indigo-500">R$ {venda.total.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(venda.created_at).toLocaleTimeString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full animate-fade-in"
                        onClick={() => handleDeleteSale(venda.id)}
                        title="Excluir Venda"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Produtos Mais Vendidos */}
      <Card className="border-border/60 shadow-md bg-gradient-to-br from-card to-indigo-500/2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4 animate-pulse" /> Classificação dos Top 10 Produtos Mais Vendidos
          </CardTitle>
          <CardDescription>
            Lista de produtos de maior circulação e volume de vendas faturadas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Rank</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Quantidade Vendida</TableHead>
                  <TableHead className="text-right">Faturamento Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top10Produtos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma venda registrada para compilar os top 10 produtos.
                    </TableCell>
                  </TableRow>
                ) : (
                  top10Produtos.map((prod: any, idx: number) => {
                    const colors = [
                      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20',
                      'bg-slate-400/10 text-slate-500 dark:text-slate-300 border border-slate-400/20',
                      'bg-amber-600/10 text-amber-700 dark:text-amber-500 border border-amber-600/20'
                    ];
                    const rankClass = idx < 3 
                      ? colors[idx]
                      : 'bg-muted text-muted-foreground';
                    
                    return (
                      <TableRow key={idx} className="hover:bg-muted/10">
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-black ${rankClass}`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-xs">{prod.produto_nome}</TableCell>
                        <TableCell className="text-center font-extrabold text-xs">{prod.quantidade_vendida} un</TableCell>
                        <TableCell className="text-right font-black text-xs text-indigo-500">
                          R$ {prod.total_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};
