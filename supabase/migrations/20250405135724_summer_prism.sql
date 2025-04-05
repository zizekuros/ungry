/*
  # Add DELETE policy for list items

  1. Changes
    - Add policy to allow list members and owners to delete items from their lists
*/

CREATE POLICY "Members can delete list items"
  ON list_items
  FOR DELETE
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