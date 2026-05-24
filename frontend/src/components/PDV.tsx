import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { Dialog } from './ui/dialog.tsx';
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, Check, 
  Mail, Barcode, Printer, Users, CreditCard, Coins
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { 
  getMockProducts, saveMockProducts, 
  getMockSales, saveMockSales, 
  getMockLogs, saveMockLogs,
  getMockClientes, saveMockClientes,
  getMockEmpresa
} from '../lib/mockData.ts';
import { Produto, Venda, EstoqueLog, Cliente, Empresa } from '../types/index.ts';

interface CartItem {
  produto: Produto;
  quantidade: number;
}

export const PDV: React.FC = () => {
  const { isMockMode, user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteEmail, setClienteEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Clientes e Cadastro Rápido
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [isNovoClienteOpen, setIsNovoClienteOpen] = useState(false);
  const [novoCliNome, setNovoCliNome] = useState('');
  const [novoCliEmail, setNovoCliEmail] = useState('');
  const [novoCliDoc, setNovoCliDoc] = useState('');
  const [novoCliTel, setNovoCliTel] = useState('');

  // Formas de Pagamento
  const [tipoPagamento, setTipoPagamento] = useState<'a_vista' | 'debito' | 'credito'>('a_vista');

  // Modal de Cupom / Impressão
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [latestSale, setLatestSale] = useState<Venda | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);

  const fetchClientesAndEmpresa = async () => {
    try {
      if (isMockMode) {
        setClientes(getMockClientes());
        setEmpresa(getMockEmpresa());
        return;
      }
      
      let clientsQuery = supabase.from('clientes').select('*');
      if (user?.id) {
        clientsQuery = clientsQuery.eq('usuario_id', user.id);
      }
      const { data: clientsData, error: clientsErr } = await clientsQuery.order('nome');
      
      if (clientsErr) {
        console.warn('Erro ao carregar clientes do Supabase (caindo para local):', clientsErr);
        setClientes(getMockClientes());
      } else if (clientsData) {
        setClientes(clientsData);
      } else {
        setClientes(getMockClientes());
      }
      
      let companyQuery = supabase.from('empresa_fiscal').select('*');
      if (user?.id) {
        companyQuery = companyQuery.eq('usuario_id', user.id);
      }
      const { data: companyData, error: companyErr } = await companyQuery.maybeSingle();
      
      if (companyErr) {
        console.warn('Erro ao carregar dados da empresa do Supabase (caindo para local):', companyErr);
        setEmpresa(getMockEmpresa());
      } else if (companyData) {
        setEmpresa(companyData);
      } else {
        setEmpresa(getMockEmpresa());
      }
    } catch (err) {
      console.error('Erro ao buscar dados cadastrais no PDV:', err);
      setClientes(getMockClientes());
      setEmpresa(getMockEmpresa());
    }
  };

  useEffect(() => {
    fetchClientesAndEmpresa();
  }, [isMockMode]);

  const handleNovoClienteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCliNome || !novoCliEmail) {
      toast('Campos obrigatórios', 'Nome e E-mail são requeridos.', 'warning');
      return;
    }

    try {
      const newClient: Cliente = {
        id: 'cli-' + Math.random().toString(36).substring(2, 9),
        nome: novoCliNome,
        email: novoCliEmail,
        documento: novoCliDoc || undefined,
        telefone: novoCliTel || undefined,
        created_at: new Date().toISOString()
      };

      if (isMockMode) {
        const list = getMockClientes();
        const updatedList = [newClient, ...list];
        saveMockClientes(updatedList);
        setClientes(updatedList);
        setSelectedClienteId(newClient.id);
        setClienteEmail(newClient.email);
        toast('Cliente Cadastrado!', `"${newClient.nome}" cadastrado com sucesso localmente.`, 'success');
      } else {
        try {
          const { data, error } = await supabase
            .from('clientes')
            .insert({
              nome: newClient.nome,
              email: newClient.email,
              documento: newClient.documento,
              telefone: newClient.telefone,
              usuario_id: user?.id
            })
            .select()
            .single();

          if (error) throw error;
          
          setClientes(prev => [data, ...prev]);
          setSelectedClienteId(data.id);
          setClienteEmail(data.email);
          toast('Cliente Cadastrado!', `"${data.nome}" cadastrado no Supabase.`, 'success');
        } catch (dbErr: any) {
          console.warn('Erro ao inserir cliente no Supabase, caindo para gravação local:', dbErr);
          const list = getMockClientes();
          const updatedList = [newClient, ...list];
          saveMockClientes(updatedList);
          setClientes(updatedList);
          setSelectedClienteId(newClient.id);
          setClienteEmail(newClient.email);
          toast('Salvo Localmente', `"${newClient.nome}" cadastrado localmente (Tabela ausente no Supabase).`, 'info');
        }
      }

      setIsNovoClienteOpen(false);
      setNovoCliNome('');
      setNovoCliEmail('');
      setNovoCliDoc('');
      setNovoCliTel('');
    } catch (err: any) {
      toast('Erro de Cadastro', err.message || 'Incapaz de registrar cliente.', 'error');
    }
  };

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

      if (user?.id) {
        query = query.eq('usuario_id', user.id);
      }

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
      let query = supabase
        .from('produtos')
        .select('*');

      if (user?.id) {
        query = query.eq('usuario_id', user.id);
      }

      const { data, error } = await query
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
      const selectedCli = clientes.find(c => c.id === selectedClienteId);

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

        // 2. Criar a venda mock com dados fiscais/comerciais
        const newSaleId = 'venda-' + Math.random().toString(36).substring(2, 9);
        const newSale: Venda = {
          id: newSaleId,
          total: cartTotal,
          cliente_email: clienteEmail || null,
          cliente_id: selectedClienteId || null,
          cliente_nome: selectedCli?.nome || null,
          cliente_documento: selectedCli?.documento || null,
          tipo_pagamento: tipoPagamento,
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

        setLatestSale(newSale);
        setIsReceiptOpen(true);
        toast('Venda Finalizada!', 'Venda processada e cupom gerado localmente.', 'success');
        setCart([]);
        setClienteEmail('');
        setSelectedClienteId('');
        setSearchTerm('');
        fetchProducts(''); // Recarregar produtos locais atualizados
        setCheckoutLoading(false);
        return;
      }

      // --- CHECKOUT REAL NO SUPABASE (CHAMADA DIRETA E SEGURA) ---
      const { data: saleData, error: saleErr } = await supabase
        .from('vendas')
        .insert({
          total: cartTotal,
          cliente_email: clienteEmail || null,
          cliente_id: selectedClienteId || null,
          cliente_nome: selectedCli?.nome || null,
          cliente_documento: selectedCli?.documento || null,
          tipo_pagamento: tipoPagamento,
          usuario_id: user?.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saleErr) {
        // Fallback robusto se a tabela não tiver colunas fiscais
        console.warn('Erro ao inserir com colunas novas, tentando fallback de RPC.');
        const payloadItens = cart.map(ci => ({
          produto_id: ci.produto.id,
          quantidade: ci.quantidade,
          preco_unitario: ci.produto.preco
        }));

        const { data: fallbackVendaId, error: rpcError } = await supabase.rpc('processar_venda', {
          p_cliente_email: clienteEmail || null,
          p_total: cartTotal,
          p_itens: payloadItens
        });

        if (rpcError) throw rpcError;

        const fallbackSale: Venda = {
          id: fallbackVendaId || 'venda-real',
          total: cartTotal,
          cliente_email: clienteEmail || null,
          tipo_pagamento: tipoPagamento,
          usuario_id: '',
          created_at: new Date().toISOString(),
          itens: cart.map(ci => ({
            id: '',
            venda_id: fallbackVendaId || '',
            produto_id: ci.produto.id,
            quantidade: ci.quantidade,
            preco_unitario: ci.produto.preco,
            produto: { nome: ci.produto.nome, sku: ci.produto.sku }
          }))
        };
        
        setLatestSale(fallbackSale);
        setIsReceiptOpen(true);
        toast('Sucesso!', 'Venda concluída com transação atômica (RPC)!', 'success');
        setCart([]);
        setClienteEmail('');
        setSelectedClienteId('');
        setSearchTerm('');
        fetchProducts('');
        setCheckoutLoading(false);
        return;
      }

      // 2. Inserir itens de venda
      const itemsToInsert = cart.map(ci => ({
        venda_id: saleData.id,
        produto_id: ci.produto.id,
        quantidade: ci.quantidade,
        preco_unitario: ci.produto.preco
      }));

      const { error: itemsErr } = await supabase
        .from('itens_venda')
        .insert(itemsToInsert);

      if (itemsErr) throw itemsErr;

      // 3. Atualizar estoque e Logs no Supabase
      for (const item of cart) {
        await supabase
          .from('produtos')
          .update({
            estoque: item.produto.estoque - item.quantidade,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.produto.id);

        await supabase
          .from('estoque_logs')
          .insert({
            produto_id: item.produto.id,
            quantidade: -item.quantidade,
            tipo: 'venda',
            descricao: `Saída por Venda ID: ${saleData.id}`,
            usuario_id: user?.id
          });
      }

      // Disparar comprovante por e-mail no backend Express se houver
      if (clienteEmail && saleData.id) {
        try {
          await fetch('http://localhost:3001/api/send-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendaId: saleData.id, clienteEmail })
          });
        } catch (e) {
          console.warn('Backend Express offline. Incapaz de despachar e-mail.');
        }
      }

      const createdSale: Venda = {
        ...saleData,
        itens: cart.map(ci => ({
          id: '',
          venda_id: saleData.id,
          produto_id: ci.produto.id,
          quantidade: ci.quantidade,
          preco_unitario: ci.produto.preco,
          produto: { nome: ci.produto.nome, sku: ci.produto.sku }
        }))
      };

      setLatestSale(createdSale);
      setIsReceiptOpen(true);
      toast('Sucesso!', 'Venda cadastrada e integrada ao banco Supabase!', 'success');
      setCart([]);
      setClienteEmail('');
      setSelectedClienteId('');
      setSearchTerm('');
      fetchProducts('');
    } catch (err: any) {
      console.error('Erro na venda (checkout):', err);

      // Fallback definitivo para Local Storage para não perder a venda
      const isDbError = err?.message?.includes('vendas') || 
                        err?.message?.includes('itens_venda') || 
                        err?.message?.includes('schema cache') || 
                        err?.message?.includes('relation') ||
                        err?.code === '42P01' || 
                        err?.code === 'PGRST116';

      if (isDbError || !isMockMode) {
        console.warn('Executando fallback local para gravação de venda devido a erro de banco/tabela...');
        try {
          const selectedCli = clientes.find(c => c.id === selectedClienteId);
          const mockProducts = getMockProducts();
          const mockSales = getMockSales();
          const mockLogs = getMockLogs();

          // 1. Validar e abater estoque localmente
          const updatedProducts = mockProducts.map(p => {
            const cartItem = cart.find(ci => ci.produto.id === p.id);
            if (cartItem) {
              return {
                ...p,
                estoque: Math.max(0, p.estoque - cartItem.quantidade),
                updated_at: new Date().toISOString()
              };
            }
            return p;
          });

          // 2. Criar a venda mock com dados fiscais/comerciais
          const newSaleId = 'venda-local-' + Math.random().toString(36).substring(2, 9);
          const newSale: Venda = {
            id: newSaleId,
            total: cartTotal,
            cliente_email: clienteEmail || null,
            cliente_id: selectedClienteId || null,
            cliente_nome: selectedCli?.nome || null,
            cliente_documento: selectedCli?.documento || null,
            tipo_pagamento: tipoPagamento,
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
            descricao: `Saída por Venda ID: ${newSaleId} (Salvo Localmente)`,
            usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
            created_at: new Date().toISOString(),
            produto: { nome: ci.produto.nome, sku: ci.produto.sku }
          }));

          // 4. Salvar no localStorage
          saveMockProducts(updatedProducts);
          saveMockSales([newSale, ...mockSales]);
          saveMockLogs([...newLogs, ...mockLogs]);

          setLatestSale(newSale);
          setIsReceiptOpen(true);
          toast('Salvo Localmente', 'Tabela de vendas ausente no Supabase. Venda concluída e salva localmente.', 'info');
          
          setCart([]);
          setClienteEmail('');
          setSelectedClienteId('');
          setSearchTerm('');
          fetchProducts('');
          setCheckoutLoading(false);
          return;
        } catch (fallbackErr) {
          console.error('Falha crítica ao executar fallback local:', fallbackErr);
        }
      }

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
          
          {/* Seletor de Cliente */}
          {cart.length > 0 && (
            <div className="w-full space-y-1.5 border-b border-border/40 pb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Users className="h-3 w-3 text-indigo-500" /> Identificar Cliente
                </span>
                <button
                  type="button"
                  onClick={() => setIsNovoClienteOpen(true)}
                  className="text-[9px] font-extrabold text-indigo-500 hover:underline"
                >
                  + Cadastrar
                </button>
              </div>
              <select
                className="premium-input h-8 text-[11px] bg-background"
                value={selectedClienteId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedClienteId(val);
                  const cli = clientes.find(c => c.id === val);
                  if (cli) {
                    setClienteEmail(cli.email);
                  } else {
                    setClienteEmail('');
                  }
                }}
              >
                <option value="">Consumidor Geral (Não Identificado)</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.documento || 'Sem CPF'})</option>
                ))}
              </select>
            </div>
          )}

          {/* Seletor de Forma de Pagamento */}
          {cart.length > 0 && (
            <div className="w-full space-y-1.5 border-b border-border/40 pb-2.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-indigo-500" /> Forma de Pagamento
              </span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'a_vista', label: 'À Vista', icon: <Coins className="h-3 w-3 mr-0.5" /> },
                  { id: 'debito', label: 'Débito', icon: <CreditCard className="h-3 w-3 mr-0.5" /> },
                  { id: 'credito', label: 'Crédito', icon: <CreditCard className="h-3 w-3 mr-0.5" /> }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTipoPagamento(opt.id as any)}
                    className={`h-7 px-1 rounded-md text-[10px] font-extrabold flex items-center justify-center border transition-all ${
                      tipoPagamento === opt.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-indigo-500/20'
                        : 'bg-background hover:bg-muted border-input text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtotal */}
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-muted-foreground">Valor Total:</span>
            <span className="text-xl font-extrabold text-primary">R$ {cartTotal.toFixed(2)}</span>
          </div>

          {/* E-mail de Comprovante */}
          {cart.length > 0 && (
            <div className="w-full space-y-1.5 border-t border-border/40 pt-2">
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

      {/* Modal 1: Cadastro Rápido de Cliente */}
      <Dialog
        isOpen={isNovoClienteOpen}
        onClose={() => setIsNovoClienteOpen(false)}
        title="Cadastrar Novo Cliente"
        description="Associe esta venda a um novo cliente cadastrando as informações rápidas abaixo."
      >
        <form onSubmit={handleNovoClienteSubmit} className="space-y-4">
          <Input
            label="Nome Completo do Cliente"
            placeholder="Ex: João da Silva"
            required
            value={novoCliNome}
            onChange={(e) => setNovoCliNome(e.target.value)}
          />
          <Input
            label="E-mail"
            type="email"
            placeholder="Ex: joao.silva@email.com"
            required
            value={novoCliEmail}
            onChange={(e) => setNovoCliEmail(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="CPF ou CNPJ"
              placeholder="Ex: 123.456.789-00"
              value={novoCliDoc}
              onChange={(e) => setNovoCliDoc(e.target.value)}
            />
            <Input
              label="Telefone / WhatsApp"
              placeholder="Ex: (11) 98888-8888"
              value={novoCliTel}
              onChange={(e) => setNovoCliTel(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNovoClienteOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Cadastrar e Selecionar
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 2: Emissão e Impressão de Cupom */}
      <Dialog
        isOpen={isReceiptOpen}
        onClose={() => { setIsReceiptOpen(false); setLatestSale(null); }}
        title="Venda Processada com Sucesso!"
        description="O cupom foi emitido no formato padrão para bobina térmica."
      >
        {latestSale && (
          <div className="space-y-4">
            
            {/* Bobina Térmica visual */}
            <div className="border border-border/80 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 font-mono text-[11px] leading-relaxed max-w-[340px] mx-auto shadow-inner space-y-2 border-t-4 border-t-primary select-none">
              
              <div className="text-center font-bold text-sm uppercase">
                {empresa?.nome_fantasia || 'LOJA PDV'}
              </div>
              <div className="text-center leading-tight opacity-90">
                {empresa?.razao_social || 'LOJA PDV E ESTOQUE LTDA'}
              </div>
              <div className="text-center leading-tight opacity-95 text-[10px]">
                CNPJ: {empresa?.cnpj || '12.345.678/0001-90'}
              </div>
              <div className="text-center leading-tight opacity-95 text-[10px]">
                IE: {empresa?.inscricao_estadual || '111.222.333.444'}
              </div>
              <div className="text-center leading-tight opacity-90 text-[10px] truncate">
                {empresa?.endereco || 'Rua Principal, 100 - São Paulo/SP'}
              </div>
              
              <div className="border-t border-dashed border-slate-400 dark:border-slate-600 my-2" />
              
              <div className="text-center font-bold text-[10px] tracking-widest uppercase">
                CUPOM DE VENDA (NÃO FISCAL)
              </div>
              
              <div className="border-t border-dashed border-slate-400 dark:border-slate-600 my-2" />
              
              <div><strong>Venda ID:</strong> #{latestSale.id.substring(0, 8)}</div>
              <div><strong>Data:</strong> {new Date(latestSale.created_at).toLocaleString('pt-BR')}</div>
              {latestSale.cliente_nome && (
                <div className="pt-1">
                  <div><strong>Cliente:</strong> {latestSale.cliente_nome}</div>
                  <div><strong>CPF/CNPJ:</strong> {latestSale.cliente_documento || '—'}</div>
                </div>
              )}
              
              <div className="border-t border-dashed border-slate-400 dark:border-slate-600 my-2" />
              
              {/* Itens */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[1fr_auto] font-bold text-[10px] text-slate-500 uppercase">
                  <span>Descrição / Qtd</span>
                  <span className="text-right">Total</span>
                </div>
                {(latestSale.itens || []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto] gap-2 items-baseline">
                    <span className="truncate max-w-[190px]">
                      {item.quantidade}x {item.produto?.nome || 'Item Venda'}
                    </span>
                    <span className="text-right font-bold">
                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-dashed border-slate-400 dark:border-slate-600 my-2" />
              
              <div className="flex justify-between text-xs font-extrabold">
                <span>VALOR TOTAL:</span>
                <span>R$ {latestSale.total.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between mt-1 text-[10px] opacity-90">
                <span>PAGAMENTO:</span>
                <span className="uppercase">
                  {latestSale.tipo_pagamento === 'credito' 
                    ? 'Cartão de Crédito' 
                    : latestSale.tipo_pagamento === 'debito' 
                    ? 'Cartão de Débito' 
                    : 'À Vista (Dinheiro/Pix)'}
                </span>
              </div>
              
              <div className="border-t border-dashed border-slate-400 dark:border-slate-600 my-2" />
              
              <div className="text-center font-bold tracking-wider text-[10px] pt-1">
                *** OBRIGADO PELA PREFERÊNCIA! ***
              </div>
              
            </div>

            {/* Ações de Impressão */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => { setIsReceiptOpen(false); setLatestSale(null); }}
              >
                Fechar Caixa
              </Button>
              <Button 
                className="flex-1 shadow-glow-primary"
                onClick={() => {
                  const emp = empresa || {
                    razao_social: 'SISTEMA DE VENDAS VNI LTDA',
                    nome_fantasia: 'Sistema VNI',
                    cnpj: '12.345.678/0001-90',
                    inscricao_estadual: '111.222.333.444',
                    regime_tributario: 'Simples Nacional',
                    endereco: 'Rua Principal, 100 - São Paulo/SP',
                    telefone: '(11) 3333-3333'
                  };
                  
                  // Helper de Impressão Térmica Dedicada
                  const printWindow = window.open('', '_blank', 'width=350,height=600');
                  if (!printWindow) {
                    toast('Bloqueador Ativo', 'Permita popups para abrir a impressão.', 'warning');
                    return;
                  }
                  
                  const itemsHtml = (latestSale.itens || []).map(item => `
                    <tr>
                      <td style="padding: 4px 0;">${item.quantidade}x ${item.produto?.nome || 'Produto'}</td>
                      <td style="padding: 4px 0; text-align: right;">R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</td>
                    </tr>
                  `).join('');

                  const pagamentoLabel = latestSale.tipo_pagamento === 'credito' 
                    ? 'Cartão de Crédito' 
                    : latestSale.tipo_pagamento === 'debito' 
                    ? 'Cartão de Débito' 
                    : 'À Vista (Dinheiro/Pix)';
                  
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Imprimir Cupom</title>
                        <style>
                          body {
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 11px;
                            width: 270px;
                            margin: 0;
                            padding: 10px;
                            color: #000;
                          }
                          .center { text-align: center; }
                          .bold { font-weight: bold; }
                          .divider { border-top: 1px dashed #000; margin: 8px 0; }
                          table { width: 100%; border-collapse: collapse; }
                        </style>
                      </head>
                      <body>
                        <div class="center bold" style="font-size: 13px;">${emp.nome_fantasia || 'LOJA PDV'}</div>
                        <div class="center">${emp.razao_social || 'LOJA LTDA'}</div>
                        <div class="center">CNPJ: ${emp.cnpj || '00.000.000/0000-00'}</div>
                        <div class="center">IE: ${emp.inscricao_estadual || 'ISENTO'}</div>
                        <div class="center" style="font-size: 9px;">${emp.endereco || ''}</div>
                        <div class="divider"></div>
                        <div class="center bold" style="font-size: 10px; letter-spacing: 1px;">CUPOM DE VENDA (NÃO FISCAL)</div>
                        <div class="divider"></div>
                        <div><strong>Venda ID:</strong> #${latestSale.id.substring(0, 8)}</div>
                        <div><strong>Data:</strong> ${new Date(latestSale.created_at).toLocaleString('pt-BR')}</div>
                        ${latestSale.cliente_nome ? `
                          <div class="divider"></div>
                          <div><strong>Cliente:</strong> ${latestSale.cliente_nome}</div>
                          <div><strong>CPF/CNPJ:</strong> ${latestSale.cliente_documento || '—'}</div>
                        ` : ''}
                        <div class="divider"></div>
                        <table>
                          <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                              <th style="text-align: left; padding-bottom: 4px;">Descrição</th>
                              <th style="text-align: right; padding-bottom: 4px;">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${itemsHtml}
                          </tbody>
                        </table>
                        <div class="divider"></div>
                        <div style="display: flex; justify-content: space-between;">
                          <span class="bold">VALOR TOTAL:</span>
                          <span class="bold">R$ ${latestSale.total.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 10px;">
                          <span>PAGAMENTO:</span>
                          <span>${pagamentoLabel}</span>
                        </div>
                        <div class="divider"></div>
                        <div class="center bold" style="margin-top: 10px;">OBRIGADO PELA PREFERÊNCIA!</div>
                        <script>
                          window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                          }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
              >
                <Printer className="h-4 w-4 mr-1.5" /> Imprimir Cupom
              </Button>
            </div>

          </div>
        )}
      </Dialog>

    </div>
  );
};
