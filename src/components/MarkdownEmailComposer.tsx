import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Link as LinkIcon,
  Palette,
  Eye,
  FileText,
  Columns,
  Check,
  AlertCircle,
  Mail,
  User,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { Contact } from '../types';
import GlassmorphismOtpModal from './GlassmorphismOtpModal';

interface MarkdownEmailComposerProps {
  contacts: Contact[];
}

const COLOR_OPTIONS = [
  { name: 'Red', hex: '#ef4444', class: 'bg-red-500' },
  { name: 'Blue', hex: '#3b82f6', class: 'bg-blue-500' },
  { name: 'Green', hex: '#10b981', class: 'bg-emerald-500' },
  { name: 'Amber', hex: '#f59e0b', class: 'bg-amber-500' },
  { name: 'Purple', hex: '#8b5cf6', class: 'bg-purple-500' },
  { name: 'Pink', hex: '#ec4899', class: 'bg-pink-500' },
  { name: 'Cyan', hex: '#06b6d4', class: 'bg-cyan-500' },
  { name: 'Slate', hex: '#64748b', class: 'bg-slate-500' },
];

const INITIAL_MARKDOWN = `# Hello from Contacts Mailer! 👋

Welcome to your **interactive message composer**. You can craft rich Markdown messages with custom colors and formatting!

### Key Features:
- **Bold**, *Italic*, <u>Underline</u>, and ~~Strikethrough~~ support.
- Custom text colors: <span style="color: #ef4444;">Red Alert</span>, <span style="color: #3b82f6;">Blue Highlight</span>, <span style="color: #10b981;">Green Success</span>!
- Code blocks and lists:

\`\`\`javascript
const greeting = "Hello, world!";
console.log(greeting);
\`\`\`

> *Feel free to edit this raw text or select a contact above to send a real email!*
`;

export default function MarkdownEmailComposer({ contacts }: MarkdownEmailComposerProps) {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('Greetings from Contacts App!');
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [viewMode, setViewMode] = useState<'split' | 'raw' | 'preview'>('split');
  const [selectedColor, setSelectedColor] = useState('#ef4444');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // OTP Verification States
  const [verifiedEmails, setVerifiedEmails] = useState<string[]>([]);
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Quick insert formatting helper
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = 'text') => {
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

    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  const applyColor = (hex: string) => {
    insertFormatting(`<span style="color: ${hex};">`, `</span>`, 'colored text');
    setShowColorPicker(false);
  };

  const handleSelectContact = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setRecipient(val);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient.trim()) {
      setSendStatus({ type: 'error', message: 'Please specify a recipient email address.' });
      return;
    }
    if (!subject.trim()) {
      setSendStatus({ type: 'error', message: 'Please provide a subject line.' });
      return;
    }
    if (!markdown.trim()) {
      setSendStatus({ type: 'error', message: 'Message content cannot be empty.' });
      return;
    }

    setSending(true);
    setSendStatus(null);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.trim(),
          subject: subject.trim(),
          markdownContent: markdown,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSendStatus({
          type: 'success',
          message: `Email successfully sent to ${recipient}! (Message ID: ${data.messageId || 'OK'})`,
        });
      } else {
        setSendStatus({
          type: 'error',
          message: data.error || 'Failed to send email. Please check SMTP configuration.',
        });
      }
    } catch (err: any) {
      console.error('Email send exception:', err);
      setSendStatus({
        type: 'error',
        message: err?.message || 'Server connection error while sending email.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold tracking-wide">
              Interactive Markdown Mailer
            </h2>
          </div>
          <span className="text-[11px] font-mono bg-indigo-950/80 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-700/50">
            Sender: nanoneptunemusic@gmail.com
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Compose raw Markdown or HTML messages, apply colors, bold/italics, and preview rendered output before sending real emails directly via Gmail SMTP.
        </p>
      </div>

      {/* Recipient & Subject Form */}
      <form onSubmit={handleSendEmail} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        
        {/* Status Notification */}
        {sendStatus && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              sendStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            {sendStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <p className="font-medium">{sendStatus.message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Quick Select from Saved Contacts */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Quick Fill From Contacts</span>
              <User className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              onChange={handleSelectContact}
              defaultValue=""
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="" disabled>
                -- Select a contact with email --
              </option>
              {contacts.map((c) => (
                <option key={c.id} value={c.email || ''} disabled={!c.email}>
                  {c.name} {c.email ? `<${c.email}>` : '(No Email set)'}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient Email Address Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>Recipient Email</span>
                {recipient && verifiedEmails.includes(recipient.toLowerCase().trim()) && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Verified OTP ✓
                  </span>
                )}
              </span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="recipient@example.com"
                required
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {recipient.trim().includes('@') && !verifiedEmails.includes(recipient.toLowerCase().trim()) && (
                <button
                  type="button"
                  onClick={() => setOtpModalOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
                  title="Send Glassmorphism OTP Email to Verify Recipient"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify (OTP)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Subject Line */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Subject Line <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Important update..."
            required
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Markdown Toolbar & View Modes */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900">
          
          {/* Toolbar */}
          <div className="p-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
            
            {/* Text Formatting Buttons */}
            <div className="flex items-center flex-wrap gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Bold (**text**)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Italic (*text*)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('<u>', '</u>', 'underlined text')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Underline (<u>text</u>)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Strikethrough (~~text~~)"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('# ', '', 'Heading 1')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('## ', '', 'Heading 2')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ', '', 'Heading 3')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              <button
                type="button"
                onClick={() => insertFormatting('- ', '', 'List item')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```\n', '\n```', 'code block')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Code Block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('> ', '', 'Quote text')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Blockquote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://example.com)', 'Link Title')}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Insert Link"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

              {/* Color Picker Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
                  title="Text Color Tools"
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-400"
                    style={{ backgroundColor: selectedColor }}
                  />
                </button>

                {showColorPicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 shadow-lg z-20 w-44 space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 px-1 mb-1">
                      Choose Text Color:
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c.hex);
                            applyColor(c.hex);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-0.5 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Split View (Editor + Rendered Preview)"
              >
                <Columns className="w-3 h-3" />
                <span>Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  viewMode === 'raw'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Raw Markdown Editor Only"
              >
                <FileText className="w-3 h-3" />
                <span>Raw</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Rendered Output Preview Only"
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>

          {/* Editor & Rendered Content Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 min-h-[320px]">
            
            {/* Raw Markdown Editor Pane */}
            {(viewMode === 'split' || viewMode === 'raw') && (
              <div className={`p-3 ${viewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-800' : 'col-span-2'}`}>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                  <span>RAW MARKDOWN INPUT</span>
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                </div>
                <textarea
                  ref={textareaRef}
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Type your markdown message here..."
                  className="w-full h-[300px] p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            )}

            {/* Rendered Markdown Preview Pane */}
            {(viewMode === 'split' || viewMode === 'preview') && (
              <div className={`p-3 ${viewMode === 'preview' ? 'col-span-2' : ''}`}>
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                  <span>LIVE RENDERED OUTPUT</span>
                  <Eye className="w-3 h-3 text-emerald-500" />
                </div>
                <div className="w-full h-[300px] p-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto text-slate-900 dark:text-slate-100 text-xs prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Send Action Button */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending Email...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Email via SMTP</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Interactive Glassmorphism OTP Verification Modal */}
      <GlassmorphismOtpModal
        email={recipient}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerified={(verifiedEmail) => {
          const norm = verifiedEmail.toLowerCase().trim();
          if (!verifiedEmails.includes(norm)) {
            setVerifiedEmails((prev) => [...prev, norm]);
          }
        }}
      />
    </div>
  );
}
