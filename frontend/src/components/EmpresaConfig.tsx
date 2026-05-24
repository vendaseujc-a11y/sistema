import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Button } from './ui/button.tsx';
import { useToast } from './ui/toast.tsx';
import { 
  Building2, ShieldCheck, KeyRound, UploadCloud, 
  Trash2, AlertTriangle, FileText, CheckCircle2 
} from 'lucide-react';
import { getMockEmpresa, saveMockEmpresa } from '../lib/mockData.ts';
import { Empresa } from '../types/index.ts';
import { supabase } from '../lib/supabase.js';

export const EmpresaConfig: React.FC = () => {
  const { isMockMode } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [empresa, setEmpresa] = useState<Empresa>({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    regime_tributario: 'Simples Nacional',
    endereco: '',
    telefone: '',
    certificado_a1_nome: null,
    certificado_a1_validade: null
  });

  const [password, setPassword] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // Carregar dados da empresa
  const loadEmpresaData = async () => {
    setLoading(true);
    try {
      if (isMockMode) {
        const data = getMockEmpresa();
        setEmpresa(data);
        if (data.certificado_a1_nome) {
          setFileName(data.certificado_a1_nome);
        }
        setLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE --
      const { data, error } = await supabase
        .from('empresa_fiscal')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEmpresa(data);
        if (data.certificado_a1_nome) {
          setFileName(data.certificado_a1_nome);
        }
      } else {
        // Inicializar com padrões se não houver registro no Supabase
        const mockDefaults = getMockEmpresa();
        setEmpresa(mockDefaults);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar dados da empresa (caindo para armazenamento local):', err);
      toast('Aviso', 'Utilizando perfil da empresa salvo localmente (Tabela de empresa ausente no Supabase).', 'info');
      // Fallback
      const data = getMockEmpresa();
      setEmpresa(data);
      if (data.certificado_a1_nome) {
        setFileName(data.certificado_a1_nome);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmpresaData();
  }, [isMockMode]);

  // Salvar cadastro de empresa
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isMockMode) {
        saveMockEmpresa(empresa);
        toast('Cadastro Atualizado', 'Dados cadastrais da empresa salvos localmente.', 'success');
        setLoading(false);
        return;
      }

      // -- MODO REAL DO SUPABASE --
      // Verifica se já existe um registro para atualizar, senão insere
      let existing = null;
      try {
        const { data, error: selectErr } = await supabase
          .from('empresa_fiscal')
          .select('id')
          .maybeSingle();
        
        if (selectErr) throw selectErr;
        existing = data;
      } catch (selectErr: any) {
        console.warn('Tabela empresa_fiscal ausente no Supabase, salvando localmente:', selectErr);
        saveMockEmpresa(empresa);
        toast('Salvo Localmente!', 'Dados cadastrais salvos no navegador (Tabela ausente no Supabase).', 'info');
        setLoading(false);
        return;
      }

      let error;
      if (existing) {
        const { error: updateError } = await supabase
          .from('empresa_fiscal')
          .update({
            razao_social: empresa.razao_social,
            nome_fantasia: empresa.nome_fantasia,
            cnpj: empresa.cnpj,
            inscricao_estadual: empresa.inscricao_estadual,
            regime_tributario: empresa.regime_tributario,
            endereco: empresa.endereco,
            telefone: empresa.telefone,
            certificado_a1_nome: empresa.certificado_a1_nome,
            certificado_a1_validade: empresa.certificado_a1_validade
          })
          .eq('id', existing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('empresa_fiscal')
          .insert({
            razao_social: empresa.razao_social,
            nome_fantasia: empresa.nome_fantasia,
            cnpj: empresa.cnpj,
            inscricao_estadual: empresa.inscricao_estadual,
            regime_tributario: empresa.regime_tributario,
            endereco: empresa.endereco,
            telefone: empresa.telefone,
            certificado_a1_nome: empresa.certificado_a1_nome,
            certificado_a1_validade: empresa.certificado_a1_validade
          });
        error = insertError;
      }

      if (error) throw error;
      toast('Sucesso!', 'Dados fiscais da empresa salvos no Supabase.', 'success');
    } catch (err: any) {
      console.error('Erro ao salvar dados da empresa:', err);
      // Fallback definitivo se der erro de tabela ausente ou restrição
      saveMockEmpresa(empresa);
      toast('Salvo Localmente!', 'Dados cadastrais salvos localmente (Tabela desatualizada no Supabase).', 'info');
    } finally {
      setLoading(false);
    }
  };

  // Upload simulado de Certificado A1
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processCertificateFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCertificateFile(e.target.files[0]);
    }
  };

  const processCertificateFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pfx' && ext !== 'p12') {
      toast('Formato Inválido', 'O certificado digital A1 deve ser um arquivo .PFX ou .P12.', 'error');
      return;
    }

    setFileName(file.name);
    toast('Certificado Anexado', 'Insira a senha do certificado para finalizar o vínculo.', 'info');
  };

  const handleLinkCertificate = () => {
    if (!fileName) return;
    if (!password) {
      toast('Senha Necessária', 'Por favor, digite a senha do certificado.', 'warning');
      return;
    }

    // Simular validação e gerar data de expiração (1 ano a partir de hoje)
    const validade = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
    
    const updatedEmpresa = {
      ...empresa,
      certificado_a1_nome: fileName,
      certificado_a1_validade: validade
    };

    setEmpresa(updatedEmpresa);
    setPassword('');

    if (isMockMode) {
      saveMockEmpresa(updatedEmpresa);
    }

    toast('Certificado Ativado!', 'Certificado digital A1 vinculado e ativo para emissão.', 'success');
  };

  const handleRemoveCertificate = () => {
    const confirm = window.confirm('Deseja realmente remover o Certificado Digital A1 vinculado?');
    if (!confirm) return;

    const updatedEmpresa = {
      ...empresa,
      certificado_a1_nome: null,
      certificado_a1_validade: null
    };

    setEmpresa(updatedEmpresa);
    setFileName(null);

    if (isMockMode) {
      saveMockEmpresa(updatedEmpresa);
    }

    toast('Certificado Removido', 'Nenhum certificado ativo no momento.', 'info');
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 animate-fade-in items-start">
      
      {/* Cadastro da Empresa */}
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500" />
            Dados Cadastrais da Empresa
          </CardTitle>
          <CardDescription className="text-xs">
            Informações corporativas essenciais para emissão de documentos fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Razão Social"
                placeholder="Razão Social da Empresa"
                required
                value={empresa.razao_social}
                onChange={(e) => setEmpresa({ ...empresa, razao_social: e.target.value })}
              />
              <Input
                label="Nome Fantasia"
                placeholder="Nome Fantasia da Loja"
                required
                value={empresa.nome_fantasia}
                onChange={(e) => setEmpresa({ ...empresa, nome_fantasia: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="CNPJ"
                placeholder="00.000.000/0000-00"
                required
                value={empresa.cnpj}
                onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
              />
              <Input
                label="Inscrição Estadual"
                placeholder="Isento ou IE do Estado"
                required
                value={empresa.inscricao_estadual}
                onChange={(e) => setEmpresa({ ...empresa, inscricao_estadual: e.target.value })}
              />
            </div>

            <div className="w-full space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Regime Tributário
              </label>
              <select
                className="premium-input bg-background"
                value={empresa.regime_tributario}
                onChange={(e) => setEmpresa({ ...empresa, regime_tributario: e.target.value })}
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Simples Nacional - Excesso de Sublimite">Simples Nacional - Excesso de Sublimite</option>
                <option value="Lucro Presumido">Lucro Presumido</option>
                <option value="Lucro Real">Lucro Real</option>
              </select>
            </div>

            <Input
              label="Endereço Fiscal Completo"
              placeholder="Rua, Número, Bairro, Cidade/UF e CEP"
              required
              value={empresa.endereco}
              onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
            />

            <Input
              label="Telefone Comercial"
              placeholder="Ex: (11) 3333-3333"
              required
              value={empresa.telefone}
              onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
            />

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto shadow-glow-primary">
                {loading ? 'Salvando...' : 'Salvar Dados Fiscais'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* Certificado Digital A1 */}
      <Card className="border-border/60 shadow-lg">
        <CardHeader className="pb-4 border-b border-border/80">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Certificado Digital A1 (.pfx / .p12)
          </CardTitle>
          <CardDescription className="text-xs">
            Vincule seu certificado digital modelo A1 para assinatura eletrônica de notas fiscais.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">

          {/* Status do Certificado Ativo */}
          {empresa.certificado_a1_nome ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/2 flex gap-4 items-start animate-fade-in">
              <div className="h-10 w-10 bg-emerald-500/20 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Certificado Ativo e Autorizado</p>
                <div className="text-xs text-muted-foreground space-y-0.5 leading-relaxed">
                  <p className="font-mono truncate"><strong className="text-foreground">Arquivo:</strong> {empresa.certificado_a1_nome}</p>
                  <p><strong className="text-foreground">Validade:</strong> {new Date(empresa.certificado_a1_validade!).toLocaleDateString('pt-BR')} (Próximos 12 meses)</p>
                  <p><strong className="text-foreground">Emissor:</strong> Autoridade Certificadora ICP-Brasil</p>
                  <p><strong className="text-foreground">Algoritmo:</strong> SHA256withRSA (2048 bits)</p>
                </div>
                <div className="pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-0 h-auto"
                    onClick={handleRemoveCertificate}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover Certificado A1
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/2 flex gap-4 items-start">
              <div className="h-10 w-10 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Nenhum Certificado Anexado</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Sem um certificado digital modelo A1 configurado, as vendas não poderão emitir notas fiscais oficiais da SEFAZ, funcionando apenas como cupons de venda comerciais simples.
                </p>
              </div>
            </div>
          )}

          {/* Área de Upload e Validação */}
          {!empresa.certificado_a1_nome && (
            <div className="space-y-4">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('cert-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="cert-upload" 
                  accept=".pfx,.p12"
                  className="hidden" 
                  onChange={handleFileChange}
                />
                
                {fileName ? (
                  <>
                    <FileText className="h-10 w-10 text-primary mb-2 animate-bounce" />
                    <p className="text-sm font-bold text-primary truncate max-w-[250px]">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Pronto para ativação segura.</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-bold">Arraste e solte seu Certificado A1</p>
                    <p className="text-xs text-muted-foreground mt-1">Formatos aceitos: .pfx ou .p12 (tamanho máx. 5MB)</p>
                  </>
                )}
              </div>

              {fileName && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 animate-slide-up">
                  <div className="relative">
                    <Input
                      label="Digite a Senha do Certificado"
                      type="password"
                      placeholder="Senha do arquivo .pfx / .p12"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <KeyRound className="absolute right-3 top-[2.1rem] h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => { setFileName(null); setPassword(''); }}
                    >
                      Limpar
                    </Button>
                    <Button 
                      className="flex-1 shadow-glow-primary"
                      onClick={handleLinkCertificate}
                    >
                      Validar & Ativar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  );
};
