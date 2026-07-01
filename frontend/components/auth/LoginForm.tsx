'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';

interface LoginFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

export default function LoginForm({ onToggleForm, onSuccess }: LoginFormProps) {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

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

      <ErrorAlert message={validationError || authError} />

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
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center justify-center cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="flex justify-end">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
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
