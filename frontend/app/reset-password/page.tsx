"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchClient } from "../../lib/api";
import { Loader2, Lock, Eye, EyeOff, CheckCircle2, FileText } from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ErrorAlert from "../../components/ui/ErrorAlert";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token de redefinição inválido ou ausente.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    if (password.length < 8) {
      setError("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      await fetchClient.internal.auth("/reset-password", {
        method: "POST",
        body: { token, password }
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(
        err?.message || "Erro ao redefinir a senha. O token pode estar expirado ou inválido."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm space-y-6 text-center transition-all duration-300 animate-in fade-in">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Senha Alterada!
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Sua senha foi redefinida com sucesso. Agora você já pode acessar a plataforma utilizando suas novas credenciais.
          </p>
          <div className="pt-2 w-full">
            <Button onClick={() => router.push("/auth")}>
              Ir para o Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm space-y-6 transition-all duration-300">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nova Senha
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Crie uma nova senha de acesso para sua conta
        </p>
      </div>

      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nova Senha"
          id="reset-password"
          type={showPassword ? "text" : "password"}
          placeholder="No mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          icon={<Lock className="h-5 w-5" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          }
        />

        <Input
          label="Confirmar Nova Senha"
          id="reset-password-confirm"
          type={showPassword ? "text" : "password"}
          placeholder="Repita a nova senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          icon={<Lock className="h-5 w-5" />}
        />

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Redefinindo..."
        >
          Salvar Nova Senha
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4">
      {/* Brand logo */}
      <div className="flex items-center gap-2 mb-8 justify-center select-none">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
          <FileText className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
          DocIntel
        </span>
      </div>
      <Suspense fallback={
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-450">Carregando...</p>
        </div>
      }>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
