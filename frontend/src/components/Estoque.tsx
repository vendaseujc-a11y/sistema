import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardContent } from './ui/card.tsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Dialog } from './ui/dialog.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  Plus, PackageOpen, ChevronLeft, ChevronRight, History, Trash2, Barcode,
  FileUp, FileSpreadsheet, ChevronDown, ChevronUp, FileCode
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { 
  getMockProducts, saveMockProducts, 
  getMockLogs, saveMockLogs 
} from '../lib/mockData.ts';
import { Produto, EstoqueLog } from '../types/index.ts';

export const Estoque: React.FC = () => {
  const { isMockMode, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [logs, setLogs] = useState<EstoqueLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Paginação Rigorosa (10 em 10)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Estados dos Modais
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [isNovoProdutoModalOpen, setIsNovoProdutoModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Estado para Entrada de Mercadoria
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [entradaQuantidade, setEntradaQuantidade] = useState(1);
  const [entradaDescricao, setEntradaDescricao] = useState('');
  const [entradaLoading, setEntradaLoading] = useState(false);

  // Estado para Novo Produto
  const [novoNome, setNovoNome] = useState('');
  const [novoSku, setNovoSku] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoPrecoCusto, setNovoPrecoCusto] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [novoEstoqueMinimo, setNovoEstoqueMinimo] = useState('');
  const [novoLoading, setNovoLoading] = useState(false);

  // Estados para dados fiscais no Novo Produto
  const [novoNcm, setNovoNcm] = useState('');
  const [novoCfop, setNovoCfop] = useState('');
  const [novoIcms, setNovoIcms] = useState('');
  const [novoPis, setNovoPis] = useState('');
  const [novoCofins, setNovoCofins] = useState('');
  const [showFiscalFields, setShowFiscalFields] = useState(false);

  // Estados para Importação XML
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false);
  const [xmlItems, setXmlItems] = useState<any[]>([]);
  const [xmlIssuerName, setXmlIssuerName] = useState('');
  const [xmlIssuerCnpj, setXmlIssuerCnpj] = useState('');
  const [xmlLoading, setXmlLoading] = useState(false);

  // Carregar produtos com paginação estrita
  const fetchInventory = async (page: number) => {
    setLoading(true);
    try {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      if (isMockMode) {
        const mockProducts = getMockProducts();
        setTotalCount(mockProducts.length);
        
        // Paginar localmente
        const paginated = mockProducts.slice(from, to + 1);
        setProdutos(paginated);
        setLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE (Otimizado de 10 em 10) --
      let query = supabase
        .from('produtos')
        .select('*', { count: 'exact' });

      if (user?.id) {
        query = query.eq('usuario_id', user.id);
      }

      const { data, count, error } = await query
        .order('nome')
        .range(from, to);

      if (error) throw error;

      setProdutos(data || []);
      setTotalCount(count || 0);

    } catch (err: any) {
      console.error('Erro ao buscar estoque:', err);
      toast('Erro de carregamento', 'Incapaz de buscar registros de estoque.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Carregar Logs de estoque (Audit Trail)
  const fetchLogs = async () => {
    try {
      if (isMockMode) {
        const mockLogs = getMockLogs();
        setLogs(mockLogs.slice(0, 15)); // Últimos 15 logs
        return;
      }

      // -- MODO REAL DO SUPABASE (Otimizado com limite) --
      let query = supabase
        .from('estoque_logs')
        .select(`
          id,
          quantidade,
          tipo,
          descricao,
          created_at,
          produtos (nome, sku)
        `);

      if (user?.id) {
        query = query.eq('usuario_id', user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      
      const formattedLogs: EstoqueLog[] = (data || []).map((log: any) => ({
        id: log.id,
        produto_id: '',
        quantidade: log.quantidade,
        tipo: log.tipo as any,
        descricao: log.descricao,
        usuario_id: '',
        created_at: log.created_at,
        produto: {
          nome: log.produtos?.nome || 'Produto',
          sku: log.produtos?.sku || ''
        }
      }));

      setLogs(formattedLogs);

    } catch (err: any) {
      console.error('Erro ao buscar logs de estoque:', err);
    }
  };

  useEffect(() => {
    fetchInventory(currentPage);
  }, [currentPage, isMockMode]);

  // Abertura do modal de entrada de mercadoria
  const openEntradaModal = (prod: Produto) => {
    setSelectedProduto(prod);
    setEntradaQuantidade(1);
    setEntradaDescricao('Entrada manual de mercadoria no estoque.');
    setIsEntradaModalOpen(true);
  };

  // Processar entrada manual de mercadoria
  const handleEntradaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduto || entradaQuantidade <= 0) return;

    setEntradaLoading(true);
    try {
      if (isMockMode) {
        // --- PROCESSAMENTO LOCAL DE ENTRADA ---
        const products = getMockProducts();
        const logsList = getMockLogs();

        // 1. Atualizar produto
        const updated = products.map(p => 
          p.id === selectedProduto.id 
            ? { ...p, estoque: p.estoque + entradaQuantidade, updated_at: new Date().toISOString() }
            : p
        );

        // 2. Gravar log
        const newLog: EstoqueLog = {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          produto_id: selectedProduto.id,
          quantidade: entradaQuantidade,
          tipo: 'entrada',
          descricao: entradaDescricao,
          usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
          created_at: new Date().toISOString(),
          produto: { nome: selectedProduto.nome, sku: selectedProduto.sku }
        };

        saveMockProducts(updated);
        saveMockLogs([newLog, ...logsList]);

        toast('Estoque Atualizado', `Adicionadas ${entradaQuantidade} unidades ao item "${selectedProduto.nome}".`, 'success');
        setIsEntradaModalOpen(false);
        fetchInventory(currentPage);
        setEntradaLoading(false);
        return;
      }

      // --- PROCESSAMENTO REAL DO SUPABASE ---
      // 1. Atualizar o estoque na tabela 'produtos'
      const { error: productUpdateError } = await supabase
        .from('produtos')
        .update({ 
          estoque: selectedProduto.estoque + entradaQuantidade,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProduto.id);

      if (productUpdateError) throw productUpdateError;

      // 2. Inserir log de estoque
      const { error: logInsertError } = await supabase
        .from('estoque_logs')
        .insert({
          produto_id: selectedProduto.id,
          quantidade: entradaQuantidade,
          tipo: 'entrada',
          descricao: entradaDescricao,
          usuario_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (logInsertError) throw logInsertError;

      toast('Estoque Atualizado', `Entrada de ${entradaQuantidade} unidades concluída com sucesso no banco.`, 'success');
      setIsEntradaModalOpen(false);
      fetchInventory(currentPage);

    } catch (err: any) {
      console.error('Erro ao dar entrada no estoque:', err);
      toast('Erro de Atualização', err.message || 'Erro ao registrar entrada de mercadoria.', 'error');
    } finally {
      setEntradaLoading(false);
    }
  };

  // Cadastrar novo produto
  const handleNovoProdutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome || !novoSku || !novoPreco || !novoPrecoCusto || !novoEstoque) {
      toast('Campos obrigatórios', 'Por favor preencha os campos essenciais do cadastro (nome, sku, custo, venda, estoque).', 'warning');
      return;
    }

    setNovoLoading(true);
    const precoNum = parseFloat(novoPreco);
    const precoCustoNum = parseFloat(novoPrecoCusto);
    const estoqueInt = parseInt(novoEstoque);
    const estoqueMinInt = parseInt(novoEstoqueMinimo) || 0;

    try {
      if (isMockMode) {
        // --- CADASTRO SIMULADO LOCAL ---
        const products = getMockProducts();
        const logsList = getMockLogs();

        // Validar SKU único localmente
        if (products.some(p => p.sku === novoSku)) {
          throw new Error('Já existe um produto com este SKU no cadastro local.');
        }

        const newId = 'prod-' + Math.random().toString(36).substring(2, 9);
        const newProduct: Produto = {
          id: newId,
          nome: novoNome,
          sku: novoSku,
          preco: precoNum,
          preco_custo: precoCustoNum,
          estoque: estoqueInt,
          estoque_minimo: estoqueMinInt,
          imagem_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ncm: novoNcm || null,
          cfop: novoCfop || null,
          icms_aliquota: novoIcms ? parseFloat(novoIcms) : null,
          pis_aliquota: novoPis ? parseFloat(novoPis) : null,
          cofins_aliquota: novoCofins ? parseFloat(novoCofins) : null
        };

        const newLog: EstoqueLog = {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          produto_id: newId,
          quantidade: estoqueInt,
          tipo: 'entrada',
          descricao: 'Carga de estoque inicial (Novo produto)',
          usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
          created_at: new Date().toISOString(),
          produto: { nome: novoNome, sku: novoSku }
        };

        saveMockProducts([newProduct, ...products]);
        saveMockLogs([newLog, ...logsList]);

        toast('Produto Cadastrado', `"${novoNome}" cadastrado e adicionado ao estoque local.`, 'success');
        setIsNovoProdutoModalOpen(false);
        resetNovoForm();
        fetchInventory(currentPage);
        setNovoLoading(false);
        return;
      }

      // --- CADASTRO REAL NO SUPABASE ---
      // 1. Inserir na tabela 'produtos'
      let newProd = null;
      let insertError = null;
      try {
        const { data, error } = await supabase
          .from('produtos')
          .insert({
            nome: novoNome,
            sku: novoSku,
            preco: precoNum,
            preco_custo: precoCustoNum,
            estoque: estoqueInt,
            estoque_minimo: estoqueMinInt,
            ncm: novoNcm || null,
            cfop: novoCfop || null,
            icms_aliquota: novoIcms ? parseFloat(novoIcms) : null,
            pis_aliquota: novoPis ? parseFloat(novoPis) : null,
            cofins_aliquota: novoCofins ? parseFloat(novoCofins) : null
          })
          .select()
          .single();
        newProd = data;
        insertError = error;
      } catch (insertErr: any) {
        insertError = insertErr;
      }

      if (insertError) {
        const isColumnError = insertError.message?.includes('ncm') || 
                              insertError.message?.includes('cfop') || 
                              insertError.message?.includes('aliquota') || 
                              insertError.message?.includes('preco_custo');
        
        if (isColumnError) {
          console.warn('Novas colunas ausentes no Supabase. Tentando cadastro simplificado...');
          const { data: newProdSimplified, error: simplifiedErr } = await supabase
            .from('produtos')
            .insert({
              nome: novoNome,
              sku: novoSku,
              preco: precoNum,
              estoque: estoqueInt,
              estoque_minimo: estoqueMinInt
            })
            .select()
            .single();

          if (simplifiedErr) throw simplifiedErr;
          
          if (newProdSimplified && estoqueInt > 0) {
            try {
              await supabase
                .from('estoque_logs')
                .insert({
                  produto_id: newProdSimplified.id,
                  quantidade: estoqueInt,
                  tipo: 'entrada',
                  descricao: 'Estoque inicial do novo produto (Simplificado).'
                });
            } catch (logErr) {
              console.warn('Erro ao inserir log no Supabase (ignorando):', logErr);
            }
          }

          toast('Produto Cadastrado!', `"${novoNome}" cadastrado sem dados fiscais (Banco desatualizado).`, 'info');
          setIsNovoProdutoModalOpen(false);
          resetNovoForm();
          fetchInventory(currentPage);
          return;
        } else {
          throw insertError;
        }
      }

      // 2. Inserir log de estoque
      if (newProd && estoqueInt > 0) {
        try {
          await supabase
            .from('estoque_logs')
            .insert({
              produto_id: newProd.id,
              quantidade: estoqueInt,
              tipo: 'entrada',
              descricao: 'Estoque inicial do novo produto.',
              usuario_id: (await supabase.auth.getUser()).data.user?.id
            });
        } catch (logErr) {
          console.warn('Erro ao inserir log no Supabase (ignorando):', logErr);
        }
      }

      toast('Sucesso!', `Produto "${novoNome}" adicionado com sucesso ao Supabase!`, 'success');
      setIsNovoProdutoModalOpen(false);
      resetNovoForm();
      fetchInventory(currentPage);

    } catch (err: any) {
      console.error('Erro ao cadastrar produto:', err);
      
      // Fallback definitivo local se der erro de banco
      const isDbError = err?.message?.includes('produtos') || 
                        err?.message?.includes('estoque_logs') || 
                        err?.message?.includes('schema cache') || 
                        err?.message?.includes('relation') ||
                        err?.code === '42P01' || 
                        err?.code === 'PGRST116';

      if (isDbError || !isMockMode) {
        console.warn('Caindo para cadastro local de produto devido a erro de banco/tabela...');
        try {
          const products = getMockProducts();
          const logsList = getMockLogs();

          if (products.some(p => p.sku === novoSku)) {
            toast('Erro de SKU', 'Já existe um produto com este SKU no cadastro local.', 'error');
            setNovoLoading(false);
            return;
          }

          const newId = 'prod-' + Math.random().toString(36).substring(2, 9);
          const newProduct: Produto = {
            id: newId,
            nome: novoNome,
            sku: novoSku,
            preco: precoNum,
            preco_custo: precoCustoNum,
            estoque: estoqueInt,
            estoque_minimo: estoqueMinInt,
            imagem_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ncm: novoNcm || null,
            cfop: novoCfop || null,
            icms_aliquota: novoIcms ? parseFloat(novoIcms) : null,
            pis_aliquota: novoPis ? parseFloat(novoPis) : null,
            cofins_aliquota: novoCofins ? parseFloat(novoCofins) : null
          };

          const newLog: EstoqueLog = {
            id: 'log-' + Math.random().toString(36).substring(2, 9),
            produto_id: newId,
            quantidade: estoqueInt,
            tipo: 'entrada',
            descricao: 'Carga de estoque inicial (Salvo Localmente)',
            usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
            created_at: new Date().toISOString(),
            produto: { nome: novoNome, sku: novoSku }
          };

          saveMockProducts([newProduct, ...products]);
          saveMockLogs([newLog, ...logsList]);

          toast('Salvo Localmente', `"${novoNome}" cadastrado localmente (Tabela de produtos ausente/desatualizada).`, 'info');
          setIsNovoProdutoModalOpen(false);
          resetNovoForm();
          fetchInventory(currentPage);
          setNovoLoading(false);
          return;
        } catch (fallbackErr) {
          console.error('Falha crítica ao executar fallback local para novo produto:', fallbackErr);
        }
      }

      toast('Erro de Cadastro', err.message || 'Verifique se o SKU é único.', 'error');
    } finally {
      setNovoLoading(false);
    }
  };

  const handleDeleteProduct = async (produtoId: string, produtoNome: string) => {
    const confirm = window.confirm(`Deseja realmente excluir o produto "${produtoNome}"? Esta ação é irreversível.`);
    if (!confirm) return;

    try {
      if (isMockMode) {
        const mockProducts = getMockProducts();
        const updated = mockProducts.filter(p => p.id !== produtoId);
        saveMockProducts(updated);
        toast('Produto Excluído', `"${produtoNome}" foi removido do estoque local.`, 'success');
        fetchInventory(currentPage);
        return;
      }

      // -- MODO REAL DO SUPABASE --
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', produtoId);

      if (error) {
        // Código 23503 do Postgres indica violação de Foreign Key
        if (error.code === '23503' || error.message?.includes('foreign key')) {
          toast('Exclusão Impedida', 'Este produto já possui vendas registradas e não pode ser excluído por motivos de histórico comercial.', 'error');
        } else {
          throw error;
        }
        return;
      }

      toast('Excluído', `"${produtoNome}" foi removido do Supabase.`, 'success');
      fetchInventory(currentPage);

    } catch (err: any) {
      console.error('Erro ao excluir produto:', err);
      toast('Erro de Exclusão', err.message || 'Erro inesperado ao remover produto.', 'error');
    }
  };

  const resetNovoForm = () => {
    setNovoNome('');
    setNovoSku('');
    setNovoPreco('');
    setNovoPrecoCusto('');
    setNovoEstoque('');
    setNovoEstoqueMinimo('');
    setNovoNcm('');
    setNovoCfop('');
    setNovoIcms('');
    setNovoPis('');
    setNovoCofins('');
    setShowFiscalFields(false);
  };

  // Processar Upload do XML de NF-e
  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Extrair Emitente
        const emitNome = xmlDoc.getElementsByTagName("xNome")[0]?.textContent || 'Emitente Desconhecido';
        const emitCnpj = xmlDoc.getElementsByTagName("CNPJ")[0]?.textContent || '00.000.000/0000-00';
        
        setXmlIssuerName(emitNome);
        setXmlIssuerCnpj(emitCnpj);
        
        // Extrair Itens da Nota
        const items: any[] = [];
        const detNodes = xmlDoc.getElementsByTagName("det");
        
        for (let i = 0; i < detNodes.length; i++) {
          const node = detNodes[i];
          const prodNode = node.getElementsByTagName("prod")[0];
          if (prodNode) {
            const nome = prodNode.getElementsByTagName("xProd")[0]?.textContent || 'Produto sem nome';
            const sku = prodNode.getElementsByTagName("cProd")[0]?.textContent || '';
            const quantidade = parseFloat(prodNode.getElementsByTagName("qCom")[0]?.textContent || '0');
            const preco_custo = parseFloat(prodNode.getElementsByTagName("vUnCom")[0]?.textContent || '0');
            const ncm = prodNode.getElementsByTagName("NCM")[0]?.textContent || '';
            const cfop = prodNode.getElementsByTagName("CFOP")[0]?.textContent || '5102';
            
            items.push({ nome, sku, quantidade, preco_custo, ncm, cfop });
          }
        }
        
        if (items.length === 0) {
          toast('Erro no XML', 'Nenhum produto foi encontrado no arquivo XML anexado.', 'error');
          return;
        }
        
        setXmlItems(items);
        toast('XML Processado', `${items.length} itens extraídos do XML com sucesso!`, 'success');
      } catch (err: any) {
        console.error('Erro ao ler XML:', err);
        toast('Erro de Leitura', 'Incapaz de analisar o arquivo XML da NF-e.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Confirmar Importação do XML de NF-e para o Estoque
  const handleXmlImportConfirm = async () => {
    if (xmlItems.length === 0) return;
    setXmlLoading(true);
    
    try {
      if (isMockMode) {
        const mockProducts = getMockProducts();
        const logsList = getMockLogs();
        
        let productsUpdated = [...mockProducts];
        let logsCreated: EstoqueLog[] = [];
        
        xmlItems.forEach((xmlItem) => {
          const existingIdx = productsUpdated.findIndex(p => p.sku.toLowerCase() === xmlItem.sku.toLowerCase());
          
          if (existingIdx !== -1) {
            // Atualizar existente
            const prod = productsUpdated[existingIdx];
            productsUpdated[existingIdx] = {
              ...prod,
              estoque: prod.estoque + xmlItem.quantidade,
              preco_custo: xmlItem.preco_custo,
              ncm: xmlItem.ncm || prod.ncm,
              cfop: xmlItem.cfop || prod.cfop,
              updated_at: new Date().toISOString()
            };
            
            logsCreated.push({
              id: 'log-' + Math.random().toString(36).substring(2, 9),
              produto_id: prod.id,
              quantidade: xmlItem.quantidade,
              tipo: 'entrada',
              descricao: `Entrada automática por XML de NF-e (Emitente: ${xmlIssuerName})`,
              usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
              created_at: new Date().toISOString(),
              produto: { nome: prod.nome, sku: prod.sku }
            });
          } else {
            // Cadastrar novo
            const newId = 'prod-' + Math.random().toString(36).substring(2, 9);
            const newProd: Produto = {
              id: newId,
              nome: xmlItem.nome,
              sku: xmlItem.sku,
              preco: Number((xmlItem.preco_custo * 1.5).toFixed(2)), // Margem padrão de 50%
              preco_custo: xmlItem.preco_custo,
              estoque: xmlItem.quantidade,
              estoque_minimo: 3,
              imagem_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ncm: xmlItem.ncm || null,
              cfop: xmlItem.cfop || null
            };
            
            productsUpdated.push(newProd);
            
            logsCreated.push({
              id: 'log-' + Math.random().toString(36).substring(2, 9),
              produto_id: newId,
              quantidade: xmlItem.quantidade,
              tipo: 'entrada',
              descricao: `Carga inicial automática por XML de NF-e (Emitente: ${xmlIssuerName})`,
              usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
              created_at: new Date().toISOString(),
              produto: { nome: xmlItem.nome, sku: xmlItem.sku }
            });
          }
        });
        
        saveMockProducts(productsUpdated);
        saveMockLogs([...logsCreated, ...logsList]);
        
        toast('XML Importado!', `${xmlItems.length} produtos atualizados/cadastrados localmente!`, 'success');
        setIsXmlModalOpen(false);
        setXmlItems([]);
        fetchInventory(currentPage);
        setXmlLoading(false);
        return;
      }
      
      // -- MODO REAL DO SUPABASE --
      for (const xmlItem of xmlItems) {
        // Verificar se existe
        const { data: existing } = await supabase
          .from('produtos')
          .select('*')
          .eq('sku', xmlItem.sku)
          .maybeSingle();
          
        if (existing) {
          // Atualizar
          const { error: prodErr } = await supabase
            .from('produtos')
            .update({
              estoque: existing.estoque + xmlItem.quantidade,
              preco_custo: xmlItem.preco_custo,
              ncm: xmlItem.ncm || existing.ncm,
              cfop: xmlItem.cfop || existing.cfop,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
            
          if (prodErr) throw prodErr;
          
          await supabase.from('estoque_logs').insert({
            produto_id: existing.id,
            quantidade: xmlItem.quantidade,
            tipo: 'entrada',
            descricao: `Entrada via XML de NF-e (Emitente: ${xmlIssuerName})`,
            usuario_id: (await supabase.auth.getUser()).data.user?.id
          });
        } else {
          // Cadastrar
          const { data: newProd, error: insertErr } = await supabase
            .from('produtos')
            .insert({
              nome: xmlItem.nome,
              sku: xmlItem.sku,
              preco: Number((xmlItem.preco_custo * 1.5).toFixed(2)),
              preco_custo: xmlItem.preco_custo,
              estoque: xmlItem.quantidade,
              estoque_minimo: 3,
              ncm: xmlItem.ncm || null,
              cfop: xmlItem.cfop || null
            })
            .select()
            .single();
            
          if (insertErr) throw insertErr;
          
          await supabase.from('estoque_logs').insert({
            produto_id: newProd.id,
            quantidade: xmlItem.quantidade,
            tipo: 'entrada',
            descricao: `Carga automática via XML de NF-e (Emitente: ${xmlIssuerName})`,
            usuario_id: (await supabase.auth.getUser()).data.user?.id
          });
        }
      }
      
      toast('XML Importado!', `${xmlItems.length} produtos atualizados no Supabase!`, 'success');
      setIsXmlModalOpen(false);
      setXmlItems([]);
      fetchInventory(currentPage);
    } catch (err: any) {
      console.error('Erro na importação em lote:', err);
      toast('Falha na Importação', err.message || 'Erro inesperado na gravação em lote.', 'error');
    } finally {
      setXmlLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleLogsOpen = () => {
    fetchLogs();
    setIsLogsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Botões de Ação */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Gerenciamento de Estoque</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cadastre novos produtos e dê entrada de mercadorias no estoque.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
            onClick={handleLogsOpen}
          >
            <History className="h-4 w-4" /> Histórico de Logs
          </Button>

          <Button 
            variant="outline" 
            className="flex items-center gap-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setIsXmlModalOpen(true)}
          >
            <FileUp className="h-4 w-4" /> Importar XML NF-e
          </Button>

          <Button 
            className="flex items-center gap-2"
            onClick={() => setIsNovoProdutoModalOpen(true)}
          >
            <Plus className="h-4 w-4" /> Cadastrar Produto
          </Button>
        </div>
      </div>

      {/* Tabela de Inventário */}
      <Card className="border-border/60 shadow-md">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Carregando itens paginados...</p>
            </div>
          ) : produtos.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <PackageOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold">Nenhum produto em estoque.</p>
              <p className="text-xs mt-1">Cadastre seu primeiro item usando o botão "Cadastrar Produto".</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">P. Custo</TableHead>
                    <TableHead className="text-right">P. Venda</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-center">Mínimo Requerido</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtos.map((prod) => {
                    const isLowStock = prod.estoque <= prod.estoque_minimo;
                    const isOutOfStock = prod.estoque === 0;

                    return (
                      <TableRow key={prod.id} className="hover:bg-muted/20">
                        <TableCell className="font-bold">{prod.nome}</TableCell>
                        <TableCell className="font-mono text-xs uppercase tracking-wider">{prod.sku}</TableCell>
                        <TableCell className="text-right text-muted-foreground font-mono">
                          R$ {prod.preco_custo ? prod.preco_custo.toFixed(2) : '0.00'}
                        </TableCell>
                        <TableCell className="text-right font-bold text-indigo-500">R$ {prod.preco.toFixed(2)}</TableCell>
                        <TableCell className={`text-center font-extrabold ${isLowStock ? 'text-amber-500' : 'text-foreground'}`}>
                          {prod.estoque} un
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{prod.estoque_minimo} un</TableCell>
                        <TableCell className="text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-red-500/10 text-red-500 border border-red-500/20">
                              Sem Estoque
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                              Estoque Crítico
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              Estável
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="h-8 hover:bg-primary/10 hover:text-primary"
                              onClick={() => openEntradaModal(prod)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Entrada
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteProduct(prod.id, prod.nome)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Controles de Paginação (Estrita 10-em-10) */}
              <div className="flex items-center justify-between p-4 border-t border-border bg-muted/10">
                <span className="text-xs text-muted-foreground font-semibold">
                  Mostrando {produtos.length} de {totalCount} produtos cadastrados.
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-xs font-bold px-3">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    disabled={currentPage === totalPages || loading}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Entrada de Mercadoria */}
      <Dialog
        isOpen={isEntradaModalOpen}
        onClose={() => setIsEntradaModalOpen(false)}
        title="Entrada de Mercadoria"
        description={selectedProduto ? `Dê entrada de estoque para o item: "${selectedProduto.nome}"` : ''}
      >
        {selectedProduto && (
          <form onSubmit={handleEntradaSubmit} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 p-3 rounded-lg bg-muted/30 border border-border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Estoque Atual</span>
                <p className="text-sm font-bold">{selectedProduto.estoque} unidades</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Preço Unitário</span>
                <p className="text-sm font-bold text-indigo-500">R$ {selectedProduto.preco.toFixed(2)}</p>
              </div>
            </div>

            <Input
              label="Quantidade da Entrada"
              type="number"
              min={1}
              required
              value={entradaQuantidade}
              onChange={(e) => setEntradaQuantidade(parseInt(e.target.value) || 1)}
            />

            <Input
              label="Observações / Descrição do Log"
              type="text"
              placeholder="Ex: Nota Fiscal nº 3824 ou Ajuste de contagem."
              value={entradaDescricao}
              onChange={(e) => setEntradaDescricao(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEntradaModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={entradaLoading}>
                {entradaLoading ? 'Atualizando...' : 'Confirmar Entrada'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Modal 2: Novo Produto */}
      <Dialog
        isOpen={isNovoProdutoModalOpen}
        onClose={() => setIsNovoProdutoModalOpen(false)}
        title="Cadastrar Novo Produto"
        description="Preencha as informações essenciais para cadastrar um novo produto no inventário."
      >
        <form onSubmit={handleNovoProdutoSubmit} className="space-y-4">
          <Input
            label="Nome do Produto"
            type="text"
            placeholder="Ex: Teclado Mecânico HyperX"
            required
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
          />

          <div className="relative">
            <Input
              id="novo-sku"
              label="SKU do Produto (Código de Barras ou Identificador Único)"
              type="text"
              placeholder="Ex: HYPX-TEC-01"
              required
              value={novoSku}
              onChange={(e) => setNovoSku(e.target.value)}
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Impede o envio precoce do formulário ao scanear
                  const nextInput = document.getElementById('novo-preco-custo') as HTMLInputElement;
                  if (nextInput) nextInput.focus();
                }
              }}
            />
            <Barcode className="absolute right-3 top-[2.1rem] h-5 w-5 text-indigo-500/80 animate-pulse pointer-events-none" aria-label="Pode utilizar leitor de código de barras" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="novo-preco-custo"
              label="Preço de Custo (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 180.00"
              required
              value={novoPrecoCusto}
              onChange={(e) => setNovoPrecoCusto(e.target.value)}
            />

            <Input
              label="Preço de Venda (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 349.90"
              required
              value={novoPreco}
              onChange={(e) => setNovoPreco(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Estoque Inicial"
              type="number"
              min="0"
              placeholder="Ex: 10"
              required
              value={novoEstoque}
              onChange={(e) => setNovoEstoque(e.target.value)}
            />

            <Input
              label="Estoque Mínimo para Alerta"
              type="number"
              min="0"
              placeholder="Ex: 3"
              required
              value={novoEstoqueMinimo}
              onChange={(e) => setNovoEstoqueMinimo(e.target.value)}
            />
          </div>

          {/* Seção Dados Fiscais */}
          <div className="border border-border/80 rounded-lg p-3 bg-muted/20 space-y-3">
            <button
              type="button"
              className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowFiscalFields(!showFiscalFields)}
            >
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                Dados Fiscais do Produto (Opcional)
              </span>
              {showFiscalFields ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showFiscalFields && (
              <div className="grid gap-3 pt-2 border-t border-border/40 animate-slide-down">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Código NCM"
                    placeholder="Ex: 84713019"
                    maxLength={8}
                    value={novoNcm}
                    onChange={(e) => setNovoNcm(e.target.value)}
                  />
                  <Input
                    label="Código CFOP"
                    placeholder="Ex: 5102"
                    maxLength={4}
                    value={novoCfop}
                    onChange={(e) => setNovoCfop(e.target.value)}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    label="Alíquota ICMS (%)"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 18.00"
                    value={novoIcms}
                    onChange={(e) => setNovoIcms(e.target.value)}
                  />
                  <Input
                    label="Alíquota PIS (%)"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1.65"
                    value={novoPis}
                    onChange={(e) => setNovoPis(e.target.value)}
                  />
                  <Input
                    label="Alíquota COFINS (%)"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 7.60"
                    value={novoCofins}
                    onChange={(e) => setNovoCofins(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNovoProdutoModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={novoLoading}>
              {novoLoading ? 'Cadastrando...' : 'Salvar Produto'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 3: Histórico de Logs */}
      <Dialog
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title="Histórico de Logs de Estoque"
        description="Fita auditável contendo todas as entradas e saídas do sistema."
      >
        <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Nenhum log gravado ainda.
            </div>
          ) : (
            logs.map((log) => {
              const isEntrada = log.quantidade > 0;
              return (
                <div 
                  key={log.id} 
                  className="p-3 rounded-lg border border-border/80 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-semibold">{log.produto?.nome}</p>
                    <p className="text-[10px] text-muted-foreground leading-none mt-1">
                      {log.descricao || 'Operação de rotina.'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2 justify-between sm:justify-end">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${
                      isEntrada ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {isEntrada ? '+' : ''}{log.quantidade} un
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setIsLogsModalOpen(false)}>
            Fechar Logs
          </Button>
        </div>
      </Dialog>

      {/* Modal 4: Importar XML de NF-e */}
      <Dialog
        isOpen={isXmlModalOpen}
        onClose={() => { setIsXmlModalOpen(false); setXmlItems([]); }}
        title="Importação Automática via XML"
        description="Carregue o arquivo XML da NF-e recebida para atualizar ou cadastrar estoque automaticamente."
      >
        <div className="space-y-4">
          {xmlItems.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => document.getElementById('xml-file-upload')?.click()}>
              <input 
                type="file" 
                id="xml-file-upload" 
                accept=".xml" 
                className="hidden" 
                onChange={handleXmlUpload} 
              />
              <FileCode className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-bold">Selecione o arquivo XML de NF-e</p>
              <p className="text-xs text-muted-foreground mt-1">Carregue apenas arquivos oficiais .XML gerados pela SEFAZ</p>
            </div>
          ) : (
            <div className="space-y-4 animate-slide-up">
              
              {/* Informações da Nota */}
              <div className="grid gap-2 sm:grid-cols-2 p-3 rounded-lg bg-emerald-500/5 dark:bg-emerald-500/2 border border-emerald-500/20 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Fornecedor / Emitente</span>
                  <p className="font-bold truncate">{xmlIssuerName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">CNPJ Emitente</span>
                  <p className="font-bold font-mono">{xmlIssuerCnpj}</p>
                </div>
              </div>

              {/* Tabela de Preview */}
              <div className="border border-border/80 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                      <th className="p-2">Produto (XML)</th>
                      <th className="p-2 text-center">Quantidade</th>
                      <th className="p-2 text-right">P. Custo</th>
                      <th className="p-2 text-center">SKU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {xmlItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/10">
                        <td className="p-2 font-medium truncate max-w-[150px]" title={item.nome}>{item.nome}</td>
                        <td className="p-2 text-center font-bold">{item.quantidade} un</td>
                        <td className="p-2 text-right font-mono">R$ {item.preco_custo.toFixed(2)}</td>
                        <td className="p-2 text-center font-mono text-[10px] bg-muted/20">{item.sku}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setXmlItems([])}
                >
                  Limpar XML
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-glow-success border-0"
                  disabled={xmlLoading}
                  onClick={handleXmlImportConfirm}
                >
                  {xmlLoading ? 'Gravando no Estoque...' : 'Confirmar Importação'}
                </Button>
              </div>

            </div>
          )}
        </div>
      </Dialog>

    </div>
  );
};
