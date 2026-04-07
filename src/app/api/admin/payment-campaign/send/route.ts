/**
 * POST /api/admin/payment-campaign/send
 *
 * 이메일 수집 DB의 잠재 고객에게 결제 링크를 일괄 발송합니다.
 *
 * 요청 바디:
 *   campaignType  — 'initial' | 'reminder_d3' | 'reminder_d1' (기본: 'initial')
 *   dryRun        — true일 경우 실제 발송하지 않고 결과 시뮬레이션
 *   emailOverride — 특정 이메일에만 발송 (테스트용)
 *
 * 환경변수:
 *   CRON_SECRET              — 내부 API 인증
 *   PORTONE_MEMBERSHIP_PRICE — 결제 금액 (기본: 49000)
 *   RESEND_API_KEY / SENDGRID_API_KEY — 이메일 발송 서비스
 *   EMAIL_FROM               — 발신자 주소
 *   NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — Supabase
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import path from 'path'
import { z } from 'zod'
import { createPaymentLink } from '@/lib/portone'
import { sendEmail } from '@/lib/email'
import {
  type CampaignType,
  buildEmailHtml,
  buildEmailText,
  getSubject,
  addUtmParams,
} from '@/lib/email-templates'

// ─── 입력 검증 ───────────────────────────────────────────────────────────────

const RequestSchema = z.object({
  campaignType: z.enum(['initial', 'reminder_d3', 'reminder_d1']).default('initial'),
  dryRun: z.boolean().default(false),
  emailOverride: z.string().email().optional(),
})

// ─── Supabase 클라이언트 ─────────────────────────────────────────────────────

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, serviceKey)
}

// ─── 이메일 목록 로드 ─────────────────────────────────────────────────────────

async function loadEmails(): Promise<string[]> {
  // 1) Supabase waitlist 테이블 시도
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('waitlist')
      .select('email')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((row: { email: string }) => row.email)
    }
  } catch {
    // Supabase 실패 시 JSON 파일 폴백
  }

  // 2) 로컬 JSON 파일 폴백
  const filePath = path.join(process.cwd(), 'data', 'waitlist.json')
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as string[]
    return []
  } catch {
    return []
  }
}

// ─── 결제 링크 조회 또는 생성 ────────────────────────────────────────────────

async function getOrCreatePaymentLink(
  email: string,
  price: number,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ paymentLinkId: string; paymentLinkUrl: string; expiresAt: Date; reused: boolean }> {
  // 유효한 링크 재사용
  const { data: existing } = await supabase
    .from('payment_links')
    .select('payment_link_id, payment_link_url, expires_at')
    .eq('customer_email', email)
    .in('status', ['pending'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return {
      paymentLinkId: existing.payment_link_id,
      paymentLinkUrl: existing.payment_link_url,
      expiresAt: new Date(existing.expires_at),
      reused: true,
    }
  }

  // 새 링크 생성
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const link = await createPaymentLink({ customerEmail: email, amountKRW: price, expiresAt })

  await supabase.from('payment_links').insert({
    payment_link_id: link.paymentLinkId,
    payment_link_url: link.paymentLinkUrl,
    customer_email: email,
    amount: price,
    expires_at: expiresAt.toISOString(),
  })

  return {
    paymentLinkId: link.paymentLinkId,
    paymentLinkUrl: link.paymentLinkUrl,
    expiresAt,
    reused: false,
  }
}

// ─── 발송 로그 저장 ───────────────────────────────────────────────────────────

async function logCampaignSend(
  supabase: ReturnType<typeof createAdminClient>,
  entry: {
    email: string
    paymentLinkId: string
    campaignType: CampaignType
    status: 'sent' | 'failed' | 'dry_run'
    errorMessage?: string
    messageId?: string
  }
) {
  await supabase.from('campaign_sends').insert({
    email: entry.email,
    payment_link_id: entry.paymentLinkId,
    campaign_type: entry.campaignType,
    status: entry.status,
    error_message: entry.errorMessage ?? null,
    message_id: entry.messageId ?? null,
    sent_at: new Date().toISOString(),
  })
}

// ─── 핸들러 ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const parseResult = RequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: '유효하지 않은 요청입니다.', details: parseResult.error.issues },
      { status: 400 }
    )
  }

  const { campaignType, dryRun, emailOverride } = parseResult.data
  const price = parseInt(process.env.PORTONE_MEMBERSHIP_PRICE ?? '49000', 10)

  let emails: string[]
  if (emailOverride) {
    emails = [emailOverride]
  } else {
    emails = await loadEmails()
  }

  if (emails.length === 0) {
    return NextResponse.json({ success: true, message: '발송 대상 없음', sent: 0, failed: 0 })
  }

  const supabase = createAdminClient()

  const results = {
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as { email: string; error: string }[],
  }

  // 순차 처리 (이메일 서비스 레이트 리밋 방지)
  for (const email of emails) {
    try {
      // 결제 링크 생성 또는 재사용
      const { paymentLinkId, paymentLinkUrl, expiresAt } = await getOrCreatePaymentLink(
        email,
        price,
        supabase
      )

      // UTM 파라미터 추가
      const trackedUrl = addUtmParams(paymentLinkUrl, campaignType)

      if (dryRun) {
        await logCampaignSend(supabase, {
          email,
          paymentLinkId,
          campaignType,
          status: 'dry_run',
        })
        results.sent++
        continue
      }

      // 이메일 발송
      const html = buildEmailHtml({ paymentUrl: trackedUrl, expiresAt, campaignType })
      const text = buildEmailText({ paymentUrl: trackedUrl, expiresAt, campaignType })

      const emailResult = await sendEmail({
        to: email,
        subject: getSubject(campaignType),
        html,
        text,
      })

      if (emailResult.ok) {
        await logCampaignSend(supabase, {
          email,
          paymentLinkId,
          campaignType,
          status: 'sent',
          messageId: emailResult.messageId,
        })
        results.sent++
      } else {
        await logCampaignSend(supabase, {
          email,
          paymentLinkId,
          campaignType,
          status: 'failed',
          errorMessage: emailResult.error,
        })
        results.failed++
        results.errors.push({ email, error: emailResult.error ?? '알 수 없는 오류' })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      results.failed++
      results.errors.push({ email, error: message })
    }
  }

  return NextResponse.json({
    success: true,
    campaignType,
    dryRun,
    totalEmails: emails.length,
    sent: results.sent,
    failed: results.failed,
    skipped: results.skipped,
    errors: results.errors.length > 0 ? results.errors : undefined,
  })
}

/**
 * GET /api/admin/payment-campaign/send
 * 발송 현황 조회 (총 발송 수, 성공/실패, 유형별 통계)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // 캠페인별 통계
  const { data: sends } = await supabase
    .from('campaign_sends')
    .select('campaign_type, status, sent_at')
    .order('sent_at', { ascending: false })

  const stats = {
    total: sends?.length ?? 0,
    byStatus: {
      sent: sends?.filter((r) => r.status === 'sent').length ?? 0,
      failed: sends?.filter((r) => r.status === 'failed').length ?? 0,
      dry_run: sends?.filter((r) => r.status === 'dry_run').length ?? 0,
    },
    byCampaignType: {
      initial: sends?.filter((r) => r.campaign_type === 'initial').length ?? 0,
      reminder_d3: sends?.filter((r) => r.campaign_type === 'reminder_d3').length ?? 0,
      reminder_d1: sends?.filter((r) => r.campaign_type === 'reminder_d1').length ?? 0,
    },
    lastSentAt: sends?.[0]?.sent_at ?? null,
  }

  // 결제 전환율 (결제 완료 / 이메일 발송)
  const { data: paidLinks } = await supabase
    .from('payment_links')
    .select('customer_email')
    .eq('status', 'paid')

  const conversionRate =
    stats.byStatus.sent > 0
      ? ((paidLinks?.length ?? 0) / stats.byStatus.sent) * 100
      : 0

  return NextResponse.json({
    success: true,
    stats,
    conversion: {
      totalPaid: paidLinks?.length ?? 0,
      rate: parseFloat(conversionRate.toFixed(2)),
    },
  })
}
