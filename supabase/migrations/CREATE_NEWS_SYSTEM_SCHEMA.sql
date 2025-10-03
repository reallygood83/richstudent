-- 경제뉴스 피드 시스템 스키마
-- 생성일: 2025-01-24

-- 뉴스 설정 테이블 (교사별 Gemini API 키 및 학생 수준 관리)
CREATE TABLE IF NOT EXISTS news_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  gemini_api_key TEXT,
  student_level TEXT NOT NULL DEFAULT 'elementary' CHECK (student_level IN ('elementary', 'middle', 'high')),
  auto_refresh_enabled BOOLEAN DEFAULT true,
  refresh_interval_minutes INTEGER DEFAULT 30 CHECK (refresh_interval_minutes >= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id)
);

-- 뉴스 피드 캐시 테이블 (RSS 수집 데이터 저장)
CREATE TABLE IF NOT EXISTS news_feed (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('maeil', 'yonhap')),
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  pub_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  original_content TEXT,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(link)
);

-- AI 해설 캐시 테이블 (Gemini AI 생성 해설 저장)
CREATE TABLE IF NOT EXISTS news_explanations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  news_id UUID NOT NULL REFERENCES news_feed(id) ON DELETE CASCADE,
  student_level TEXT NOT NULL CHECK (student_level IN ('elementary', 'middle', 'high')),
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(news_id, student_level)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_news_feed_source ON news_feed(source);
CREATE INDEX IF NOT EXISTS idx_news_feed_pub_date ON news_feed(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_feed_cached_at ON news_feed(cached_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_explanations_news_id ON news_explanations(news_id);
CREATE INDEX IF NOT EXISTS idx_news_explanations_level ON news_explanations(student_level);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_news_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_settings_updated_at
  BEFORE UPDATE ON news_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_news_settings_updated_at();

-- RLS (Row Level Security) 정책
ALTER TABLE news_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_explanations ENABLE ROW LEVEL SECURITY;

-- 뉴스 설정: 교사는 자신의 설정만 조회/수정 가능
CREATE POLICY "Teachers can view their own news settings"
  ON news_settings FOR SELECT
  USING (true);

CREATE POLICY "Teachers can update their own news settings"
  ON news_settings FOR UPDATE
  USING (true);

CREATE POLICY "Teachers can insert their own news settings"
  ON news_settings FOR INSERT
  WITH CHECK (true);

-- 뉴스 피드: 모든 사용자 조회 가능, 서버에서만 삽입/업데이트
CREATE POLICY "Anyone can view news feed"
  ON news_feed FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert news feed"
  ON news_feed FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update news feed"
  ON news_feed FOR UPDATE
  USING (true);

-- AI 해설: 모든 사용자 조회 가능, 서버에서만 삽입/업데이트
CREATE POLICY "Anyone can view news explanations"
  ON news_explanations FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert news explanations"
  ON news_explanations FOR INSERT
  WITH CHECK (true);

-- 주석 추가
COMMENT ON TABLE news_settings IS '교사별 뉴스 피드 설정 (Gemini API 키, 학생 수준)';
COMMENT ON TABLE news_feed IS 'RSS 뉴스 피드 캐시 (매일경제, 연합뉴스)';
COMMENT ON TABLE news_explanations IS 'AI 생성 뉴스 해설 캐시 (학생 수준별)';

COMMENT ON COLUMN news_settings.gemini_api_key IS 'Google Gemini API 키 (암호화 권장)';
COMMENT ON COLUMN news_settings.student_level IS '학생 수준: elementary(초5-6), middle(중), high(고)';
COMMENT ON COLUMN news_feed.source IS '뉴스 출처: maeil(매일경제), yonhap(연합뉴스)';
COMMENT ON COLUMN news_explanations.explanation IS '파인만 기법 기반 학생 수준별 해설';
