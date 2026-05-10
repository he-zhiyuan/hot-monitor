import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }
  return transporter
}

export interface EmailPayload {
  subject: string
  title: string
  body: string
  url?: string
  source?: string
}

export async function sendNotificationEmail(payload: EmailPayload): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP not configured, skipping email')
    return
  }

  const to = process.env.NOTIFY_EMAIL_TO || process.env.SMTP_USER

  try {
    await getTransporter().sendMail({
      from: `"HotMonitor 🔥" <${process.env.SMTP_USER}>`,
      to,
      subject: `🔥 ${payload.subject}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a0f1e; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); }
    .header { display: flex; align-items: center; margin-bottom: 20px; }
    .badge { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin: 16px 0 8px; }
    .body { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .source { color: #64748b; font-size: 12px; margin-top: 12px; }
    .btn { display: inline-block; margin-top: 20px; padding: 10px 24px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">🔥 HotMonitor 热点预警</span>
    </div>
    <div class="title">${payload.title}</div>
    <div class="body">${payload.body}</div>
    ${payload.source ? `<div class="source">来源：${payload.source}</div>` : ''}
    ${payload.url ? `<a href="${payload.url}" class="btn">查看原文 →</a>` : ''}
    <div class="footer">
      此邮件由 HotMonitor 自动发送 · <a href="http://localhost:3001" style="color:#7c3aed;">打开控制台</a>
    </div>
  </div>
</body>
</html>`,
    })
    console.log(`[Email] Sent to ${to}: ${payload.subject}`)
  } catch (err) {
    console.error('[Email] Send error:', err)
  }
}
