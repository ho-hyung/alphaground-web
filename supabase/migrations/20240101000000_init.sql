-- AlphaGround 초기 스키마
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.

-- ── users 테이블 ──────────────────────────────────────
-- auth.users 를 참조하는 공개 프로파일 테이블
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  membership    TEXT NOT NULL DEFAULT 'free' CHECK (membership IN ('free', 'premium')),
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 신규 가입 시 자동으로 users 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── bookmarks 테이블 ──────────────────────────────────
-- 사용자가 관심 있는 경매 사건번호 저장
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  case_number   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, case_number)
);

-- ── Row Level Security ────────────────────────────────
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 본인 행만 조회/수정 가능
CREATE POLICY "users: 본인만 조회" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users: 본인만 수정" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "bookmarks: 본인만 조회" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookmarks: 본인만 추가" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks: 본인만 삭제" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);
