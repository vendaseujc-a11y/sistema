import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  syncRecentOrders,
  importOrderToDatabase,
  getValidMLToken,
} from '../services/mercadoLivreService.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

const ML_WEBHOOK_SECRET = process.env.ML_WEBHOOK_SECRET || '';

// ============================================================
// Validação de Assinatura HMAC-SHA256 do Webhook ML
// ============================================================
function validateMLSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): boolean {
  try {
    // O ML assina: "id:{data_id};request-id:{x-request-id};"
    const message = `id:${dataId};request-id:${xRequestId};`;
    const expectedHash = crypto.createHmac('sha256', secret).update(message).digest('hex');

    // Extrair o hash v1 do cabeçalho x-signature (formato: "ts=...,v1=<hash>")
    const v1Match = xSignature.match(/v1=([a-f0-9]+)/);
    if (!v1Match) return false;

    const receivedHash = v1Match[1];
    // Comparação timing-safe para evitar timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(receivedHash, 'hex')
    );
  } catch {
    return false;
  }
}

// ============================================================
// POST /webhooks/mercadolivre
// Recebe notificações automáticas de novos pedidos do ML
// ============================================================
router.post('/mercadolivre', async (req: Request, res: Response) => {
  // Responder imediatamente (ML exige resposta < 5s)
  res.status(200).json({ status: 'received' });

  try {
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;
    const { data } = req.body;

    // Validar assinatura se o secret estiver configurado
    if (ML_WEBHOOK_SECRET && xSignature && xRequestId && data?.id) {
      const isValid = validateMLSignature(xSignature, xRequestId, String(data.id), ML_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('❌ Assinatura do Webhook ML inválida! Payload ignorado.');
        return;
      }
    }

    // Processar apenas notificações de pedidos (topic: "orders_v2")
    const topic = req.body.topic || req.body.type;
    if (topic !== 'orders_v2' && topic !== 'orders') {
      console.log(`ℹ️ Webhook ML ignorado — topic: ${topic}`);
      return;
    }

    // Obter detalhes do pedido via API do ML
    const orderId = data?.id;
    if (!orderId) return;

    console.log(`📦 Webhook ML: processando pedido #${orderId}...`);

    const tokenData = await getValidMLToken();
    if (!tokenData) {
      console.error('❌ ML não conectado — não foi possível processar webhook.');
      return;
    }

    // Buscar detalhes completos do pedido
    const orderResponse = await fetch(
      `https://api.mercadolibre.com/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!orderResponse.ok) {
      console.error(`❌ Falha ao buscar pedido #${orderId}:`, await orderResponse.text());
      return;
    }

    const order = await orderResponse.json();

    // Importar pedido para o banco (com proteção contra duplicatas)
    const result = await importOrderToDatabase(order);
    console.log(`✅ Webhook processado — Pedido #${orderId}:`, result);

  } catch (err: any) {
    console.error('❌ Erro ao processar webhook ML:', err.message);
  }
});

// ============================================================
// POST /api/ml/sync
// Importação Manual: botão "Sincronizar Agora" no frontend
// ============================================================
router.post('/ml/sync', async (_req: Request, res: Response) => {
  try {
    const tokenData = await getValidMLToken();
    if (!tokenData) {
      return res.status(403).json({
        error: 'Mercado Livre não conectado.',
        detail: 'Acesse a aba Integrações e clique em "Conectar Mercado Livre" primeiro.',
      });
    }

    console.log('🔄 Iniciando sincronização manual de pedidos ML...');
    const result = await syncRecentOrders();

    return res.json({
      success: true,
      message: `Sincronização concluída: ${result.imported} pedido(s) importado(s), ${result.skipped} já existentes, ${result.errors} erro(s).`,
      ...result,
    });
  } catch (err: any) {
    console.error('❌ Erro na sincronização ML:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/ml/status
// Retorna o status de conexão e as últimas vendas importadas
// ============================================================
router.get('/ml/status', async (_req: Request, res: Response) => {
  try {
    const tokenData = await getValidMLToken();
    const connected = !!tokenData;

    // Buscar últimas 20 vendas importadas do ML
    const { data: vendas } = await supabaseAdmin
      .from('vendas')
      .select(`
        id,
        total,
        cliente_email,
        ml_order_id,
        origem,
        created_at,
        itens_venda (
          quantidade,
          preco_unitario,
          produtos (nome, sku)
        )
      `)
      .eq('origem', 'Mercado Livre')
      .order('created_at', { ascending: false })
      .limit(20);

    return res.json({
      connected,
      seller_id: tokenData?.seller_id || null,
      vendas_ml: vendas || [],
    });
  } catch (err: any) {
    console.error('❌ Erro ao buscar status ML:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
