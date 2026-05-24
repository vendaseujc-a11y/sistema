import { Produto, Venda, EstoqueLog, Cliente, Empresa } from '../types/index.ts';

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
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    ncm: '84713019',
    cfop: '5102',
    icms_aliquota: 18,
    pis_aliquota: 1.65,
    cofins_aliquota: 7.6
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
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    ncm: '84716052',
    cfop: '5102',
    icms_aliquota: 18,
    pis_aliquota: 1.65,
    cofins_aliquota: 7.6
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
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    ncm: '84716053',
    cfop: '5102',
    icms_aliquota: 18,
    pis_aliquota: 1.65,
    cofins_aliquota: 7.6
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
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    ncm: '85285220',
    cfop: '5102',
    icms_aliquota: 18,
    pis_aliquota: 1.65,
    cofins_aliquota: 7.6
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
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    ncm: '85183000',
    cfop: '5102',
    icms_aliquota: 18,
    pis_aliquota: 1.65,
    cofins_aliquota: 7.6
  }
];

const DEFAULT_SALES: Venda[] = [
  {
    id: 'v1-venda-uuid-001',
    total: 4820.00,
    cliente_email: 'joao.silva@email.com',
    cliente_nome: 'João Silva',
    cliente_documento: '123.456.789-00',
    tipo_pagamento: 'a_vista',
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
    cliente_nome: 'Maria Oliveira',
    cliente_documento: '987.654.321-11',
    tipo_pagamento: 'debito',
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

// Clientes & Empresa Mock Data Handlers
const DEFAULT_CLIENTS: Cliente[] = [
  {
    id: 'cli-1',
    nome: 'João Silva',
    email: 'joao.silva@email.com',
    documento: '123.456.789-00',
    telefone: '(11) 98888-8888',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
  },
  {
    id: 'cli-2',
    nome: 'Maria Oliveira',
    email: 'maria.oliveira@email.com',
    documento: '987.654.321-11',
    telefone: '(21) 97777-7777',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString()
  }
];

const DEFAULT_EMPRESA: Empresa = {
  razao_social: 'SISTEMA DE VENDAS VNI LTDA',
  nome_fantasia: 'Sistema VNI',
  cnpj: '12.345.678/0001-90',
  inscricao_estadual: '111.222.333.444',
  regime_tributario: 'Simples Nacional',
  endereco: 'Rua Principal, 100 - São Paulo/SP',
  telefone: '(11) 3333-3333',
  certificado_a1_nome: null,
  certificado_a1_validade: null
};

export const getMockClientes = (): Cliente[] => {
  const data = localStorage.getItem('mock_clientes');
  if (!data) {
    localStorage.setItem('mock_clientes', JSON.stringify(DEFAULT_CLIENTS));
    return DEFAULT_CLIENTS;
  }
  return JSON.parse(data);
};

export const saveMockClientes = (clientes: Cliente[]) => {
  localStorage.setItem('mock_clientes', JSON.stringify(clientes));
};

export const getMockEmpresa = (): Empresa => {
  const data = localStorage.getItem('mock_empresa');
  if (!data) {
    localStorage.setItem('mock_empresa', JSON.stringify(DEFAULT_EMPRESA));
    return DEFAULT_EMPRESA;
  }
  return JSON.parse(data);
};

export const saveMockEmpresa = (empresa: Empresa) => {
  localStorage.setItem('mock_empresa', JSON.stringify(empresa));
};
