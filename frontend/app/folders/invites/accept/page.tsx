"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../hooks/useAuth";
import { fetchClient } from "../../../../lib/api";
import { Loader2, CheckCircle2, AlertCircle, FileText, ArrowRight } from "lucide-react";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const inviteId = searchParams.get("inviteId");
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isLoading || !isAuthenticated || !inviteId || status !== "idle") return;

    const acceptInvite = async () => {
      try {
        setStatus("processing");
        await fetchClient.internal.request(`/api/folders/invites/${inviteId}/accept`, {
          method: "POST",
        });
        setStatus("success");
      } catch (err: any) {
        console.error("Error accepting invite:", err);
        setStatus("error");
        setErrorMsg(err.message || "Falha ao aceitar o convite.");
      }
    };

    acceptInvite();
  }, [isAuthenticated, isLoading, inviteId, status]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
          Verificando sua sessão...
        </p>
      </div>
    );
  }

  if (!inviteId) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Link Inválido</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          O link de convite está incorreto ou malformado.
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
        >
          Ir para o Painel
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Convite de Colaboração</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Você foi convidado para colaborar em uma pasta no DocIntel. Para aceitar, por favor faça login na sua conta.
          </p>
        </div>
        <button
          onClick={() => router.push(`/auth?redirect=/folders/invites/accept?inviteId=${inviteId}`)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          Fazer Login <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-lg text-center space-y-6 animate-in zoom-in-95 duration-200">
      {status === "processing" && (
        <div className="space-y-4 py-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
          <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Aceitando convite da pasta...
          </p>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Convite Aceito!</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Você aceitou o convite com sucesso. A pasta compartilhada já está disponível no seu painel.
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Acessar Painel
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Não foi possível aceitar</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {errorMsg}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
          >
            Ir para o Painel
          </button>
        </>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="flex flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            Carregando página de convites...
          </p>
        </div>
      }>
        <AcceptInviteContent />
      </Suspense>
    </div>
  );
}
