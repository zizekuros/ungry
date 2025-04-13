/*
  # Add Leave List Feature

  1. Changes
    - Add policy to allow members to delete their own membership
*/

CREATE POLICY "Members can leave lists"
  ON list_members
  FOR DELETE
  USING (member_id = auth.uid());