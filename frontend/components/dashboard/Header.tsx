'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileText, LogOut, Settings } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-white border-b border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            DocIntel
          </span>
        </div>

        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate hidden sm:inline">
              {user.firstName}
            </span>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
              >
                <Settings className="h-4 w-4 text-zinc-500" />
                Configurações
              </button>
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 my-1" />
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer text-left font-medium"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
