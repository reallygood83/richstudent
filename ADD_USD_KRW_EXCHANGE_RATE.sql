-- ========================================
-- USD-KRW 환율 추가를 위한 SQL 스크립트
-- ========================================

-- 1. 기존 USD-KRW 환율 데이터 확인 및 삭제 (있다면)
DELETE FROM market_assets WHERE symbol = 'USDKRW' OR symbol = 'USD/KRW';

-- 2. USD-KRW 환율 자산 추가
INSERT INTO market_assets (
  symbol,
  name,
  asset_type,
  category,
  current_price,
  currency,
  is_active,
  min_quantity,
  created_at,
  updated_at
) VALUES (
  'USDKRW=X',
  '미국 달러/한국 원',
  'currency',
  '주요 환율',
  1320.50,  -- 대략적인 현재 환율 (실제로는 API에서 업데이트)
  'KRW',
  true,
  0.01,     -- 0.01달러 단위로 거래 가능
  NOW(),
  NOW()
);

-- 3. 추가로 주요 환율들도 함께 추가
INSERT INTO market_assets (
  symbol,
  name,
  asset_type,
  category,
  current_price,
  currency,
  is_active,
  min_quantity,
  created_at,
  updated_at
) VALUES 
(
  'EURUKR=X',
  '유로/한국 원',
  'currency',
  '주요 환율',
  1430.00,  -- 대략적인 현재 환율
  'KRW',
  true,
  0.01,
  NOW(),
  NOW()
),
(
  'JPYKRW=X',
  '일본 엔/한국 원',
  'currency',
  '주요 환율',
  8.85,     -- 100엔 기준 환율
  'KRW',
  true,
  0.01,
  NOW(),
  NOW()
),
(
  'CNYUKR=X',
  '중국 위안/한국 원',
  'currency',
  '주요 환율',
  181.20,   -- 대략적인 현재 환율
  'KRW',
  true,
  0.01,
  NOW(),
  NOW()
);

-- 4. 환율 정보 확인
SELECT 
  symbol,
  name,
  asset_type,
  category,
  current_price,
  currency,
  is_active,
  created_at
FROM market_assets 
WHERE asset_type = 'currency' 
ORDER BY symbol;

-- 5. 총 자산 개수 확인
SELECT 
  asset_type,
  COUNT(*) as count
FROM market_assets 
WHERE is_active = true
GROUP BY asset_type
ORDER BY asset_type;