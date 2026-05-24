import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card.tsx';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { Dialog } from './ui/dialog.tsx';
import { 
  Users, UserPlus, Search, Trash2, Mail, FileText, Phone, Edit
} from 'lucide-react';
import { getMockClientes, saveMockClientes } from '../lib/mockData.ts';
import { Cliente } from '../types/index.ts';
import { supabase } from '../lib/supabase.js';

export const Clientes: React.FC = () => {
  const { isMockMode, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados do Modal de Cadastro / Edição
  const [isOpen, setIsOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefone, setTelefone] = useState('');

  // Carregar Clientes
  const loadClientes = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        setClientes(getMockClientes());
        setLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE --
      let query = supabase
        .from('clientes')
        .select('*');

      if (user?.id) {
        query = query.eq('usuario_id', user.id);
      }

      const { data, error } = await query.order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar clientes do Supabase (caindo para armazenamento local):', err);
      setClientes(getMockClientes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, [isMockMode]);

  // Filtrar clientes na visualização
  const filteredClientes = clientes.filter(c => 
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.documento && c.documento.includes(searchTerm))
  );

  // Abrir Modal para Criar Novo
  const handleOpenNovo = () => {
    setEditingCliente(null);
    setNome('');
    setEmail('');
    setDocumento('');
    setTelefone('');
    setIsOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEditar = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setNome(cliente.nome);
    setEmail(cliente.email);
    setDocumento(cliente.documento || '');
    setTelefone(cliente.telefone || '');
    setIsOpen(true);
  };

  // Gravar / Atualizar Cliente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email) {
      toast('Campos obrigatórios', 'Nome e E-mail são requeridos.', 'warning');
      return;
    }

    setLoading(true);
    const id = editingCliente?.id || 'cli-' + Math.random().toString(36).substring(2, 9);
    const newClient: Cliente = {
      id,
      nome,
      email,
      documento: documento || undefined,
      telefone: telefone || undefined,
      created_at: editingCliente?.created_at || new Date().toISOString()
    };

    try {
      if (isMockMode) {
        const list = getMockClientes();
        let updatedList: Cliente[];
        if (editingCliente) {
          updatedList = list.map(c => c.id === id ? newClient : c);
        } else {
          updatedList = [newClient, ...list];
        }
        saveMockClientes(updatedList);
        setClientes(updatedList);
        toast('Sucesso!', editingCliente ? 'Cadastro de cliente atualizado.' : 'Novo cliente cadastrado.', 'success');
      } else {
        // -- MODO REAL DO SUPABASE --
        let error;
        if (editingCliente) {
          const { error: updateErr } = await supabase
            .from('clientes')
            .update({
              nome: newClient.nome,
              email: newClient.email,
              documento: newClient.documento,
              telefone: newClient.telefone
            })
            .eq('id', id);
          error = updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from('clientes')
            .insert({
              nome: newClient.nome,
              email: newClient.email,
              documento: newClient.documento,
              telefone: newClient.telefone
            });
          error = insertErr;
        }

        if (error) throw error;
        toast('Sucesso!', editingCliente ? 'Cadastro atualizado no Supabase.' : 'Cliente inserido no Supabase.', 'success');
        loadClientes();
      }
      setIsOpen(false);
    } catch (err: any) {
      console.warn('Erro ao persistir cliente no Supabase, caindo para gravação local:', err);
      // Fallback local
      const list = getMockClientes();
      let updatedList: Cliente[];
      if (editingCliente) {
        updatedList = list.map(c => c.id === id ? newClient : c);
      } else {
        updatedList = [newClient, ...list];
      }
      saveMockClientes(updatedList);
      setClientes(updatedList);
      toast('Salvo Localmente', 'Dados do cliente salvos localmente (Tabela de clientes ausente no Supabase).', 'info');
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Excluir Cliente
  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Deseja realmente excluir este cliente do cadastro?');
    if (!confirm) return;

    try {
      if (isMockMode) {
        const list = getMockClientes();
        const updatedList = list.filter(c => c.id !== id);
        saveMockClientes(updatedList);
        setClientes(updatedList);
        toast('Sucesso!', 'Cliente removido com sucesso.', 'success');
      } else {
        // -- MODO REAL DO SUPABASE --
        const { error } = await supabase
          .from('clientes')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast('Sucesso!', 'Cliente removido do Supabase.', 'success');
        loadClientes();
      }
    } catch (err: any) {
      console.warn('Erro ao deletar cliente no Supabase, executando remoção local:', err);
      const list = getMockClientes();
      const updatedList = list.filter(c => c.id !== id);
      saveMockClientes(updatedList);
      setClientes(updatedList);
      toast('Removido Localmente', 'Cliente removido localmente (Tabela ausente no Supabase).', 'info');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Premium do Controle de Clientes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900/40 to-violet-950/20 dark:from-indigo-950/50 dark:to-background p-6 rounded-2xl border border-indigo-500/20 backdrop-blur-md shadow-premium">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-500 animate-pulse" />
            Gerenciamento de Clientes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre, pesquise, edite e organize a base de clientes do seu sistema de vendas.
          </p>
        </div>
        
        <Button 
          onClick={handleOpenNovo} 
          className="self-start sm:self-auto flex items-center gap-2 shadow-glow-primary"
        >
          <UserPlus className="h-4 w-4" />
          Cadastrar Cliente
        </Button>
      </div>

      {/* Tabela de Listagem de Clientes */}
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="pb-4 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Lista de Clientes Cadastrados
            </CardTitle>
            <CardDescription className="text-xs">
              Pesquise e gerencie os clientes para seleção imediata no PDV de faturamento.
            </CardDescription>
          </div>
          
          {/* Caixa de Pesquisa */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Pesquise por nome, e-mail ou documento..." 
              className="pl-9 h-9 text-xs rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent className="pt-4 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/80 hover:bg-transparent">
                  <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Nome</TableHead>
                  <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">E-mail</TableHead>
                  <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Documento (CPF/CNPJ)</TableHead>
                  <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Telefone</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Carregando banco de dados de clientes...
                    </TableCell>
                  </TableRow>
                ) : filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                      {searchTerm ? 'Nenhum cliente atende aos critérios da busca.' : 'Nenhum cliente cadastrado no sistema.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cli) => (
                    <TableRow key={cli.id} className="border-border/60 hover:bg-muted/10 transition-colors">
                      <TableCell className="font-semibold text-sm px-6 py-4">{cli.nome}</TableCell>
                      <TableCell className="text-xs px-6 py-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 text-indigo-400" />
                          {cli.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 text-indigo-400" />
                          {cli.documento || 'Não informado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs px-6 py-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-indigo-400" />
                          {cli.telefone || 'Não informado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 rounded-lg"
                            onClick={() => handleOpenEditar(cli)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg"
                            onClick={() => handleDelete(cli.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog de Cadastro/Edição de Cliente */}
      <Dialog 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        title={editingCliente ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}
        description="Preencha os dados do cliente abaixo para salvá-lo de forma permanente no sistema."
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <Input 
            label="Nome Completo / Razão Social"
            placeholder="Digite o nome completo do cliente"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <Input 
            label="Endereço de E-mail"
            type="email"
            placeholder="exemplo@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="grid gap-4 grid-cols-2">
            <Input 
              label="Documento (CPF / CNPJ)"
              placeholder="Ex: 000.000.000-00"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
            />
            <Input 
              label="Telefone com DDD"
              placeholder="Ex: (11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-between pt-4 border-t border-border/50">
            {editingCliente ? (
              <Button 
                type="button" 
                variant="ghost" 
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  handleDelete(editingCliente.id);
                  setIsOpen(false);
                }}
                disabled={loading}
              >
                Excluir Cadastro
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="shadow-glow-primary"
              >
                {loading ? 'Salvando...' : editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

    </div>
  );
};
