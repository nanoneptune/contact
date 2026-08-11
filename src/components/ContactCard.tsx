import React, { useState } from 'react';
import {
  Phone,
  MapPin,
  Star,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { Contact } from '../types';
import { getAvatarColor, getInitials } from '../utils/storage';

interface ContactCardProps {
  contact: Contact;
  onToggleFavorite: (id: string) => void;
  onEdit: (contact: Contact) => void;
  onDelete: (id: string) => void;
  onSelect: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onToggleFavorite,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const avatarStyle = getAvatarColor(contact.name);
  const initials = getInitials(contact.name);

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(contact.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onEdit(contact);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onDelete(contact.id);
  };

  const tagColors: Record<string, string> = {
    Personal: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    Work: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    Family: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
    VIP: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    Other: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  return (
    <div
      onClick={() => onSelect(contact)}
      className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Avatar + Name & Tag */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base border shrink-0 ${avatarStyle.bg} ${avatarStyle.text} ${avatarStyle.border}`}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {contact.name}
              </h3>
              {contact.tag && (
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${
                    tagColors[contact.tag] || tagColors.Other
                  }`}
                >
                  {contact.tag}
                </span>
              )}
            </div>
            
            {/* Location / Place */}
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">{contact.place}</span>
            </div>
          </div>
        </div>

        {/* Right Top Actions: Star Favorite & Menu */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleToggleFav}
            className={`p-1.5 rounded-lg transition-colors ${
              contact.isFavorite
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100'
                : 'text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={contact.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-label="Favorite"
          >
            <Star className={`w-4 h-4 ${contact.isFavorite ? 'fill-amber-500' : ''}`} />
          </button>

          {/* Options Dropdown Button */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1.5 animate-in fade-in zoom-in-95 duration-150"
              >
                <button
                  onClick={handleEditClick}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-indigo-500" />
                  Edit Contact
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phone Number Bar & Actions */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
            {contact.phone}
          </span>
          <button
            onClick={handleCopyPhone}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Copy phone number"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Quick Communication Trigger Icons */}
        <div className="flex items-center gap-1">
          <a
            href={`tel:${contact.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors"
            title="Call Phone Number"
          >
            <Phone className="w-3.5 h-3.5" />
          </a>
          <a
            href={`sms:${contact.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-colors"
            title="Send Message"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Optional Note excerpt if present */}
      {contact.notes && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 rounded-md border border-slate-100 dark:border-slate-800">
          "{contact.notes}"
        </p>
      )}
    </div>
  );
};
