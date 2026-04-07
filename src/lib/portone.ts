/**
 * 포트원(PortOne) v2 API 클라이언트
 * 문서: https://developers.portone.io/api/rest-v2
 */

const PORTONE_API_BASE = 'https://api.portone.io'

function getApiSecret(): string {
  const secret = process.env.PORTONE_API_SECRET
  if (!secret) throw new Error('PORTONE_API_SECRET 환경변수가 설정되지 않았습니다.')
  return secret
}

function getChannelKey(): string {
  const key = process.env.PORTONE_CHANNEL_KEY
  if (!key) throw new Error('PORTONE_CHANNEL_KEY 환경변수가 설정되지 않았습니다.')
  return key
}

export interface CreatePaymentLinkParams {
  customerEmail: string
  amountKRW: number
  orderName?: string
  expiresAt?: Date
}

export interface PortonePaymentLink {
  paymentLinkId: string
  paymentLinkUrl: string
}

async function parsePortoneError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  if (!text) return ''
  try {
    const json = JSON.parse(text)
    // 포트원 v2 에러 형식: { code, message } 또는 { type, message }
    return json.message ?? json.code ?? text
  } catch {
    return text
  }
}

/**
 * 포트원 v2 결제 링크 생성
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<PortonePaymentLink> {
  const { customerEmail, amountKRW, orderName, expiresAt } = params

  const expires = expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  // storeId는 복수 스토어 계정에서 필요. 단일 스토어면 생략 가능
  const storeId = process.env.PORTONE_STORE_ID

  const body: Record<string, unknown> = {
    channelKey: getChannelKey(),
    orderName: orderName ?? 'AlphaGround 얼리버드 멤버십',
    amount: {
      total: amountKRW,
      currency: 'KRW',
    },
    customer: {
      email: customerEmail,
    },
    expiresAt: expires.toISOString(),
  }

  if (storeId) body.storeId = storeId

  const response = await fetch(`${PORTONE_API_BASE}/payment-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `PortOne ${getApiSecret()}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorMsg = await parsePortoneError(response)
    let hint = ''
    if (response.status === 404) {
      hint = ' → 채널 키 확인 (포트원 관리자 > 채널 관리) 또는 PORTONE_STORE_ID 환경변수 추가 필요'
    } else if (response.status === 401 || response.status === 403) {
      hint = ' → PORTONE_API_SECRET이 올바른지 확인'
    }
    throw new Error(
      `포트원 결제 링크 생성 실패 (${response.status})${errorMsg ? ': ' + errorMsg : ''}${hint}`
    )
  }

  const data = await response.json()
  return {
    paymentLinkId: data.paymentLinkId,
    paymentLinkUrl: data.paymentLinkUrl,
  }
}

/**
 * 포트원 v2 Webhook 서명 검증
 * https://developers.portone.io/docs/ko/v2-payment/webhook
 */
export async function verifyWebhookSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string
): Promise<boolean> {
  const secret = process.env.PORTONE_WEBHOOK_SECRET
  if (!secret) {
    console.error('PORTONE_WEBHOOK_SECRET 환경변수가 설정되지 않았습니다.')
    return false
  }

  try {
    const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const msgData = encoder.encode(signedContent)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
    const computedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    )

    // webhook-signature 헤더는 "v1,<base64>" 형식
    const expectedSignatures = webhookSignature.split(' ').map((s) => s.replace('v1,', ''))
    return expectedSignatures.includes(computedSignature)
  } catch (error) {
    console.error('Webhook 서명 검증 오류:', error)
    return false
  }
}

/**
 * 포트원 서버 API로 결제 내역 단건 조회
 */
export async function getPayment(paymentId: string) {
  const response = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `PortOne ${getApiSecret()}`,
    },
  })

  if (!response.ok) {
    const errorMsg = await parsePortoneError(response)
    throw new Error(`포트원 결제 조회 실패 (${response.status})${errorMsg ? ': ' + errorMsg : ''}`)
  }

  return response.json()
}
