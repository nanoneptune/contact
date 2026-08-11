import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';

interface EmbeddedGoogleMapProps {
  location: string;
  title?: string;
  height?: string;
  showControls?: boolean;
  className?: string;
}

export const EmbeddedGoogleMap: React.FC<EmbeddedGoogleMapProps> = ({
  location,
  title,
  height = '180px',
  showControls = true,
  className = '',
}) => {
  const [mapType, setMapType] = useState<'m' | 'k'>('m'); // 'm' = standard map, 'k' = satellite

  const cleanLocation = location ? location.trim() : '';
  const mapsEmbedUrl = cleanLocation
    ? `https://maps.google.com/maps?q=${encodeURIComponent(cleanLocation)}&t=${mapType}&z=13&ie=UTF8&iwloc=&output=embed`
    : '';

  const externalMapUrl = cleanLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanLocation)}`
    : 'https://maps.google.com';

  if (!cleanLocation) {
    return (
      <div className={`rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 p-5 text-center space-y-1.5 ${className}`}>
        <MapPin className="w-7 h-7 text-slate-400 mx-auto animate-bounce" />
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Map Waiting for Location
        </p>
        <p className="text-[11px] text-slate-400">
          Enter a city, state, or full address to display the embedded Google Map.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden bg-slate-900 text-white shadow-xs transition-all ${className}`}>
      {/* Map Header Controls */}
      {showControls && (
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Compass className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="font-bold text-slate-200 truncate">{title || cleanLocation}</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-mono border border-emerald-500/30">
              Google Maps
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMapType((prev) => (prev === 'm' ? 'k' : 'm'))}
              className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors border border-slate-700"
              title="Toggle Map or Satellite View"
            >
              {mapType === 'm' ? 'Map' : 'Satellite'}
            </button>

            <a
              href={externalMapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Open full Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Embedded IFrame Container */}
      <div className="relative w-full overflow-hidden bg-slate-950" style={{ height }}>
        <iframe
          title={`Google Map for ${cleanLocation}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapsEmbedUrl}
          className="w-full h-full opacity-95 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Embedded System Footer Bar */}
      <div className="px-3 py-1 bg-slate-950 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 font-mono">
        <div className="flex items-center gap-1 text-slate-300 truncate max-w-[70%]">
          <Navigation className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="truncate">{cleanLocation}</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-400 font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Embedded GPS</span>
        </div>
      </div>
    </div>
  );
};
