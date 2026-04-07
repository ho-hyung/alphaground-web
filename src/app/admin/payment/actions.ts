'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/portone'
import { z } from 'zod'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE 환경변수가 설정되지 않았습니다 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
  return createSupabaseAdmin(url, key)
}

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail && user.email !== adminEmail) {
    throw new Error('관리자 권한이 없습니다.')
  }
}

const CreateLinkSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  amountKRW: z.number().int().positive('금액은 1원 이상이어야 합니다.'),
})

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export async function createTestPaymentLink(
  formData: FormData
): Promise<ActionResult<{ paymentLinkUrl: string }>> {
  try {
    await assertAdmin()

    const parseResult = CreateLinkSchema.safeParse({
      email: formData.get('email'),
      amountKRW: parseInt(formData.get('amountKRW') as string, 10),
    })
    if (!parseResult.success) {
      return { ok: false, error: parseResult.error.issues[0]?.message ?? '입력값이 유효하지 않습니다.' }
    }

    const { email, amountKRW } = parseResult.data
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const link = await createPaymentLink({ customerEmail: email, amountKRW, expiresAt })

    const supabase = createAdminClient()
    const { error: insertError } = await supabase.from('payment_links').insert({
      payment_link_id: link.paymentLinkId,
      payment_link_url: link.paymentLinkUrl,
      customer_email: email,
      amount: amountKRW,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) {
      // payment_links 테이블 미생성 등 DB 오류는 로그만 남기고 링크는 반환
      console.error('[admin/payment] DB insert error:', insertError.message)
    }

    return { ok: true, data: { paymentLinkUrl: link.paymentLinkUrl } }
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
    console.error('[admin/payment] createTestPaymentLink error:', message)
    return { ok: false, error: message }
  }
}

export async function fetchPayments() {
  await assertAdmin()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data ?? []
}
