/*
  # Add User Item Analytics Tracking

  1. Changes
    - Create `user_item_analytics` table to track user events
    - Add indexes for efficient querying by user and time periods
    - Add RLS policies for user data access
    - Add helper functions for analytics queries
*/

-- Create analytics table to track user events
CREATE TABLE user_item_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid REFERENCES shopping_lists(id) ON DELETE CASCADE,
  item_id uuid REFERENCES list_items(id) ON DELETE CASCADE,
  item_name text,
  action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_user_item_analytics_user_id ON user_item_analytics(user_id);
CREATE INDEX idx_user_item_analytics_created_at ON user_item_analytics(created_at);
CREATE INDEX idx_user_item_analytics_action ON user_item_analytics(action);
CREATE INDEX idx_user_item_analytics_user_created ON user_item_analytics(user_id, created_at);
CREATE INDEX idx_user_item_analytics_list_id ON user_item_analytics(list_id) WHERE list_id IS NOT NULL;
CREATE INDEX idx_user_item_analytics_item_id ON user_item_analytics(item_id) WHERE item_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_item_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own analytics
CREATE POLICY "Users can view their own analytics"
  ON user_item_analytics
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Allow inserts (for logging events)
CREATE POLICY "Allow analytics inserts"
  ON user_item_analytics
  FOR INSERT
  WITH CHECK (true);

