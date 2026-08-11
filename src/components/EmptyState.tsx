import React from 'react';
import { UserPlus, SearchX, UserCheck } from 'lucide-react';

interface EmptyStateProps {
  isSearch: boolean;
  onClearFilters?: () => void;
  onOpenCreateModal?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isSearch,
  onClearFilters,
  onOpenCreateModal,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs my-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
        {isSearch ? <SearchX className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
        {isSearch ? 'No matching contacts found' : 'No contacts in directory'}
      </h3>

      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
        {isSearch
          ? 'Try adjusting your search query, location filter, or category selection.'
          : 'Start by creating your first contact with a name, phone number, and location.'}
      </p>

      {isSearch ? (
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Clear Search & Filters
        </button>
      ) : (
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Create First Contact
        </button>
      )}
    </div>
  );
};
