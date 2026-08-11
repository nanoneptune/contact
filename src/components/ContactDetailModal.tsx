import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Star,
  Copy,
  Check,
  MessageSquare,
  Edit2,
  Trash2,
  Calendar,
  ExternalLink,
  Tag,
  FileText,
} from 'lucide-react';
import { Contact } from '../types';
import { getAvatarColor, getInitials } from '../utils/storage';
import { EmbeddedGoogleMap } from './EmbeddedGoogleMap';

interface ContactDetailModalProps {
  contact: Contact | null;
  onClose: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);

  if (!contact) return null;

  const avatarStyle = getAvatarColor(contact.name);
  const initials = getInitials(contact.name);

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    contact.place
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Banner Header */}
        <div className="relative h-28 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar overlay */}
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold ring-4 ring-white dark:ring-slate-900 shadow-md ${avatarStyle.bg} ${avatarStyle.text}`}
            >
              {initials}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(contact.id)}
                className={`p-2 rounded-xl border transition-colors ${
                  contact.isFavorite
                    ? 'bg-amber-50 border-amber-200 text-amber-500 dark:bg-amber-950/40 dark:border-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 hover:text-amber-500'
                }`}
                title="Favorite"
              >
                <Star className={`w-4 h-4 ${contact.isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(contact);
                }}
                className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors"
                title="Edit Contact"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  onClose();
                  onDelete(contact.id);
                }}
                className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 transition-colors"
                title="Delete Contact"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Name & Category Tag */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {contact.name}
              </h2>
              {contact.tag && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {contact.tag}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Added on {new Date(contact.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Details Grid */}
          <div className="mt-6 space-y-3">
            {/* Phone Number Item */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Phone Number
                  </p>
                  <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {contact.phone}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCopyPhone}
                className="p-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Place / Location Item */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Place / Location
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {contact.place}
                  </p>
                </div>
              </div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors flex items-center gap-1 font-medium"
              >
                Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Embedded Interactive Google Map */}
            <div className="pt-1">
              <EmbeddedGoogleMap
                location={contact.place}
                title={`${contact.name}'s Location`}
                height="180px"
              />
            </div>

            {/* Notes if available */}
            {contact.notes && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Notes
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            )}
          </div>

          {/* Quick Action Buttons Bar */}
          <div className="mt-6 flex gap-3">
            <a
              href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Phone className="w-4 h-4" />
              Call Contact
            </a>
            <a
              href={`sms:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Send Message
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
