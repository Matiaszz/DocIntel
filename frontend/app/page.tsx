"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import {
  FolderOpen,
  Clock,
  FileSearch,
  ArrowRight,
  Lock,
  ArrowLeft,
} from "lucide-react";
import Header from "../components/dashboard/Header";
import WelcomeBanner from "../components/dashboard/WelcomeBanner";
import StatsCard from "../components/dashboard/StatsCard";
import DocumentAnalysis from "../components/dashboard/DocumentAnalysis";
import SettingsModal from "../components/dashboard/SettingsModal";
import FeedbackModal, { ModalType } from "../components/dashboard/FeedbackModal";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";

export default function Home() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [selectedModule, setSelectedModule] = useState<
    "analise" | "gestao" | null
  >(null);
  const [showSettings, setShowSettings] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    type: ModalType;
    title: string;
    message: string;
  } | null>(null);
  const router = useRouter();

  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  // Beautiful custom shimmer instead of spinner loader
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Prevent flash of unauthenticated content
  if (!isAuthenticated || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
        <WelcomeBanner user={user} />

        {/* 1. MODULES SELECTOR (Default home view) */}
        {selectedModule === null ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Nossos Módulos
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                Selecione uma ferramenta abaixo para iniciar sua jornada
                documental.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Module A: Análise de Documentos */}
              <div
                onClick={() => setSelectedModule("analise")}
                className="group relative flex flex-col justify-between p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500/50 dark:hover:border-indigo-500/30 hover:scale-[1.01] transition-all cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                <div className="space-y-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSearch className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      Análise de Documentos
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Analise seus arquivos de texto, PDF ou contratos. Extraia
                      resumos automáticos, tags de classificação e faça buscas
                      inteligentes com auxílio da IA.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Acessar módulo</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-[10px] uppercase tracking-wider">
                    Ativo
                  </span>
                </div>
              </div>

              {/* Module B: Gestão de Documentos (Em breve) */}
              <div className="group relative flex flex-col justify-between p-6 bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl opacity-60 cursor-not-allowed overflow-hidden">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-200 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      Gestão de Documentos
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
                      Organize e centralize todos os seus documentos. Crie
                      pastas inteligentes, gerencie tags de busca, controle de
                      versões e compartilhamento seguro.
                    </p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                  <span>Indisponível</span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] uppercase tracking-wider">
                    Em breve
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 2. ACTIVE MODULE CONTENT (Análise de Documentos) */
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            {/* Breadcrumb / Nav */}
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <button
                onClick={() => setSelectedModule(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Voltar para módulos
              </button>
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-800">
                Módulo: Análise de Documentos
              </span>
            </div>

            {/* Dashboard Stats */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StatsCard
                icon={<FolderOpen className="w-6 h-6" />}
                label="Total de Arquivos"
                value="4"
              />
              <StatsCard
                icon={<Clock className="w-6 h-6" />}
                iconBgClass="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                label="Análise Concluída"
                value="4"
              />
            </section>

            {/* Workspace Operations */}
            <div className="max-w-4xl mx-auto w-full">
              <DocumentAnalysis />
            </div>
          </div>
        )}
      </main>

      {/* Account Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSuccess={() => {
          setFeedbackModal({
            isOpen: true,
            type: 'success',
            title: 'Perfil Atualizado',
            message: 'Suas informações de perfil foram salvas e atualizadas com sucesso!'
          });
        }}
      />

      {/* Reusable Feedback Modal */}
      {feedbackModal && (
        <FeedbackModal
          isOpen={feedbackModal.isOpen}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmLabel="Ok, entendi"
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
}
