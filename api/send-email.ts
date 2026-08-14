import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER || 'nanoneptunemusic@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'vjlvkgudsrkdqksg';

function markdownToHtml(md: string): string {
  const html = md
    .replace(/^### (.*$)/gim, '<h3 style="font-size: 16px; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #1e293b;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 8px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size: 22px; font-weight: bold; margin-top: 24px; margin-bottom: 12px; color: #0f172a;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #ef4444;">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline;">$1</a>')
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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, markdownContent } = req.body || {};
    if (!to || !subject || !markdownContent) {
      return res.status(400).json({ error: 'Recipient (to), subject, and message content are required.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const htmlContent = markdownToHtml(markdownContent);
    const mailOptions = {
      from: `"Contacts App" <${EMAIL_USER}>`,
      to: to.trim(),
      subject: subject.trim(),
      text: markdownContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return res.json({ success: true, messageId: info.messageId, sentTo: to });
  } catch (err: any) {
    console.error('Failed to send email:', err);
    return res.status(500).json({ error: err?.message || 'Failed to send email via SMTP.' });
  }
}
