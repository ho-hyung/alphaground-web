-- ── recently_viewed 테이블 ─────────────────────────────
-- 사용자가 최근에 본 매물 기록 (최대 50개, 오래된 것부터 삭제)
CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_number   TEXT NOT NULL,
  viewed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, case_number)
);

-- Row Level Security
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recently_viewed: 본인만 조회" ON public.recently_viewed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "recently_viewed: 본인만 추가" ON public.recently_viewed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "recently_viewed: 본인만 수정" ON public.recently_viewed
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "recently_viewed: 본인만 삭제" ON public.recently_viewed
  FOR DELETE USING (auth.uid() = user_id);
