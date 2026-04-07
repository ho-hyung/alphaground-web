-- ── properties 테이블 ─────────────────────────────────
-- AlphaGround 경매 매물 정보 (Alpha-Report 기반)

CREATE TABLE IF NOT EXISTS public.properties (
  id                TEXT PRIMARY KEY,           -- case_id (예: 2024타경6220)
  case_number       TEXT NOT NULL,
  court             TEXT NOT NULL DEFAULT '',
  region            TEXT NOT NULL DEFAULT '기타',
  district          TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  property_type     TEXT NOT NULL DEFAULT '기타',
  area              NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_bid       BIGINT NOT NULL DEFAULT 0,
  estimated_value   BIGINT NOT NULL DEFAULT 0,  -- 감정가
  appraisal_price   BIGINT NOT NULL DEFAULT 0,
  estimated_bid     BIGINT NOT NULL DEFAULT 0,  -- 추정낙찰가
  roi               NUMERIC(8,2) NOT NULL DEFAULT 0,
  legal_judgment    TEXT NOT NULL DEFAULT 'PASS' CHECK (legal_judgment IN ('PASS','FAIL','CAUTION')),
  risk_level        TEXT NOT NULL DEFAULT 'low'  CHECK (risk_level IN ('none','low','medium','high','critical')),
  auction_date      DATE,
  status            TEXT NOT NULL DEFAULT '예정',
  score             INT NOT NULL DEFAULT 50,
  summary           TEXT NOT NULL DEFAULT '',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  report_file       TEXT NOT NULL DEFAULT '',
  failed_auctions   INT NOT NULL DEFAULT 0,
  special_notes     TEXT NOT NULL DEFAULT '',
  nearby_trade      JSONB,
  lat               NUMERIC(10,7),
  lng               NUMERIC(10,7),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 자주 쓰는 필터 컬럼 인덱스
CREATE INDEX IF NOT EXISTS idx_properties_region        ON public.properties(region);
CREATE INDEX IF NOT EXISTS idx_properties_judgment      ON public.properties(legal_judgment);
CREATE INDEX IF NOT EXISTS idx_properties_auction_date  ON public.properties(auction_date);
CREATE INDEX IF NOT EXISTS idx_properties_roi           ON public.properties(roi DESC);

-- Row Level Security — 매물은 누구나 조회 가능 (공개 데이터)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties: 누구나 조회" ON public.properties
  FOR SELECT USING (true);

-- 서비스 롤만 추가/수정/삭제 가능 (시드 스크립트 등)
CREATE POLICY "properties: 서비스롤만 쓰기" ON public.properties
  FOR ALL USING (auth.role() = 'service_role');
