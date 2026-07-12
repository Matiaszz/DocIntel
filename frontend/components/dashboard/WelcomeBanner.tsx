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
    <section className="bg-gradient-to-r from-indigo-955 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md shadow-indigo-950/10 border border-indigo-850/20 select-none">
      {/* Dynamic background glow effects */}
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-1.5 max-w-xl">
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-105 to-zinc-200 bg-clip-text text-transparent">
          Olá, {user.firstName} {user.lastName}!
        </h1>
        <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed font-medium">
          Bem-vindo de volta ao DocIntel. Escolha um dos módulos abaixo ou continue organizando seus documentos na biblioteca.
        </p>
      </div>
    </section>
  );
}
