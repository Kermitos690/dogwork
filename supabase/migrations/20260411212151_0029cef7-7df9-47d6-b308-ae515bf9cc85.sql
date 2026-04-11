
-- Lower credit costs across the board for better value
UPDATE ai_feature_catalog SET credits_cost = 1 WHERE code = 'chat';
UPDATE ai_feature_catalog SET credits_cost = 1 WHERE code = 'chat_general';
UPDATE ai_feature_catalog SET credits_cost = 1 WHERE code = 'connection_guide';
UPDATE ai_feature_catalog SET credits_cost = 2 WHERE code = 'behavior_summary';
UPDATE ai_feature_catalog SET credits_cost = 2 WHERE code = 'dog_profile_analysis';
UPDATE ai_feature_catalog SET credits_cost = 2 WHERE code = 'record_enrichment';
UPDATE ai_feature_catalog SET credits_cost = 3 WHERE code = 'plan_generator';
UPDATE ai_feature_catalog SET credits_cost = 3 WHERE code = 'behavior_analysis';
UPDATE ai_feature_catalog SET credits_cost = 4 WHERE code = 'adoption_plan';
UPDATE ai_feature_catalog SET credits_cost = 5 WHERE code = 'education_plan';

-- Deactivate features not relevant for a dog training app
UPDATE ai_feature_catalog SET is_active = false WHERE code = 'content_rewrite';
UPDATE ai_feature_catalog SET is_active = false WHERE code = 'marketing_content';
