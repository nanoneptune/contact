import React from 'react';
import { Users, MapPin, Star, Filter, Tag } from 'lucide-react';
import { Contact } from '../types';

interface StatsBarProps {
  contacts: Contact[];
  selectedPlace: string | null;
  onSelectPlace: (place: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  filterFavorite: boolean;
  onToggleFavoriteFilter: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  contacts,
  selectedPlace,
  onSelectPlace,
  selectedTag,
  onSelectTag,
  filterFavorite,
  onToggleFavoriteFilter,
}) => {
  const totalCount = contacts.length;
  const favoriteCount = contacts.filter((c) => c.isFavorite).length;

  // Extract unique places
  const placesMap = contacts.reduce((acc, c) => {
    acc[c.place] = (acc[c.place] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniquePlaces = Object.keys(placesMap);

  // Extract tags count
  const tagsList = ['Personal', 'Work', 'Family', 'VIP', 'Other'] as const;

  return (
    <div className="space-y-4">
      {/* Top Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Contacts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Contacts
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {totalCount}
            </p>
          </div>
        </div>

        {/* Unique Places */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 rounded-xl">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Locations / Places
            </p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {uniquePlaces.length}
            </p>
          </div>
        </div>

        {/* Favorites Card */}
        <div
          onClick={onToggleFavoriteFilter}
          className={`col-span-2 sm:col-span-1 border rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all shadow-2xs ${
            filterFavorite
              ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl ${
                filterFavorite
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-500 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Favorites
              </p>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                {favoriteCount}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {filterFavorite ? 'Showing only starred' : 'Click to filter'}
          </span>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tag Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Category:
          </span>
          <button
            onClick={() => onSelectTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedTag === null
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
            }`}
          >
            All
          </button>
          {tagsList.map((t) => (
            <button
              key={t}
              onClick={() => onSelectTag(selectedTag === t ? null : t)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedTag === t
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Place Filter Pills */}
        {uniquePlaces.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Place:
            </span>
            <button
              onClick={() => onSelectPlace(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedPlace === null
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
              }`}
            >
              All Places
            </button>
            {uniquePlaces.map((pl) => (
              <button
                key={pl}
                onClick={() => onSelectPlace(selectedPlace === pl ? null : pl)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedPlace === pl
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{pl}</span>
                <span className="text-[10px] opacity-75">({placesMap[pl]})</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
