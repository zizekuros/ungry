/*
  # Remove item_name from user_item_analytics

  1. Changes
    - Remove item_name column from user_item_analytics table
    - Since there's no renaming feature, item names can be retrieved via item_id JOIN
    - Simplifies the schema and reduces storage overhead
*/

-- Remove item_name column from user_item_analytics table
ALTER TABLE user_item_analytics DROP COLUMN item_name;
