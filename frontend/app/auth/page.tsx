"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import LoginForm from "../../components/auth/LoginForm";
import RegisterForm from "../../components/auth/RegisterForm";
import ForgotPasswordForm from "../../components/auth/ForgotPasswordForm";
import DashboardSkeleton from "../../components/dashboard/DashboardSkeleton";
import { Loader2, FileText, Shield, BookOpen, Search } from "lucide-react";

export default function AuthPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot-password">("login");
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-zinc-500 dark:text-zinc-400 font-medium animate-pulse">
            Carregando sua sessão...
          </p>
        </div>
      </div>
    );
  }

  // If already authenticated, show dashboard shimmer while router redirects
  if (isAuthenticated) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="flex flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Left Panel - Hero/Brand Showcase (Hidden on Mobile) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-linear-to-tr from-indigo-950 via-slate-900 to-zinc-950 text-white overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        {/* Header */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-linear-to-r from-white to-zinc-300 bg-clip-text text-transparent">
            DocIntel
          </span>
        </div>

        {/* Content Slider/Features */}
        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Gerencie e analise seus documentos com facilidade
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed">
            Organize, filtre e encontre informações essenciais em seus
            relatórios, contratos e manuais de forma rápida e segura.
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 gap-4 pt-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-white/5 rounded-lg border border-white/10">
                <BookOpen className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100">
                  Leitura Facilitada
                </h4>
                <p className="text-sm text-zinc-400">
                  Processamento rápido e resumos claros do conteúdo dos seus
                  arquivos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-white/5 rounded-lg border border-white/10">
                <Search className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100">Busca Eficiente</h4>
                <p className="text-sm text-zinc-400">
                  Encontre cláusulas contratuais, obrigações e prazos em poucos
                  segundos.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-white/5 rounded-lg border border-white/10">
                <Shield className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-100">
                  Privacidade Garantida
                </h4>
                <p className="text-sm text-zinc-400">
                  Seus dados e documentos permanecem encriptados e totalmente
                  protegidos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} DocIntel Corp. Todos os direitos
          reservados.
        </div>
      </div>

      {/* Right Panel - Form (Centered on Mobile, Right side on Desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-12 md:px-12 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md">
          {/* Header for mobile only */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              DocIntel
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-950 transition-all duration-300">
            {mode === "login" ? (
              <LoginForm
                onToggleForm={() => setMode("register")}
                onForgotPassword={() => setMode("forgot-password")}
                onSuccess={() => router.push("/")}
              />
            ) : mode === "register" ? (
              <RegisterForm
                onToggleForm={() => setMode("login")}
                onSuccess={() => router.push("/")}
              />
            ) : (
              <ForgotPasswordForm
                onBackToLogin={() => setMode("login")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
