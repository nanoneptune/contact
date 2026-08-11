import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Contact } from '../types';

interface DeleteConfirmModalProps {
  contact: Contact | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  contact,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !contact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="p-3 bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rounded-full mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Delete Contact?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Are you sure you want to delete <span className="font-semibold text-slate-700 dark:text-slate-300">"{contact.name}"</span>? This action cannot be undone.
          </p>

          <div className="flex items-center gap-3 w-full mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
