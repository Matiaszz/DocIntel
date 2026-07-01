'use client';

import React from 'react';

interface WelcomeBannerProps {
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function WelcomeBanner({ user }: WelcomeBannerProps) {
  return (
    <section className="bg-gradient-to-r from-indigo-900/90 to-slate-900 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg shadow-indigo-950/5">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/15 rounded-full blur-2xl" />
      <div className="relative z-10 space-y-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          Olá, {user.firstName} {user.lastName}!
        </h1>
        <p className="text-zinc-300 text-xs sm:text-sm">
          Bem-vindo ao painel do DocIntel. Escolha um módulo ou continue seu trabalho abaixo.
        </p>
      </div>
    </section>
  );
}
