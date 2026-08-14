import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  Mail,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  Send,
  Users,
  ShieldCheck,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { Contact } from './types';
import { getInitials } from './utils/storage';
import { supabase } from './lib/supabase';
import MarkdownEmailComposer from './components/MarkdownEmailComposer';
import GlassmorphismOtpModal from './components/GlassmorphismOtpModal';
import AiVoiceTalkback from './components/AiVoiceTalkback';
import TelegramBotSync from './components/TelegramBotSync';

export default function App() {
  const [activeTab, setActiveTab] = useState<'saved' | 'contacts' | 'mailer' | 'talkback' | 'telegram'>('saved');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'has_email' | 'has_phone'>('all');

  // Form & Supabase error messages
  const [formError, setFormError] = useState('');

  // Target email and content for quick compose prefill
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [prefilledSubject, setPrefilledSubject] = useState('');
  const [prefilledMarkdown, setPrefilledMarkdown] = useState('');

  // OTP Verification States
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpTargetEmail, setOtpTargetEmail] = useState('');

  const handleOpenOtpModal = (emailToVerify: string) => {
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setFormError('Please enter a valid email address first before sending OTP.');
      return;
    }
    setFormError('');
    setOtpTargetEmail(emailToVerify.trim());
    setOtpModalOpen(true);
  };

  const handleEmailVerified = (verifiedEmail: string) => {
    const norm = verifiedEmail.toLowerCase().trim();
    if (!verifiedEmails.includes(norm)) {
      setVerifiedEmails((prev) => [...prev, norm]);
    }
  };

  // Fetch contacts directly from Supabase
  const fetchContacts = async () => {
    try {
      setLoading(true);
      setFormError('');

      const { data, error } = await supabase
        .from('contacts')
        .select('*');

      if (error) {
        console.error('Supabase fetch error:', error);
        setFormError(`Supabase notice: ${error.message}`);
        setContacts([]);
      } else if (data) {
        const formatted: Contact[] = data
          .map((item: any) => ({
            id: String(item.id || ''),
            name: String(item.name || ''),
            phone: String(item.phone || ''),
            place: String(item.place || ''),
            email: item.email ? String(item.email) : undefined,
            isFavorite: Boolean(item.isFavorite ?? item.is_favorite ?? false),
            createdAt: Number(item.createdAt ?? item.created_at ?? Date.now()),
          }))
          .sort((a, b) => b.createdAt - a.createdAt);

        setContacts(formatted);
      }
    } catch (err: any) {
      console.error('Supabase fetch exception:', err);
      setFormError(`Failed to connect to Supabase: ${err?.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !place.trim()) {
      setFormError('Please fill in Name, Phone Number, and Place.');
      return;
    }

    setFormError('');

    if (editingId) {
      // Edit mode in Supabase
      const updatedFields = {
        name: name.trim(),
        phone: phone.trim(),
        place: place.trim(),
        email: email.trim() || null,
      };

      const { error } = await supabase
        .from('contacts')
        .update(updatedFields)
        .eq('id', editingId);

      if (error) {
        console.error('Supabase update error:', error);
        setFormError(`Failed to update in Supabase: ${error.message}`);
        return;
      }

      setContacts((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? { ...c, ...updatedFields, email: email.trim() || undefined }
            : c
        )
      );

      setEditingId(null);
      setName('');
      setPhone('');
      setPlace('');
      setEmail('');
      setActiveTab('saved');
    } else {
      // Create mode in Supabase
      const newContact: Contact = {
        id: `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        phone: phone.trim(),
        place: place.trim(),
        email: email.trim() || undefined,
        isFavorite: false,
        createdAt: Date.now(),
      };

      const { error } = await supabase.from('contacts').insert([
        {
          id: newContact.id,
          name: newContact.name,
          phone: newContact.phone,
          place: newContact.place,
          email: newContact.email || null,
          isFavorite: false,
          createdAt: newContact.createdAt,
        },
      ]);

      if (error) {
        console.error('Supabase insert error:', error);
        setFormError(`Failed to save to Supabase: ${error.message}`);
        return;
      }

      setContacts((prev) => [newContact, ...prev]);
      setName('');
      setPhone('');
      setPlace('');
      setEmail('');
      setActiveTab('saved');
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setPlace(contact.place);
    setEmail(contact.email || '');
    setFormError('');
    setActiveTab('contacts');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPlace('');
    setEmail('');
    setFormError('');
  };

  const handleDelete = async (id: string) => {
    setFormError('');

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      setFormError(`Failed to delete from Supabase: ${error.message}`);
      return;
    }

    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (editingId === id) {
      handleCancelEdit();
    }
  };

  const handleQuickCompose = (targetEmail?: string) => {
    if (targetEmail) {
      setPrefilledEmail(targetEmail);
    }
    setActiveTab('mailer');
  };

  const filteredContacts = contacts.filter((c) => {
    if (filterType === 'verified') {
      if (!c.email || !verifiedEmails.includes(c.email.toLowerCase().trim())) return false;
    } else if (filterType === 'has_email') {
      if (!c.email) return false;
    } else if (filterType === 'has_phone') {
      if (!c.phone) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.place.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const verifiedCount = contacts.filter((c) => c.email && verifiedEmails.includes(c.email.toLowerCase().trim())).length;
  const emailableCount = contacts.filter((c) => c.email && c.email.includes('@')).length;

  return (
    <div className="min-h-screen text-[#1a1a1e] dark:text-[#f8fafc] flex flex-col justify-between p-3 sm:p-6 lg:p-8">
      {/* AMBIENT MINIMALIST SHELL */}
      <div className="w-full max-w-[1600px] mx-auto min-h-[calc(100vh-3rem)] flex flex-col gap-6">
        
        {/* TOP HEADER COMPONENT */}
        <header className="ambient-glass rounded-[24px] sm:rounded-[28px] p-4 sm:p-6 lg:px-8 lg:py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6 shadow-xl border border-black/5 dark:border-white/5">
          {/* BRANDING */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h1 className="text-2xl sm:text-3xl font-light tracking-tighter text-[#1a1a1e] dark:text-white flex items-center gap-2">
                <span>Contacts</span>
                <span className="text-[#5e5ce6] font-normal">& Mailer</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight">
                Ambient directory & SMTP dispatcher
              </p>
            </div>
          </div>

          {/* NAVIGATION TABS IN HEADER */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'saved'
                    ? 'bg-[#1a1a1e] text-white dark:bg-white dark:text-[#1a1a1e] shadow-md font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Directory</span>
                <span className="font-geist-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-80">
                  {contacts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleCancelEdit();
                  setActiveTab('contacts');
                }}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'contacts'
                    ? 'bg-[#1a1a1e] text-white dark:bg-white dark:text-[#1a1a1e] shadow-md font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{editingId ? 'Edit Contact' : 'Add Contact'}</span>
                <span className="font-geist-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-80">
                  {editingId ? 'EDIT' : 'NEW'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mailer')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'mailer'
                    ? 'bg-[#1a1a1e] text-white dark:bg-white dark:text-[#1a1a1e] shadow-md font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Markdown Mailer</span>
                <span className="font-geist-mono text-[10px] px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 opacity-80">
                  SMTP
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('talkback')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'talkback'
                    ? 'bg-[#5e5ce6] text-white shadow-md font-semibold'
                    : 'text-[#5e5ce6] dark:text-indigo-400 hover:bg-[#5e5ce6]/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-cyan-300" />
                <span>AI Voice Talkback</span>
                <span className="font-geist-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
                  LIVE
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('telegram')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium text-xs transition-all ${
                  activeTab === 'telegram'
                    ? 'bg-[#0088cc] text-white shadow-md font-semibold'
                    : 'text-[#0088cc] dark:text-cyan-400 hover:bg-[#0088cc]/10'
                }`}
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 -rotate-45" />
                <span>Telegram Bot</span>
                <span className="font-geist-mono text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">
                  SYNC
                </span>
              </button>
            </nav>
          </div>
        </header>

        {/* MAIN VIEW PANEL */}
        <main className="ambient-glass rounded-[28px] p-6 sm:p-8 lg:p-10 flex flex-col gap-6 shadow-xl relative overflow-y-auto flex-1">
          
          {/* VIEW: DIRECTORY / CONTACTS */}
          {activeTab === 'saved' && (
            <div className="space-y-6 flex-1 flex flex-col">
              
              {/* SEARCH WRAPPER */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH DIRECTORY..."
                    className="w-full bg-white/50 dark:bg-slate-950/40 border border-black/8 dark:border-white/10 px-5 py-4 pl-12 rounded-xl font-geist-mono text-xs tracking-wider uppercase text-[#1a1a1e] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#5e5ce6] transition-all shadow-inner"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* FILTER PILLS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-geist-mono">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all tracking-wider text-[11px] uppercase ${
                      filterType === 'all'
                        ? 'bg-[#1a1a1e] text-white dark:bg-white dark:text-[#1a1a1e] font-semibold shadow-sm'
                        : 'bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/5 hover:bg-white/70'
                    }`}
                  >
                    ALL ({contacts.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType('verified')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all tracking-wider text-[11px] uppercase flex items-center gap-1.5 ${
                      filterType === 'verified'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/5 hover:bg-white/70'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    VERIFIED ({verifiedCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterType('has_email')}
                    className={`px-3.5 py-1.5 rounded-lg transition-all tracking-wider text-[11px] uppercase flex items-center gap-1.5 ${
                      filterType === 'has_email'
                        ? 'bg-[#5e5ce6] text-white font-semibold shadow-sm'
                        : 'bg-white/40 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-black/5 dark:border-white/5 hover:bg-white/70'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-[#5e5ce6]" />
                    HAS EMAIL ({emailableCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('telegram')}
                    className="ml-auto px-3.5 py-1.5 rounded-lg transition-all tracking-wider text-[11px] uppercase flex items-center gap-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] dark:text-cyan-400 border border-[#0088cc]/30 font-semibold"
                  >
                    <Send className="w-3 h-3 -rotate-45" />
                    <span>Sync from Telegram</span>
                  </button>
                </div>
              </div>

              {/* CONTACT GRID */}
              {loading ? (
                <div className="p-12 text-center rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-black/5 dark:border-white/5 font-geist-mono text-xs text-slate-400">
                  FETCHING_SUPABASE_RECORDS...
                </div>
              ) : filteredContacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                  {filteredContacts.map((c) => {
                    const initials = getInitials(c.name);
                    const isVerified = c.email && verifiedEmails.includes(c.email.toLowerCase().trim());

                    return (
                      <div
                        key={c.id}
                        className="ambient-card p-5 rounded-2xl flex flex-col justify-between gap-4 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:border-[#5e5ce6]/40 hover:-translate-y-0.5 transition-all duration-200 shadow-sm group"
                      >
                        <div className="flex items-start gap-4">
                          {/* AVATAR */}
                          <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-xl bg-[#1a1a1e] dark:bg-white text-[#fdfcfb] dark:text-[#1a1a1e] flex items-center justify-center font-geist-mono font-semibold text-lg shadow-sm">
                              {initials}
                            </div>
                            {isVerified && (
                              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-900 shadow-sm">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </span>
                            )}
                          </div>

                          {/* CONTENT DETAILS */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="meta-tag text-slate-400 dark:text-slate-500 truncate">
                              {c.place.toUpperCase()} / {c.phone}
                            </div>
                            <h3 className="font-semibold text-base text-[#1a1a1e] dark:text-white truncate leading-tight">
                              {c.name}
                            </h3>
                            {c.email ? (
                              <div className="font-geist-mono text-xs text-[#5e5ce6] dark:text-indigo-400 truncate flex items-center gap-1 pt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic">No email provided</div>
                            )}
                          </div>
                        </div>

                        {/* CARD ACTIONS */}
                        <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {c.email && !isVerified && (
                              <button
                                type="button"
                                onClick={() => handleOpenOtpModal(c.email!)}
                                className="px-2.5 py-1 text-[10px] font-geist-mono uppercase font-semibold text-[#5e5ce6] bg-[#5e5ce6]/10 hover:bg-[#5e5ce6]/20 rounded-lg transition-colors"
                              >
                                OTP Verify
                              </button>
                            )}
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-geist-mono uppercase font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {c.email && (
                              <button
                                type="button"
                                onClick={() => handleQuickCompose(c.email)}
                                className="p-1.5 text-slate-400 hover:text-[#5e5ce6] rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                title="Compose Email"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              title="Edit Contact"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* QUICK ACTION INVITE / ADD CARD */}
                  <div
                    onClick={() => {
                      handleCancelEdit();
                      setActiveTab('contacts');
                    }}
                    className="ambient-card p-5 rounded-2xl border-dashed border-2 border-slate-300/80 dark:border-slate-700/80 flex items-center gap-4 cursor-pointer hover:border-[#5e5ce6] hover:bg-white/60 dark:hover:bg-slate-900/60 transition-all opacity-80 hover:opacity-100"
                  >
                    <div className="w-14 h-14 rounded-xl border border-dashed border-slate-400 dark:border-slate-600 text-slate-400 flex items-center justify-center font-geist-mono text-2xl font-light">
                      +
                    </div>
                    <div className="space-y-0.5">
                      <div className="meta-tag text-slate-400">QUICK ACTION</div>
                      <div className="font-semibold text-sm text-[#1a1a1e] dark:text-white">
                        Create New Entry
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-black/5 dark:border-white/5 space-y-3">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="font-geist-mono text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {searchQuery ? 'NO MATCHING DIRECTORY RECORDS' : 'DIRECTORY EMPTY'}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('contacts')}
                    className="px-5 py-2.5 bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] text-xs font-semibold uppercase tracking-wider font-geist-mono rounded-xl shadow-md"
                  >
                    Add First Contact
                  </button>
                </div>
              )}


            </div>
          )}

          {/* VIEW: ADD / EDIT CONTACT FORM */}
          {activeTab === 'contacts' && (
            <div className="max-w-2xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4">
                <div>
                  <div className="meta-tag text-slate-400">DIRECTORY EDITOR</div>
                  <h2 className="text-2xl font-light tracking-tight text-[#1a1a1e] dark:text-white">
                    {editingId ? 'Edit Contact Profile' : 'New Contact Entry'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="text-xs font-geist-mono uppercase tracking-wider text-[#5e5ce6] hover:underline"
                >
                  ← Return to Directory
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono">
                    {formError}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="block meta-tag text-slate-500">FULL NAME *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-950/40 border border-black/10 dark:border-white/10 rounded-xl text-xs text-[#1a1a1e] dark:text-white font-mono focus:outline-none focus:border-[#5e5ce6]"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="block meta-tag text-slate-500">PHONE NUMBER *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-950/40 border border-black/10 dark:border-white/10 rounded-xl text-xs text-[#1a1a1e] dark:text-white font-mono focus:outline-none focus:border-[#5e5ce6]"
                    />
                  </div>
                </div>

                {/* Place */}
                <div className="space-y-1.5">
                  <label className="block meta-tag text-slate-500">LOCATION / CITY *</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                    <input
                      type="text"
                      value={place}
                      onChange={(e) => setPlace(e.target.value)}
                      placeholder="Bengaluru, Karnataka"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-950/40 border border-black/10 dark:border-white/10 rounded-xl text-xs text-[#1a1a1e] dark:text-white font-mono focus:outline-none focus:border-[#5e5ce6]"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block meta-tag text-slate-500">EMAIL ADDRESS (OPTIONAL)</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-950/40 border border-black/10 dark:border-white/10 rounded-xl text-xs text-[#1a1a1e] dark:text-white font-mono focus:outline-none focus:border-[#5e5ce6]"
                      />
                    </div>
                    {email.trim().includes('@') && !verifiedEmails.includes(email.toLowerCase().trim()) && (
                      <button
                        type="button"
                        onClick={() => handleOpenOtpModal(email)}
                        className="px-4 py-3 bg-[#5e5ce6] text-white text-xs font-semibold uppercase tracking-wider font-geist-mono rounded-xl shrink-0 shadow-sm hover:bg-[#5e5ce6]/90"
                      >
                        Verify OTP
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-5 py-3 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold uppercase tracking-wider font-geist-mono hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] text-xs font-semibold uppercase tracking-wider font-geist-mono shadow-md hover:bg-black/90 dark:hover:bg-slate-100 transition-all"
                  >
                    {editingId ? 'Save Updates' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW: MARKDOWN EMAIL COMPOSER */}
          {activeTab === 'mailer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="meta-tag text-slate-400">SMTP DISPATCH ENGINE</div>
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="text-xs font-geist-mono uppercase tracking-wider text-[#5e5ce6] hover:underline"
                >
                  ← Return to Directory
                </button>
              </div>
              <MarkdownEmailComposer
                contacts={contacts}
                initialRecipient={prefilledEmail}
                initialSubject={prefilledSubject || undefined}
                initialMarkdown={prefilledMarkdown || undefined}
              />
            </div>
          )}

          {/* VIEW: AI VOICE TALKBACK */}
          {activeTab === 'talkback' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="meta-tag text-[#5e5ce6] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-[#5e5ce6]" />
                  AI VOICE ASSISTANT
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="text-xs font-geist-mono uppercase tracking-wider text-[#5e5ce6] hover:underline"
                >
                  ← Return to Directory
                </button>
              </div>
              <AiVoiceTalkback
                contacts={contacts}
                onDraftToMailer={(draftSubject, draftBody, draftRecipient) => {
                  setPrefilledSubject(draftSubject);
                  setPrefilledMarkdown(draftBody);
                  if (draftRecipient) {
                    setPrefilledEmail(draftRecipient);
                  }
                  setActiveTab('mailer');
                }}
              />
            </div>
          )}

          {/* VIEW: TELEGRAM BOT CONTACT SYNC */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                <div className="meta-tag text-[#0088cc] flex items-center gap-1.5 font-geist-mono">
                  <Send className="w-3.5 h-3.5 -rotate-45 text-[#0088cc]" />
                  TELEGRAM CONTACT INGESTION ENGINE
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('saved')}
                  className="text-xs font-geist-mono uppercase tracking-wider text-[#0088cc] hover:underline"
                >
                  ← Return to Directory
                </button>
              </div>
              <TelegramBotSync
                existingContacts={contacts}
                onContactsImported={(newlyImported) => {
                  setContacts((prev) => [...newlyImported, ...prev]);
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* OTP VERIFICATION MODAL */}
      <GlassmorphismOtpModal
        email={otpTargetEmail}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={handleEmailVerified}
      />
    </div>
  );
}


