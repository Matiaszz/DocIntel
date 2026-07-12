'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, HelpCircle, X } from 'lucide-react';
import Button from '../ui/Button';

export type ModalType = 'info' | 'success' | 'request' | 'error' | 'warn';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function FeedbackModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel
}: FeedbackModalProps) {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />,
      bgIcon: 'bg-emerald-50 dark:bg-emerald-950/40',
      variant: 'primary' as const,
      className: 'bg-emerald-600 hover:bg-emerald-705 dark:bg-emerald-700 dark:hover:bg-emerald-600'
    },
    error: {
      icon: <AlertCircle className="w-7 h-7 text-red-650 dark:text-red-400" />,
      bgIcon: 'bg-red-50 dark:bg-red-950/40',
      variant: 'danger' as const,
      className: ''
    },
    warn: {
      icon: <AlertTriangle className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
      bgIcon: 'bg-amber-50 dark:bg-amber-950/40',
      variant: 'primary' as const,
      className: 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600'
    },
    info: {
      icon: <Info className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/40',
      variant: 'primary' as const,
      className: ''
    },
    request: {
      icon: <HelpCircle className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
      bgIcon: 'bg-indigo-50 dark:bg-indigo-950/40',
      variant: 'primary' as const,
      className: ''
    }
  };

  const currentConfig = config[type] || config.info;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={handleCancel}
      />

      {/* Dialog Box */}
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 z-10 text-center flex flex-col items-center space-y-4">
        
        {/* Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon Container */}
        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${currentConfig.bgIcon} shrink-0 mb-1`}>
          {currentConfig.icon}
        </div>

        {/* Text Content */}
        <div className="space-y-1.5 w-full">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        {/* Buttons Section */}
        <div className="w-full pt-2 flex gap-3">
          {type === 'request' ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 py-2 text-xs"
              >
                {cancelLabel}
              </Button>
              <Button
                variant={currentConfig.variant}
                onClick={handleConfirm}
                className={`flex-1 py-2 text-xs ${currentConfig.className}`}
              >
                {confirmLabel}
              </Button>
            </>
          ) : (
            <Button
              variant={currentConfig.variant}
              onClick={handleConfirm}
              className={`w-full py-2 text-xs ${currentConfig.className}`}
            >
              {confirmLabel}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
