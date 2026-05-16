UPDATE "Plan"
SET
  features = array_remove(array_remove(features, 'API_ACCESS'), 'CUSTOM_INTEGRATIONS'),
  "updatedAt" = now()
WHERE features && ARRAY['API_ACCESS', 'CUSTOM_INTEGRATIONS'];
