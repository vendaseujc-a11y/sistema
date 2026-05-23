import { Produto, Venda, EstoqueLog } from '../types/index.ts';

const DEFAULT_PRODUCTS: Produto[] = [
  {
    id: 'p1-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    nome: 'Notebook Ultra Slim 15.6"',
    sku: 'NOTE-001',
    preco: 4500.00,
    preco_custo: 3800.00,
    estoque: 8,
    estoque_minimo: 10,
    imagem_url: 'https://images.unsplash.com/photo-1496181130207-89941d254e88?auto=format&fit=crop&w=300&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
  },
  {
    id: 'p2-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    nome: 'Teclado Mecânico RGB Brown Switch',
    sku: 'TEC-002',
    preco: 320.00,
    preco_custo: 180.00,
    estoque: 25,
    estoque_minimo: 5,
    imagem_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString()
  },
  {
    id: 'p3-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    nome: 'Mouse Gamer Wireless 16.000 DPI',
    sku: 'MOUS-003',
    preco: 180.00,
    preco_custo: 95.00,
    estoque: 12,
    estoque_minimo: 8,
    imagem_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=300&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
  },
  {
    id: 'p4-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    nome: 'Monitor IPS 27" QHD 144Hz',
    sku: 'MON-004',
    preco: 1250.00,
    preco_custo: 920.00,
    estoque: 3,
    estoque_minimo: 5,
    imagem_url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=300&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },
  {
    id: 'p5-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    nome: 'Headset Gamer Wireless 7.1',
    sku: 'HEAD-005',
    preco: 540.00,
    preco_custo: 310.00,
    estoque: 15,
    estoque_minimo: 6,
    imagem_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
  }
];

const DEFAULT_SALES: Venda[] = [
  {
    id: 'v1-venda-uuid-001',
    total: 4820.00,
    cliente_email: 'joao.silva@email.com',
    usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
    created_at: new Date().toISOString(),
    itens: [
      {
        id: 'iv1-item-uuid-001',
        venda_id: 'v1-venda-uuid-001',
        produto_id: 'p1-d9b736b4-24ff-4fc9-b684-2a62886f3458',
        quantidade: 1,
        preco_unitario: 4500.00,
        produto: { nome: 'Notebook Ultra Slim 15.6"', sku: 'NOTE-001' }
      },
      {
        id: 'iv1-item-uuid-002',
        venda_id: 'v1-venda-uuid-001',
        produto_id: 'p2-d9b736b4-24ff-4fc9-b684-2a62886f3458',
        quantidade: 1,
        preco_unitario: 320.00,
        produto: { nome: 'Teclado Mecânico RGB Brown Switch', sku: 'TEC-002' }
      }
    ]
  },
  {
    id: 'v2-venda-uuid-002',
    total: 360.00,
    cliente_email: 'maria.oliveira@email.com',
    usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    itens: [
      {
        id: 'iv2-item-uuid-001',
        venda_id: 'v2-venda-uuid-002',
        produto_id: 'p3-d9b736b4-24ff-4fc9-b684-2a62886f3458',
        quantidade: 2,
        preco_unitario: 180.00,
        produto: { nome: 'Mouse Gamer Wireless 16.000 DPI', sku: 'MOUS-003' }
      }
    ]
  }
];

const DEFAULT_LOGS: EstoqueLog[] = [
  {
    id: 'log1',
    produto_id: 'p1-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    quantidade: 10,
    tipo: 'entrada',
    descricao: 'Carga inicial de estoque',
    usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    produto: { nome: 'Notebook Ultra Slim 15.6"', sku: 'NOTE-001' }
  },
  {
    id: 'log2',
    produto_id: 'p1-d9b736b4-24ff-4fc9-b684-2a62886f3458',
    quantidade: -1,
    tipo: 'venda',
    descricao: 'Saída por Venda ID: v1-venda-uuid-001',
    usuario_id: 'd9b736b4-24ff-4fc9-b684-2a62886f3458',
    created_at: new Date().toISOString(),
    produto: { nome: 'Notebook Ultra Slim 15.6"', sku: 'NOTE-001' }
  }
];

// Funções para gerenciar o Mock DB no LocalStorage
export const getMockProducts = (): Produto[] => {
  const data = localStorage.getItem('mock_products');
  if (!data) {
    localStorage.setItem('mock_products', JSON.stringify(DEFAULT_PRODUCTS));
    return DEFAULT_PRODUCTS;
  }
  return JSON.parse(data);
};

export const saveMockProducts = (products: Produto[]) => {
  localStorage.setItem('mock_products', JSON.stringify(products));
};

export const getMockSales = (): Venda[] => {
  const data = localStorage.getItem('mock_sales');
  if (!data) {
    localStorage.setItem('mock_sales', JSON.stringify(DEFAULT_SALES));
    return DEFAULT_SALES;
  }
  return JSON.parse(data);
};

export const saveMockSales = (sales: Venda[]) => {
  localStorage.setItem('mock_sales', JSON.stringify(sales));
};

export const getMockLogs = (): EstoqueLog[] => {
  const data = localStorage.getItem('mock_logs');
  if (!data) {
    localStorage.setItem('mock_logs', JSON.stringify(DEFAULT_LOGS));
    return DEFAULT_LOGS;
  }
  return JSON.parse(data);
};

export const saveMockLogs = (logs: EstoqueLog[]) => {
  localStorage.setItem('mock_logs', JSON.stringify(logs));
};
