/*
  # Fix Analytics Cascade Deletion Issue

  1. Changes
    - Remove CASCADE deletion for item_id and list_id foreign keys
    - Change to SET NULL on deletion to preserve analytics data
    - This ensures analytics data is retained even when items/lists are deleted
*/

-- Drop existing foreign key constraints
ALTER TABLE user_item_analytics 
  DROP CONSTRAINT IF EXISTS user_item_analytics_list_id_fkey;

ALTER TABLE user_item_analytics 
  DROP CONSTRAINT IF EXISTS user_item_analytics_item_id_fkey;

-- Recreate foreign keys with ON DELETE SET NULL to preserve analytics
ALTER TABLE user_item_analytics 
  ADD CONSTRAINT user_item_analytics_list_id_fkey 
  FOREIGN KEY (list_id) 
  REFERENCES shopping_lists(id) 
  ON DELETE SET NULL;

ALTER TABLE user_item_analytics 
  ADD CONSTRAINT user_item_analytics_item_id_fkey 
  FOREIGN KEY (item_id) 
  REFERENCES list_items(id) 
  ON DELETE SET NULL;

