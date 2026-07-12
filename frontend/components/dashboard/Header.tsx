'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, LogOut, Settings, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeaderProps {
  user: {
    firstName: string;
    lastName: string;
  };
  onLogout: () => void;
  onOpenSettings: () => void;
}

export default function Header({ user, onLogout, onOpenSettings }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-indigo-650 shadow-sm shadow-indigo-600/10">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            DocIntel
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border border-transparent hover:border-zinc-200/50 dark:hover:border-zinc-800/50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate hidden sm:inline-block">
                {user.firstName}
              </span>
              <ChevronDown className={cn("w-3 h-3 text-zinc-400 dark:text-zinc-550 transition-transform duration-200 hidden sm:inline-block", dropdownOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1.5 duration-150">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer text-left"
                >
                  <Settings className="h-3.5 w-3.5 text-zinc-400" />
                  Configurações
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800/60 my-1" />
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer text-left"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
