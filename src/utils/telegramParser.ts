import { Contact } from '../types';

export interface TelegramRawUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
    contact?: {
      phone_number: string;
      first_name: string;
      last_name?: string;
      user_id?: number;
      vcard?: string;
    };
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface ParsedTelegramContact {
  id: string;
  telegramUpdateId: number;
  messageId: number;
  chatId?: number;
  senderName: string;
  senderUsername?: string;
  name: string;
  phone: string;
  place: string;
  email?: string;
  rawText?: string;
  receivedAt: number;
  isNativeContactCard: boolean;
  status: 'new' | 'imported' | 'existing';
}

/**
 * Extracts phone numbers from text
 */
function extractPhone(text: string): string | null {
  // Match international or standard 10-14 digit formats
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3,5}\)?[-.\s]?)?[\d\s-]{6,12}\d/g;
  const matches = text.match(phoneRegex);
  if (matches && matches.length > 0) {
    // Pick the most plausible phone number (digits count >= 8)
    for (const match of matches) {
      const clean = match.replace(/[^\d+]/g, '');
      if (clean.replace('+', '').length >= 8 && clean.replace('+', '').length <= 15) {
        return clean.startsWith('+') ? clean : clean;
      }
    }
  }
  return null;
}

/**
 * Extracts email from text
 */
function extractEmail(text: string): string | null {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const match = text.match(emailRegex);
  return match ? match[0].toLowerCase().trim() : null;
}

/**
 * Parses vCard text for email and address
 */
function parseVCard(vcard?: string): { email?: string; place?: string } {
  if (!vcard) return {};
  const result: { email?: string; place?: string } = {};

  const emailMatch = vcard.match(/EMAIL[^:]*:(.+)/i);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
  }

  const adrMatch = vcard.match(/ADR[^:]*:(.+)/i);
  if (adrMatch) {
    const parts = adrMatch[1].split(';').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      result.place = parts[parts.length - 1] || parts[0];
    }
  }

  return result;
}

/**
 * Parse an array of Telegram updates into structured contact entries
 */
export function parseTelegramUpdates(
  updates: TelegramRawUpdate[],
  existingContacts: Contact[] = []
): ParsedTelegramContact[] {
  const parsedList: ParsedTelegramContact[] = [];

  const existingPhoneSet = new Set(
    existingContacts.map((c) => c.phone.replace(/[^\d]/g, '').slice(-10))
  );
  const existingEmailSet = new Set(
    existingContacts.map((c) => (c.email || '').toLowerCase().trim()).filter(Boolean)
  );

  for (const update of updates) {
    const msg = update.message;
    if (!msg) continue;

    const updateId = update.update_id;
    const messageId = msg.message_id;
    const chatId = msg.chat?.id;
    const sender = msg.from;
    const senderName = [sender?.first_name, sender?.last_name].filter(Boolean).join(' ') || sender?.username || 'Telegram User';
    const senderUsername = sender?.username;
    const receivedAt = msg.date ? msg.date * 1000 : Date.now();

    // 1. Direct Telegram Contact Card
    if (msg.contact) {
      const c = msg.contact;
      const contactName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || senderName;
      const phone = c.phone_number.startsWith('+') ? c.phone_number : `+${c.phone_number}`;
      const vcardData = parseVCard(c.vcard);

      const normPhone = phone.replace(/[^\d]/g, '').slice(-10);
      const isExisting =
        existingPhoneSet.has(normPhone) ||
        (vcardData.email && existingEmailSet.has(vcardData.email.toLowerCase()));

      parsedList.push({
        id: `tg-${updateId}-${messageId}`,
        telegramUpdateId: updateId,
        messageId,
        chatId,
        senderName,
        senderUsername,
        name: contactName,
        phone,
        place: vcardData.place || 'Telegram Shared',
        email: vcardData.email,
        receivedAt,
        isNativeContactCard: true,
        status: isExisting ? 'existing' : 'new',
      });
      continue;
    }

    // 2. Text message with potential contact information
    if (msg.text && typeof msg.text === 'string') {
      const text = msg.text.trim();

      // Skip common bot commands like /start, /help unless they contain contact data
      if (text === '/start' || text === '/help') {
        continue;
      }

      // Check if structured key:value format
      let parsedName = '';
      let parsedPhone = '';
      let parsedPlace = '';
      let parsedEmail = '';

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.startsWith('name:') || lower.startsWith('ಹೆಸರು:') || lower.startsWith('नाम:')) {
          parsedName = line.split(':')[1]?.trim() || '';
        } else if (lower.startsWith('phone:') || lower.startsWith('mobile:') || lower.startsWith('ದೂರವಾಣಿ:') || lower.startsWith('फोन:')) {
          parsedPhone = line.split(':')[1]?.trim() || '';
        } else if (lower.startsWith('place:') || lower.startsWith('city:') || lower.startsWith('ಸ್ಥಳ:') || lower.startsWith('शहर:')) {
          parsedPlace = line.split(':')[1]?.trim() || '';
        } else if (lower.startsWith('email:') || lower.startsWith('ಇಮೇಲ್:') || lower.startsWith('ईमेल:')) {
          parsedEmail = line.split(':')[1]?.trim() || '';
        }
      }

      // If not structured with key:value, use regex extractors
      if (!parsedPhone) {
        parsedPhone = extractPhone(text) || '';
      }
      if (!parsedEmail) {
        parsedEmail = extractEmail(text) || '';
      }

      // Extract place or name from comma separated (e.g. "Arun Kumar, 9876543210, Bangalore, arun@mail.com")
      if (!parsedName && lines.length === 1 && lines[0].includes(',')) {
        const parts = lines[0].split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          parsedName = parts[0];
          if (!parsedPlace && parts[2]) {
            parsedPlace = parts[2];
          }
        }
      }

      // If still no name, use sender's name if we found a phone number
      if (parsedPhone && !parsedName) {
        parsedName = senderName;
      }

      // If we found at least a phone or email or structured name
      if (parsedPhone || (parsedName && parsedEmail)) {
        const finalPlace = parsedPlace || 'Telegram Direct';
        const normPhone = parsedPhone ? parsedPhone.replace(/[^\d]/g, '').slice(-10) : '';
        const isExisting =
          (normPhone && existingPhoneSet.has(normPhone)) ||
          (parsedEmail && existingEmailSet.has(parsedEmail.toLowerCase()));

        parsedList.push({
          id: `tg-${updateId}-${messageId}`,
          telegramUpdateId: updateId,
          messageId,
          chatId,
          senderName,
          senderUsername,
          name: parsedName || senderName,
          phone: parsedPhone || 'N/A',
          place: finalPlace,
          email: parsedEmail || undefined,
          rawText: text,
          receivedAt,
          isNativeContactCard: false,
          status: isExisting ? 'existing' : 'new',
        });
      }
    }
  }

  // Return sorted with latest updates first
  return parsedList.reverse();
}
