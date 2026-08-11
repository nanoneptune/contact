import React, { useRef, useState } from 'react';
import {
  Search,
  Plus,
  X,
  Phone,
  Download,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  FileSpreadsheet,
  FileJson,
  UserPlus,
} from 'lucide-react';
import { Contact, SortOption } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImportJSON: (contacts: Contact[]) => void;
  onResetDefaults: () => void;
  filterFavorite: boolean;
  onToggleFavoriteFilter: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  sortBy,
  onSortChange,
  onExportCSV,
  onExportJSON,
  onImportJSON,
  onResetDefaults,
  filterFavorite,
  onToggleFavoriteFilter,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImportJSON(json);
        } else {
          alert('Invalid backup format. Must be an array of contacts.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Contact Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Organize contacts by name, phone number & location
              </p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name, phone, or place..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none pr-1 cursor-pointer"
              >
                <option value="recent" className="bg-white dark:bg-slate-800">Newest First</option>
                <option value="name-asc" className="bg-white dark:bg-slate-800">Name (A-Z)</option>
                <option value="name-desc" className="bg-white dark:bg-slate-800">Name (Z-A)</option>
                <option value="place" className="bg-white dark:bg-slate-800">By Location</option>
              </select>
            </div>

            {/* Primary Action: New Contact */}
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Contact</span>
            </button>

            {/* Overflow Options Button */}
            <div className="relative">
              <button
                onClick={() => setShowOptions((prev) => !prev)}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                title="More Options"
              >
                <Download className="w-4 h-4" />
              </button>

              {showOptions && (
                <div className="absolute right-0 top-11 z-30 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-2 text-xs animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={() => {
                      onExportCSV();
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    Export to CSV
                  </button>

                  <button
                    onClick={() => {
                      onExportJSON();
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <FileJson className="w-4 h-4 text-indigo-500" />
                    Export Backup (JSON)
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-amber-500" />
                    Import Backup (JSON)
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                  <button
                    onClick={() => {
                      if (confirm('Reset contact directory to default sample contacts?')) {
                        onResetDefaults();
                      }
                      setShowOptions(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset to Samples
                  </button>
                </div>
              )}
            </div>

            {/* Hidden JSON file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
