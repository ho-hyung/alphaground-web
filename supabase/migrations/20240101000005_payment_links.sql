-- ── payment_links 테이블 ──────────────────────────────
-- 포트원 v2 결제 링크 생성 및 상태 추적

CREATE TABLE IF NOT EXISTS public.payment_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_link_id TEXT NOT NULL UNIQUE,   -- 포트원에서 발급된 결제 링크 ID
  payment_link_url TEXT NOT NULL,          -- 결제 링크 URL
  customer_email  TEXT NOT NULL,
  order_name      TEXT NOT NULL DEFAULT 'AlphaGround 얼리버드 멤버십',
  amount          INTEGER NOT NULL,        -- KRW 금액 (정수)
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  expires_at      TIMESTAMPTZ NOT NULL,
  paid_at         TIMESTAMPTZ,
  portone_tx_id   TEXT,                    -- 포트원 결제 트랜잭션 ID
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row Level Security
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 가능 (모든 RLS 정책은 서비스 롤에서 bypass)
-- 일반 사용자는 본인 이메일 결제만 조회 가능
CREATE POLICY "payment_links: 본인 이메일만 조회" ON public.payment_links
  FOR SELECT
  USING (
    customer_email = (
      SELECT email FROM public.users WHERE id = auth.uid()
    )
  );

-- 업데이트 시 updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.update_payment_links_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER payment_links_updated_at
  BEFORE UPDATE ON public.payment_links
  FOR EACH ROW EXECUTE PROCEDURE public.update_payment_links_updated_at();
