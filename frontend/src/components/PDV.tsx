import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, Check, 
  Mail, Barcode 
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { 
  getMockProducts, saveMockProducts, 
  getMockSales, saveMockSales, 
  getMockLogs, saveMockLogs 
} from '../lib/mockData.ts';
import { Produto, Venda, EstoqueLog } from '../types/index.ts';

interface CartItem {
  produto: Produto;
  quantidade: number;
}

export const PDV: React.FC = () => {
  const { isMockMode } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteEmail, setClienteEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Animação temporária de feedback ao adicionar item
  const [addedItemAnimationId, setAddedItemAnimationId] = useState<string | null>(null);

  // Buscar produtos ao digitar ou ao abrir a tela
  const fetchProducts = async (term: string) => {
    setSearchLoading(true);
    try {
      if (isMockMode) {
        const mockProducts = getMockProducts();
        
        // Simular filtro no banco
        const filtered = mockProducts.filter(p => 
          p.nome.toLowerCase().includes(term.toLowerCase()) || 
          p.sku.toLowerCase().includes(term.toLowerCase())
        );
        
        setProdutos(filtered);
        setSearchLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE (Otimizado com paginação de 10 em 10) --
      let query = supabase
        .from('produtos')
        .select('*');

      if (term) {
        // Se houver termo, busca por SKU exato ou Nome parcial
        query = query.or(`sku.ilike.%${term}%,nome.ilike.%${term}%`);
      }

      const { data, error } = await query
        .order('nome')
        .range(0, 199);

      if (error) throw error;
      setProdutos(data || []);

    } catch (err: any) {
      console.error('Erro ao buscar produtos:', err);
      toast('Erro de busca', 'Incapaz de carregar catálogo de produtos.', 'error');
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, isMockMode]);

  // Processamento de código de barras escaneado
  const handleBarcodeScanned = async (barcode: string) => {
    toast('Código Lido', `Buscando SKU: ${barcode}...`, 'info');
    
    try {
      if (isMockMode) {
        const mockProducts = getMockProducts();
        const found = mockProducts.find(p => p.sku.toLowerCase() === barcode.toLowerCase());
        
        if (found) {
          addToCart(found);
        } else {
          toast('Não Encontrado', `Produto com o SKU "${barcode}" não está cadastrado localmente.`, 'warning');
        }
        return;
      }

      // -- MODO REAL DO SUPABASE --
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('sku', barcode)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        addToCart(data);
      } else {
        toast('Não Encontrado', `Produto com o SKU "${barcode}" não está cadastrado no Supabase.`, 'warning');
      }

    } catch (err: any) {
      console.error('Erro ao buscar código de barras:', err);
      toast('Erro de Scanner', 'Incapaz de consultar o código de barras no banco.', 'error');
    }
  };

  // Leitor de Código de Barras Global
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (isInput) {
        // Se já estiver digitando em algum campo do formulário, ignoramos a captura global
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (diff > 80) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        const cleanBuffer = buffer.trim();
        if (cleanBuffer.length >= 3) {
          e.preventDefault();
          handleBarcodeScanned(cleanBuffer);
          buffer = '';
        }
        return;
      }

      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isMockMode, cart, produtos]);

  const addToCart = (produto: Produto) => {
    if (produto.estoque <= 0) {
      toast('Sem Estoque', `O produto "${produto.nome}" está esgotado!`, 'warning');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find(item => item.produto.id === produto.id);
      if (existing) {
        if (existing.quantidade >= produto.estoque) {
          toast('Estoque Máximo', `Quantidade máxima de "${produto.nome}" no estoque é de ${produto.estoque}.`, 'warning');
          return prevCart;
        }
        return prevCart.map(item => 
          item.produto.id === produto.id 
            ? { ...item, quantidade: item.quantidade + 1 } 
            : item
        );
      }
      return [...prevCart, { produto, quantidade: 1 }];
    });

    // Ativar animação de pulso no item do carrinho
    setAddedItemAnimationId(produto.id);
    setTimeout(() => setAddedItemAnimationId(null), 500);

    toast('Adicionado!', `"${produto.nome}" foi colocado no carrinho.`, 'success');
  };

  const updateQuantity = (produtoId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart.map(item => {
        if (item.produto.id === produtoId) {
          const newQty = item.quantidade + delta;
          if (newQty <= 0) return null;
          if (newQty > item.produto.estoque) {
            toast('Estoque Máximo', `Apenas ${item.produto.estoque} unidades disponíveis.`, 'warning');
            return item;
          }
          return { ...item, quantidade: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (produtoId: string) => {
    setCart(prev => prev.filter(item => item.produto.id !== produtoId));
    toast('Item removido', 'Produto retirado do carrinho.', 'info');
  };

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.produto.preco * curr.quantidade), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast('Carrinho vazio', 'Adicione pelo menos um item para processar a venda.', 'warning');
      return;
    }

    setCheckoutLoading(true);

    try {
      if (isMockMode) {
        // --- CHECKOUT SIMULADO NO LOCAL STORAGE ---
        const mockProducts = getMockProducts();
        const mockSales = getMockSales();
        const mockLogs = getMockLogs();

        // 1. Validar e abater estoque
        const updatedProducts = mockProducts.map(p => {
          const cartItem = cart.find(ci => ci.produto.id === p.id);
          if (cartItem) {
            if (p.estoque < cartItem.quantidade) {
              throw new Error(`Estoque insuficiente para ${p.nome}. Disponível: ${p.estoque}`);
            }
            return {
              ...p,
              estoque: p.estoque - cartItem.quantidade,
              updated_at: new Date().toISOString()
            };
          }
          return p;
        });

        // 2. Criar a venda mock
        const newSaleId = 'venda-' + Math.random().toString(36).substring(2, 9);
        const newSale: Venda = {
          id: newSaleId,
          total: cartTotal,
          cliente_email: clienteEmail || null,
          usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
          created_at: new Date().toISOString(),
          itens: cart.map(ci => ({
            id: 'item-' + Math.random().toString(36).substring(2, 9),
            venda_id: newSaleId,
            produto_id: ci.produto.id,
            quantidade: ci.quantidade,
            preco_unitario: ci.produto.preco,
            produto: { nome: ci.produto.nome, sku: ci.produto.sku }
          }))
        };

        // 3. Criar Logs de Estoque
        const newLogs: EstoqueLog[] = cart.map(ci => ({
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          produto_id: ci.produto.id,
          quantidade: -ci.quantidade,
          tipo: 'venda',
          descricao: `Saída por Venda ID: ${newSaleId}`,
          usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
          created_at: new Date().toISOString(),
          produto: { nome: ci.produto.nome, sku: ci.produto.sku }
        }));

        // 4. Salvar no localStorage
        saveMockProducts(updatedProducts);
        saveMockSales([newSale, ...mockSales]);
        saveMockLogs([...newLogs, ...mockLogs]);

        // Simular envio de e-mail pela API do backend se fornecido
        if (clienteEmail) {
          toast('E-mail Agendado', `Enviando comprovante para ${clienteEmail} via backend...`, 'info');
          try {
            await fetch('http://localhost:3001/api/send-receipt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                vendaId: newSaleId,
                clienteEmail: clienteEmail
              })
            });
          } catch (e) {
            console.log('Simulação: Não foi possível alcançar o backend local para enviar e-mail.');
          }
        }

        toast('Venda Finalizada!', 'Venda processada e estoque reduzido localmente.', 'success');
        setCart([]);
        setClienteEmail('');
        setSearchTerm('');
        fetchProducts(''); // Recarregar produtos locais atualizados
        setCheckoutLoading(false);
        return;
      }

      // --- CHECKOUT REAL NO SUPABASE (CHAMADA ATÔMICA RPC) ---
      const payloadItens = cart.map(ci => ({
        produto_id: ci.produto.id,
        quantidade: ci.quantidade,
        preco_unitario: ci.produto.preco
      }));

      // Chamar RPC processar_venda configurada em SQL
      const { data: vendaId, error: rpcError } = await supabase.rpc('processar_venda', {
        p_cliente_email: clienteEmail || null,
        p_total: cartTotal,
        p_itens: payloadItens
      });

      if (rpcError) throw rpcError;

      // Disparar e-mail de comprovante se o e-mail estiver configurado
      if (clienteEmail && vendaId) {
        toast('Enviando e-mail', 'Disparando comprovante...', 'info');
        try {
          await fetch('http://localhost:3001/api/send-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendaId, clienteEmail })
          });
        } catch (e) {
          console.warn('Erro ao disparar chamada de e-mail na API do Express backend.');
        }
      }

      toast('Sucesso!', 'Venda registrada e integrada ao estoque com transação atômica!', 'success');
      setCart([]);
      setClienteEmail('');
      setSearchTerm('');
      fetchProducts('');
    } catch (err: any) {
      console.error('Erro na venda (checkout):', err);
      toast('Transação Negada', err.message || 'Erro inesperado ao realizar venda.', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3 animate-fade-in items-start">
      
      {/* Catálogo de Produtos (Esquerda - 2 colunas) */}
      <div className="lg:col-span-2 space-y-2">
        
        {/* Barra de Pesquisa e Scanner Banner */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Pesquise produtos por nome ou SKU..."
              className="pl-9 h-10 text-sm rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (produtos.length === 1) {
                    addToCart(produtos[0]);
                    setSearchTerm('');
                  } else if (searchTerm.trim()) {
                    handleBarcodeScanned(searchTerm.trim());
                    setSearchTerm('');
                  }
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/2 shrink-0 shadow-premium">
            <Barcode className="h-5 w-5 text-indigo-500 animate-pulse shrink-0" />
            <div className="text-left">
              <p className="text-[8px] text-muted-foreground font-extrabold uppercase leading-none">Scanner Global</p>
              <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">Aponte e scaneie!</p>
            </div>
          </div>
        </div>

        {/* Listagem do Catálogo */}
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Buscando no banco de dados...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border rounded-xl bg-card/20 text-muted-foreground">
            <p className="text-xs font-semibold">Nenhum produto cadastrado ou encontrado.</p>
            <p className="text-[10px] mt-1">Experimente buscar por outros termos ou gerencie o estoque na aba correspondente.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card shadow-md">
            {/* Cabeçalho da lista */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-3 py-1.5 bg-muted/40 border-b border-border text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Produto / SKU</span>
              <span className="text-right w-20">Preço</span>
              <span className="text-center w-16">Estoque</span>
              <span className="text-right w-20">Ação</span>
            </div>

            {/* Linhas dos produtos */}
            <div className="divide-y divide-border/60">
              {produtos.map((prod) => {
                const inStock = prod.estoque > 0;
                const isLowStock = prod.estoque <= prod.estoque_minimo && inStock;
                const isAnimating = addedItemAnimationId === prod.id;

                return (
                  <div
                    key={prod.id}
                    className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 px-3 py-1.5 transition-colors duration-150 ${
                      inStock
                        ? 'hover:bg-primary/5 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isAnimating ? 'bg-primary/10' : ''}`}
                    onClick={() => inStock && addToCart(prod)}
                  >
                    {/* Nome + SKU */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-snug" title={prod.nome}>
                        {prod.nome}
                      </p>
                      <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                        {prod.sku}
                      </p>
                    </div>

                    {/* Preço */}
                    <span className="w-20 text-right font-extrabold text-xs text-indigo-500 tabular-nums">
                      R$ {prod.preco.toFixed(2)}
                    </span>

                    {/* Estoque */}
                    <span className={`w-14 text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      !inStock
                        ? 'bg-red-500/10 text-red-500'
                        : isLowStock
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {prod.estoque}
                    </span>

                    {/* Botão Adicionar */}
                    <div className="w-20 flex justify-end">
                      <button
                        disabled={!inStock}
                        onClick={(e) => { e.stopPropagation(); inStock && addToCart(prod); }}
                        className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all duration-150 ${
                          inStock
                            ? 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {inStock ? '+' : '—'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Carrinho Lateral (Direita - 1 coluna) */}
      <Card className="border-border/60 shadow-xl flex flex-col max-h-[calc(100vh-8rem)] lg:sticky lg:top-24">
        <CardHeader className="pb-2 border-b border-border">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Carrinho
          </CardTitle>
          <CardDescription className="text-[10px]">
            Itens para processar a venda.
          </CardDescription>
        </CardHeader>

        {/* Conteúdo do Carrinho */}
        <CardContent className="flex-1 overflow-y-auto py-2 space-y-2 min-h-[150px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-xs font-semibold">O carrinho está vazio</p>
              <p className="text-[10px] text-center max-w-[200px]">Clique em um produto da lista para iniciar a venda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((item) => (
                <div key={item.produto.id} className="flex gap-2 py-2 items-center justify-between first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate leading-none mb-0.5">{item.produto.nome}</p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      {item.quantidade} x R$ {item.produto.preco.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center border border-input bg-background rounded-md h-7 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.produto.id, -1)}
                        className="px-1.5 hover:bg-muted text-muted-foreground flex items-center"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-6 text-center text-[10px] font-bold">{item.quantidade}</span>
                      <button 
                        onClick={() => updateQuantity(item.produto.id, 1)}
                        className="px-1.5 hover:bg-muted text-muted-foreground flex items-center"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.produto.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Rodapé e Fechamento */}
        <CardFooter className="flex flex-col border-t border-border pt-3 bg-muted/10 p-4 space-y-3">
          
          {/* Subtotal */}
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-muted-foreground">Valor Total:</span>
            <span className="text-xl font-extrabold text-primary">R$ {cartTotal.toFixed(2)}</span>
          </div>

          {/* E-mail de Comprovante */}
          {cart.length > 0 && (
            <div className="w-full space-y-1.5 border-t border-border pt-2">
              <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <Mail className="h-3 w-3" /> Comprovante por E-mail
              </span>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="cliente@email.com (opcional)"
                  className="pr-8 h-8 text-[11px]"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                />
                {clienteEmail && (
                  <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
            </div>
          )}

          {/* Botão de Finalizar */}
          <Button 
            className="w-full h-10 text-sm" 
            disabled={cart.length === 0 || checkoutLoading}
            onClick={handleCheckout}
          >
            {checkoutLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando transação...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Finalizar Venda
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
};
