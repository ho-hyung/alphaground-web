/**
 * 결제 캠페인 이메일 템플릿
 *
 * 캠페인 유형:
 *   initial     — 최초 발송
 *   reminder_d3 — 결제 링크 만료 D-3 리마인더
 *   reminder_d1 — 결제 링크 만료 D-1 리마인더
 */

export type CampaignType = 'initial' | 'reminder_d3' | 'reminder_d1'

export interface TemplateParams {
  paymentUrl: string
  expiresAt: Date
  campaignType: CampaignType
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alphaground.vercel.app'
const DISCOUNT_LABEL = '얼리버드 49,000원'

function formatDate(date: Date): string {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  })
}

// ─── 제목 ─────────────────────────────────────────────────────────────────────

export function getSubject(type: CampaignType): string {
  switch (type) {
    case 'initial':
      return 'AlphaGround 얼리버드 혜택 — 지금 바로 결제하세요'
    case 'reminder_d3':
      return '[D-3] AlphaGround 얼리버드 혜택 마감까지 3일 남았습니다'
    case 'reminder_d1':
      return '[D-1] 내일이면 AlphaGround 얼리버드 혜택이 종료됩니다'
  }
}

// ─── HTML 본문 ───────────────────────────────────────────────────────────────

function buildHtml(params: TemplateParams & { headline: string; intro: string; urgency: string }): string {
  const { paymentUrl, expiresAt, headline, intro, urgency } = params

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headline}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 48px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; color: #8b9dc3; font-size: 14px; }
    .badge { display: inline-block; background: #f59e0b; color: #1a1a2e; font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; margin-top: 16px; }
    .content { padding: 48px; }
    .content p { margin: 0 0 16px; color: #374151; font-size: 15px; line-height: 1.7; }
    .benefit-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 24px; margin: 24px 0; }
    .benefit-box h3 { margin: 0 0 12px; color: #0369a1; font-size: 15px; font-weight: 600; }
    .benefit-box ul { margin: 0; padding-left: 20px; }
    .benefit-box ul li { color: #374151; font-size: 14px; line-height: 1.8; }
    .price-box { background: #fafafa; border: 2px solid #e5e7eb; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
    .price-box .original { color: #9ca3af; font-size: 14px; text-decoration: line-through; }
    .price-box .price { color: #1a1a2e; font-size: 32px; font-weight: 800; margin: 4px 0; }
    .price-box .note { color: #6b7280; font-size: 13px; }
    .cta-btn { display: block; width: 100%; max-width: 320px; margin: 32px auto; padding: 18px 0; background: #f59e0b; color: #1a1a2e; font-size: 16px; font-weight: 700; text-align: center; text-decoration: none; border-radius: 10px; letter-spacing: -0.3px; }
    .urgency { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 24px 0; }
    .urgency p { margin: 0; color: #dc2626; font-size: 14px; font-weight: 500; }
    .expires { text-align: center; color: #6b7280; font-size: 13px; margin-top: 8px; }
    .footer { background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px 48px; text-align: center; }
    .footer p { margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.8; }
    .footer a { color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>AlphaGround</h1>
      <p>부동산 경매 초과 수익을 AI로 찾아냅니다</p>
      <span class="badge">🎯 얼리버드 특별 혜택</span>
    </div>
    <div class="content">
      <p>${intro}</p>

      <div class="benefit-box">
        <h3>✅ AlphaGround 멤버십 혜택</h3>
        <ul>
          <li>AI 기반 경매 물건 자동 분석 (권리관계·수익률)</li>
          <li>PASS 물건 텔레그램 실시간 알림</li>
          <li>법원 경매 데이터 전체 열람</li>
          <li>월 업데이트 무제한</li>
        </ul>
      </div>

      <div class="price-box">
        <div class="original">정가 월 99,000원</div>
        <div class="price">49,000원 <span style="font-size:16px;font-weight:400;color:#6b7280;">/ 월</span></div>
        <div class="note">얼리버드 첫 3개월 50% 할인</div>
      </div>

      <a href="${paymentUrl}" class="cta-btn">
        지금 바로 결제하기 →
      </a>

      <div class="urgency">
        <p>${urgency}</p>
      </div>

      <p class="expires">결제 링크 만료일: <strong>${formatDate(expiresAt)}</strong></p>
    </div>
    <div class="footer">
      <p>
        <a href="${SITE_URL}">AlphaGround</a> · 수신 거부를 원하시면 <a href="${SITE_URL}/unsubscribe">여기</a>를 클릭하세요.<br />
        이 이메일은 웨이트리스트에 등록하신 분께 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

export function buildEmailHtml(params: TemplateParams): string {
  const { campaignType, expiresAt } = params

  switch (campaignType) {
    case 'initial':
      return buildHtml({
        ...params,
        headline: 'AlphaGround 얼리버드 혜택',
        intro:
          '안녕하세요! 웨이트리스트에 등록해 주셔서 감사합니다.<br />' +
          'AlphaGround 얼리버드 혜택 결제 링크를 보내드립니다. 아래 버튼을 클릭해 지금 바로 멤버십을 시작하세요.',
        urgency: `⏰ 이 결제 링크는 ${formatDate(expiresAt)}까지만 유효합니다. 기간 내 결제하지 않으면 혜택이 소멸됩니다.`,
      })

    case 'reminder_d3':
      return buildHtml({
        ...params,
        headline: 'D-3 마감 알림',
        intro:
          '안녕하세요! AlphaGround 얼리버드 혜택 마감까지 이제 <strong>3일</strong>밖에 남지 않았습니다.<br />' +
          '아직 결제를 완료하지 않으셨다면, 놓치지 마세요.',
        urgency: `🔔 결제 링크 만료일: ${formatDate(expiresAt)} — 3일 후 자동으로 링크가 만료됩니다.`,
      })

    case 'reminder_d1':
      return buildHtml({
        ...params,
        headline: 'D-1 마지막 알림',
        intro:
          '안녕하세요! AlphaGround 얼리버드 혜택이 <strong>내일 종료</strong>됩니다.<br />' +
          '이번이 마지막 안내입니다. 지금 바로 결제 링크를 클릭하세요.',
        urgency: `🚨 내일(${formatDate(expiresAt)}) 자정에 링크가 만료됩니다. 이 기회를 놓치지 마세요!`,
      })
  }
}

export function buildEmailText(params: TemplateParams): string {
  const { paymentUrl, expiresAt, campaignType } = params
  const subject = getSubject(campaignType)

  return [
    subject,
    '',
    '━'.repeat(40),
    'AlphaGround 얼리버드 멤버십 — 49,000원/월',
    '━'.repeat(40),
    '',
    '결제 링크:',
    paymentUrl,
    '',
    `링크 만료일: ${formatDate(expiresAt)}`,
    '',
    '혜택: AI 경매 분석 · 실시간 알림 · 전체 데이터 열람',
    '',
    `더 알아보기: ${SITE_URL}`,
  ].join('\n')
}

// ─── UTM 파라미터 추가 ───────────────────────────────────────────────────────

export function addUtmParams(url: string, campaignType: CampaignType): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('utm_source', 'email')
    parsed.searchParams.set('utm_medium', 'campaign')
    parsed.searchParams.set('utm_campaign', `earlybird_${campaignType}`)
    return parsed.toString()
  } catch {
    return url
  }
}
