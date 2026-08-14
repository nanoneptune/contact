import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  RefreshCw,
  Check,
  CheckCheck,
  Copy,
  ExternalLink,
  Users,
  MessageSquare,
  Sparkles,
  Phone,
  MapPin,
  Mail,
  User,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Contact } from '../types';
import {
  parseTelegramUpdates,
  ParsedTelegramContact,
  TelegramRawUpdate,
} from '../utils/telegramParser';
import { supabase } from '../lib/supabase';

interface TelegramBotSyncProps {
  existingContacts: Contact[];
  onContactsImported: (newContacts: Contact[]) => void;
}

const DEFAULT_BOT_TOKEN =
  (import.meta.env.VITE_TELEGRAM_BOT_TOKEN as string) ||
  '8927749666:AAECASzT9foWNDb8M6zzdKUgFsrprOBmueY';

export default function TelegramBotSync({
  existingContacts,
  onContactsImported,
}: TelegramBotSyncProps) {
  const [botInfo, setBotInfo] = useState<{
    id?: number;
    first_name?: string;
    username?: string;
  } | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rawUpdates, setRawUpdates] = useState<TelegramRawUpdate[]>([]);
  const [parsedContacts, setParsedContacts] = useState<ParsedTelegramContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [replyStatus, setReplyStatus] = useState<{ [chatId: number]: string }>({});
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);

  // Fetch bot information
  const fetchBotInfo = useCallback(async () => {
    setLoadingInfo(true);
    try {
      // 1. Try local server
      let data: any = null;
      try {
        const res = await fetch('/api/telegram/info');
        if (res.ok) {
          const json = await res.json();
          if (json.bot) data = json.bot;
        }
      } catch {
        // ignore
      }

      // 2. Direct Telegram API fallback
      if (!data) {
        const res = await fetch(
          `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getMe`
        );
        const json = await res.json();
        if (json.ok && json.result) {
          data = json.result;
        }
      }

      if (data) {
        setBotInfo(data);
      }
    } catch (err: any) {
      console.warn('Could not fetch bot info:', err);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  // Fetch updates from Telegram Bot
  const fetchUpdates = useCallback(async () => {
    setSyncing(true);
    setErrorMessage(null);
    setSyncSuccessMsg(null);

    try {
      let updatesList: TelegramRawUpdate[] = [];

      // 1. Try local server endpoint
      try {
        const res = await fetch('/api/telegram/updates');
        if (res.ok) {
          const json = await res.json();
          if (json.updates && Array.isArray(json.updates)) {
            updatesList = json.updates;
          }
        }
      } catch {
        // ignore
      }

      // 2. Direct Telegram API call
      if (updatesList.length === 0) {
        const res = await fetch(
          `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getUpdates?limit=100`
        );
        const json = await res.json();
        if (json.ok && Array.isArray(json.result)) {
          updatesList = json.result;
        } else if (!json.ok) {
          setErrorMessage(`Telegram notice: ${json.description || 'Could not fetch updates'}`);
        }
      }

      setRawUpdates(updatesList);

      // Parse contacts
      const parsed = parseTelegramUpdates(updatesList, existingContacts);
      setParsedContacts(parsed);

      // Auto-select all new contacts
      const newIds = parsed.filter((c) => c.status === 'new').map((c) => c.id);
      setSelectedIds(newIds);

      if (parsed.length > 0) {
        setSyncSuccessMsg(`Retrieved ${parsed.length} contact detail${parsed.length === 1 ? '' : 's'} from Telegram.`);
      } else {
        setSyncSuccessMsg('Connected to bot. No contact messages received yet. Send a contact card or details to the bot!');
      }
    } catch (err: any) {
      console.error('Error syncing with Telegram:', err);
      setErrorMessage(`Failed to connect to Telegram: ${err?.message || 'Network error'}`);
    } finally {
      setSyncing(false);
    }
  }, [existingContacts]);

  useEffect(() => {
    fetchBotInfo();
    fetchUpdates();
  }, [fetchBotInfo, fetchUpdates]);

  // Auto-sync polling timer
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchUpdates();
    }, 12000);
    return () => clearInterval(interval);
  }, [autoSync, fetchUpdates]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllNew = () => {
    const newIds = parsedContacts.filter((c) => c.status === 'new').map((c) => c.id);
    setSelectedIds(newIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Import selected contacts into Directory & Supabase
  const handleImportSelected = async () => {
    const toImport = parsedContacts.filter((c) => selectedIds.includes(c.id));
    if (toImport.length === 0) return;

    setSyncing(true);
    setErrorMessage(null);

    const newlyCreated: Contact[] = [];

    for (const item of toImport) {
      const newContact: Contact = {
        id: `contact-tg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        phone: item.phone,
        place: item.place,
        email: item.email,
        isFavorite: false,
        createdAt: Date.now(),
      };

      try {
        // Save to Supabase
        await supabase.from('contacts').insert([
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
      } catch (sbErr) {
        console.warn('Supabase insert notice:', sbErr);
      }

      newlyCreated.push(newContact);

      // Send confirmation reply back to Telegram if chat ID exists
      if (item.chatId) {
        sendTelegramReply(
          item.chatId,
          `✅ *Contact Saved!*\n\nHello ${item.senderName},\nYour contact details for *${item.name}* (${item.phone}) have been securely imported into the *Contacts & Mailer* directory.`
        );
      }
    }

    // Update parent directory
    onContactsImported(newlyCreated);

    // Mark as imported in local state
    setParsedContacts((prev) =>
      prev.map((c) => (selectedIds.includes(c.id) ? { ...c, status: 'existing' } : c))
    );
    setSelectedIds([]);
    setSyncing(false);
    setSyncSuccessMsg(`Successfully imported ${newlyCreated.length} contact${newlyCreated.length === 1 ? '' : 's'} into Directory!`);
  };

  const sendTelegramReply = async (chatId: number, text: string) => {
    try {
      setReplyStatus((prev) => ({ ...prev, [chatId]: 'sending' }));

      let ok = false;
      try {
        const res = await fetch('/api/telegram/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, text }),
        });
        if (res.ok) ok = true;
      } catch {
        // ignore
      }

      if (!ok) {
        const res = await fetch(
          `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text,
              parse_mode: 'Markdown',
            }),
          }
        );
        if (res.ok) ok = true;
      }

      setReplyStatus((prev) => ({
        ...prev,
        [chatId]: ok ? 'sent' : 'failed',
      }));
    } catch {
      setReplyStatus((prev) => ({ ...prev, [chatId]: 'failed' }));
    }
  };

  const botUsername = botInfo?.username || 'contacts_helper_bot';
  const botLink = `https://t.me/${botUsername}`;

  const copyBotLink = () => {
    navigator.clipboard.writeText(botLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const newContactsCount = parsedContacts.filter((c) => c.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* BOT STATUS & DIRECT LINK CARD */}
      <div className="ambient-card rounded-[24px] p-5 sm:p-6 shadow-sm border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc] shrink-0 shadow-sm">
              <Send className="w-6 h-6 -rotate-45" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-[#1a1a1e] dark:text-white">
                  {botInfo?.first_name || 'Telegram Contact Ingestion Bot'}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-geist-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-geist-mono">
                @{botUsername} &bull; Token: 892774...BmueY
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-sm transition-all"
            >
              <span>Open in Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={copyBotLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Bot Link'}</span>
            </button>

            <button
              type="button"
              onClick={fetchUpdates}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] text-xs font-semibold hover:bg-black/90 dark:hover:bg-slate-100 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Updates'}</span>
            </button>
          </div>
        </div>

        {/* HELPER GUIDE ACCORDION */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-black/5 dark:bg-white/5 text-xs space-y-2 border border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
            <Sparkles className="w-4 h-4 text-[#5e5ce6]" />
            <span>How to send contacts to this Telegram bot:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-black/5 dark:border-white/5">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Option A: Native Telegram Contact Card</p>
              <p>In Telegram, tap the Paperclip icon 📎 &rarr; <strong>Contact</strong> &rarr; Share any contact or your own card.</p>
            </div>
            <div className="p-2.5 rounded-xl bg-white/40 dark:bg-slate-900/40 border border-black/5 dark:border-white/5">
              <p className="font-semibold text-slate-900 dark:text-white mb-1">Option B: Text Message Format</p>
              <p className="font-geist-mono text-[10px]">
                Name: Rahul Sharma<br />
                Phone: +91 9876543210<br />
                Place: Bangalore<br />
                Email: rahul@example.com
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {syncSuccessMsg && !errorMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{syncSuccessMsg}</span>
          </div>
          <span className="text-[10px] font-geist-mono opacity-80">
            {parsedContacts.length} updates found
          </span>
        </div>
      )}

      {/* ACTION BAR FOR PARSED CONTACTS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm text-[#1a1a1e] dark:text-white flex items-center gap-2">
            <span>Received Telegram Contacts</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-geist-mono bg-[#0088cc]/15 text-[#0088cc] font-medium">
              {parsedContacts.length} Total
            </span>
          </h4>
          {newContactsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-geist-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
              {newContactsCount} New
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {newContactsCount > 0 && (
            <>
              <button
                type="button"
                onClick={handleSelectAllNew}
                className="text-xs px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-all"
              >
                Select New ({newContactsCount})
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-xs px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-all"
                >
                  Clear Selection
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleImportSelected}
            disabled={selectedIds.length === 0 || syncing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Import Selected ({selectedIds.length})</span>
          </button>
        </div>
      </div>

      {/* PARSED CONTACTS LIST */}
      {parsedContacts.length === 0 ? (
        <div className="ambient-card rounded-[24px] p-8 text-center space-y-3 border border-black/5 dark:border-white/5">
          <div className="w-12 h-12 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h5 className="font-semibold text-sm text-[#1a1a1e] dark:text-white">No Contact Messages in Bot Yet</h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Open <strong>@{botUsername}</strong> on Telegram and send a contact card or text with phone numbers and details, then click <strong>Sync Updates</strong>.
            </p>
          </div>
          <a
            href={botLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0088cc] text-white text-xs font-semibold mt-2"
          >
            <span>Open Telegram Bot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {parsedContacts.map((contact) => {
            const isSelected = selectedIds.includes(contact.id);
            const isExisting = contact.status === 'existing';

            return (
              <div
                key={contact.id}
                onClick={() => !isExisting && handleToggleSelect(contact.id)}
                className={`ambient-card rounded-[20px] p-4 sm:p-5 border transition-all relative cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                    : isExisting
                    ? 'opacity-70 border-black/5 dark:border-white/5 cursor-default'
                    : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* AVATAR & SENDER INFO */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/20 flex items-center justify-center text-[#0088cc] font-semibold text-sm shrink-0">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-semibold text-sm text-[#1a1a1e] dark:text-white flex items-center gap-1.5">
                        <span>{contact.name}</span>
                        {contact.isNativeContactCard && (
                          <span className="text-[9px] font-geist-mono px-1.5 py-0.5 rounded bg-[#0088cc]/10 text-[#0088cc] font-normal">
                            vCard
                          </span>
                        )}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-geist-mono">
                        From: {contact.senderName} {contact.senderUsername ? `(@${contact.senderUsername})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* STATUS BADGE / CHECKBOX */}
                  <div>
                    {isExisting ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-geist-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                        <Check className="w-3 h-3" />
                        In Directory
                      </span>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-black/20 dark:border-white/20 bg-white/50 dark:bg-slate-800/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    )}
                  </div>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-black/5 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-geist-mono truncate">{contact.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{contact.place}</span>
                  </div>

                  {contact.email && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-geist-mono truncate">{contact.email}</span>
                    </div>
                  )}
                </div>

                {/* FOOTER METADATA */}
                <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-geist-mono pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(contact.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>Update #{contact.telegramUpdateId}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
