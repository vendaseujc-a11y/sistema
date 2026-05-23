// frontend/src/types/index.ts - Definições de Tipos para o Frontend

export interface Produto {
  id: string; // UUID
  nome: string;
  sku: string; // Único
  preco: number;
  preco_custo: number; // Preço de Custo
  estoque: number;
  estoque_minimo: number;
  imagem_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Venda {
  id: string; // UUID
  total: number;
  cliente_email?: string | null;
  usuario_id: string; // UUID (auth.users)
  created_at: string;
  itens?: ItemVendaDetalhe[];
}

export interface ItemVenda {
  id: string; // UUID
  venda_id: string; // UUID
  produto_id: string; // UUID
  quantidade: number;
  preco_unitario: number;
}

export interface ItemVendaDetalhe extends ItemVenda {
  produto?: Pick<Produto, 'nome' | 'sku'>;
}

export interface EstoqueLog {
  id: string; // UUID
  produto_id: string; // UUID
  quantidade: number; // Positivo (entrada), Negativo (saída)
  tipo: 'entrada' | 'saida' | 'venda' | 'ajuste';
  descricao?: string | null;
  usuario_id: string; // UUID
  created_at: string;
  produto?: Pick<Produto, 'nome' | 'sku'>;
}

// Interfaces de Comunicação API
export interface DashboardStats {
  vendas_hoje: number;
  faturamento_hoje: number;
  produtos_baixo_estoque: number;
  alertas: Pick<Produto, 'id' | 'nome' | 'sku' | 'estoque' | 'estoque_minimo'>[];
}

export interface RelatorioVendasResponse {
  periodo: string;
  total_vendas: number;
  faturamento_total: number;
  produtos_mais_vendidos: {
    produto_nome: string;
    quantidade_vendida: number;
    total_faturado: number;
  }[];
}

export interface CheckoutPayload {
  cliente_email?: string;
  itens: {
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
  }[];
}

// ============================================================
// Mercado Livre Integration Types
// ============================================================

export interface MLStatus {
  connected: boolean;
  seller_id: string | null;
  vendas_ml: VendaML[];
}

export interface VendaML {
  id: string;
  total: number;
  cliente_email?: string | null;
  ml_order_id: string | null;
  origem: string;
  created_at: string;
  itens_venda?: {
    quantidade: number;
    preco_unitario: number;
    produtos?: {
      nome: string;
      sku: string;
    } | null;
  }[];
}
