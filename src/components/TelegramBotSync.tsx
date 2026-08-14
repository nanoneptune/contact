import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  Quote,
  Eye,
  FileText,
  Columns,
  Search,
  CheckCircle2,
  Bell,
  SlidersHorizontal,
  Radio,
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

const NOTICE_TEMPLATES = [
  {
    id: 'announcement',
    title: '📢 General Announcement',
    text: `*📢 OFFICIAL NOTICE*\n\nHello everyone,\n\nWe are sharing an important directory update. Please review your contact details and notify us if any adjustments are needed.\n\n_Thank you for staying connected!_`,
  },
  {
    id: 'contact-update',
    title: '📇 Contact Detail Request',
    text: `*📇 CONTACT VERIFICATION REQUEST*\n\nHello,\n\nPlease reply directly to this bot with your updated details in the format below:\n\n\`Name: [Your Name]\`\n\`Phone: [Your Phone]\`\n\`Place: [Your City]\`\n\`Email: [Your Email]\`\n\n_We will automatically update your directory card._`,
  },
  {
    id: 'meeting',
    title: '📅 Meeting & Reminder',
    text: `*📅 SCHEDULE REMINDER*\n\nHello,\n\nThis is a quick reminder regarding our scheduled follow-up meeting. Please reply to confirm your availability.\n\n*Time:* Tomorrow at 10:30 AM\n*Agenda:* Directory Sync & Collaboration`,
  },
  {
    id: 'security',
    title: '🛡️ Service Notice',
    text: `*🛡️ SERVICE & SECURITY ALERT*\n\nYour profile in the automated *Contacts Directory* is active and secure. You can now send vCards and direct contact updates anytime to this bot.`,
  },
];

export default function TelegramBotSync({
  existingContacts,
  onContactsImported,
}: TelegramBotSyncProps) {
  // Navigation sub-tabs
  const [subTab, setSubTab] = useState<'notices' | 'contacts' | 'setup'>('notices');

  // Bot metadata state
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
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search and filter for contacts tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'vcard'>('all');

  // NOTICE COMPOSER STATE
  const [noticeRecipient, setNoticeRecipient] = useState<string>('broadcast');
  const [customChatId, setCustomChatId] = useState<string>('');
  const [noticeMarkdown, setNoticeMarkdown] = useState<string>(
    `*📢 OFFICIAL DIRECTORY NOTICE*\n\nHello,\n\nWe have updated your contact information in the central *Contacts & Messaging Directory*.\n\nFeel free to send any questions or share contact cards directly here!\n\n_Best regards,_\n*Contacts Team*`
  );
  const [noticeViewMode, setNoticeViewMode] = useState<'split' | 'raw' | 'preview'>('split');
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeStatus, setNoticeStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Fetch bot information
  const fetchBotInfo = useCallback(async () => {
    setLoadingInfo(true);
    try {
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

      if (!data) {
        const res = await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getMe`);
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

    try {
      let updatesList: TelegramRawUpdate[] = [];

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

      if (updatesList.length === 0) {
        const res = await fetch(
          `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/getUpdates?limit=100`
        );
        const json = await res.json();
        if (json.ok && Array.isArray(json.result)) {
          updatesList = json.result;
        } else if (!json.ok) {
          setErrorMessage(`Telegram: ${json.description || 'Could not fetch updates'}`);
        }
      }

      setRawUpdates(updatesList);

      const parsed = parseTelegramUpdates(updatesList, existingContacts);
      setParsedContacts(parsed);

      // Auto-select all new contacts
      const newIds = parsed.filter((c) => c.status === 'new').map((c) => c.id);
      setSelectedIds(newIds);
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

  // Extract unique active chats from updates
  const activeChats = React.useMemo(() => {
    const map = new Map<number, { chatId: number; name: string; username?: string }>();
    for (const update of rawUpdates) {
      const msg = update.message;
      if (msg?.chat?.id) {
        const name =
          [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' ') ||
          msg.chat.first_name ||
          msg.from?.username ||
          `Chat ${msg.chat.id}`;
        map.set(msg.chat.id, {
          chatId: msg.chat.id,
          name,
          username: msg.from?.username,
        });
      }
    }
    return Array.from(map.values());
  }, [rawUpdates]);

  // Format insertion in Notice Markdown textarea
  const insertNoticeFormatting = (
    prefix: string,
    suffix: string = '',
    defaultText: string = 'text'
  ) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end) || defaultText;

    const newText =
      textarea.value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      textarea.value.substring(end);

    setNoticeMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  // Send single or broadcast Telegram notice
  const handleSendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeMarkdown.trim()) {
      setNoticeStatus({ type: 'error', message: 'Please write a message before sending.' });
      return;
    }

    setSendingNotice(true);
    setNoticeStatus(null);

    // Determine target chat IDs
    let targetChatIds: number[] = [];

    if (noticeRecipient === 'broadcast') {
      targetChatIds = activeChats.map((c) => c.chatId);
      if (targetChatIds.length === 0 && customChatId.trim()) {
        const num = Number(customChatId.trim());
        if (!isNaN(num)) targetChatIds = [num];
      }
    } else if (noticeRecipient === 'custom') {
      const num = Number(customChatId.trim());
      if (isNaN(num) || !customChatId.trim()) {
        setSendingNotice(false);
        setNoticeStatus({ type: 'error', message: 'Please enter a valid numeric Telegram Chat ID.' });
        return;
      }
      targetChatIds = [num];
    } else {
      const num = Number(noticeRecipient);
      if (!isNaN(num)) targetChatIds = [num];
    }

    if (targetChatIds.length === 0) {
      setSendingNotice(false);
      setNoticeStatus({
        type: 'error',
        message: 'No active chat recipients found. Open the bot and send a message, or enter a Chat ID manually.',
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const chatId of targetChatIds) {
      try {
        let sent = false;
        // 1. Try local server
        try {
          const res = await fetch('/api/telegram/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, text: noticeMarkdown }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) sent = true;
          }
        } catch {
          // ignore
        }

        // 2. Direct Telegram API fallback
        if (!sent) {
          const res = await fetch(
            `https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: noticeMarkdown,
                parse_mode: 'Markdown',
              }),
            }
          );
          const data = await res.json();
          if (data.ok) sent = true;
        }

        if (sent) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setSendingNotice(false);
    if (successCount > 0) {
      setNoticeStatus({
        type: 'success',
        message: `Successfully delivered notice to ${successCount} Telegram recipient${
          successCount === 1 ? '' : 's'
        }${failCount > 0 ? ` (${failCount} failed)` : ''}!`,
      });
    } else {
      setNoticeStatus({
        type: 'error',
        message: 'Failed to deliver notice. Make sure the user has started the bot on Telegram.',
      });
    }
  };

  // Contacts selection and import
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllNew = () => {
    const newIds = filteredContacts.filter((c) => c.status === 'new').map((c) => c.id);
    setSelectedIds(newIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

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

      // Send confirmation reply back to Telegram
      if (item.chatId) {
        try {
          await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: item.chatId,
              text: `✅ *Contact Saved!*\n\nHello ${item.senderName},\nYour contact details for *${item.name}* (${item.phone}) have been saved into the Contacts Directory.`,
              parse_mode: 'Markdown',
            }),
          });
        } catch {
          // ignore
        }
      }
    }

    onContactsImported(newlyCreated);
    setParsedContacts((prev) =>
      prev.map((c) => (selectedIds.includes(c.id) ? { ...c, status: 'existing' } : c))
    );
    setSelectedIds([]);
    setSyncing(false);
    setSyncSuccessMsg(`Imported ${newlyCreated.length} contact${newlyCreated.length === 1 ? '' : 's'} into Directory!`);
  };

  const botUsername = botInfo?.username || 'contacts_helper_bot';
  const botLink = `https://t.me/${botUsername}`;

  const copyBotLink = () => {
    navigator.clipboard.writeText(botLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered contacts list
  const filteredContacts = parsedContacts.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.place.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'new') return c.status === 'new';
    if (filterType === 'vcard') return c.isNativeContactCard;
    return true;
  });

  const newContactsCount = parsedContacts.filter((c) => c.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* SUB-TABS NAVIGATION & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('notices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap ${
              subTab === 'notices'
                ? 'bg-[#0088cc] text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send Bot Notice</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('contacts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap ${
              subTab === 'contacts'
                ? 'bg-[#0088cc] text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Synced Contacts</span>
            {newContactsCount > 0 && (
              <span className="font-geist-mono text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                {newContactsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('setup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-xs transition-all whitespace-nowrap ${
              subTab === 'setup'
                ? 'bg-[#0088cc] text-white shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Instructions</span>
          </button>
        </div>

        {/* COMPACT ACTIONS */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href={botLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>Open Bot</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={copyBotLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/50 dark:bg-slate-800/50 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium transition-all"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={fetchUpdates}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1e] dark:bg-white text-white dark:text-[#1a1a1e] text-xs font-semibold hover:bg-black/90 dark:hover:bg-slate-100 shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SEND BOT NOTICE (MARKDOWN NOTICE COMPOSER) */}
      {subTab === 'notices' && (
        <div className="ambient-card rounded-[28px] p-5 sm:p-7 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
          {/* HEADER & TEMPLATE SELECTOR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
            <div className="space-y-1">
              <h4 className="font-semibold text-base text-[#1a1a1e] dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0088cc]" />
                <span>Compose Telegram Bot Notice</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Broadcast instant Markdown formatted alerts, updates, or contact requests directly to Telegram users.
              </p>
            </div>

            {/* QUICK PRESET CHIPS */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400 mr-1">Presets:</span>
              {NOTICE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setNoticeMarkdown(tmpl.text)}
                  className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#0088cc]/15 hover:text-[#0088cc] text-slate-600 dark:text-slate-300 text-[11px] font-medium transition-all"
                >
                  {tmpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* STATUS TOAST */}
          {noticeStatus && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-3 border ${
                noticeStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {noticeStatus.type === 'success' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="font-medium">{noticeStatus.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNoticeStatus(null)}
                className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSendNotice} className="space-y-5">
            {/* RECIPIENT SELECTOR & VIEW MODE TOGGLE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0088cc]" />
                  <span>Target Telegram Recipient</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={noticeRecipient}
                    onChange={(e) => setNoticeRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                  >
                    <option value="broadcast">
                      📢 Broadcast to All Active Users ({activeChats.length} Recipients)
                    </option>
                    {activeChats.map((c) => (
                      <option key={c.chatId} value={c.chatId}>
                        👤 {c.name} (Chat ID: {c.chatId}) {c.username ? `@${c.username}` : ''}
                      </option>
                    ))}
                    <option value="custom">✏️ Enter Specific Telegram Chat ID manually...</option>
                  </select>
                </div>

                {noticeRecipient === 'custom' && (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789 (Enter numeric Telegram Chat ID)"
                      value={customChatId}
                      onChange={(e) => setCustomChatId(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-xs font-geist-mono focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                  </div>
                )}
              </div>

              {/* VIEW SWITCHER */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#0088cc]" />
                  <span>View Layout</span>
                </label>
                <div className="flex rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-1">
                  <button
                    type="button"
                    onClick={() => setNoticeViewMode('split')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      noticeViewMode === 'split'
                        ? 'bg-white dark:bg-slate-800 text-[#1a1a1e] dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeViewMode('raw')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      noticeViewMode === 'raw'
                        ? 'bg-white dark:bg-slate-800 text-[#1a1a1e] dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticeViewMode('preview')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      noticeViewMode === 'preview'
                        ? 'bg-white dark:bg-slate-800 text-[#1a1a1e] dark:text-white shadow-xs font-semibold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              </div>
            </div>

            {/* FORMATTING TOOLBAR */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs">
              <button
                type="button"
                title="Bold (*text*)"
                onClick={() => insertNoticeFormatting('*', '*', 'bold text')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all font-bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Italic (_text_)"
                onClick={() => insertNoticeFormatting('_', '_', 'italic text')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Inline Code (`code`)"
                onClick={() => insertNoticeFormatting('`', '`', 'code')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                <Code className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Link ([title](url))"
                onClick={() => insertNoticeFormatting('[Link Title](', ')', 'https://example.com')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Quote (> text)"
                onClick={() => insertNoticeFormatting('> ', '', 'Quoted notice text')}
                className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
              >
                <Quote className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-black/10 dark:bg-white/10 mx-1" />

              {/* QUICK EMOJIS */}
              {['📢', '📇', '🔔', '📞', '📅', '📍', '✅', '⚠️'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertNoticeFormatting(emoji + ' ', '', '')}
                  className="px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-xs transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* DUAL WORKSPACE: COMPOSER & TELEGRAM SIMULATED PREVIEW */}
            <div
              className={`grid gap-4 ${
                noticeViewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
              }`}
            >
              {/* RAW MARKDOWN COMPOSER */}
              {(noticeViewMode === 'split' || noticeViewMode === 'raw') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Markdown Notice Editor</span>
                    <span className="font-geist-mono">{noticeMarkdown.length} chars</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={noticeMarkdown}
                    onChange={(e) => setNoticeMarkdown(e.target.value)}
                    rows={12}
                    placeholder="Write your Telegram notice in standard Markdown..."
                    className="w-full p-4 rounded-2xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 font-geist-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0088cc] shadow-inner resize-y"
                  />
                </div>
              )}

              {/* TELEGRAM SIMULATED BUBBLE PREVIEW */}
              {(noticeViewMode === 'split' || noticeViewMode === 'preview') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5 text-[#0088cc] -rotate-45" />
                      <span>Telegram In-App Preview</span>
                    </span>
                    <span className="text-[10px] font-geist-mono bg-[#0088cc]/10 text-[#0088cc] px-2 py-0.5 rounded-md font-medium">
                      Simulated Render
                    </span>
                  </div>

                  {/* TELEGRAM CHAT CONTAINER */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#e5ebf0] dark:bg-[#0e1621] border border-black/10 dark:border-white/10 min-h-[260px] flex flex-col justify-start">
                    {/* BUBBLE */}
                    <div className="max-w-[92%] self-start bg-white dark:bg-[#182533] text-slate-900 dark:text-[#f5f5f5] p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-sm border border-black/5 dark:border-white/5 space-y-2 relative">
                      {/* BOT SENDER BADGE */}
                      <div className="flex items-center gap-1.5 pb-1 border-b border-black/5 dark:border-white/5 text-[11px] font-semibold text-[#0088cc]">
                        <span>{botInfo?.first_name || 'Contacts Bot'}</span>
                        <span className="text-[9px] bg-[#0088cc]/10 text-[#0088cc] px-1.5 py-0.2 rounded font-normal">
                          BOT
                        </span>
                      </div>

                      {/* MARKDOWN RENDER */}
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {noticeMarkdown}
                        </ReactMarkdown>
                      </div>

                      {/* TIMESTAMP & DOUBLE BLUE CHECK */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 font-geist-mono pt-1">
                        <span>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <CheckCheck className="w-3.5 h-3.5 text-[#0088cc]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Notice will be delivered instantly via Telegram Bot API with Markdown styling.
              </p>
              <button
                type="submit"
                disabled={sendingNotice || !noticeMarkdown.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className={`w-4 h-4 -rotate-45 ${sendingNotice ? 'animate-spin' : ''}`} />
                <span>{sendingNotice ? 'Sending Notice...' : 'Send Telegram Notice'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: SYNCED CONTACTS DIRECTORY */}
      {subTab === 'contacts' && (
        <div className="space-y-4">
          {/* SEARCH & BATCH IMPORT TOOLBAR */}
          <div className="ambient-card rounded-[24px] p-4 sm:p-5 shadow-sm border border-black/5 dark:border-white/5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* SEARCH INPUT */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search received contacts by name, phone, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 text-xs focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                />
              </div>

              {/* FILTER PILLS & ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    All ({parsedContacts.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('new')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterType === 'new'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    New ({newContactsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('vcard')}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      filterType === 'vcard'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    vCards
                  </button>
                </div>

                {newContactsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllNew}
                    className="text-xs px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-all"
                  >
                    Select New
                  </button>
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
          </div>

          {/* EMPTY STATE FOR CONTACTS */}
          {filteredContacts.length === 0 ? (
            <div className="ambient-card rounded-[28px] p-10 text-center space-y-4 border border-black/5 dark:border-white/5">
              <div className="w-14 h-14 rounded-3xl bg-[#0088cc]/10 border border-[#0088cc]/20 flex items-center justify-center mx-auto text-[#0088cc] shadow-sm">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h5 className="font-semibold text-base text-[#1a1a1e] dark:text-white">
                  {searchQuery ? 'No Matching Contacts Found' : 'No Telegram Contacts Received Yet'}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {searchQuery
                    ? `No contacts matched "${searchQuery}". Try a different keyword or clear your filter.`
                    : `Open @${botUsername} on Telegram and share a contact card or type phone details to sync instantly.`}
                </p>
              </div>

              {!searchQuery && (
                <div className="pt-2">
                  <a
                    href={botLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#0088cc] text-white text-xs font-semibold shadow-sm hover:bg-[#0077b5] transition-all"
                  >
                    <span>Open @{botUsername} in Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredContacts.map((contact) => {
                const isSelected = selectedIds.includes(contact.id);
                const isExisting = contact.status === 'existing';

                return (
                  <div
                    key={contact.id}
                    onClick={() => !isExisting && handleToggleSelect(contact.id)}
                    className={`ambient-card rounded-[22px] p-4 sm:p-5 border transition-all relative cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm'
                        : isExisting
                        ? 'opacity-70 border-black/5 dark:border-white/5 cursor-default'
                        : 'border-black/5 dark:border-white/5 hover:border-black/20 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
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
                            From: {contact.senderName}{' '}
                            {contact.senderUsername ? `(@${contact.senderUsername})` : ''}
                          </p>
                        </div>
                      </div>

                      {/* BADGE OR CHECKBOX */}
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

                    {/* DETAILS */}
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

                    {/* METADATA */}
                    <div className="flex items-center justify-between mt-3 text-[10px] text-slate-400 font-geist-mono pt-2 border-t border-black/5 dark:border-white/5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(contact.receivedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>Update #{contact.telegramUpdateId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: BOT INSTRUCTIONS & SETUP */}
      {subTab === 'setup' && (
        <div className="ambient-card rounded-[28px] p-6 sm:p-8 shadow-sm border border-black/5 dark:border-white/5 space-y-6">
          <div className="space-y-1">
            <h4 className="font-semibold text-base text-[#1a1a1e] dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0088cc]" />
              <span>How Telegram Contact Sync & Notices Work</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete guide on sending contact details, sharing vCards, and broadcasting notices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h5 className="font-semibold text-xs text-slate-900 dark:text-white">
                Share Native vCard
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                In Telegram, tap the Paperclip icon 📎 &rarr; <strong>Contact</strong> &rarr; Share any contact card. The app extracts phone, name, email, and location.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h5 className="font-semibold text-xs text-slate-900 dark:text-white">
                Text Message Format
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-geist-mono leading-relaxed">
                Name: Rahul Sharma<br />
                Phone: +91 9876543210<br />
                Place: Bangalore<br />
                Email: rahul@example.com
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h5 className="font-semibold text-xs text-slate-900 dark:text-white">
                Send Direct Notices
              </h5>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Use the <strong>Send Bot Notice</strong> tab to dispatch announcements or reminders with bold, italic, and code styling to all users.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#0088cc]">Direct Bot Web Link</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-geist-mono">
                {botLink}
              </p>
            </div>
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0088cc] text-white text-xs font-semibold hover:bg-[#0077b5] transition-all"
            >
              <span>Test Bot on Telegram</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
