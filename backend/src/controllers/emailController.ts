import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { sendReceiptEmail, ReceiptData } from '../services/emailService.js';

export async function sendSaleReceipt(req: Request, res: Response) {
  const { vendaId, clienteEmail } = req.body;

  if (!vendaId || !clienteEmail) {
    return res.status(400).json({ error: 'Os campos vendaId e clienteEmail são obrigatórios.' });
  }

  try {
    // 1. Buscar dados da venda
    const { data: venda, error: vendaError } = await supabaseAdmin
      .from('vendas')
      .select('id, total, created_at')
      .eq('id', vendaId)
      .single();

    if (vendaError || !venda) {
      console.error('Venda não encontrada:', vendaError);
      return res.status(404).json({ error: 'Venda não encontrada.' });
    }

    // 2. Buscar itens da venda incluindo o nome do produto
    const { data: itens, error: itensError } = await supabaseAdmin
      .from('itens_venda')
      .select(`
        quantidade,
        preco_unitario,
        produtos (
          nome
        )
      `)
      .eq('venda_id', vendaId);

    if (itensError || !itens) {
      console.error('Itens da venda não encontrados:', itensError);
      return res.status(404).json({ error: 'Itens da venda não encontrados.' });
    }

    // 3. Formatar os dados para o comprovante
    const receiptData: ReceiptData = {
      vendaId: venda.id,
      total: Number(venda.total),
      data: new Date(venda.created_at).toLocaleString('pt-BR'),
      itens: itens.map((item: any) => ({
        nome: item.produtos?.nome || 'Produto Desconhecido',
        quantidade: item.quantidade,
        precoUnitario: Number(item.preco_unitario)
      }))
    };

    // 4. Enviar o e-mail
    const emailSent = await sendReceiptEmail(clienteEmail, receiptData);

    if (!emailSent) {
      return res.status(500).json({ error: 'Erro ao processar o envio do e-mail.' });
    }

    return res.json({ message: 'Comprovante de venda enviado com sucesso por e-mail.' });
  } catch (err: any) {
    console.error('Erro inesperado no envio de comprovante:', err);
    return res.status(500).json({ error: 'Erro interno ao enviar o comprovante.' });
  }
}
