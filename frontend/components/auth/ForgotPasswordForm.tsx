"use client";

import React, { useState } from "react";
import { Mail, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { fetchClient } from "../../lib/api";
import Input from "../ui/Input";
import Button from "../ui/Button";
import ErrorAlert from "../ui/ErrorAlert";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export default function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Por favor, preencha o campo de e-mail.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um e-mail válido.");
      return;
    }

    setIsLoading(true);
    try {
      await fetchClient.internal.auth("/forgot-password", {
        method: "POST",
        body: { email }
      });
      setIsSuccess(true);
    } catch (err: any) {
      // For security, even if the error is 404, we don't leak user existence
      // but if it's a network error, we display it.
      setError(err?.message || "Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full space-y-6 text-center animate-in fade-in duration-300">
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Instruções Enviadas!
          </h2>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 max-w-sm leading-relaxed">
            Se o e-mail informado estiver cadastrado em nossa base, você receberá um link para redefinir a sua senha em instantes. Verifique também a sua pasta de spam.
          </p>
        </div>
        <Button
          type="button"
          onClick={onBackToLogin}
        >
          Voltar para o Login
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Recuperar Senha
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Digite seu e-mail cadastrado e enviaremos um link de recuperação
        </p>
      </div>

      <ErrorAlert message={error} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-mail"
          id="forgot-email"
          type="email"
          placeholder="seu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          icon={<Mail className="h-5 w-5" />}
        />

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Enviando..."
          icon={<ArrowRight className="h-5 w-5" />}
        >
          Enviar Link de Recuperação
        </Button>
      </form>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          disabled={isLoading}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para o Login
        </button>
      </div>
    </div>
  );
}
