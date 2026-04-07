/**
 * POST /api/payment/webhook
 *
 * 포트원 v2 Webhook 수신 엔드포인트.
 * 결제 완료(paid) 이벤트를 수신하여 멤버십 상태를 활성화합니다.
 *
 * 환경변수:
 *   PORTONE_WEBHOOK_SECRET   — 포트원 Webhook 서명 시크릿
 *   PORTONE_API_SECRET       — 포트원 v2 API 시크릿 (결제 검증용)
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
  // 원시 바디를 텍스트로 읽어 서명 검증에 사용
  const rawBody = await request.text()

  const webhookId = request.headers.get('webhook-id') ?? ''
  const webhookTimestamp = request.headers.get('webhook-timestamp') ?? ''
  const webhookSignature = request.headers.get('webhook-signature') ?? ''

  // 서명 검증
  const isValid = await verifyWebhookSignature(rawBody, webhookId, webhookTimestamp, webhookSignature)
  if (!isValid) {
    console.error('포트원 Webhook 서명 검증 실패')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { type: string; data?: { paymentId?: string; paymentLinkId?: string } }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 결제 완료 이벤트만 처리
  if (event.type !== 'Transaction.Paid') {
    return NextResponse.json({ success: true, skipped: true })
  }

  const paymentId = event.data?.paymentId
  if (!paymentId) {
    return NextResponse.json({ error: 'paymentId 없음' }, { status: 400 })
  }

  try {
    // 포트원 서버에서 결제 내역 재확인 (이중 검증)
    const payment = await getPayment(paymentId)

    if (payment.status !== 'PAID') {
      return NextResponse.json({ success: true, skipped: true })
    }

    const customerEmail = payment.customer?.email
    if (!customerEmail) {
      console.error('결제 고객 이메일 없음:', paymentId)
      return NextResponse.json({ error: '고객 이메일 없음' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // payment_links 레코드 업데이트
    const paymentLinkId = event.data?.paymentLinkId
    if (paymentLinkId) {
      await supabase
        .from('payment_links')
        .update({
          status: 'paid',
          paid_at: payment.paidAt ?? new Date().toISOString(),
          portone_tx_id: paymentId,
        })
        .eq('payment_link_id', paymentLinkId)
    }

    // 사용자 멤버십 활성화
    const { error: updateError } = await supabase
      .from('users')
      .update({ membership: 'premium' })
      .eq('email', customerEmail)

    if (updateError) {
      console.error('멤버십 활성화 실패:', updateError)
      return NextResponse.json({ error: '멤버십 활성화 실패' }, { status: 500 })
    }

    console.log(`멤버십 활성화 완료: ${customerEmail} (결제 ID: ${paymentId})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook 처리 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
