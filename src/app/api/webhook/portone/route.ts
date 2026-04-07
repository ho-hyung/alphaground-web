/**
 * POST /api/webhook/portone
 *
 * 포트원(PortOne) v2 Webhook 수신 엔드포인트.
 *
 * 처리 흐름:
 * 1. PORTONE_WEBHOOK_SECRET 으로 서명 검증
 * 2. 요청 바디에서 payment_id 추출
 * 3. 포트원 서버 API 로 결제 상태 재조회 (위변조 방지)
 * 4. 결제 성공(PAID) 시 해당 사용자의 멤버십을 premium 으로 업데이트
 *
 * 환경변수:
 *   PORTONE_WEBHOOK_SECRET   — 포트원 Webhook 서명 시크릿
 *   PORTONE_API_SECRET       — 포트원 v2 API 시크릿 (결제 재조회용)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyWebhookSignature, getPayment } from '@/lib/portone'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, serviceKey)
}

export async function POST(request: NextRequest) {
  // 원시 바디를 텍스트로 먼저 읽어야 서명 검증에 사용 가능
  const rawBody = await request.text()

  // ── 1. 서명 검증 ─────────────────────────────────
  const webhookId = request.headers.get('webhook-id') ?? ''
  const webhookTimestamp = request.headers.get('webhook-timestamp') ?? ''
  const webhookSignature = request.headers.get('webhook-signature') ?? ''

  const isValid = await verifyWebhookSignature(rawBody, webhookId, webhookTimestamp, webhookSignature)
  if (!isValid) {
    console.error('[portone webhook] 서명 검증 실패')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // ── 2. 바디 파싱 & payment_id 추출 ───────────────
  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // v2 포맷: data.paymentId / 혹은 최상위 payment_id 모두 허용
  const paymentId =
    (body.payment_id as string | undefined) ??
    ((body.data as Record<string, unknown> | undefined)?.paymentId as string | undefined)

  if (!paymentId) {
    console.error('[portone webhook] payment_id 없음:', JSON.stringify(body))
    return NextResponse.json({ error: 'payment_id 없음' }, { status: 400 })
  }

  try {
    // ── 3. 포트원 서버에서 결제 상태 재조회 ──────────
    const payment = await getPayment(paymentId)

    if (payment.status !== 'PAID') {
      // 결제 실패·취소 등 — 성공이 아닌 이벤트는 무시 (200 반환으로 재시도 방지)
      return NextResponse.json({ success: true, skipped: true, status: payment.status })
    }

    const customerEmail: string | undefined = payment.customer?.email
    if (!customerEmail) {
      console.error('[portone webhook] 결제 고객 이메일 없음. paymentId:', paymentId)
      return NextResponse.json({ error: '고객 이메일 없음' }, { status: 400 })
    }

    // ── 4. 사용자 멤버십 업데이트 ────────────────────
    const supabase = createAdminClient()

    const { error: membershipError } = await supabase
      .from('users')
      .update({ membership: 'premium' })
      .eq('email', customerEmail)

    if (membershipError) {
      console.error('[portone webhook] 멤버십 업데이트 실패:', membershipError)
      return NextResponse.json({ error: '멤버십 업데이트 실패' }, { status: 500 })
    }

    // payment_links 테이블이 있으면 상태도 갱신 (없으면 무시)
    await supabase
      .from('payment_links')
      .update({
        status: 'paid',
        paid_at: payment.paidAt ?? new Date().toISOString(),
        portone_tx_id: paymentId,
      })
      .eq('customer_email', customerEmail)
      .eq('status', 'pending')

    console.log(`[portone webhook] 멤버십 활성화: ${customerEmail} (paymentId: ${paymentId})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[portone webhook] 처리 중 오류:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
