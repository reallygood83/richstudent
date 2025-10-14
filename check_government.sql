-- 경제 기구 확인
SELECT 
  ee.id,
  ee.name,
  ee.entity_type,
  eea.account_type,
  eea.balance
FROM economic_entities ee
LEFT JOIN economic_entity_accounts eea ON ee.id = eea.entity_id
WHERE ee.name = 'Government'
ORDER BY ee.id, eea.account_type;
