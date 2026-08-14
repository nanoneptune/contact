export default async function handler(req: any, res: any) {
  // Handle CORS
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userMessage, contacts, history, languageCode } = req.body || {};

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'User message is required.' });
    }

    const formattedContacts =
      Array.isArray(contacts) && contacts.length > 0
        ? contacts
            .map(
              (c: any) =>
                `- Name: ${c.name}, Phone: ${c.phone}, Place: ${c.place}, Email: ${c.email || 'N/A'}`
            )
            .join('\n')
        : 'No contacts currently saved.';

    let languageInstruction = 'Respond in clear, natural English.';
    if (languageCode === 'kn-IN') {
      languageInstruction =
        'CRITICAL: Respond strictly in Kannada script (ಕನ್ನಡ) so the Sarvam AI Kannada TTS engine can speak it natively aloud to the user.';
    } else if (languageCode === 'hi-IN') {
      languageInstruction =
        'CRITICAL: Respond strictly in Hindi script (हिंदी) so the Sarvam AI Hindi TTS engine can speak it natively aloud to the user.';
    } else if (languageCode === 'en-IN') {
      languageInstruction =
        'Respond in clear English suitable for Indian English speech synthesis.';
    }

    const systemPrompt = `You are "AI Voice Talkback", an intelligent, courteous AI assistant for the Contacts & Messaging App.
Your goal is to greet the user politely, organize conversations clearly, provide helpful information based on the user's saved contacts or general questions, and format your output so it sounds natural when spoken aloud.

LANGUAGE MANDATE:
${languageInstruction}

SAVED CONTACTS CONTEXT:
${formattedContacts}

INSTRUCTIONS:
1. Greet the user warmly in the target language when appropriate.
2. Provide direct, organized answers (e.g. if asked about contacts, list their details clearly).
3. Keep answers conversational, crisp, and under 120 words so they sound great over speech synthesis / talkback.
4. Avoid markdown heavy tables or code blocks unless requested.`;

    const rawGroqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    const groqKey =
      (rawGroqKey ? rawGroqKey.replace(/^["']|["']$/g, '').trim() : '') ||
      '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';

    if (groqKey) {
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(history) ? history.slice(-6) : []),
          { role: 'user', content: userMessage },
        ];

        // Try llama-3.3-70b-versatile first
        let groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature: 0.7,
            max_tokens: 400,
          }),
        });

        // Fallback to llama-3.1-8b-instant if needed
        if (!groqRes.ok) {
          groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${groqKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages,
              temperature: 0.7,
              max_tokens: 400,
            }),
          });
        }

        if (groqRes.ok) {
          const data = await groqRes.json();
          const groqReply = data.choices?.[0]?.message?.content;
          if (groqReply && groqReply.trim()) {
            return res.json({ reply: groqReply.trim(), source: 'groq' });
          }
        }
      } catch (groqErr) {
        console.error('Vercel API Groq error:', groqErr);
      }
    }

    // Fallback template
    const contactCount = Array.isArray(contacts) ? contacts.length : 0;
    let fallbackReply = `Hello! I am your AI Voice assistant. You have ${contactCount} saved contact${contactCount === 1 ? '' : 's'}. How can I help you message, locate, or organize them today?`;
    if (languageCode === 'kn-IN') {
      fallbackReply = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಎಐ ಧ್ವನಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಬಳಿ ${contactCount} ಉಳಿಸಿದ ಸಂಪರ್ಕಗಳಿವೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
    } else if (languageCode === 'hi-IN') {
      fallbackReply = `नमस्ते! मैं आपका एआई वॉयस असिस्टेंट हूं। आपके पास ${contactCount} सेव किए गए संपर्क हैं। मैं आपकी क्या मदद कर सकता हूं?`;
    }

    return res.json({ reply: fallbackReply, source: 'offline-template' });
  } catch (err: any) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ error: err?.message || 'Server error' });
  }
}
