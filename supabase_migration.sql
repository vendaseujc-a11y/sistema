-- Script de Migração Supabase para Sincronização Comercial e Fiscal
-- Copie e cole este script completo no editor SQL (SQL Editor) do seu painel Supabase e clique em "Run" (Executar).

-- 1. Criar tabela de 'clientes'
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    documento TEXT,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para clientes
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Adicionar políticas de acesso para usuários autenticados
CREATE POLICY "Permitir leitura de clientes para autenticados" ON public.clientes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir insercao de clientes para autenticados" ON public.clientes
    FOR INSERT TO authenticated WITH CHECK (true);


-- 2. Criar tabela de 'empresa_fiscal'
CREATE TABLE IF NOT EXISTS public.empresa_fiscal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    inscricao_estadual TEXT NOT NULL,
    regime_tributario TEXT NOT NULL DEFAULT 'Simples Nacional',
    endereco TEXT NOT NULL,
    telefone TEXT NOT NULL,
    certificado_a1_nome TEXT,
    certificado_a1_validade TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para empresa_fiscal
ALTER TABLE public.empresa_fiscal ENABLE ROW LEVEL SECURITY;

-- Adicionar política de acesso irrestrito para usuários autenticados
CREATE POLICY "Permitir tudo de empresa_fiscal para autenticados" ON public.empresa_fiscal
    FOR ALL TO authenticated USING (true);


-- 3. Adicionar novas colunas fiscais e de custo na tabela 'produtos' (caso não existam)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='preco_custo') THEN
        ALTER TABLE public.produtos ADD COLUMN preco_custo NUMERIC(10,2) DEFAULT 0.00 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='ncm') THEN
        ALTER TABLE public.produtos ADD COLUMN ncm TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='cfop') THEN
        ALTER TABLE public.produtos ADD COLUMN cfop TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='icms_aliquota') THEN
        ALTER TABLE public.produtos ADD COLUMN icms_aliquota NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='pis_aliquota') THEN
        ALTER TABLE public.produtos ADD COLUMN pis_aliquota NUMERIC(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='produtos' AND column_name='cofins_aliquota') THEN
        ALTER TABLE public.produtos ADD COLUMN cofins_aliquota NUMERIC(5,2);
    END IF;
END $$;


-- 4. Adicionar novas colunas comerciais e de cliente na tabela 'vendas' (caso não existam)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas' AND column_name='cliente_id') THEN
        ALTER TABLE public.vendas ADD COLUMN cliente_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas' AND column_name='cliente_nome') THEN
        ALTER TABLE public.vendas ADD COLUMN cliente_nome TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas' AND column_name='cliente_documento') THEN
        ALTER TABLE public.vendas ADD COLUMN cliente_documento TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendas' AND column_name='tipo_pagamento') THEN
        ALTER TABLE public.vendas ADD COLUMN tipo_pagamento TEXT DEFAULT 'a_vista';
    END IF;
END $$;


-- 5. Atualizar/Recriar a função RPC de processamento atômico de venda
CREATE OR REPLACE FUNCTION public.processar_venda(
    p_cliente_email TEXT,
    p_total NUMERIC,
    p_itens JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_venda_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Inserir a venda
    INSERT INTO public.vendas (total, cliente_email, created_at)
    VALUES (p_total, p_cliente_email, NOW())
    RETURNING id INTO v_venda_id;

    -- 2. Inserir itens de venda e abater estoque correspondente
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(produto_id UUID, quantidade INT, preco_unitario NUMERIC) LOOP
        -- Inserir detalhe do item
        INSERT INTO public.itens_venda (venda_id, produto_id, quantidade, preco_unitario)
        VALUES (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.preco_unitario);

        -- Reduzir saldo de estoque do produto
        UPDATE public.produtos
        SET estoque = estoque - v_item.quantidade,
            updated_at = NOW()
        WHERE id = v_item.produto_id;

        -- Registrar log auditável de estoque
        INSERT INTO public.estoque_logs (produto_id, quantidade, tipo, descricao, created_at)
        VALUES (v_item.produto_id, -v_item.quantidade, 'venda', 'Saída por Venda (RPC: ' || v_venda_id || ')', NOW());
    END LOOP;

    RETURN v_venda_id;
END;
$$;
