'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  FolderOpen,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Download,
  Sparkles,
  AlertCircle,
  Folder,
  ChevronRight
} from 'lucide-react';
import { fetchClient } from '../../lib/api';
import { useCategories } from '../../hooks/useCategories';
import { cn } from '../../lib/utils';
import Button from '../ui/Button';

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

interface TreeNode {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE';
  s3Key?: string | null;
  category?: string | null;
  analyzed?: boolean;
  children: TreeNode[];
}

export default function DocumentAnalysis() {
  const [step, setStep] = useState<'existing' | 'loading' | 'result'>('existing');
  const [selectedDoc, setSelectedDoc] = useState<MockDocument | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Inicializando...');
  
  // Real tree and file manager states
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loadingTree, setLoadingTree] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Re-analysis confirmation modal states
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<TreeNode | null>(null);

  const { resolveCategory } = useCategories();

  const fetchTree = async () => {
    setLoadingTree(true);
    setError(null);
    try {
      const data = await fetchClient.internal.request<TreeNode[]>('/api/documents/tree');
      setTree(data || []);
    } catch (err) {
      console.error(err);
      setError('Falha ao carregar os arquivos da biblioteca.');
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

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

  // Finder-like active folder navigation helper
  const activeChildren = useMemo(() => {
    if (!selectedFolderId) {
      return tree;
    }
    const findFolder = (nodes: TreeNode[]): TreeNode[] | null => {
      for (const n of nodes) {
        if (n.id === selectedFolderId) return n.children || [];
        const res = findFolder(n.children || []);
        if (res) return res;
      }
      return null;
    };
    return findFolder(tree) || [];
  }, [tree, selectedFolderId]);

  // Finder breadcrumbs path resolver
  const breadcrumbs = useMemo(() => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Meu Drive' }];
    if (!selectedFolderId) return path;

    const findPath = (nodes: TreeNode[], targetId: string, currentPath: { id: string; name: string }[]): boolean => {
      for (const n of nodes) {
        const newPath = [...currentPath, { id: n.id, name: n.name }];
        if (n.id === targetId) {
          path.push(...newPath);
          return true;
        }
        if (n.children && findPath(n.children, targetId, newPath)) {
          return true;
        }
      }
      return false;
    };
    findPath(tree, selectedFolderId, []);
    return path;
  }, [tree, selectedFolderId]);

  const runAnalysis = (file: TreeNode) => {
    const docResult: MockDocument = {
      id: file.id,
      name: file.name,
      size: '1.4 MB',
      date: new Date().toLocaleDateString('pt-BR'),
      type: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      summary: `O documento "${file.name}" foi analisado com sucesso pelo modelo de processamento cognitivo inteligente. Os metadados abaixo foram validados contra as políticas contratuais vigentes.`,
      metadata: [
        { label: 'Tipo de Documento', value: resolveCategory(file.category)?.label || 'Geral' },
        { label: 'Categoria', value: resolveCategory(file.category)?.type || 'Outros' },
        { label: 'Status da Análise', value: 'Concluído com Sucesso' },
        { label: 'Data do Processamento', value: new Date().toLocaleDateString('pt-BR') }
      ]
    };
    setSelectedDoc(docResult);
    setStep('loading');
  };

  const handleFileClick = (file: TreeNode) => {
    if (file.analyzed) {
      setPendingFile(file);
      setShowReanalyzeModal(true);
    } else {
      runAnalysis(file);
    }
  };

  const confirmReanalysis = () => {
    if (pendingFile) {
      runAnalysis(pendingFile);
    }
    setShowReanalyzeModal(false);
    setPendingFile(null);
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-sm min-h-[460px] flex flex-col justify-between transition-all duration-300">
      
      {/* 1. SELECT EXISTING VIEW (Simplified Finder Explorer) */}
      {step === 'existing' && (
        <div className="space-y-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4 w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {selectedFolderId && (
                  <button
                    onClick={() => {
                      if (breadcrumbs.length <= 2) {
                        setSelectedFolderId(null);
                      } else {
                        const parent = breadcrumbs[breadcrumbs.length - 2];
                        setSelectedFolderId(parent.id);
                      }
                    }}
                    className="p-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shrink-0"
                    title="Voltar um nível"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 select-none font-medium whitespace-nowrap">
                  {breadcrumbs.map((b, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />}
                      <button
                        onClick={() => setSelectedFolderId(b.id)}
                        className={cn(
                          'hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer',
                          idx === breadcrumbs.length - 1 ? 'text-zinc-900 dark:text-white font-semibold' : ''
                        )}
                      >
                        {b.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none sm:text-right shrink-0">
                Análise de Arquivos
              </h3>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-650 dark:text-red-400 text-xs rounded-xl flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-550 dark:text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/25 dark:bg-zinc-950/10 min-h-[280px] max-h-[350px] overflow-y-auto custom-scrollbar">
              {loadingTree ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">Carregando biblioteca...</span>
                </div>
              ) : activeChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[280px] text-center gap-3 p-6">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 dark:text-zinc-550">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Pasta Vazia</p>
                    <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-0.5">Nenhum arquivo encontrado neste diretório.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {[...activeChildren]
                    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'FOLDER' ? -1 : 1))
                    .map(node => {
                      const isFolder = node.type === 'FOLDER';
                      return (
                        <div
                          key={node.id}
                          onClick={() => {
                            if (isFolder) {
                              setSelectedFolderId(node.id);
                            } else {
                              handleFileClick(node);
                            }
                          }}
                          className="flex items-center justify-between p-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 cursor-pointer transition-all duration-150 select-none group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isFolder ? (
                              <Folder className="w-4 h-4 text-amber-500 fill-amber-500/10 shrink-0 group-hover:scale-105 transition-transform" />
                            ) : (
                              <FileText className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
                            )}
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-250 truncate group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                              {node.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {isFolder ? (
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold bg-zinc-100 dark:bg-zinc-800/40 px-2 py-0.5 rounded-full">
                                {node.children?.length || 0} itens
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                {node.analyzed && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/50 font-bold shrink-0">
                                    Analisado
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 transition-colors">
                                  Analisar
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 select-none text-center font-medium">
            Selecione qualquer arquivo para extrair dados usando Inteligência Artificial.
          </div>
        </div>
      )}

      {/* 2. LOADING / PROCESSING VIEW */}
      {step === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 text-center animate-in fade-in duration-300">
          <div className="relative flex items-center justify-center">
            <Loader2 className="w-16 h-16 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span className="absolute text-xs font-bold text-indigo-600 dark:text-indigo-400">{loadingProgress}%</span>
          </div>

          <div className="space-y-2 max-w-sm">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Processando IA...
            </h3>
            <p className="text-xs text-zinc-555 dark:text-zinc-400 min-h-[36px] leading-relaxed transition-all duration-300">
              {loadingMessage}
            </p>
          </div>

          <div className="w-full max-w-xs bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. ANALYSIS RESULT VIEW */}
      {step === 'result' && selectedDoc && (
        <div className="space-y-6 flex-1 flex flex-col justify-between animate-in fade-in duration-300">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
              <button
                onClick={() => setStep('existing')}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-full border border-emerald-100/50 dark:border-emerald-900/50">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Análise Concluída
              </span>
            </div>

            {/* Document Profile */}
            <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {selectedDoc.name}
                </h4>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {selectedDoc.size} • {selectedDoc.type}
                </p>
              </div>
            </div>

            {/* Summary Block */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                Resumo Executivo (IA)
              </h5>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50/50 dark:bg-zinc-900/20 p-3.5 rounded-xl border border-zinc-150/50 dark:border-zinc-800/40">
                {selectedDoc.summary}
              </p>
            </div>

            {/* Extracted Metadata Grid */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none">
                Metadados Extraídos
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {selectedDoc.metadata.map((meta, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-150/40 dark:border-zinc-800/40 rounded-xl"
                  >
                    <span className="text-zinc-450 dark:text-zinc-550 font-medium">{meta.label}</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-right truncate pl-2 max-w-[65%]">
                      {meta.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button
              variant="outline"
              onClick={() => {
                alert(`Exportando metadados de "${selectedDoc.name}" em formato JSON...`);
              }}
              icon={<Download className="w-4 h-4" />}
            >
              Exportar JSON
            </Button>
            <Button
              onClick={() => setStep('existing')}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Analisar Outro
            </Button>
          </div>
        </div>
      )}

      {/* REANALYZE CONFIRMATION MODAL */}
      {showReanalyzeModal && pendingFile && (
        <div className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Documento Já Analisado</h3>
            <p className="text-xs text-zinc-555 dark:text-zinc-405 leading-relaxed">
              O documento <span className="font-semibold text-zinc-800 dark:text-zinc-200">"{pendingFile.name}"</span> já passou por uma análise estruturada anteriormente.
              Tem certeza de que deseja reanalisá-lo? Isso executará uma nova consulta ao modelo de Inteligência Artificial.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReanalyzeModal(false);
                  setPendingFile(null);
                }}
                className="w-auto px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmReanalysis}
                className="w-auto px-4 py-2"
              >
                Sim, Reanalisar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
