/**
 * GET /api/admin/payment-diagnose
 *
 * 포트원 환경변수 설정 및 연결 상태를 점검합니다.
 * CRON_SECRET 인증 필요.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: Record<string, string> = {}

  const envVars = [
    'PORTONE_API_SECRET',
    'PORTONE_CHANNEL_KEY',
    'PORTONE_STORE_ID',
    'PORTONE_WEBHOOK_SECRET',
    'PORTONE_MEMBERSHIP_PRICE',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CRON_SECRET',
    'ADMIN_EMAIL',
  ]

  for (const key of envVars) {
    const val = process.env[key]
    if (!val) {
      checks[key] = '❌ 미설정'
    } else if (val.includes('...') || val === 'your-secret-here' || val.includes('<')) {
      checks[key] = '⚠️ 플레이스홀더 값 (실제 값으로 교체 필요)'
    } else {
      checks[key] = `✅ 설정됨 (${val.substring(0, 8)}...)`
    }
  }

  // ── 포트원 결제링크 API 직접 호출 테스트 ────────────
  let paymentLinkTest: Record<string, unknown> = { status: '미실행' }
  const apiSecret = process.env.PORTONE_API_SECRET
  const channelKey = process.env.PORTONE_CHANNEL_KEY
  const storeId = process.env.PORTONE_STORE_ID

  if (apiSecret && channelKey && !apiSecret.includes('...') && !channelKey.includes('...')) {
    const body: Record<string, unknown> = {
      channelKey,
      orderName: '[진단용] 테스트 결제',
      amount: { total: 1000, currency: 'KRW' },
      customer: { email: 'diagnose@test.com' },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 후
    }
    if (storeId) body.storeId = storeId

    try {
      const res = await fetch('https://api.portone.io/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `PortOne ${apiSecret}`,
        },
        body: JSON.stringify(body),
      })

      const rawText = await res.text().catch(() => '')
      let parsedBody: unknown = rawText
      try { parsedBody = JSON.parse(rawText) } catch { /* keep raw */ }

      paymentLinkTest = {
        httpStatus: res.status,
        ok: res.ok,
        responseBody: parsedBody,
        requestBody: { ...body, channelKey: channelKey.substring(0, 20) + '...' },
      }
    } catch (e) {
      paymentLinkTest = { error: e instanceof Error ? e.message : String(e) }
    }
  } else {
    paymentLinkTest = { status: '⚠️ PORTONE_API_SECRET 또는 PORTONE_CHANNEL_KEY 미설정' }
  }

  return NextResponse.json({
    envVars: checks,
    paymentLinkTest,
    tips: [
      '404: 채널이 결제링크를 지원하지 않거나 channelKey가 올바르지 않음',
      '401/403: PORTONE_API_SECRET이 v2 API 시크릿인지 확인 (포트원 관리자 > 상점 정보 > API Keys > V2 API Secret)',
      '422: 요청 파라미터 오류 (responseBody에서 상세 확인)',
    ],
  })
}
