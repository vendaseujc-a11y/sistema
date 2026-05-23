import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, Check, 
  Sparkles, Mail, Send, AlertTriangle 
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

      // Limitamos a pesquisa a 10 itens para economizar egress
      const { data, error } = await query
        .order('nome')
        .range(0, 9);

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
    <div className="grid gap-6 lg:grid-cols-3 animate-fade-in items-start">
      
      {/* Catálogo de Produtos (Esquerda - 2 colunas) */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquise produtos por nome ou SKU..."
            className="pl-10 h-12 text-base rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Listagem do Catálogo */}
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Buscando no banco de dados...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl bg-card/20 text-muted-foreground">
            <p className="text-sm font-semibold">Nenhum produto cadastrado ou encontrado.</p>
            <p className="text-xs mt-1">Experimente buscar por outros termos ou gerencie o estoque na aba correspondente.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {produtos.map((prod) => {
              const inStock = prod.estoque > 0;
              const isLowStock = prod.estoque <= prod.estoque_minimo;
              const isAnimating = addedItemAnimationId === prod.id;
              
              return (
                <div 
                  key={prod.id}
                  onClick={() => inStock && addToCart(prod)}
                  className={`flex gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow-premium transition-all duration-300 ${
                    inStock 
                      ? 'cursor-pointer hover:shadow-premium-hover hover:border-primary/40 active:scale-98' 
                      : 'opacity-60 cursor-not-allowed'
                  } ${isAnimating ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                >
                  {/* Mock Image Box */}
                  <div className="w-20 h-20 bg-muted/60 dark:bg-muted/10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative border border-border">
                    {prod.imagem_url ? (
                      <img src={prod.imagem_url} alt={prod.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-muted-foreground/45" />
                    )}
                    
                    {/* Alerta de Estoque Baixo / Esgotado */}
                    {!inStock ? (
                      <div className="absolute inset-0 bg-red-600/80 backdrop-blur-[1px] flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider">
                        Esgotado
                      </div>
                    ) : isLowStock ? (
                      <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Estoque baixo" />
                    ) : null}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate leading-snug" title={prod.nome}>{prod.nome}</h4>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">SKU: {prod.sku}</p>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <span className="text-base font-extrabold text-indigo-500">
                        R$ {prod.preco.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isLowStock ? 'bg-amber-500/10 text-amber-500' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        Estoque: {prod.estoque} un
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Carrinho Lateral (Direita - 1 coluna) */}
      <Card className="border-border/60 shadow-xl flex flex-col max-h-[calc(100vh-10rem)] lg:sticky lg:top-24">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" /> Carrinho de Compras
          </CardTitle>
          <CardDescription>
            Itens selecionados para processar a transação.
          </CardDescription>
        </CardHeader>

        {/* Conteúdo do Carrinho */}
        <CardContent className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[200px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-xs font-semibold">O carrinho está vazio</p>
              <p className="text-[10px] text-center max-w-[200px]">Clique em um produto da lista para iniciar a venda.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((item) => (
                <div key={item.produto.id} className="flex gap-3 py-3 items-center justify-between first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate leading-none mb-1">{item.produto.nome}</p>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {item.quantidade} x R$ {item.produto.preco.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-input bg-background rounded-md h-8 overflow-hidden">
                      <button 
                        onClick={() => updateQuantity(item.produto.id, -1)}
                        className="px-2 hover:bg-muted text-muted-foreground text-sm flex items-center"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">{item.quantidade}</span>
                      <button 
                        onClick={() => updateQuantity(item.produto.id, 1)}
                        className="px-2 hover:bg-muted text-muted-foreground text-sm flex items-center"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.produto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Rodapé e Fechamento */}
        <CardFooter className="flex flex-col border-t border-border pt-4 bg-muted/10 p-6 space-y-4">
          
          {/* Subtotal */}
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-semibold text-muted-foreground">Valor Total:</span>
            <span className="text-2xl font-extrabold text-primary">R$ {cartTotal.toFixed(2)}</span>
          </div>

          {/* E-mail de Comprovante */}
          {cart.length > 0 && (
            <div className="w-full space-y-2 border-t border-border pt-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> Enviar comprovante por E-mail (Resend)
              </span>
              <div className="relative">
                <Input
                  type="email"
                  placeholder="cliente@email.com (opcional)"
                  className="pr-10 h-9 text-xs"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                />
                {clienteEmail && (
                  <Check className="absolute right-3 top-2.5 h-4 w-4 text-emerald-500" />
                )}
              </div>
            </div>
          )}

          {/* Botão de Finalizar */}
          <Button 
            className="w-full h-11" 
            disabled={cart.length === 0 || checkoutLoading}
            onClick={handleCheckout}
          >
            {checkoutLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando transação...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                Finalizar Venda (Checkout)
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>

    </div>
  );
};
