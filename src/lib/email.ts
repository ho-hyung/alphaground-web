/**
 * 이메일 발송 유틸리티
 *
 * 지원 프로바이더 (환경변수로 선택):
 *   RESEND_API_KEY   — Resend (기본값)
 *   SENDGRID_API_KEY — SendGrid
 *
 * 발신자 주소: EMAIL_FROM (예: "AlphaGround <hello@alphaground.kr>")
 */

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  ok: boolean
  messageId?: string
  error?: string
}

// ─── Resend ─────────────────────────────────────────────────────────────────

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' }

  const from = process.env.EMAIL_FROM ?? 'AlphaGround <noreply@alphaground.kr>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: `Resend error ${res.status}: ${body}` }
  }

  const data = (await res.json()) as { id?: string }
  return { ok: true, messageId: data.id }
}

// ─── SendGrid ────────────────────────────────────────────────────────────────

async function sendViaSendGrid(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) return { ok: false, error: 'SENDGRID_API_KEY not configured' }

  const from = process.env.EMAIL_FROM ?? 'noreply@alphaground.kr'

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from: { email: from },
      subject: params.subject,
      content: [
        { type: 'text/html', value: params.html },
        ...(params.text ? [{ type: 'text/plain', value: params.text }] : []),
      ],
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    return { ok: false, error: `SendGrid error ${res.status}: ${body}` }
  }

  const messageId = res.headers.get('x-message-id') ?? undefined
  return { ok: true, messageId }
}

// ─── 공개 API ────────────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (process.env.SENDGRID_API_KEY) {
    return sendViaSendGrid(params)
  }
  return sendViaResend(params)
}
