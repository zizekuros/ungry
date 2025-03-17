/*
  # Update Shopping Lists Schema

  1. Changes
    - Add `bought` column to `list_items` table
    - Add policy for updating items
    - Add policy for inserting shopping lists
*/

-- Add bought column to list_items
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS bought boolean DEFAULT false;

-- Add policy for updating items
CREATE POLICY "Members can update list items"
  ON list_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM list_members
      WHERE list_id = list_items.list_id
      AND member_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM shopping_lists
      WHERE id = list_items.list_id
      AND owner_id = auth.uid()
    )
  );

-- Add policy for inserting shopping lists
CREATE POLICY "Users can create lists"
  ON shopping_lists
  FOR INSERT
  WITH CHECK (true);