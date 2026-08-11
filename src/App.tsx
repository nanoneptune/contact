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
  Contact as ContactIcon,
  Code2,
  Copy,
  Send,
  Users,
  ShieldCheck,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { Contact } from './types';
import { getAvatarColor, getInitials } from './utils/storage';
import { supabase } from './lib/supabase';
import MarkdownEmailComposer from './components/MarkdownEmailComposer';
import GlassmorphismOtpModal from './components/GlassmorphismOtpModal';
import AiVoiceTalkback from './components/AiVoiceTalkback';

export default function App() {
  const [activeTab, setActiveTab] = useState<'saved' | 'contacts' | 'mailer' | 'talkback'>('saved');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Form & Supabase error messages
  const [formError, setFormError] = useState('');

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
        setFormError(`Supabase fetch warning: ${error.message}`);
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

  const [filterType, setFilterType] = useState<'all' | 'verified' | 'has_email' | 'has_phone'>('all');

  const filteredContacts = contacts.filter((c) => {
    // First apply filterType
    if (filterType === 'verified') {
      if (!c.email || !verifiedEmails.includes(c.email.toLowerCase().trim())) return false;
    } else if (filterType === 'has_email') {
      if (!c.email) return false;
    } else if (filterType === 'has_phone') {
      if (!c.phone) return false;
    }

    // Then apply searchQuery
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
    <div className="min-h-screen bg-[#eef2f7] dark:bg-[#0f172a] text-[#0f172a] dark:text-slate-100 font-sans antialiased pb-28 pt-4 px-3 sm:px-6">
      
      {/* MOBILE APP CONTAINER FRAME */}
      <div className="max-w-md mx-auto space-y-4">
        
        {/* COMPACT APP HEADER */}
        <div className="flex items-center justify-between px-2 pt-1 pb-1">
          <h1 className="text-lg font-black tracking-tight text-[#0f172a] dark:text-white flex items-center gap-2">
            <span>Contacts & Mailer</span>
          </h1>
        </div>

        {/* TAB 1: SAVED CONTACTS DIRECTORY */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            
            {/* Search Bar with Neumorphic Inset Shadow */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts by name, city, or email..."
                className="w-full pl-11 pr-9 py-3 rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_3px_3px_6px_#d1d9e6,inset_-3px_-3px_6px_#ffffff] dark:shadow-[inset_3px_3px_6px_#0b101d,inset_-3px_-3px_6px_#2b3953] border border-white/40 dark:border-slate-800 text-xs text-[#0f172a] dark:text-slate-100 placeholder-slate-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  filterType === 'all'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#eef2f7] dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 shadow-[3px_3px_7px_#d1d9e6,-3px_-3px_7px_#ffffff] dark:shadow-[3px_3px_7px_#0b101d,-3px_-3px_7px_#2b3953]'
                }`}
              >
                All ({contacts.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('verified')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  filterType === 'verified'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[#eef2f7] dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 shadow-[3px_3px_7px_#d1d9e6,-3px_-3px_7px_#ffffff] dark:shadow-[3px_3px_7px_#0b101d,-3px_-3px_7px_#2b3953]'
                }`}
              >
                Verified OTP ({verifiedCount})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('has_email')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  filterType === 'has_email'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-[#eef2f7] dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 shadow-[3px_3px_7px_#d1d9e6,-3px_-3px_7px_#ffffff] dark:shadow-[3px_3px_7px_#0b101d,-3px_-3px_7px_#2b3953]'
                }`}
              >
                Has Email ({emailableCount})
              </button>
            </div>

            {/* CATEGORIZED SCROLLABLE LIST OF CONTACT CARDS */}
            {loading ? (
              <div className="p-8 text-center rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] text-xs text-slate-400">
                Loading contacts from Supabase...
              </div>
            ) : filteredContacts.length > 0 ? (
              <div className="space-y-3">
                {filteredContacts.map((c) => {
                  const avatar = getAvatarColor(c.name);
                  const initials = getInitials(c.name);
                  const isVerified = c.email && verifiedEmails.includes(c.email.toLowerCase().trim());

                  return (
                    <div
                      key={c.id}
                      className="p-4 rounded-[22px] bg-[#eef2f7] dark:bg-[#1e293b] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] dark:shadow-[6px_6px_14px_#0b101d,-6px_-6px_14px_#2b3953] border border-white/60 dark:border-slate-800/60 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        {/* Circular Avatar with soft drop shadow & status dot */}
                        <div className="relative shrink-0">
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-xs shadow-md ${avatar.bg} ${avatar.text}`}
                          >
                            {initials}
                          </div>
                          {isVerified ? (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white border-2 border-[#eef2f7]">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-slate-400 rounded-full border-2 border-[#eef2f7]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-bold text-sm text-[#0f172a] dark:text-white truncate">
                              {c.name}
                            </h3>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors"
                                title="Edit Contact"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                title="Delete Contact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{c.phone}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{c.place}</span>
                            </div>

                            {c.email ? (
                              <div className="flex items-center gap-1.5 pt-0.5">
                                <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span className="truncate text-indigo-600 dark:text-indigo-400 font-medium">
                                  {c.email}
                                </span>
                                {isVerified ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold ml-auto shrink-0">
                                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                    OTP Verified
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenOtpModal(c.email!)}
                                    className="ml-auto text-[10px] text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-full font-bold border border-indigo-200 dark:border-indigo-800 transition-colors shrink-0"
                                  >
                                    Verify OTP
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-400 italic">No email address</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {c.email && (
                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-end">
                          <button
                            onClick={() => setActiveTab('mailer')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Compose Email →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-[24px] bg-[#eef2f7] dark:bg-[#1e293b] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] text-slate-400">
                <ContactIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {searchQuery ? 'No contacts match search' : 'No contacts saved yet'}
                </div>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full shadow-md"
                >
                  Add Contact Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADD / EDIT CONTACT FORM */}
        {activeTab === 'contacts' && (
          <div className="p-5 rounded-[24px] bg-[#eef2f7] dark:bg-[#1e293b] shadow-[6px_6px_14px_#d1d9e6,-6px_-6px_14px_#ffffff] dark:shadow-[6px_6px_14px_#0b101d,-6px_-6px_14px_#2b3953] border border-white/60 dark:border-slate-800/60 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-[#0f172a] dark:text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                <span>{editingId ? 'Edit Contact' : 'Add New Contact'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className="text-xs text-indigo-600 font-semibold"
              >
                Back to Directory →
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {formError && (
                <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                  {formError}
                </p>
              )}

              {/* Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-white/40 text-xs text-[#0f172a] dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 0192"
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-white/40 text-xs text-[#0f172a] dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  City / Location *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="New York, NY"
                    required
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-white/40 text-xs text-[#0f172a] dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-[#eef2f7] dark:bg-[#1e293b] shadow-[inset_2px_2px_5px_#d1d9e6,inset_-2px_-2px_5px_#ffffff] border border-white/40 text-xs text-[#0f172a] dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  {email.trim().includes('@') && !verifiedEmails.includes(email.toLowerCase().trim()) && (
                    <button
                      type="button"
                      onClick={() => handleOpenOtpModal(email)}
                      className="px-3 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-2xl shadow-md shrink-0"
                    >
                      Verify OTP
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-xs font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-full shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                >
                  {editingId ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: MARKDOWN MAILER */}
        {activeTab === 'mailer' && (
          <MarkdownEmailComposer contacts={contacts} />
        )}

        {/* TAB 4: AI VOICE TALKBACK */}
        {activeTab === 'talkback' && (
          <AiVoiceTalkback contacts={contacts} />
        )}
      </div>

      {/* FLOATING NEUMORPHIC BOTTOM NAVIGATION PILL BAR */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-1.5rem)] bg-[#eef2f7]/90 dark:bg-[#1e293b]/90 backdrop-blur-xl p-2 rounded-full shadow-[8px_8px_18px_rgba(166,180,200,0.4),-8px_-8px_18px_rgba(255,255,255,0.9)] dark:shadow-[8px_8px_18px_rgba(10,15,26,0.6)] border border-white/80 dark:border-slate-800 z-40 flex items-center justify-around">
        {/* Tab 1: Saved Contacts */}
        <button
          onClick={() => setActiveTab('saved')}
          className={`flex-1 py-2 rounded-full flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'saved'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Contacts</span>
        </button>

        {/* Tab 2: Add Contact */}
        <button
          onClick={() => {
            handleCancelEdit();
            setActiveTab('contacts');
          }}
          className={`flex-1 py-2 rounded-full flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'contacts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Add New</span>
        </button>

        {/* Tab 3: Mailer */}
        <button
          onClick={() => setActiveTab('mailer')}
          className={`flex-1 py-2 rounded-full flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'mailer'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Mailer</span>
        </button>

        {/* Tab 4: AI Voice */}
        <button
          onClick={() => setActiveTab('talkback')}
          className={`flex-1 py-2 rounded-full flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
            activeTab === 'talkback'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400/40'
              : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700'
          }`}
        >
          <Radio className="w-4 h-4 animate-spin text-cyan-300" />
          <span>AI Voice</span>
        </button>
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

