'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fetchClient } from '../../lib/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface LoginFormProps {
  onToggleForm: () => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}

export default function LoginForm({ onToggleForm, onForgotPassword, onSuccess }: LoginFormProps) {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const isEmailUnverified = authError?.toLowerCase().includes('não verificado') || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();
    setResendSuccess(false);

    // Basic Validation
    if (!email.trim() || !password) {
      setValidationError('Por favor, preencha todos os campos.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Por favor, insira um e-mail válido.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      onSuccess();
    } catch (err: any) {
      // Errors are handled in the context, but we catch to stop loading
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResendLoading(true);
    try {
      await fetchClient.internal.auth('/resend-verification', {
        method: 'POST',
        params: { email }
      });
      setResendSuccess(true);
      clearError();
    } catch (err: any) {
      setValidationError(err?.message || 'Erro ao reenviar e-mail de verificação.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Bem-vindo de volta
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Acesse sua conta para gerenciar seus documentos
        </p>
      </div>

      <ErrorAlert message={validationError || (isEmailUnverified ? null : authError)} />

      {isEmailUnverified && (
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl space-y-2 text-xs text-indigo-750 dark:text-indigo-400">
          <p>
            Parece que a sua conta ainda não foi ativada. Deseja que enviemos um novo link de confirmação?
          </p>
          {resendSuccess ? (
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
              E-mail de verificação reenviado com sucesso! Verifique sua caixa de entrada.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="inline-flex items-center gap-1.5 font-bold hover:underline text-indigo-600 dark:text-indigo-300 disabled:opacity-50 cursor-pointer pt-1"
            >
              {resendLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : null}
              Reenviar e-mail de ativação
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="E-mail"
          id="login-email"
          type="email"
          placeholder="seu-email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          icon={<Mail className="h-5 w-5" />}
        />

        <div className="space-y-2">
          <Input
            label="Senha"
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            icon={<Lock className="h-5 w-5" />}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                clearError();
                onForgotPassword();
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors"
            >
              Esqueceu a senha?
            </a>
          </div>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Entrando..."
          icon={<ArrowRight className="h-5 w-5" />}
        >
          Entrar
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={() => {
              clearError();
              onToggleForm();
            }}
            disabled={isLoading}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors cursor-pointer"
          >
            Cadastre-se grátis
          </button>
        </p>
      </div>
    </div>
  );
}
