'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Focus confirm button when dialog opens
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [open, onCancel]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
          isDanger ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          {isDanger ? (
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3
          id="confirm-dialog-title"
          className="text-xl font-semibold text-gray-900 text-center mb-2"
        >
          {title}
        </h3>

        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="text-gray-600 text-center mb-6"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

