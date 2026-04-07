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

  // 환경변수 존재 여부 확인 (값은 노출하지 않음)
  const envVars = [
    'PORTONE_API_SECRET',
    'PORTONE_CHANNEL_KEY',
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
      checks[key] = `✅ 설정됨 (${val.substring(0, 6)}...)`
    }
  }

  // 포트원 API 연결 테스트 (결제 조회로 확인)
  let portoneStatus = '미확인'
  const apiSecret = process.env.PORTONE_API_SECRET
  if (apiSecret && !apiSecret.includes('...')) {
    try {
      const res = await fetch('https://api.portone.io/payments/test-connection-check', {
        headers: { Authorization: `PortOne ${apiSecret}` },
      })
      // 404면 엔드포인트 없음이지만 인증은 됨, 401/403이면 키 오류
      if (res.status === 401 || res.status === 403) {
        portoneStatus = `❌ 인증 실패 (${res.status}) — PORTONE_API_SECRET 확인 필요`
      } else {
        portoneStatus = `✅ API 연결 가능 (HTTP ${res.status})`
      }
    } catch (e) {
      portoneStatus = `❌ 네트워크 오류: ${e instanceof Error ? e.message : String(e)}`
    }
  } else {
    portoneStatus = '⚠️ PORTONE_API_SECRET 미설정으로 테스트 불가'
  }

  return NextResponse.json({
    envVars: checks,
    portoneApiStatus: portoneStatus,
    note: '채널 키 404 오류 시: 포트원 관리자 > 채널 관리 > 채널 키 확인. "channel-key-{uuid}" 형식이어야 합니다.',
  })
}
