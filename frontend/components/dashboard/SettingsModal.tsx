'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Settings, User, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fetchClient } from '../../lib/api';

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Configurações da Conta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/20 dark:bg-zinc-950/10">
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setStatus('idle'); setErrorMessage(''); }}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-500'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Perfil
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setStatus('idle'); setErrorMessage(''); }}
            className={`flex items-center gap-1.5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer ml-6 ${
              activeTab === 'password'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-500'
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
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100/50 dark:border-emerald-950 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{activeTab === 'profile' ? 'Dados atualizados com sucesso!' : 'Senha alterada com sucesso!'}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 rounded-xl border border-red-100/50 dark:border-red-950 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields depending on Active Tab */}
          {activeTab === 'profile' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Nome
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={status === 'loading' || status === 'success'}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                    placeholder="Ex: João"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Sobrenome
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={status === 'loading' || status === 'success'}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                    placeholder="Ex: Silva"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                  placeholder="Ex: joao.silva@email.com"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label htmlFor="oldPassword" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Senha Atual
                </label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Nova Senha
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 text-zinc-900 dark:text-white transition-colors"
                  placeholder="Repita a nova senha"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={status === 'loading' || status === 'success'}
              className="flex-1 px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 rounded-xl cursor-pointer transition-all shadow-sm shadow-indigo-950/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
