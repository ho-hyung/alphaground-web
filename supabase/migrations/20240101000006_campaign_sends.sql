-- 결제 캠페인 이메일 발송 이력 테이블
CREATE TABLE IF NOT EXISTS campaign_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text NOT NULL,
  payment_link_id text,
  campaign_type   text NOT NULL CHECK (campaign_type IN ('initial', 'reminder_d3', 'reminder_d1')),
  status          text NOT NULL CHECK (status IN ('sent', 'failed', 'dry_run')),
  message_id      text,
  error_message   text,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_sends_email       ON campaign_sends (email);
CREATE INDEX idx_campaign_sends_campaign_type ON campaign_sends (campaign_type);
CREATE INDEX idx_campaign_sends_status      ON campaign_sends (status);
CREATE INDEX idx_campaign_sends_sent_at     ON campaign_sends (sent_at DESC);

-- Service Role만 접근 가능 (외부 노출 없음)
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;
