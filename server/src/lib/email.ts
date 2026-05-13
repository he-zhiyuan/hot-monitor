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
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- 顶部色条 -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#06b6d4,#0891b2);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:24px 32px 20px;border-bottom:1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:#ecfeff;color:#0891b2;border:1px solid #cffafe;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;letter-spacing:0.5px;">
                      ⚡ HotMonitor · AI 热点预警
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 标题 + 正文 -->
          <tr>
            <td style="padding:28px 32px 24px;">
              <h2 style="margin:0 0 14px 0;font-size:19px;font-weight:700;color:#0f172a;line-height:1.4;">
                ${payload.title}
              </h2>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.7;">
                ${payload.body}
              </p>

              ${payload.source ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
                <tr>
                  <td style="padding:10px 14px;background-color:#f8fafc;border-radius:8px;border-left:3px solid #22d3ee;">
                    <span style="font-size:12px;color:#64748b;">来源平台：</span>
                    <span style="font-size:12px;font-weight:600;color:#0f172a;">${payload.source}</span>
                  </td>
                </tr>
              </table>` : ''}

              ${payload.url ? `
              <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="background-color:#06b6d4;border-radius:8px;">
                    <a href="${payload.url}" target="_blank"
                      style="display:inline-block;padding:11px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                      查看原文 →
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 20px;border-top:1px solid #f1f5f9;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                此邮件由 <strong style="color:#64748b;">HotMonitor</strong> 自动发送，请勿直接回复。<br>
                你收到此邮件是因为订阅了关键词监控通知。
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    })
    console.log(`[Email] Sent to ${to}: ${payload.subject}`)
  } catch (err) {
    console.error('[Email] Send error:', err)
  }
}
