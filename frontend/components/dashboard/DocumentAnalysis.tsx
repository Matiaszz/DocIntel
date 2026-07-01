'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  FileUp,
  FolderOpen,
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  Download,
  Files,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface MockDocument {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  summary: string;
  metadata: {
    label: string;
    value: string;
  }[];
}

const mockDocuments: MockDocument[] = [
  {
    id: '1',
    name: 'Contrato_Prestacao_Servicos_TI.pdf',
    size: '1.8 MB',
    date: '01/07/2026',
    type: 'PDF',
    summary: 'Este contrato estabelece os termos para prestação de serviços de desenvolvimento de software, suporte técnico e consultoria em nuvem entre a DocIntel Tecnologias Ltda. e DevCorp Soluções de Software. As obrigações incluem SLA de suporte de 99.9% e cláusulas de confidencialidade de dados.',
    metadata: [
      { label: 'Tipo de Documento', value: 'Contrato de Prestação de Serviços' },
      { label: 'Partes Envolvidas', value: 'DocIntel Tecnologias & DevCorp' },
      { label: 'Valor Mensal', value: 'R$ 15.000,00' },
      { label: 'Vigência', value: '12 meses' },
      { label: 'Foro Jurídico', value: 'São Paulo/SP' }
    ]
  },
  {
    id: '2',
    name: 'Relatorio_Financeiro_Q2_2026.docx',
    size: '920 KB',
    date: '30/06/2026',
    type: 'DOCX',
    summary: 'O relatório apresenta o desempenho financeiro consolidado do segundo trimestre (Q2) de 2026, destacando o crescimento de 15% nas receitas recorrentes de licenciamento SaaS e redução de 8% nos custos gerais de infraestrutura de TI.',
    metadata: [
      { label: 'Tipo de Documento', value: 'Relatório Financeiro Trimestral' },
      { label: 'Período', value: 'Q2 2026 (Abril - Junho)' },
      { label: 'Faturamento Total', value: 'R$ 1.250.000,00' },
      { label: 'Margem Ebitda', value: '38.5%' },
      { label: 'Status da Auditoria', value: 'Aprovado sem ressalvas' }
    ]
  },
  {
    id: '3',
    name: 'Termos_de_Uso_DocIntel.pdf',
    size: '2.1 MB',
    date: '28/06/2026',
    type: 'PDF',
    summary: 'Regulamenta o uso da plataforma de inteligência documental DocIntel, definindo regras de conduta para usuários, propriedade intelectual, limitação de responsabilidade e as diretrizes de privacidade de dados em total conformidade com a LGPD.',
    metadata: [
      { label: 'Tipo de Documento', value: 'Termos de Serviço / Uso' },
      { label: 'Versão', value: 'v2.4 (Revisada)' },
      { label: 'Última Atualização', value: '28 de Junho de 2026' },
      { label: 'Conformidade LGPD', value: 'Sim (100% aderente)' },
      { label: 'Suporte a Litígios', value: 'Câmara de Arbitragem de SP' }
    ]
  },
  {
    id: '4',
    name: 'Fatura_Servicos_Nuvem.pdf',
    size: '340 KB',
    date: '25/06/2026',
    type: 'PDF',
    summary: 'Fatura detalhada referente ao consumo mensal de serviços de infraestrutura em nuvem (instâncias EC2, buckets S3, banco de dados RDS e funções Lambda) durante o período de faturamento de Junho de 2026 na AWS.',
    metadata: [
      { label: 'Tipo de Documento', value: 'Fatura / Nota Fiscal' },
      { label: 'Provedor', value: 'Amazon Web Services (AWS) Brasil' },
      { label: 'Valor da Fatura', value: 'R$ 3.420,50' },
      { label: 'Data de Vencimento', value: '10/07/2026' },
      { label: 'Centro de Custos', value: 'Tecnologia / P&D' }
    ]
  }
];

export default function DocumentAnalysis() {
  const [step, setStep] = useState<'options' | 'upload' | 'existing' | 'loading' | 'result'>('options');
  const [selectedDoc, setSelectedDoc] = useState<MockDocument | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Inicializando...');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle simulated analysis loading
  useEffect(() => {
    if (step !== 'loading') return;

    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setStep('result');
          }, 300);
          return 100;
        }
        return next;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [step]);

  // Update status message based on progress
  useEffect(() => {
    if (loadingProgress < 25) {
      setLoadingMessage(`Lendo arquivo: ${selectedDoc?.name || 'documento'}`);
    } else if (loadingProgress < 55) {
      setLoadingMessage('Extraindo textos, tabelas e parágrafos estruturados...');
    } else if (loadingProgress < 85) {
      setLoadingMessage('Analisando contexto e extraindo metadados com Inteligência Artificial...');
    } else {
      setLoadingMessage('Gerando resumo executivo e estruturando resultados...');
    }
  }, [loadingProgress, selectedDoc]);

  const handleSelectExisting = (doc: MockDocument) => {
    setSelectedDoc(doc);
    setStep('loading');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create a mock document entry for the uploaded file
    const newDoc: MockDocument = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      date: new Date().toLocaleDateString('pt-BR'),
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      summary: `O documento "${file.name}" foi importado para a plataforma de inteligência artificial. O processamento preliminar detectou padrões textuais coerentes com documentos operacionais e registros corporativos. O modelo de linguagem sumarizou os principais pontos para facilitar a navegação rápida.`,
      metadata: [
        { label: 'Tipo de Documento', value: 'Arquivo Importado' },
        { label: 'Nome Original', value: file.name },
        { label: 'Tamanho do Arquivo', value: `${(file.size / (1024 * 1024)).toFixed(2)} MB` },
        { label: 'Data de Importação', value: new Date().toLocaleDateString('pt-BR') },
        { label: 'Status da Análise', value: 'Concluída com Sucesso' }
      ]
    };

    setSelectedDoc(newDoc);
    setStep('loading');
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between transition-all duration-300">
      
      {/* 1. OPTIONS VIEW */}
      {step === 'options' && (
        <div className="space-y-6 flex-1 flex flex-col justify-center">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Análise de Documentos
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Escolha uma opção abaixo para analisar um documento e extrair seus metadados.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: Select Existing */}
            <div
              onClick={() => setStep('existing')}
              className="group border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 rounded-xl p-5 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all flex flex-col gap-3 shadow-sm hover:shadow-md hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Selecionar documento já existente
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Acesse sua biblioteca de arquivos e escolha um documento enviado anteriormente.
                </p>
              </div>
            </div>

            {/* Option B: Upload New */}
            <div
              onClick={() => setStep('upload')}
              className="group border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/30 rounded-xl p-5 cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all flex flex-col gap-3 shadow-sm hover:shadow-md hover:scale-[1.01]"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  Enviar novo documento
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Faça o upload de um arquivo PDF, TXT ou DOCX direto do seu computador.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. UPLOAD NEW VIEW */}
      {step === 'upload' && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('options')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                Enviar Novo Documento
              </h3>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.docx"
            />

            <div 
              onClick={triggerFileInput}
              className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:scale-110 transition-transform">
                <FileUp className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Clique para fazer upload ou arraste o arquivo
                </p>
                <p className="text-xs text-zinc-400">Suporta PDF, TXT ou DOCX (Max. 20MB)</p>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mt-2">
            Seus dados são protegidos por criptografia de ponta a ponta.
          </div>
        </div>
      )}

      {/* 3. SELECT EXISTING VIEW */}
      {step === 'existing' && (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('options')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
              <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                Selecione um Arquivo Existente
              </h3>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/10">
              <div className="max-h-[220px] overflow-y-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                {mockDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectExisting(doc)}
                    className="flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                          <span>{doc.size}</span>
                          <span>•</span>
                          <span>{doc.date}</span>
                        </div>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100/50 dark:border-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-950 transition-colors shrink-0">
                      Analisar
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. LOADING / PROCESSING VIEW */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
            <span className="absolute text-sm font-bold text-indigo-600">{loadingProgress}%</span>
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white animate-pulse">
              Processando IA...
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 min-h-[32px] leading-relaxed transition-all">
              {loadingMessage}
            </p>
          </div>

          <div className="w-full max-w-xs bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 5. ANALYSIS RESULT VIEW */}
      {step === 'result' && selectedDoc && (
        <div className="space-y-5 flex-1 flex flex-col justify-between animate-in fade-in duration-300">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <button
                onClick={() => setStep('options')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Nova Análise
              </button>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-950">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Análise Concluída
              </span>
            </div>

            {/* Document Profile */}
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {selectedDoc.name}
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                  {selectedDoc.size} • {selectedDoc.type}
                </p>
              </div>
            </div>

            {/* Summary Block */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Resumo Executivo (IA)
              </h5>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800/30">
                {selectedDoc.summary}
              </p>
            </div>

            {/* Extracted Metadata Grid */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                Metadados Extraídos
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {selectedDoc.metadata.map((meta, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between p-2 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/30 rounded-lg"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500">{meta.label}</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-200 text-right truncate pl-2 max-w-[65%]">
                      {meta.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              onClick={() => {
                alert(`Exportando metadados de "${selectedDoc.name}" em formato JSON...`);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar JSON
            </button>
            <button
              onClick={() => setStep('options')}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 px-3 py-2.5 rounded-xl cursor-pointer transition-all shadow-sm shadow-indigo-950/15"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analisar Outro
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
