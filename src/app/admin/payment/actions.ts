'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/portone'
import { z } from 'zod'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  email: z.string().email(),
  amountKRW: z.number().int().positive(),
})

export async function createTestPaymentLink(formData: FormData) {
  await assertAdmin()

  const parsed = CreateLinkSchema.parse({
    email: formData.get('email'),
    amountKRW: parseInt(formData.get('amountKRW') as string, 10),
  })

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const link = await createPaymentLink({ customerEmail: parsed.email, amountKRW: parsed.amountKRW, expiresAt })

  const supabase = createAdminClient()
  await supabase.from('payment_links').insert({
    payment_link_id: link.paymentLinkId,
    payment_link_url: link.paymentLinkUrl,
    customer_email: parsed.email,
    amount: parsed.amountKRW,
    expires_at: expiresAt.toISOString(),
  })

  return { paymentLinkUrl: link.paymentLinkUrl }
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
