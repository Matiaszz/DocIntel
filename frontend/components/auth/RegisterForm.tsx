"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Input from "../ui/Input";
import Button from "../ui/Button";
import ErrorAlert from "../ui/ErrorAlert";

interface RegisterFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

export default function RegisterForm({
  onToggleForm,
  onSuccess,
}: RegisterFormProps) {
  const { register, error: authError, clearError } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    // Validations
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setValidationError("Por favor, preencha todos os campos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError("Por favor, insira um e-mail válido.");
      return;
    }

    if (password.length < 8) {
      setValidationError("A senha deve conter no mínimo 8 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      await register(firstName, lastName, email, password);
      onSuccess();
    } catch (err) {
      // Errors are handled in the context, but we catch to stop loading
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Crie sua conta
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Comece a organizar e analisar seus documentos de forma inteligente
        </p>
      </div>

      <ErrorAlert message={validationError || authError} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Nome"
            id="register-firstname"
            type="text"
            placeholder="João"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isLoading}
            icon={<User className="h-5 w-5" />}
          />

          <Input
            label="Sobrenome"
            id="register-lastname"
            type="text"
            placeholder="Silva"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isLoading}
            icon={<User className="h-5 w-5" />}
          />
        </div>

        <Input
          label="E-mail"
          id="register-email"
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
            id="register-password"
            type={showPassword ? "text" : "password"}
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
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            }
          />
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            A senha deve conter no mínimo 8 caracteres.
          </p>
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Registrando..."
          icon={<ArrowRight className="h-5 w-5" />}
        >
          Criar Conta
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Já possui uma conta?{" "}
          <button
            type="button"
            onClick={() => {
              clearError();
              onToggleForm();
            }}
            disabled={isLoading}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 transition-colors cursor-pointer"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}
