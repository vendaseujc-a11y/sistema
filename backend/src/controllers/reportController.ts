import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

export async function getQuickReport(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.dias as string) || 30;

    // Chamar a função SQL do Postgres (RPC) para executar os agregados no banco
    const { data, error } = await supabaseAdmin.rpc('obter_relatorio_rapido', {
      p_dias: days
    });

    if (error) {
      console.error('Erro ao buscar relatório via RPC:', error);
      
      // Fallback em caso de erro ou de a função RPC não estar instalada ainda
      // Isso garante resiliência na inicialização do projeto
      const { data: sales, error: salesError } = await supabaseAdmin
        .from('vendas')
        .select('total');
      
      if (salesError) {
        return res.status(500).json({ error: 'Erro ao gerar relatório do banco.' });
      }

      const totalVendas = sales.length;
      const faturamentoTotal = sales.reduce((acc, curr) => acc + Number(curr.total), 0);

      return res.json({
        periodo: `${days} dias (Fallback)`,
        total_vendas: totalVendas,
        faturamento_total: faturamentoTotal,
        produtos_mais_vendidos: []
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Erro inesperado no relatório rápido:', err);
    return res.status(500).json({ error: 'Erro interno ao processar o relatório.' });
  }
}
