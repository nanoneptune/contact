export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const rawBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
  const botToken =
    (rawBotToken ? rawBotToken.replace(/^["']|["']$/g, '').trim() : '') ||
    '8927749666:AAECASzT9foWNDb8M6zzdKUgFsrprOBmueY';

  const action = req.query.action || (req.method === 'GET' ? 'updates' : 'send');

  try {
    if (action === 'info') {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await response.json();
      return res.json(data);
    }

    if (action === 'updates' || req.method === 'GET') {
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&limit=100`
      );
      const data = await response.json();
      return res.json(data);
    }

    if (action === 'send' && req.method === 'POST') {
      const { chatId, text } = req.body || {};
      if (!chatId || !text) {
        return res.status(400).json({ error: 'chatId and text are required' });
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
      const data = await response.json();
      return res.json(data);
    }

    return res.status(400).json({ error: 'Invalid action or method' });
  } catch (err: any) {
    console.error('Vercel Telegram handler error:', err);
    return res.status(500).json({ error: err?.message || 'Telegram integration error' });
  }
}
