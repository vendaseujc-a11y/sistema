import { supabaseAdmin } from '../config/supabase.js';

// ============================================================
// Configurações do OAuth do Mercado Livre
// ============================================================
const ML_CLIENT_ID = process.env.ML_CLIENT_ID || '';
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || '';
const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI || 'http://localhost:3001/auth/callback';
const ML_API_BASE = 'https://api.mercadolibre.com';
const ML_AUTH_BASE = 'https://auth.mercadolivre.com.br';

// ============================================================
// Tipos internos do Mercado Livre
// ============================================================
interface MLTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
}

interface MLOrder {
  id: number;
  status: string;
  date_created: string;
  date_closed: string;
  total_amount: number;
  buyer: {
    id: number;
    nickname: string;
    email?: string;
  };
  order_items: {
    item: {
      id: string;
      title: string;
      seller_sku?: string;
    };
    quantity: number;
    unit_price: number;
  }[];
}

// ============================================================
// 1. Gerar URL de Autorização OAuth
// ============================================================
export function getMLAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ML_CLIENT_ID,
    redirect_uri: ML_REDIRECT_URI,
  });
  return `${ML_AUTH_BASE}/authorization?${params.toString()}`;
}

// ============================================================
// 2. Trocar o code pelo access_token + refresh_token
// ============================================================
export async function exchangeCodeForTokens(code: string): Promise<MLTokenResponse> {
  const response = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      code,
      redirect_uri: ML_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao trocar code por token: ${err}`);
  }

  return response.json() as Promise<MLTokenResponse>;
}

// ============================================================
// 3. Renovar o access_token com o refresh_token
// ============================================================
export async function refreshMLToken(refreshToken: string): Promise<MLTokenResponse> {
  const response = await fetch(`${ML_API_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao renovar token ML: ${err}`);
  }

  return response.json() as Promise<MLTokenResponse>;
}

// ============================================================
// 4. Salvar tokens no Supabase (tabela configuracoes_api)
// ============================================================
export async function saveMLTokens(tokens: MLTokenResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('configuracoes_api')
    .upsert(
      {
        servico: 'mercadolivre',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        usuario_ml_id: String(tokens.user_id),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'servico' }
    );

  if (error) throw new Error(`Falha ao salvar tokens: ${error.message}`);
}

// ============================================================
// 5. Carregar tokens válidos do Supabase (com auto-refresh)
// ============================================================
export async function getValidMLToken(): Promise<{ access_token: string; seller_id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_api')
    .select('*')
    .eq('servico', 'mercadolivre')
    .single();

  if (error || !data) return null;

  // Verificar se o token expirou (com 5 min de margem)
  const expiresAt = new Date(data.expires_at).getTime();
  const now = Date.now() + 5 * 60 * 1000;

  if (now >= expiresAt) {
    // Token expirado: renovar automaticamente
    console.log('🔄 Renovando access_token do ML...');
    const newTokens = await refreshMLToken(data.refresh_token);
    await saveMLTokens(newTokens);
    return { access_token: newTokens.access_token, seller_id: data.usuario_ml_id };
  }

  return { access_token: data.access_token, seller_id: data.usuario_ml_id };
}

// ============================================================
// 6. Buscar pedidos recentes pagos do Mercado Livre
// ============================================================
export async function getRecentOrders(accessToken: string, sellerId: string): Promise<MLOrder[]> {
  // Buscar pedidos pagos dos últimos 7 dias
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const url = `${ML_API_BASE}/orders/search?seller=${sellerId}&order.status=paid&sort=date_desc&offset=0&limit=50&order.date_created.from=${dateFrom}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Falha ao buscar pedidos ML: ${err}`);
  }

  const data = await response.json() as { results: MLOrder[] };
  return data.results || [];
}

// ============================================================
// 7. Importar um único pedido ML para o banco de dados
// ============================================================
export async function importOrderToDatabase(order: MLOrder): Promise<{
  imported: boolean;
  reason?: string;
  venda_id?: string;
}> {
  const mlOrderId = String(order.id);

  // 7.1 Verificar duplicata: se o pedido já foi importado, ignorar
  const { data: existing } = await supabaseAdmin
    .from('vendas')
    .select('id')
    .eq('ml_order_id', mlOrderId)
    .maybeSingle();

  if (existing) {
    return { imported: false, reason: 'Pedido já importado anteriormente.' };
  }

  // 7.2 Montar os itens e localizar produtos pelo ml_item_id
  const vendaItens: { produto_id: string; quantidade: number; preco_unitario: number }[] = [];
  let totalVenda = 0;

  for (const orderItem of order.order_items) {
    const mlItemId = orderItem.item.id;

    // Buscar produto vinculado ao ml_item_id
    const { data: produto } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, estoque, preco')
      .eq('ml_item_id', mlItemId)
      .maybeSingle();

    if (!produto) {
      console.warn(`⚠️ Produto com ml_item_id "${mlItemId}" não encontrado no cadastro. Item ignorado.`);
      continue;
    }

    // Verificar estoque suficiente
    if (produto.estoque < orderItem.quantity) {
      console.warn(`⚠️ Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}, Solicitado: ${orderItem.quantity}`);
    }

    vendaItens.push({
      produto_id: produto.id,
      quantidade: orderItem.quantity,
      preco_unitario: orderItem.unit_price,
    });

    totalVenda += orderItem.unit_price * orderItem.quantity;
  }

  if (vendaItens.length === 0) {
    return { imported: false, reason: 'Nenhum produto vinculado (ml_item_id) encontrado.' };
  }

  // 7.3 Criar a venda usando a RPC atômica do banco de dados
  // Usamos o admin para simular o usuário de sistema para vendas do ML
  // Primeiro: inserir a venda com os campos extras de ML
  const { data: novaVenda, error: vendaError } = await supabaseAdmin
    .from('vendas')
    .insert({
      total: totalVenda,
      cliente_email: order.buyer.email || null,
      usuario_id: (await getSystemUserId()),
      origem: 'Mercado Livre',
      ml_order_id: mlOrderId,
      created_at: order.date_closed || order.date_created,
    })
    .select('id')
    .single();

  if (vendaError || !novaVenda) {
    throw new Error(`Falha ao criar venda ML: ${vendaError?.message}`);
  }

  const vendaId = novaVenda.id;

  // 7.4 Inserir itens da venda e abater estoque
  for (const item of vendaItens) {
    // Inserir item_venda
    await supabaseAdmin.from('itens_venda').insert({
      venda_id: vendaId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
    });

    // Abater estoque
    const { data: prodAtual } = await supabaseAdmin
      .from('produtos')
      .select('estoque')
      .eq('id', item.produto_id)
      .single();

    if (prodAtual) {
      const novoEstoque = Math.max(0, prodAtual.estoque - item.quantidade);
      await supabaseAdmin
        .from('produtos')
        .update({ estoque: novoEstoque, updated_at: new Date().toISOString() })
        .eq('id', item.produto_id);
    }

    // Gravar log de estoque
    await supabaseAdmin.from('estoque_logs').insert({
      produto_id: item.produto_id,
      quantidade: -item.quantidade,
      tipo: 'venda',
      descricao: `Venda via Mercado Livre — Pedido #${mlOrderId}`,
      usuario_id: await getSystemUserId(),
      created_at: order.date_closed || order.date_created,
    });
  }

  console.log(`✅ Pedido ML #${mlOrderId} importado como Venda ID: ${vendaId}`);
  return { imported: true, venda_id: vendaId };
}

// ============================================================
// 8. Sincronizar todos os pedidos recentes (import em lote)
// ============================================================
export async function syncRecentOrders(): Promise<{
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}> {
  const tokenData = await getValidMLToken();
  if (!tokenData) {
    throw new Error('Mercado Livre não está conectado. Configure as credenciais primeiro.');
  }

  const orders = await getRecentOrders(tokenData.access_token, tokenData.seller_id);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const order of orders) {
    try {
      const result = await importOrderToDatabase(order);
      if (result.imported) {
        imported++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`❌ Erro ao importar pedido #${order.id}:`, err);
      errors++;
    }
  }

  return { total: orders.length, imported, skipped, errors };
}

// ============================================================
// Helper: Obter ID de usuário "sistema" para transações ML
// ============================================================
async function getSystemUserId(): Promise<string> {
  // Retorna o primeiro usuário admin do sistema como responsável pelas vendas ML
  // Em produção, crie um usuário dedicado "sistema@loja.com" no Supabase Auth
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  if (data?.users?.length > 0) {
    return data.users[0].id;
  }
  throw new Error('Nenhum usuário encontrado no sistema para associar à venda ML.');
}
