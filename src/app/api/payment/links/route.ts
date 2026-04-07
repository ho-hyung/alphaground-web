/**
 * POST /api/payment/links
 *
 * 포트원 v2 결제 링크 생성 엔드포인트.
 * 웨이트리스트에 등록된 이메일을 대상으로 고유 결제 링크를 생성하고 DB에 저장합니다.
 *
 * 환경변수:
 *   PORTONE_API_SECRET       — 포트원 v2 API 시크릿
 *   PORTONE_CHANNEL_KEY      — 포트원 채널 키 (토스페이먼츠 또는 카카오페이)
 *   PORTONE_MEMBERSHIP_PRICE — 얼리버드 멤버십 가격 (KRW, 기본값: 49000)
 *   CRON_SECRET              — 내부 API 호출 인증 (Vercel Cron Secret)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createPaymentLink } from '@/lib/portone'

const RequestSchema = z.object({
  email: z.string().email(),
  amountKRW: z.number().int().positive().optional(),
})

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, serviceKey)
}

export async function POST(request: NextRequest) {
  // 내부 API 인증
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { email, amountKRW } = RequestSchema.parse(body)

    const price = amountKRW ?? parseInt(process.env.PORTONE_MEMBERSHIP_PRICE ?? '49000', 10)

    // 이미 유효한 결제 링크가 있으면 재사용
    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('payment_links')
      .select('payment_link_id, payment_link_url, expires_at')
      .eq('customer_email', email)
      .in('status', ['pending'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({
        success: true,
        paymentLinkId: existing.payment_link_id,
        paymentLinkUrl: existing.payment_link_url,
        reused: true,
      })
    }

    // 새 결제 링크 생성
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const link = await createPaymentLink({ customerEmail: email, amountKRW: price, expiresAt })

    const { error: insertError } = await supabase.from('payment_links').insert({
      payment_link_id: link.paymentLinkId,
      payment_link_url: link.paymentLinkUrl,
      customer_email: email,
      amount: price,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      paymentLinkId: link.paymentLinkId,
      paymentLinkUrl: link.paymentLinkUrl,
      reused: false,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: '유효하지 않은 요청입니다.', details: error.issues }, { status: 400 })
    }
    console.error('결제 링크 생성 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

/**
 * GET /api/payment/links
 * 내부용: 모든 대기 중인 결제 링크 목록 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('결제 링크 목록 조회 오류:', error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, links: data })
}
