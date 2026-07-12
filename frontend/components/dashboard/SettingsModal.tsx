'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, User, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fetchClient } from '../../lib/api';
import Input from '../ui/Input';
import Button from '../ui/Button';
import ErrorAlert from '../ui/ErrorAlert';
import { CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SettingsModal({ isOpen, onClose, onSuccess }: SettingsModalProps) {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Load user data when modal opens
  useEffect(() => {
    if (user && isOpen) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setStatus('idle');
      setErrorMessage('');
      setActiveTab('profile');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setErrorMessage('');

    if (activeTab === 'profile') {
      if (!firstName.trim() || !lastName.trim() || !email.trim()) {
        setStatus('error');
        setErrorMessage('Todos os campos são obrigatórios.');
        return;
      }

      setStatus('loading');
      try {
        await updateUser(firstName, lastName, email);
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          onClose();
          onSuccess();
        }, 1000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Ocorreu um erro ao atualizar os dados.');
      }
    } else {
      if (!oldPassword || !newPassword || !confirmPassword) {
        setStatus('error');
        setErrorMessage('Preencha todos os campos de senha.');
        return;
      }

      if (newPassword.length < 8) {
        setStatus('error');
        setErrorMessage('A nova senha deve ter pelo menos 8 caracteres.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setStatus('error');
        setErrorMessage('As novas senhas não coincidem.');
        return;
      }

      setStatus('loading');
      try {
        await fetchClient.internal.user('/me/password', {
          method: 'PUT',
          body: { oldPassword, newPassword }
        });
        setStatus('success');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setStatus('idle');
          onClose();
          onSuccess();
        }, 1000);
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Ocorreu um erro ao alterar a senha.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 z-10">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/85">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-indigo-650 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Configurações da Conta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-550 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setStatus('idle'); setErrorMessage(''); }}
            className={`flex items-center gap-2 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-450 hover:text-zinc-600 dark:text-zinc-500'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setStatus('idle'); setErrorMessage(''); }}
            className={`flex items-center gap-2 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer ml-6 ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-450 hover:text-zinc-600 dark:text-zinc-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Segurança
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status Feedback */}
          {status === 'success' && (
            <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/50 dark:border-emerald-950 text-xs font-semibold animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{activeTab === 'profile' ? 'Dados atualizados com sucesso!' : 'Senha alterada com sucesso!'}</span>
            </div>
          )}

          <ErrorAlert message={status === 'error' ? errorMessage : null} />

          {/* Form Fields depending on Active Tab */}
          {activeTab === 'profile' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="firstName"
                  label="Nome"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  placeholder="Ex: João"
                />

                <Input
                  id="lastName"
                  label="Sobrenome"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  placeholder="Ex: Silva"
                />
              </div>

              <Input
                id="email"
                label="E-mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading' || status === 'success'}
                placeholder="Ex: joao.silva@email.com"
              />
            </>
          ) : (
            <>
              <Input
                id="oldPassword"
                label="Senha Atual"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={status === 'loading' || status === 'success'}
                placeholder="••••••••"
              />

              <Input
                id="newPassword"
                label="Nova Senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={status === 'loading' || status === 'success'}
                placeholder="Mínimo 8 caracteres"
              />

              <Input
                id="confirmPassword"
                label="Confirmar Nova Senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={status === 'loading' || status === 'success'}
                placeholder="Repita a nova senha"
              />
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={status === 'loading' || status === 'success'}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={status === 'loading'}
              loadingText="Salvando..."
              disabled={status === 'success'}
              className="flex-1"
            >
              Salvar Alterações
            </Button>
          </div>

        </form>

      </div>
    </div>
  );
}
