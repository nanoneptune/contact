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
    const { text, languageCode } = req.body || {};
    const rawSarvamKey = process.env.SARVAM_API_KEY || process.env.VITE_SARVAM_API_KEY;
    const sarvamKey =
      (rawSarvamKey ? rawSarvamKey.replace(/^["']|["']$/g, '').trim() : '') ||
      'sk_sugpmk4r_XFuBU2y16WzaWQPCSxp7tHKb';

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text string is required for speech synthesis.' });
    }

    const cleanText = text.replace(/[*#_`]/g, '').trim().slice(0, 500);
    const targetLang = languageCode || 'en-IN';

    // 1. Try Bulbul V3
    let sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamKey,
        Authorization: `Bearer ${sarvamKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: [cleanText],
        target_language_code: targetLang,
        speaker: 'ritu',
        pace: 1.0,
        model: 'bulbul:v3',
      }),
    });

    // 2. Try Bulbul V2 if V3 is not available
    if (!sarvamRes.ok) {
      sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamKey,
          Authorization: `Bearer ${sarvamKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [cleanText],
          target_language_code: targetLang,
          speaker: 'anushka',
          pace: 1.0,
          model: 'bulbul:v2',
        }),
      });
    }

    // 3. Try standard model
    if (!sarvamRes.ok) {
      sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamKey,
          Authorization: `Bearer ${sarvamKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: [cleanText],
          target_language_code: targetLang,
          speaker: 'shubh',
        }),
      });
    }

    if (!sarvamRes.ok) {
      const errBody = await sarvamRes.text();
      return res.status(sarvamRes.status).json({
        error: `Sarvam API returned status ${sarvamRes.status}`,
        details: errBody,
      });
    }

    const data = await sarvamRes.json();
    const audios = data.audios;

    if (Array.isArray(audios) && audios.length > 0 && audios[0]) {
      return res.json({
        success: true,
        audioBase64: `data:audio/wav;base64,${audios[0]}`,
        model: 'sarvam',
      });
    }

    return res.status(500).json({ error: 'No audio data returned by Sarvam TTS.' });
  } catch (err: any) {
    console.error('Sarvam TTS handler error:', err);
    return res.status(500).json({ error: err?.message || 'Sarvam TTS request failed.' });
  }
}
