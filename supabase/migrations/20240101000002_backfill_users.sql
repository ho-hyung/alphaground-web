-- ── 기존 auth.users 백필 ──────────────────────────────
-- 트리거 생성 전에 이미 가입한 사용자를 public.users에 삽입
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

INSERT INTO public.users (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;
