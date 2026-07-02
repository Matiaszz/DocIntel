"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchClient } from "../../lib/api";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import Button from "../../components/ui/Button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Token de verificação ausente.");
      return;
    }

    const verify = async () => {
      try {
        await fetchClient.internal.auth(`/verify-email`, {
          method: "POST",
          params: { token }
        });
        setStatus("success");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(
          err?.message || "Ocorreu um erro ao verificar seu e-mail. O link pode ter expirado."
        );
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm space-y-6 text-center transition-all duration-300">
      {status === "loading" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Verificando e-mail
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Estamos validando a sua conta. Aguarde um instante...
          </p>
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-450">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Conta Ativada!
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
            Seu endereço de e-mail foi verificado com sucesso. Agora você já pode acessar a plataforma DocIntel.
          </p>
          <div className="pt-2 w-full">
            <Button onClick={() => router.push("/auth")}>
              Ir para o Login
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 flex items-center justify-center text-red-650 dark:text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Falha na Ativação
          </h2>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium max-w-sm">
            {errorMessage}
          </p>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 max-w-xs">
            Caso o token tenha expirado, você pode solicitar um novo e-mail de confirmação na tela de login.
          </p>
          <div className="pt-2 w-full">
            <Button onClick={() => router.push("/auth")}>
              Voltar para o Login
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
