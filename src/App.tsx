import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Search,
  Check,
  X,
  Contact as ContactIcon,
} from 'lucide-react';
import { Contact } from './types';
import { loadContacts, saveContacts, getAvatarColor, getInitials } from './utils/storage';

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(loadContacts);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [place, setPlace] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Form validation errors
  const [formError, setFormError] = useState('');

  // Fetch contacts from server
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/contacts');
      if (res.ok) {
        const result = await res.json();
        setContacts(result.contacts || []);
        saveContacts(result.contacts || []);
      }
    } catch (err: any) {
      console.warn('Backend API fetch notice:', err);
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
      // Edit mode
      const updatedData = { name: name.trim(), phone: phone.trim(), place: place.trim() };
      
      const updatedList = contacts.map((c) =>
        c.id === editingId ? { ...c, ...updatedData } : c
      );
      setContacts(updatedList);
      saveContacts(updatedList);

      try {
        await fetch(`/api/contacts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData),
        });
      } catch (err) {
        console.error('Failed to update contact via API:', err);
      }

      setEditingId(null);
    } else {
      // Create mode
      const newContactData = { name: name.trim(), phone: phone.trim(), place: place.trim() };

      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContactData),
        });

        if (res.ok) {
          const result = await res.json();
          const createdContact = result.contact || result;
          const newList = [createdContact, ...contacts];
          setContacts(newList);
          saveContacts(newList);
        } else {
          // Local fallback
          const localContact: Contact = {
            id: `contact-${Date.now()}`,
            ...newContactData,
            isFavorite: false,
            createdAt: Date.now(),
          };
          const newList = [localContact, ...contacts];
          setContacts(newList);
          saveContacts(newList);
        }
      } catch (err) {
        console.error('Failed to create contact via API:', err);
        const localContact: Contact = {
          id: `contact-${Date.now()}`,
          ...newContactData,
          isFavorite: false,
          createdAt: Date.now(),
        };
        const newList = [localContact, ...contacts];
        setContacts(newList);
        saveContacts(newList);
      }
    }

    setName('');
    setPhone('');
    setPlace('');
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setPlace(contact.place);
    setFormError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPlace('');
    setFormError('');
  };

  const handleDelete = async (id: string) => {
    const updatedList = contacts.filter((c) => c.id !== id);
    setContacts(updatedList);
    saveContacts(updatedList);

    if (editingId === id) {
      handleCancelEdit();
    }

    try {
      await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete contact via API:', err);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.place.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Simple Page Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Contacts
          </h1>
        </div>

        {/* Clean Create / Edit Contact Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Edit Contact</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>New Contact</span>
                </>
              )}
            </span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/50 p-2.5 rounded-xl border border-rose-200/60 dark:border-rose-900">
                {formError}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 0192"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Place */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Place / Location
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="New York, NY"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
              >
                {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{editingId ? 'Save Changes' : 'Add Contact'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Search Bar & List Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Saved Contacts ({contacts.length})
            </h2>

            {contacts.length > 0 && (
              <div className="relative w-48 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Contact List View */}
          {loading ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
              Loading contacts...
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="space-y-2">
              {filteredContacts.map((c) => {
                const avatar = getAvatarColor(c.name);
                const initials = getInitials(c.name);

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${avatar.bg} ${avatar.text}`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {c.name}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            {c.phone}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                            {c.place}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <ContactIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {searchQuery ? 'No contacts match your search.' : 'No contacts yet. Fill the form above to create one.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
