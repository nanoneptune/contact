import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import {
  getAllContactsDB,
  addContactDB,
  updateContactDB,
  deleteContactDB,
} from "./src/db/sqlite";
import {
  fetchContactsSupabase,
  addContactSupabase,
  updateContactSupabase,
  deleteContactSupabase,
} from "./src/db/supabaseStore";

// Setup Nodemailer Transporter for Gmail SMTP
const EMAIL_USER = process.env.EMAIL_USER || "nanoneptunemusic@gmail.com";
const EMAIL_PASS = process.env.EMAIL_PASS || "vjlvkgudsrkdqksg";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// In-memory OTP Store: email -> { otp, expires }
const otpStore = new Map<string, { otp: string; expires: number }>();

// Helper to construct Glassmorphism OTP Email HTML
function buildGlassmorphismOtpEmail(otp: string, recipientEmail: string): string {
  const digits = otp.split('');
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification OTP</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #090d16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <!-- Outer Gradient Container -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh; background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #311042 100%); padding: 40px 16px;">
        <tr>
          <td align="center">
            <!-- Glassmorphism Card Container -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background: rgba(255, 255, 255, 0.08); background-color: #121829; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 24px; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); overflow: hidden;">
              
              <!-- Glass Header Banner -->
              <tr>
                <td style="padding: 32px 32px 20px 32px; text-align: center; border-b: 1px solid rgba(255,255,255,0.08);">
                  <div style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); width: 56px; height: 56px; border-radius: 16px; line-height: 56px; font-size: 24px; color: #ffffff; font-weight: bold; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.4); margin-bottom: 16px;">
                    🔒
                  </div>
                  <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                    Verify Your Email
                  </h1>
                  <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                    Enter the 6-digit verification code below to verify <span style="color: #c084fc; font-weight: 600;">${recipientEmail}</span>
                  </p>
                </td>
              </tr>

              <!-- OTP Digits Glass Section -->
              <tr>
                <td style="padding: 24px 32px; text-align: center;">
                  <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 18px; padding: 24px 16px; margin: 0 auto; backdrop-filter: blur(10px);">
                    <p style="margin: 0 0 16px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #818cf8; font-weight: 700;">
                      ONE-TIME PASSCODE
                    </p>

                    <!-- Interactive Glass Digit Boxes -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                      <tr>
                        ${digits
                          .map(
                            (digit) => `
                          <td style="padding: 0 4px;">
                            <div style="width: 44px; height: 52px; line-height: 52px; font-size: 26px; font-weight: 800; color: #ffffff; background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 12px; text-align: center; box-shadow: inset 0 1px 1px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2);">
                              ${digit}
                            </div>
                          </td>
                        `
                          )
                          .join('')}
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0 0; font-size: 12px; color: #cbd5e1; font-weight: 500;">
                      ⏱️ Code expires in <strong style="color: #f43f5e;">10 minutes</strong>
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Security Warning & Footer -->
              <tr>
                <td style="padding: 0 32px 32px 32px; text-align: center;">
                  <p style="margin: 0 0 16px 0; font-size: 11px; color: #64748b; line-height: 1.5;">
                    If you did not request this verification code, please ignore this email.
                  </p>
                  <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
                    <p style="margin: 0; font-size: 11px; color: #475569; font-weight: 500;">
                      Sent securely from Contacts App Applet • nanoneptunemusic@gmail.com
                    </p>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Helper to convert simple markdown to HTML for email body
function markdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Restore custom span tags for colors if any
    .replace(/&lt;span style="color:\s*([^"]+);"&gt;(.*?)&lt;\/span&gt;/gi, '<span style="color: $1;">$2</span>')
    .replace(/&lt;span style='color:\s*([^']+);'&gt;(.*?)&lt;\/span&gt;/gi, "<span style=\"color: $1;\">$2</span>")
    .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<b>$1</b>')
    .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/gi, '<i>$1</i>')
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u>$1</u>')
    // Headings
    .replace(/^### (.*$)/gim, '<h3 style="margin: 12px 0 6px; font-size: 16px; font-weight: bold;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="margin: 16px 0 8px; font-size: 18px; font-weight: bold;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="margin: 20px 0 10px; font-size: 22px; font-weight: bold;">$1</h1>')
    // Bold and Italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    // Blockquote
    .replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 8px 0; color: #475569;">$1</blockquote>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre style="background: #0f172a; color: #f8fafc; padding: 12px; rounded: 8px; font-family: monospace; overflow-x: auto;"><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code style="background: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
    // Links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline;">$1</a>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      ${html}
      <hr style="margin-top: 24px; border: none; border-top: 1px solid #e2e8f0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 12px;">
        Sent via Contacts Interactive Mailer (nanoneptunemusic@gmail.com)
      </p>
    </div>
  `;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send Glassmorphism OTP Email
  app.post("/api/send-otp", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "A valid email address is required." });
      }

      const normalizedEmail = email.toLowerCase().trim();
      // Generate 6-digit random numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore.set(normalizedEmail, { otp, expires });

      const glassHtml = buildGlassmorphismOtpEmail(otp, normalizedEmail);

      const mailOptions = {
        from: `"Security Verification" <${EMAIL_USER}>`,
        to: normalizedEmail,
        subject: `🔒 ${otp} is your Verification Passcode`,
        text: `Your OTP verification code is ${otp}. It will expire in 10 minutes.`,
        html: glassHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[OTP] Glassmorphism OTP email sent to ${normalizedEmail}:`, info.messageId);

      return res.json({
        success: true,
        message: `OTP sent successfully to ${normalizedEmail}`,
        expiresInSeconds: 600,
      });
    } catch (err: any) {
      console.error("[OTP] Failed to send OTP email:", err);
      return res.status(500).json({
        error: err?.message || "Failed to send OTP email via SMTP.",
      });
    }
  });

  // API Route: Verify OTP Code
  app.post("/api/verify-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ error: "Email and OTP code are required." });
      }

      const normalizedEmail = String(email).toLowerCase().trim();
      const enteredOtp = String(otp).trim();

      const stored = otpStore.get(normalizedEmail);

      if (!stored) {
        return res.status(400).json({ error: "No OTP request found for this email. Please request a new code." });
      }

      if (Date.now() > stored.expires) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ error: "This OTP code has expired. Please request a new code." });
      }

      if (stored.otp !== enteredOtp) {
        return res.status(400).json({ error: "Invalid OTP passcode. Please check and try again." });
      }

      // OTP is valid! Clear it from store
      otpStore.delete(normalizedEmail);

      return res.json({
        success: true,
        verified: true,
        message: "Email address verified successfully!",
      });
    } catch (err: any) {
      console.error("[OTP] Verification error:", err);
      return res.status(500).json({ error: "Failed to verify OTP." });
    }
  });

  // API Route to Send Email
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, markdownContent } = req.body;

      if (!to || !subject || !markdownContent) {
        return res.status(400).json({ error: "Recipient (to), subject, and message content are required." });
      }

      const htmlContent = markdownToHtml(markdownContent);

      const mailOptions = {
        from: `"Contacts App" <${EMAIL_USER}>`,
        to: to.trim(),
        subject: subject.trim(),
        text: markdownContent,
        html: htmlContent,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);

      return res.json({
        success: true,
        messageId: info.messageId,
        sentTo: to,
      });
    } catch (err: any) {
      console.error("Failed to send email:", err);
      return res.status(500).json({
        error: err?.message || "Failed to send email via SMTP.",
      });
    }
  });

  // API Route: AI Voice Conversation (Gemini Primary + Groq Fallback)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { userMessage, contacts, history, languageCode } = req.body || {};

      if (!userMessage || typeof userMessage !== "string") {
        return res.status(400).json({ error: "User message is required." });
      }

      const formattedContacts = Array.isArray(contacts) && contacts.length > 0
        ? contacts.map((c: any) => `- Name: ${c.name}, Phone: ${c.phone}, Place: ${c.place}, Email: ${c.email || 'N/A'}`).join("\n")
        : "No contacts currently saved.";

      let languageInstruction = "Respond in clear, natural English.";
      if (languageCode === "kn-IN") {
        languageInstruction = "CRITICAL: Respond strictly in Kannada script (ಕನ್ನಡ) so the Sarvam AI Kannada TTS engine can speak it natively aloud to the user.";
      } else if (languageCode === "hi-IN") {
        languageInstruction = "CRITICAL: Respond strictly in Hindi script (हिंदी) so the Sarvam AI Hindi TTS engine can speak it natively aloud to the user.";
      } else if (languageCode === "en-IN") {
        languageInstruction = "Respond in clear English suitable for Indian English speech synthesis.";
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

      // 1. Try Google Gemini API first
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiApiKey });
          const contents = [
            ...(Array.isArray(history)
              ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
              : []),
            `User: ${userMessage}`
          ].join("\n");

          const geminiRes = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `${systemPrompt}\n\n${contents}`,
          });

          const geminiReply = geminiRes.text;
          if (geminiReply && geminiReply.trim()) {
            return res.json({ reply: geminiReply.trim() });
          }
        } catch (geminiError) {
          console.error("[Gemini API Attempt Failed]:", geminiError);
        }
      }

      // 2. Try Groq API as Secondary
      const groqKey = process.env.GROQ_API_KEY || "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";
      if (groqKey) {
        try {
          const messages = [
            { role: "system", content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-6) : []),
            { role: "user", content: userMessage }
          ];

          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages,
              temperature: 0.7,
              max_tokens: 400
            })
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            const groqReply = data.choices?.[0]?.message?.content;
            if (groqReply) {
              return res.json({ reply: groqReply.trim() });
            }
          }
        } catch (groqError) {
          console.error("[Groq API Attempt Failed]:", groqError);
        }
      }

      // 3. Intelligent Local Fallback Response
      const contactCount = Array.isArray(contacts) ? contacts.length : 0;
      let fallbackReply = `Hello! I am your AI Voice assistant. You have ${contactCount} saved contact${contactCount === 1 ? '' : 's'}. How can I help you message, locate, or organize them today?`;
      
      if (languageCode === "kn-IN") {
        fallbackReply = `ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ ಎಐ ಧ್ವನಿ ಸಹಾಯಕ. ನಿಮ್ಮ ಬಳಿ ${contactCount} ಉಳಿಸಿದ ಸಂಪರ್ಕಗಳಿವೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?`;
      } else if (languageCode === "hi-IN") {
        fallbackReply = `नमस्ते! मैं आपका एआई वॉयस असिस्टेंट हूं। आपके पास ${contactCount} सेव किए गए संपर्क हैं। मैं आपकी क्या मदद कर सकता हूं?`;
      }

      return res.json({ reply: fallbackReply });
    } catch (err: any) {
      console.error("[AI Chat Route Error]:", err);
      return res.json({ reply: "Hello! I am your AI Assistant. How can I help you manage your contacts today?" });
    }
  });

  // API Route: Sarvam AI Text-to-Speech (Talkback)
  app.post("/api/sarvam-tts", async (req, res) => {
    try {
      const { text, languageCode } = req.body;
      const sarvamKey = process.env.SARVAM_API_KEY || "sk_sugpmk4r_XFuBU2y16WzaWQPCSxp7tHKb";

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text string is required for speech synthesis." });
      }

      // Truncate text if excessively long for TTS
      const cleanText = text.replace(/[*#_`]/g, '').trim().slice(0, 500);

      const sarvamRes = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": sarvamKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: [cleanText],
          target_language_code: languageCode || "en-IN",
          speaker: "meera",
          pitch: 0,
          pace: 1.05,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: "bulbul:v1"
        })
      });

      if (!sarvamRes.ok) {
        const errText = await sarvamRes.text();
        console.error("[Sarvam TTS Error]:", sarvamRes.status, errText);
        return res.status(sarvamRes.status).json({ error: "Sarvam TTS request failed", details: errText });
      }

      const data = await sarvamRes.json();
      const audioBase64 = data.audios?.[0];

      if (!audioBase64) {
        return res.status(500).json({ error: "No audio returned from Sarvam API." });
      }

      return res.json({
        success: true,
        audioBase64: `data:audio/wav;base64,${audioBase64}`
      });
    } catch (err: any) {
      console.error("[Sarvam TTS Exception]:", err);
      return res.status(500).json({ error: err?.message || "Failed to generate talkback audio." });
    }
  });

  // API REST Routes for Contacts
  app.get("/api/contacts", async (_req, res) => {
    try {
      const { data: supabaseContacts, error: sbError } = await fetchContactsSupabase();

      if (!sbError && supabaseContacts !== null) {
        return res.json({
          source: "supabase",
          contacts: supabaseContacts,
          error: null,
        });
      }

      const sqliteContacts = await getAllContactsDB();
      res.json({
        source: "sqlite",
        contacts: sqliteContacts,
        error: sbError || "Supabase offline",
      });
    } catch (err: any) {
      console.error("Error fetching contacts:", err);
      const sqliteContacts = await getAllContactsDB();
      res.json({
        source: "sqlite",
        contacts: sqliteContacts,
        error: err?.message || "Failed to fetch contacts",
      });
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      const { name, phone, place, email } = req.body;
      if (!name || !phone || !place) {
        return res.status(400).json({ error: "Name, phone, and place are required" });
      }

      const id = `contact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = Date.now();
      const newContact = {
        id,
        name,
        phone,
        place,
        email: email ? String(email).trim() : undefined,
        isFavorite: false,
        createdAt,
      };

      // Store in SQLite
      await addContactDB(newContact);

      // Attempt storing in Supabase
      const sbResult = await addContactSupabase(newContact);

      res.status(201).json({
        contact: newContact,
        supabaseSaved: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error creating contact:", err);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, place, email, isFavorite } = req.body;

      // Update in local SQLite
      await updateContactDB(id, { name, phone, place, email, isFavorite });

      // Update in Supabase
      const sbResult = await updateContactSupabase(id, { name, phone, place, email, isFavorite });

      res.json({
        success: true,
        supabaseSaved: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error updating contact:", err);
      res.status(500).json({ error: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;

      await deleteContactDB(id);
      const sbResult = await deleteContactSupabase(id);

      res.json({
        success: true,
        supabaseDeleted: sbResult.success,
        supabaseError: sbResult.error,
      });
    } catch (err: any) {
      console.error("Error deleting contact:", err);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
